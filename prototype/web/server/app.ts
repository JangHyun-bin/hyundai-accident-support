import { realpath, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { makeShare, preparePayload, reduceCase, validateCase, type JourneyCase } from '../src/journey/case'
import { InvalidProductInput, inputId, inputObject, parseCopy, parseVehicleAction, parseVehicleFact, stampPhoneCommand } from '../src/product/product-commands'
import { applyVehicleAction, applyVehicleFact } from '../src/product/product-progress'
import type { ChangeResponse, CopyResponse } from '../src/product/api-contract'
import { CaseDatabase, type Grant } from './database'
import { Pairing } from './pairing'
import { readChange, readJson } from './requests'
import { ApiError, canonicalJson, hash, PENDING_COOKIE, PHONE_COOKIE, privateResponse,
  readCookie, requireOrigin, sameSecret, sessionCookie } from './security'

export type AppConfig = { origin: string; staticDir: string }
export type CaseApp = { fetch: (request: Request, peer?: string) => Promise<Response>; store: CaseDatabase }

export function createApp(config: AppConfig, store: CaseDatabase, clock: () => Date = () => new Date()): CaseApp {
  const pairing = new Pairing(store, config.origin)

  function authenticate(request: Request, role: Grant['role'] | 'either', now: string, caseId?: string): Grant {
    const authorization = request.headers.get('Authorization')
    let grant: Grant
    if (role !== 'phone' && authorization !== null) {
      const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization)
      if (!match) throw new ApiError(401, 'access-required', '차량 연결을 확인해 주세요.')
      grant = store.grantByToken(match[1], 'vehicle', now)
    } else {
      if (role === 'vehicle' || authorization !== null) throw new ApiError(403, 'forbidden', '이 기기에서 사용할 수 없는 요청이에요.')
      const credential = readCookie(request, PHONE_COOKIE)
      if (!credential) throw new ApiError(401, 'access-required', '휴대폰 연결을 먼저 확인해 주세요.')
      grant = store.grantByToken(credential, 'phone', now)
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        requireOrigin(request, config.origin)
        if (!sameSecret(request.headers.get('X-CSRF-Token') ?? '', grant.csrf)) throw new ApiError(403, 'forbidden', '요청 확인 정보가 맞지 않아요.')
      }
    }
    if (caseId !== undefined && grant.case_id !== caseId) throw new ApiError(403, 'forbidden', '이 기록에 접근할 수 없어요.')
    return grant
  }

  async function api(request: Request, url: URL, peer: string): Promise<Response> {
    const now = clock().toISOString()
    let grant: Grant | null = null
    try {
      if (request.headers.has('Origin') && request.headers.get('Origin') !== config.origin) throw new ApiError(403, 'forbidden', '이 주소에서는 요청할 수 없어요.')
      if (request.method === 'GET' && url.pathname === '/api/health') return Response.json({ ok: true })
      store.rateLimit(`api:${hash(peer)}`, 1200, 60_000, Date.parse(now))
      const segments = url.pathname.split('/').filter(Boolean).map(segment => decodeURIComponent(segment))
      if (segments.some(segment => segment.includes('/') || segment.includes('\\'))) throw new ApiError(400, 'invalid-request', '요청 주소를 확인해 주세요.')
      if (segments.length === 2 && segments[1] === 'cases' && request.method === 'POST') {
        store.rateLimit(`create:${hash(peer)}`, 20, 3_600_000, Date.parse(now))
        return Response.json(pairing.create(await readJson(request), now), { status: 201 })
      }
      if (segments.length === 2 && segments[1] === 'pair-claims' && request.method === 'POST') {
        requireOrigin(request, config.origin)
        store.rateLimit(`claim:${hash(peer)}`, 60, 3_600_000, Date.parse(now))
        const claim = pairing.claim(await readJson(request), readCookie(request, PENDING_COOKIE), now)
        return Response.json(claim.value, { status: 201, headers: { 'Set-Cookie': sessionCookie(PENDING_COOKIE, claim.pending, claim.value.expiresAt) } })
      }
      if (segments.length === 3 && segments[1] === 'pair-claims' && request.method === 'GET' && inputId(segments[2])) {
        const result = pairing.status(segments[2], readCookie(request, PENDING_COOKIE), now)
        const response = Response.json(result.value)
        if (result.credential && result.value.state === 'approved') response.headers.set('Set-Cookie', sessionCookie(PHONE_COOKIE, result.credential, result.value.session.expiresAt))
        return response
      }
      if (segments.length === 2 && segments[1] === 'session' && request.method === 'GET') {
        grant = authenticate(request, 'phone', now)
        store.heartbeat(grant, now)
        return Response.json(store.phoneSession(grant))
      }
      if (segments.length === 4 && segments[1] === 'pairs' && inputId(segments[2])) {
        grant = authenticate(request, 'either', now)
        if (segments[3] === 'claims' && request.method === 'GET') return Response.json({ claims: pairing.claims(segments[2], grant, now) })
        if (segments[3] === 'approve' && request.method === 'POST') {
          store.rateLimit(`approve:${grant.id}`, 30, 60_000, Date.parse(now))
          const value = await readJson(request)
          if (!inputObject(value) || Object.keys(value).length !== 1 || !inputId(value.claimId)) throw new ApiError(400, 'invalid-request', '연결 요청을 확인해 주세요.')
          pairing.approve(segments[2], value.claimId, grant, clock().toISOString())
          return Response.json({ ok: true })
        }
      }
      if (segments[1] !== 'cases' || !inputId(segments[2])) throw new ApiError(404, 'missing', '요청한 주소를 찾을 수 없어요.')
      const caseId = segments[2]
      if (segments.length === 3 && request.method === 'GET') {
        grant = authenticate(request, 'phone', now, caseId)
        const value = store.getCase(caseId)
        store.heartbeat(grant, now)
        return Response.json({ value })
      }
      if (segments.length === 4 && segments[3] === 'progress' && request.method === 'GET') {
        grant = authenticate(request, 'vehicle', now, caseId)
        return Response.json(store.progress(store.getCase(caseId), now))
      }
      if (segments.length === 4 && segments[3] === 'pairs' && request.method === 'POST') {
        grant = authenticate(request, 'either', now, caseId)
        store.rateLimit(`pair:${grant.id}`, 20, 3_600_000, Date.parse(now))
        return Response.json(pairing.pair(grant, now), { status: 201 })
      }
      if (segments.length === 5 && segments[3] === 'assets' && request.method === 'GET' && inputId(segments[4])) {
        grant = authenticate(request, 'phone', now, caseId)
        const asset = store.readAsset(caseId, segments[4])
        return new Response(asset.data, { headers: { 'Content-Type': asset.mime, 'Content-Length': String(asset.bytes),
          'Content-Disposition': `inline; filename="${asset.id.replace(/[^a-zA-Z0-9._-]/g, '_')}"`, 'Content-Security-Policy': "default-src 'none'; sandbox" } })
      }
      if (segments.length === 4 && segments[3] === 'changes' && request.method === 'POST') {
        grant = authenticate(request, 'phone', now, caseId)
        const { change, assets } = await readChange(request, caseId)
        const commitTime = clock().toISOString()
        const result = store.mutate({ caseId, actorId: grant.id, expectedRevision: change.expectedRevision, mutationId: change.mutationId,
          intentHash: hash(canonicalJson({ kind: 'changes', commands: change.commands, assets: change.assets })), now: commitTime, assets,
          apply: current => {
            let value = current
            for (const command of change.commands) {
              const next = reduceCase(value, stampPhoneCommand(command, commitTime))
              if (next === value && !allowedNoChange(value, command)) throw new ApiError(400, 'invalid-change', '현재 상태에서는 이 변경을 적용할 수 없어요.')
              value = next
            }
            if (!validateCase(value)) throw new ApiError(400, 'invalid-change', '저장할 내용을 확인해 주세요.')
            return { value }
          } })
        const response: ChangeResponse = { value: result.value, duplicate: result.duplicate, ackMutationId: result.ackMutationId, ackRevision: result.ackRevision }
        return Response.json(response)
      }
      if (segments.length === 4 && segments[3] === 'copies' && request.method === 'POST') {
        grant = authenticate(request, 'phone', now, caseId)
        const input = parseCopy(await readJson(request))
        const commitTime = clock().toISOString()
        const result = store.mutate({ caseId, actorId: grant.id, expectedRevision: input.expectedRevision, mutationId: input.mutationId,
          intentHash: hash(canonicalJson({ kind: 'copy', id: input.id, selection: input.selection, preview: input.preview })), now: commitTime,
          apply: current => {
            const payload = preparePayload(current, input.selection)
            if (!payload.ok || canonicalJson(payload.value) !== canonicalJson(input.preview)) throw new ApiError(400, 'invalid-change', '현재 내용과 미리보기가 달라요. 다시 확인해 주세요.')
            const shared = makeShare(current, { recipient: '내 보관용 사본', id: input.id, selection: input.selection, now: commitTime })
            if (!shared.ok) throw new ApiError(400, 'invalid-change', '사본에 포함할 내용을 다시 확인해 주세요.')
            return { value: shared.value, result: { copyId: input.id } }
          } })
        const copy = result.value.shares.find(item => item.id === input.id)
        if (!copy) throw new ApiError(503, 'unavailable', '저장한 사본을 확인할 수 없어요.')
        const response: CopyResponse = { value: result.value, copyId: copy.id, payload: copy.payload, duplicate: result.duplicate,
          ackMutationId: result.ackMutationId, ackRevision: result.ackRevision }
        return Response.json(response)
      }
      if (segments.length === 4 && request.method === 'POST' && (segments[3] === 'vehicle-actions' || segments[3] === 'vehicle-facts')) {
        grant = authenticate(request, 'vehicle', now, caseId)
        const input = segments[3] === 'vehicle-actions' ? parseVehicleAction(await readJson(request)) : parseVehicleFact(await readJson(request))
        const commitTime = clock().toISOString()
        const result = store.mutate({ caseId, actorId: grant.id, expectedRevision: input.expectedRevision, mutationId: input.mutationId,
          intentHash: hash(canonicalJson({ kind: segments[3], ...('actionId' in input ? { actionId: input.actionId } : { fact: input.fact }) })), now: commitTime,
          apply: value => {
            const next = 'actionId' in input ? applyVehicleAction(value, input.actionId, input.mutationId, commitTime) : applyVehicleFact(value, input.fact, input.mutationId, commitTime)
            if (next === value) throw new ApiError(400, 'invalid-change', '현재 기록에 이 차량 정보를 추가할 수 없어요.')
            return { value: next }
          } })
        return Response.json(store.progress(result.value, commitTime))
      }
      if (segments.length === 5 && request.method === 'DELETE' && inputId(segments[4])) {
        grant = authenticate(request, 'either', now, caseId)
        if (segments[3] === 'clients') pairing.revokeClient(segments[4], grant, now)
        else if (segments[3] === 'pairs') pairing.revokePair(segments[4], grant, now)
        else throw new ApiError(404, 'missing', '요청한 주소를 찾을 수 없어요.')
        return Response.json({ ok: true })
      }
      throw new ApiError(404, 'missing', '요청한 주소를 찾을 수 없어요.')
    } catch (error) {
      const failure = error instanceof ApiError ? error : error instanceof InvalidProductInput || error instanceof URIError
        ? new ApiError(400, 'invalid-request', '요청 내용을 확인해 주세요.') : new ApiError(503, 'unavailable', '지금은 요청을 처리할 수 없어요. 저장되지 않은 내용은 다시 시도해 주세요.')
      const body: Record<string, unknown> = { error: { code: failure.code, message: failure.message } }
      if (failure.code === 'conflict' && grant) {
        try {
          store.requireGrant(grant.id, grant.case_id, clock().toISOString())
          const latest = store.getCase(grant.case_id)
          body.latestRevision = latest.revision
          if (grant.role === 'phone') body.value = latest
          else body.progress = store.progress(latest, clock().toISOString())
        } catch { /* Revocation must not expose a canonical case. */ }
      }
      return Response.json(body, { status: failure.status })
    }
  }

  return { store, async fetch(request, peer = 'local') {
    const url = new URL(request.url)
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return privateResponse(await api(request, url, peer))
    return privateResponse(await staticResponse(request, url.pathname, config.staticDir))
  } }
}

