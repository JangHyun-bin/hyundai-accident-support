import { validateCase, type Evidence, type JourneyCase } from '../journey/case'
import { validatePayload } from '../journey/case-validation'
import type { CaseBatch, CaseData, CaseDataFailure, CaseLoadResult, CaseWriteResult, CaseCopyBatch } from '../journey/case-data'
import { createProductOutbox, tabDraftId } from './product-outbox'
import { inputId, inputObject, inputRevision, parsePhoneCommand, parseCopy } from './product-commands'
import type { AssetManifest, ChangeRequest, MultipartChange, PhoneSession } from './api-contract'

export class CaseAccessError extends Error {
  constructor(readonly reason: 'access-required' | 'forbidden' | 'unavailable') { super(reason) }
}

function failureReason(status: number): CaseDataFailure {
  if (status === 401) return 'access-required'
  if (status === 403) return 'forbidden'
  if (status === 409) return 'conflict'
  if (status === 413) return 'quota'
  if (status >= 500 || status === 429 || status === 408) return 'unavailable'
  return 'invalid'
}
function canonical(value: unknown, caseId: string): value is JourneyCase {
  return validateCase(value) && value.id === caseId && value.emergency.scenarioId === 'product' && value.fixtureId === null
}

export function createRemoteCaseData({ session }: { session: PhoneSession }): CaseData {
  if (session.role !== 'phone' || !inputId(session.caseId) || !inputId(session.clientId) || !session.csrfToken) throw new Error('A paired phone session is required')
  const origin = location.origin
  const outbox = createProductOutbox({ origin, clientId: session.clientId, draftId: tabDraftId() })
  const pendingAssets = new Map<string, Blob>()
  const batchAssets = new Map<string, string[]>()
  const hashes = new WeakMap<Blob, Promise<string>>()
  const casePath = `/api/cases/${encodeURIComponent(session.caseId)}`
  const scoped = (caseId: string) => caseId === session.caseId
  const requireScope = (caseId: string) => { if (!scoped(caseId)) throw new CaseAccessError('forbidden') }
  const rememberAssets = (batch: CaseBatch) => {
    batchAssets.set(batch.mutationId, batch.assets.map(asset => asset.id))
    for (const asset of batch.assets) pendingAssets.set(asset.id, asset.blob)
  }
  const request = (path: string, init?: RequestInit) => fetch(path, { ...init, credentials: 'same-origin', mode: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json', ...init?.headers } })
  async function responseValue(response: Response): Promise<unknown> {
    try { return await response.json() } catch { return null }
  }
  async function write(path: string, batch: CaseBatch, body: BodyInit, json: boolean): Promise<CaseWriteResult> {
    try {
      const response = await request(path, { method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken, ...(json ? { 'Content-Type': 'application/json' } : {}) }, body })
      const raw = await responseValue(response)
      if (!response.ok) return { ok: false, reason: failureReason(response.status), ...(inputObject(raw) && canonical(raw.value, session.caseId) ? { latest: raw.value } : {}) }
      if (!inputObject(raw) || !canonical(raw.value, session.caseId) || raw.ackMutationId !== batch.mutationId || !inputRevision(raw.ackRevision) ||
        raw.ackRevision > raw.value.revision || raw.ackRevision <= (batch.expectedRevision ?? -1) || typeof raw.duplicate !== 'boolean') return { ok: false, reason: 'unavailable' }
      if (batch.kind === 'copy') {
        const copy = raw.value.shares.find(item => item.id === batch.input.id)
        if (raw.copyId !== batch.input.id || !copy || !validatePayload(raw.payload) || JSON.stringify(raw.payload) !== JSON.stringify(batch.preview) ||
          JSON.stringify(copy.payload) !== JSON.stringify(batch.preview)) return { ok: false, reason: 'unavailable' }
      }
      return { ok: true, value: raw.value, ackMutationId: raw.ackMutationId, ackRevision: raw.ackRevision }
    } catch { return { ok: false, reason: 'unavailable' } }
  }
  async function approveCopy(batch: CaseCopyBatch): Promise<CaseWriteResult> {
    if (!scoped(batch.local.id) || batch.input.kind !== 'share' || batch.expectedRevision === null || batch.assets.length) return { ok: false, reason: 'invalid' }
    try {
      const payload = parseCopy({ expectedRevision: batch.expectedRevision, mutationId: batch.mutationId, id: batch.input.id, selection: batch.input.selection, preview: batch.preview })
      return await write(`${casePath}/copies`, batch, JSON.stringify(payload), true)
    } catch { return { ok: false, reason: 'invalid' } }
  }
  return {
    mode: 'remote',
    load: async caseId => {
      if (!scoped(caseId)) return { kind: 'forbidden' }
      try {
        const response = await request(casePath)
        if (!response.ok) {
          const kind: CaseLoadResult['kind'] = response.status === 401 ? 'access-required' : response.status === 403 ? 'forbidden' : response.status === 404 ? 'missing' : 'unavailable'
          return { kind }
        }
        const raw = await responseValue(response)
        return inputObject(raw) && canonical(raw.value, caseId) ? { kind: 'found', value: raw.value } : { kind: 'unavailable' }
      } catch { return { kind: 'unavailable' } }
    },
    apply: async batch => {
      if (!scoped(batch.local.id) || batch.kind !== 'changes' || batch.expectedRevision === null) return { ok: false, reason: 'invalid' }
      let commands: ChangeRequest['commands']
      try { commands = batch.commands.map(parsePhoneCommand) } catch { return { ok: false, reason: 'invalid' } }
      if (!commands.length || commands.length > 100) return { ok: false, reason: 'invalid' }
      const payload: ChangeRequest = { mutationId: batch.mutationId, expectedRevision: batch.expectedRevision, commands }
      if (!batch.assets.length) return write(`${casePath}/changes`, batch, JSON.stringify(payload), true)
      try {
        const evidence: Evidence[] = commands.flatMap(command => command.type === 'evidence-put' ? [command.evidence] : command.type === 'voice-save' ? command.evidence : [])
        const assets: AssetManifest[] = []
        if (new Set(batch.assets.map(asset => asset.id)).size !== batch.assets.length) return { ok: false, reason: 'invalid' }
        for (const asset of batch.assets) {
          const item = evidence.find(item => item.assetId === asset.id)
          if (asset.caseId !== session.caseId || !inputId(asset.id) || !item || asset.blob.size !== item.metadata.bytes || asset.blob.type !== item.metadata.mime) return { ok: false, reason: 'invalid' }
          let hash = hashes.get(asset.blob)
          if (!hash) {
            hash = asset.blob.arrayBuffer().then(bytes => crypto.subtle.digest('SHA-256', bytes)).then(bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join(''))
            hashes.set(asset.blob, hash)
          }
          assets.push({ id: asset.id, mime: asset.blob.type, bytes: asset.blob.size, sha256: await hash })
        }
        const manifest: MultipartChange = { ...payload, assets }
        const form = new FormData()
        form.set('manifest', JSON.stringify(manifest))
        for (const asset of batch.assets) form.set(`asset:${asset.id}`, asset.blob, asset.id)
        return await write(`${casePath}/changes`, batch, form, false)
      } catch { return { ok: false, reason: 'unavailable' } }
    },
    approveCopy,
    readAsset: async (caseId, assetId) => {
      requireScope(caseId)
      if (!inputId(assetId)) return null
      const pending = pendingAssets.get(assetId)
      if (pending) return pending
      let response: Response
      try { response = await request(`${casePath}/assets/${encodeURIComponent(assetId)}`) } catch { throw new CaseAccessError('unavailable') }
      if (response.status === 404) return null
      if (!response.ok) throw new CaseAccessError(response.status === 401 ? 'access-required' : response.status === 403 ? 'forbidden' : 'unavailable')
      const blob = await response.blob()
      return blob.size ? blob : null
    },
    stageBatch: async batch => {
      requireScope(batch.local.id)
      rememberAssets(batch)
      return outbox.stageBatch(batch)
    },
    readBatches: async caseId => {
      requireScope(caseId)
      const records = await outbox.readBatches(caseId)
      for (const record of records) rememberAssets(record.batch)
      return records
    },
    acknowledgeBatch: async (caseId, mutationId) => {
      requireScope(caseId)
      const result = await outbox.acknowledgeBatch(caseId, mutationId)
      if (result.durable) {
        const removed = batchAssets.get(mutationId) ?? []
        batchAssets.delete(mutationId)
        for (const id of removed) if (![...batchAssets.values()].some(ids => ids.includes(id))) pendingAssets.delete(id)
      }
      return result
    },
    markBatch: (caseId, mutationId, status, latest) => { requireScope(caseId); return outbox.markBatch(caseId, mutationId, status, latest) },
    readEditorDraft: (caseId, kind) => { requireScope(caseId); return outbox.readEditorDraft(caseId, kind) },
    writeEditorDraft: (caseId, draft) => { requireScope(caseId); return outbox.writeEditorDraft(caseId, draft) },
    clearEditorDraft: (caseId, kind, expectedVersion) => { requireScope(caseId); return outbox.clearEditorDraft(caseId, kind, expectedVersion) },
  }
}
