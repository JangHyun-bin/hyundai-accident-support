import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { ChangeResponse, CopyResponse, VehicleProgress } from '../src/product/api-contract'
import { preparePayload } from '../src/journey/case'
import { Harness, PNG } from './harness'

let h: Harness
beforeEach(() => { h = new Harness() })
afterEach(() => { h.close() })

describe('canonical case transactions', () => {
  test('removed asset IDs cannot be reused to rewrite an immutable attachment', async () => {
    const phone = await h.phone()
    expect((await h.photo(phone, 0, 'immutable')).status).toBe(200)
    expect((await h.change(phone, 1, [{ type: 'evidence-remove', id: 'immutable' }])).status).toBe(200)
    expect((await h.photo(phone, 2, 'immutable')).status).toBe(400)
    expect((await h.current(phone)).evidence).toEqual([])
    expect((await h.current(phone)).revision).toBe(2)
  })

  test('a real case starts without scenario observations, reports, requests or assumed safety', async () => {
    const phone = await h.phone()
    const value = await h.current(phone)
    expect(value.fixtureId).toBeNull()
    expect(value.emergency.scenarioId).toBe('product')
    expect(value.observations).toEqual([])
    expect(value.submissions).toEqual([])
    expect(value.statements).toEqual([])
    expect(value.diagram).toBeNull()
    expect(value.report).toBeNull()
    expect(value.emergency.requests).toEqual({ rescue: 'not_sent', vehicle: 'not_sent', insurance: 'not_sent' })
    expect((await h.change(phone, 0, [{ type: 'navigate', stage: 'record' }])).status).toBe(400)
    expect((await h.current(phone)).stage).toBe('response')
  })

  test('a losing CAS does not overwrite or prune prior media; restart preserves bytes and revisions', async () => {
    const phone = await h.phone()
    expect((await h.photo(phone, 0, 'original')).status).toBe(200)
    const loser = await h.photo(phone, 0, 'loser')
    expect(loser.status).toBe(409)
    expect((await loser.json()).latestRevision).toBe(1)
    expect((await h.current(phone)).evidence.map(item => item.id)).toEqual(['original'])
    const assetPath = `/api/cases/${phone.session.caseId}/assets/asset:original`
    expect(new Uint8Array(await (await h.request(assetPath, { cookie: phone.cookie })).arrayBuffer())).toEqual(new Uint8Array(PNG))
    expect((await h.request(`/api/cases/${phone.session.caseId}/assets/asset:loser`, { cookie: phone.cookie })).status).toBe(404)
    h.restart()
    expect((await h.current(phone)).revision).toBe(1)
    expect(new Uint8Array(await (await h.request(assetPath, { cookie: phone.cookie })).arrayBuffer())).toEqual(new Uint8Array(PNG))
  })

  test('simultaneous phone changes have one winner and never merge an unapproved stale intent', async () => {
    const phone = await h.phone()
    const second = await h.phone(phone.vehicle)
    const results = await Promise.all([
      h.change(phone, 0, [{ type: 'statement-edit', id: 'one', text: '첫 기록', audioEvidenceIds: [] }]),
      h.change(second, 0, [{ type: 'statement-edit', id: 'two', text: '다른 기록', audioEvidenceIds: [] }]),
    ])
    expect(results.map(result => result.status).sort()).toEqual([200, 409])
    expect((await h.current(phone)).statements).toHaveLength(1)
    expect((await h.current(phone)).revision).toBe(1)
  })

  test('same-intent retries dedupe before CAS, return current head and the original exact ACK', async () => {
    const phone = await h.phone()
    const command = { type: 'statement-edit', id: 'statement', text: '먼저 적은 내용', audioEvidenceIds: [] } as const
    const commands = [{ ...command, audioEvidenceIds: [] }]
    const first: ChangeResponse = await (await h.change(phone, 0, commands, 'mutation-first')).json()
    expect(first.ackRevision).toBe(1)
    expect((await h.change(phone, 1, [{ ...command, text: '나중에 고친 내용', audioEvidenceIds: [] }], 'mutation-second')).status).toBe(200)
    h.restart()
    const duplicate: ChangeResponse = await (await h.change(phone, 0, commands, 'mutation-first')).json()
    expect(duplicate.duplicate).toBe(true)
    expect(duplicate.ackMutationId).toBe('mutation-first')
    expect(duplicate.ackRevision).toBe(1)
    expect(duplicate.value.revision).toBe(2)
    expect(duplicate.value.statements[0].text).toBe('나중에 고친 내용')
    const mismatch = await h.change(phone, 2, [{ ...command, text: '같은 번호에 다른 내용', audioEvidenceIds: [] }], 'mutation-first')
    expect(mismatch.status).toBe(400)
    expect((await h.current(phone)).revision).toBe(2)
  })

  test('manifest hashes, parts and real image bytes are validated before a transaction accepts media', async () => {
    const phone = await h.phone()
    expect((await h.photo(phone, 0, 'not-an-image', 'bad-image', new Uint8Array([1, 2, 3, 4]))).status).toBe(400)
    expect((await h.current(phone)).revision).toBe(0)
    const form = new FormData()
    form.set('manifest', JSON.stringify({ expectedRevision: 0, mutationId: 'bad-hash', commands: [{ type: 'statement-edit', id: 'text', text: '기록', audioEvidenceIds: [] }],
      assets: [{ id: 'asset', mime: 'image/png', bytes: PNG.length, sha256: '0'.repeat(64) }] }))
    form.set('asset:asset', new Blob([PNG], { type: 'image/png' }), 'photo.png')
    expect((await h.request(`/api/cases/${phone.session.caseId}/changes`, { method: 'POST', cookie: phone.cookie, csrf: phone.session.csrfToken, body: form })).status).toBe(400)
    form.set('unexpected', 'private')
    expect((await h.request(`/api/cases/${phone.session.caseId}/changes`, { method: 'POST', cookie: phone.cookie, csrf: phone.session.csrfToken, body: form })).status).toBe(400)
    expect((await h.current(phone)).revision).toBe(0)
  })

  test('own-copy approval preserves media and is never insurer delivery; stale preview is refused', async () => {
    const phone = await h.phone()
    expect((await h.photo(phone, 0, 'scene')).status).toBe(200)
    expect((await h.change(phone, 1, [{ type: 'statement-edit', id: 'text', text: '주변을 확인했어요.', audioEvidenceIds: [] }, { type: 'statement-confirm', id: 'text' }])).status).toBe(200)
    const current = await h.current(phone)
    const selection = { observationIds: [], statementIds: ['text'], evidenceIds: ['scene'], includeDiagram: false, includeReport: false }
    const prepared = preparePayload(current, selection)
    if (!prepared.ok) throw new Error('Expected reviewable payload')
    const response = await h.request(`/api/cases/${phone.session.caseId}/copies`, { method: 'POST', cookie: phone.cookie, csrf: phone.session.csrfToken,
      value: { expectedRevision: current.revision, mutationId: 'copy-request', id: 'copy', selection, preview: prepared.value } })
    expect(response.status).toBe(200)
    const copy: CopyResponse = await response.json()
    expect(copy.value.shares[0].status).toBe('pending')
    expect(copy.value.submissions).toEqual([])
    expect(copy.value.emergency.requests.insurance).toBe('not_sent')
    expect((await h.change(phone, copy.value.revision, [{ type: 'evidence-remove', id: 'scene' }])).status).toBe(200)
    expect((await h.request(`/api/cases/${phone.session.caseId}/assets/asset:scene`, { cookie: phone.cookie })).status).toBe(200)
    const newest = await h.current(phone)
    const stale = await h.request(`/api/cases/${phone.session.caseId}/copies`, { method: 'POST', cookie: phone.cookie, csrf: phone.session.csrfToken,
      value: { expectedRevision: newest.revision, mutationId: 'stale-copy', id: 'other-copy', selection, preview: prepared.value } })
    expect(stale.status).toBe(400)
    const retry = await h.request(`/api/cases/${phone.session.caseId}/copies`, { method: 'POST', cookie: phone.cookie, csrf: phone.session.csrfToken,
      value: { expectedRevision: current.revision, mutationId: 'copy-request', id: 'copy', selection, preview: prepared.value } })
    const duplicate: CopyResponse = await retry.json()
    expect(duplicate.duplicate).toBe(true)
    expect(duplicate.payload.evidence[0].id).toBe('scene')
    expect(duplicate.value.revision).toBe(newest.revision)
  })

  test('new risk invalidates old readiness and keeps the return stage until a new explicit confirmation', async () => {
    const phone = await h.phone()
    const ready = { type: 'safety-action', action: { id: 'record-ready', label: '기록 준비', status: 'user-confirmed', source: 'user', confirmedAt: null } } as const
    expect((await h.change(phone, 0, [ready, { type: 'navigate', stage: 'record' }, { type: 'navigate', stage: 'review' }])).status).toBe(200)
    h.now = new Date(h.now.getTime() + 1000)
    expect((await h.change(phone, 1, [{ type: 'observation', observation: { id: 'risk-new', kind: 'risk', label: '위험', value: '연기가 보여요',
      source: 'user', observedAt: null, confirmation: 'attention', legacyFactId: null, supersedes: null } }])).status).toBe(200)
    const risky = await h.current(phone)
    expect(risky.suspended).toBe(true)
    expect(risky.stage).toBe('response')
    expect(risky.returnStage).toBe('review')
    expect(risky.safetyActions.find(action => action.id === 'record-ready')?.status).toBe('unknown')
    expect((await h.change(phone, 2, [{ type: 'resume' }])).status).toBe(400)
    expect((await h.change(phone, 2, [ready, { type: 'resume' }])).status).toBe(200)
    expect((await h.current(phone)).stage).toBe('review')
  })

  test('phones cannot fabricate device facts, successful requests or SDK-confirmed safety', async () => {
    const phone = await h.phone()
    const forbidden = [
      { type: 'observation', observation: { id: 'fake', kind: 'impact', label: '충격', value: '감지', source: 'device', observedAt: null, confirmation: 'confirmed', legacyFactId: null, supersedes: null } },
      { type: 'safety-action', action: { id: 'record-ready', label: '준비', status: 'device-confirmed', source: 'device', confirmedAt: h.now.toISOString() } },
      { type: 'contact-start', now: h.now.toISOString() },
      { type: 'request-result', caseId: phone.session.caseId, agency: 'insurance', submissionId: 'fake', status: 'received', externalReceipt: null, now: h.now.toISOString() },
    ]
    for (const command of forbidden) expect((await h.request(`/api/cases/${phone.session.caseId}/changes`, { method: 'POST', cookie: phone.cookie,
      csrf: phone.session.csrfToken, value: { expectedRevision: 0, mutationId: 'forbidden', commands: [command] } })).status).toBe(400)
    expect((await h.current(phone)).revision).toBe(0)
  })

  test('SDK false and unavailable never clear risk; native errors return projection only and help never makes a call', async () => {
    const phone = await h.phone()
    const base = `/api/cases/${phone.session.caseId}`
    const native = { method: 'POST', bearer: phone.vehicle.vehicleCredential }
    expect((await h.request(`${base}/vehicle-actions`, { ...native, value: { expectedRevision: 0, mutationId: 'risk', actionId: 'report-risk' } })).status).toBe(200)
    const reading = { signal: 'seat-airbag-deployed', seatId: 'driver', sdkVersion: '2.3.2', observedAt: h.now.toISOString(), kind: 'reading', value: false, source: 'pleos-sdk' }
    const response = await h.request(`${base}/vehicle-facts`, { ...native, value: { expectedRevision: 1, mutationId: 'airbag-false', fact: reading } })
    const progress: VehicleProgress = await response.json()
    expect(progress.riskCheckRequired).toBe(true)
    expect(progress.suspended).toBe(true)
    const unavailable = { signal: 'seat-airbag-deployed', seatId: 'driver', sdkVersion: '2.3.2', observedAt: h.now.toISOString(), kind: 'unavailable', cause: 'permission-denied' }
    const missingSignal = await h.request(`${base}/vehicle-facts`, { ...native, value: { expectedRevision: 2, mutationId: 'airbag-unavailable', fact: unavailable } })
    expect(missingSignal.status).toBe(200)
    expect((await missingSignal.json()).riskCheckRequired).toBe(true)
    const stale = await h.request(`${base}/vehicle-actions`, { ...native, value: { expectedRevision: 0, mutationId: 'help-stale', actionId: 'need-help' } })
    const error = await stale.json()
    expect(stale.status).toBe(409)
    expect(error).not.toHaveProperty('value')
    expect(error.progress.caseId).toBe(phone.session.caseId)
    expect((await h.request(`${base}/vehicle-actions`, { ...native, value: { expectedRevision: 3, mutationId: 'help', actionId: 'need-help' } })).status).toBe(200)
    const value = await h.current(phone)
    expect(value.submissions).toEqual([])
    expect(value.emergency.requests.rescue).toBe('not_sent')
  })
})