function allowedNoChange(value: JourneyCase, command: Parameters<typeof stampPhoneCommand>[0]): boolean {
  if (command.type === 'statement-edit') return value.statements.some(item => item.id === command.id && item.text === command.text && canonicalJson(item.audioEvidenceIds) === canonicalJson(command.audioEvidenceIds))
  if (command.type === 'evidence-put') return value.evidence.some(item => canonicalJson(item) === canonicalJson(command.evidence))
  if (command.type === 'observation') return value.observations.some(item => canonicalJson({ ...item, observedAt: null }) === canonicalJson({ ...command.observation, observedAt: null }))
  if (command.type === 'evidence-remove') return !value.evidence.some(item => item.id === command.id)
  return false
}

async function staticResponse(request: Request, pathname: string, staticDir: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Not found', { status: 404 })
  let decoded: string
  try { decoded = decodeURIComponent(pathname) } catch { return new Response('Not found', { status: 404 }) }
  if (decoded === '/api' || decoded.startsWith('/api/') || decoded.split('/').some(part => part.startsWith('.')) ||
    decoded.includes('\\') || decoded.includes('\0')) return new Response('Not found', { status: 404 })
  const root = await realpath(staticDir).catch(() => null)
  if (!root) return new Response('Web build unavailable', { status: 503 })
  const requested = resolve(root, `.${decoded}`)
  const candidate = await realpath(requested).catch(() => null)
  if (candidate && candidate.startsWith(`${root}${sep}`) && (await stat(candidate).catch(() => null))?.isFile()) {
    const file = Bun.file(candidate)
    if (await file.exists() && file.size > 0) return new Response(request.method === 'HEAD' ? null : file, { headers: { 'Content-Type': file.type } })
  }
  if (extname(decoded)) return new Response('Not found', { status: 404 })
  const indexPath = await realpath(resolve(root, 'index.html')).catch(() => null)
  if (!indexPath || !indexPath.startsWith(`${root}${sep}`)) return new Response('Web build unavailable', { status: 503 })
  const index = Bun.file(indexPath)
  if (!await index.exists()) return new Response('Web build unavailable', { status: 503 })
  return new Response(request.method === 'HEAD' ? null : index, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
