import { describe, expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { JourneyCaseSync } from '../src/journey/case-sync'
import type { CaseBatch, CaseChangeBatch, CaseData, CaseWriteResult } from '../src/journey/case-data'
import { createProductOutbox, type ProductOutbox, type ProductOutboxOptions } from '../src/product/product-outbox'
import { createProductCase } from '../src/product/product-case'
import { preparePayload, reduceCase, type CaseCommand, type JourneyCase } from '../src/journey/case'

const now = '2026-11-14T01:00:00.000Z'
const caseId = 'case-sync'
type WriteHandler = (batch: CaseBatch) => Promise<CaseWriteResult>
type Harness = { data: CaseData; outbox: ProductOutbox; options: ProductOutboxOptions; server: { head: JourneyCase }; calls: CaseBatch[]; setHandler: (handler: WriteHandler) => void }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
function harness(config: ProductOutboxOptions = { origin: 'https://accident.example', clientId: 'phone-one', draftId: 'tab-one', indexedDB: new IDBFactory() }, initial?: JourneyCase): Harness {
  const outbox = createProductOutbox(config)
  const server = { head: initial ?? { ...createProductCase(caseId, now), revision: 1 } }
  const calls: CaseBatch[] = []
  let handler: WriteHandler = async () => { throw new Error('Unexpected server write') }
  const write: WriteHandler = async batch => { calls.push(batch); return handler(batch) }
  const data: CaseData = { ...outbox, mode: 'remote', load: async () => ({ kind: 'found', value: structuredClone(server.head) }),
    apply: write, approveCopy: write, readAsset: async () => { throw new Error('Unexpected media read') } }
  return { data, outbox, options: config, server, calls, setHandler: next => { handler = next } }
}
function ack(batch: CaseBatch, value: JourneyCase, ackRevision = value.revision): CaseWriteResult {
  return { ok: true, value, ackMutationId: batch.mutationId, ackRevision }
}
function apply(head: JourneyCase, batch: CaseBatch): JourneyCase {
  if (batch.kind !== 'changes') throw new Error('Expected a command batch')
  return { ...batch.commands.reduce(reduceCase, head), revision: head.revision + 1 }
}
const statement = (text: string): CaseCommand => ({ type: 'statement-edit', id: 'statement-one', text, audioEvidenceIds: [] })
const risk = (): CaseCommand => ({ type: 'observation', observation: { id: 'new-risk', kind: 'risk', label: '새 위험', value: '안전 확인 필요', source: 'user',
  observedAt: now, confirmation: 'attention', legacyFactId: null, supersedes: null } })

describe('provider-backed case synchronization', () => {
  test('an old ACK preserves new risk input and removes only the exact durable batch', async () => {
    const h = harness()
    const enteredFirst = deferred<CaseBatch>(), enteredSecond = deferred<CaseBatch>()
    const first = deferred<CaseWriteResult>(), second = deferred<CaseWriteResult>()
    h.setHandler(async batch => {
      const durable = await createProductOutbox(h.options).readBatches(caseId)
      expect(durable.some(record => record.batch.mutationId === batch.mutationId)).toBe(true)
      if (h.calls.length === 1) { enteredFirst.resolve(batch); return first.promise }
      enteredSecond.resolve(batch); return second.promise
    })
    const sync = new JourneyCaseSync(h.data)
    await sync.open(caseId)
    await h.outbox.writeEditorDraft(caseId, { kind: 'voice', text: '아직 저장 버튼을 누르지 않은 입력', clips: [] })
    const savingFirst = sync.save(statement('먼저 남긴 내용'))
    const batchFirst = await enteredFirst.promise
    const savingRisk = sync.save(risk())
    expect(await h.outbox.readBatches(caseId)).toHaveLength(2)
    const committedFirst = apply(h.server.head, batchFirst)
    first.resolve(ack(batchFirst, committedFirst))
    expect((await savingFirst).ok).toBe(true)
    const batchSecond = await enteredSecond.promise
    expect(sync.getSnapshot().value?.observations.some(item => item.id === 'new-risk')).toBe(true)
    expect(sync.getSnapshot().value?.suspended).toBe(true)
    expect((await h.outbox.readBatches(caseId)).map(record => record.batch.mutationId)).toEqual([batchSecond.mutationId])
    expect(await h.outbox.readEditorDraft(caseId, 'voice')).toMatchObject({ text: '아직 저장 버튼을 누르지 않은 입력' })
    const committedSecond = apply(committedFirst, batchSecond)
    second.resolve(ack(batchSecond, committedSecond))
    expect((await savingRisk).ok).toBe(true)
    expect(sync.getSnapshot().value?.statements[0]?.text).toBe('먼저 남긴 내용')
    expect(sync.getSnapshot().value?.suspended).toBe(true)
    expect(sync.getSnapshot().saveState).toBe('saved')
    expect(await createProductOutbox(h.options).readBatches(caseId)).toEqual([])
  })

  test('a newer canonical head plus an exact older ACK preserves pending content and requires reconfirmation', async () => {
    const h = harness()
    const entered = deferred<CaseBatch>(), response = deferred<CaseWriteResult>()
    h.setHandler(batch => { entered.resolve(batch); return response.promise })
    const sync = new JourneyCaseSync(h.data)
    await sync.open(caseId)
    const first = sync.save(statement('직접 확인할 사고 내용'))
    const batch = await entered.promise
    const confirmation = sync.save({ type: 'statement-confirm', id: 'statement-one' })
    const accepted = apply(h.server.head, batch)
    const latest = { ...reduceCase(accepted, risk()), revision: 3 }
    response.resolve(ack(batch, latest, 2))
    expect(await first).toMatchObject({ ok: false, reason: 'conflict' })
    expect(await confirmation).toMatchObject({ ok: false, reason: 'conflict' })
    expect(h.calls).toHaveLength(1)
    const value = sync.getSnapshot().value
    expect(value?.revision).toBe(3)
    expect(value?.suspended).toBe(true)
    expect(value?.statements[0]?.text).toBe('직접 확인할 사고 내용')
    expect(value?.statements[0]?.confirmedRevision).toBeNull()
    const pending = await createProductOutbox(h.options).readBatches(caseId)
    expect(pending).toHaveLength(1)
    expect(pending[0]?.status).toBe('conflict')
    expect(pending[0]?.batch.base?.statements[0]?.confirmedRevision).toBeNull()
    expect(pending[0]?.batch.local.statements[0]?.confirmedRevision).toBe(1)
    expect(pending[0]?.latest?.revision).toBe(3)
  })

  test('a mismatched ACK never erases the mutation or its input', async () => {
    const h = harness()
    h.setHandler(async batch => ({ ok: true, value: apply(h.server.head, batch), ackMutationId: 'wrong-operation', ackRevision: 2 }))
    const sync = new JourneyCaseSync(h.data)
    await sync.open(caseId)
    expect(await sync.save(statement('ACK가 달라도 남는 내용'))).toMatchObject({ ok: false, reason: 'unavailable' })
    expect(sync.getSnapshot().value?.statements[0]?.text).toBe('ACK가 달라도 남는 내용')
    const pending = await createProductOutbox(h.options).readBatches(caseId)
    expect(pending).toHaveLength(1)
    expect(pending[0]?.batch.mutationId).toBe(h.calls[0]?.mutationId)
  })

  test('reload retries a committed-but-unacknowledged operation with its original identity before CAS', async () => {
    const h = harness()
    h.setHandler(async batch => { h.server.head = apply(h.server.head, batch); return { ok: false, reason: 'unavailable' } })
    const sync = new JourneyCaseSync(h.data)
    await sync.open(caseId)
    expect(await sync.save(statement('응답을 받지 못한 입력'))).toMatchObject({ ok: false, reason: 'unavailable' })
    const original = h.calls[0]!
    const latest = { ...reduceCase(h.server.head, risk()), revision: 3 }
    const reconnected = harness(h.options, latest)
    const retried = deferred<CaseBatch>(), response = deferred<CaseWriteResult>()
    reconnected.setHandler(batch => { retried.resolve(batch); return response.promise })
    const afterReload = new JourneyCaseSync(reconnected.data)
    await afterReload.open(caseId)
    const retry = await retried.promise
    expect(retry.mutationId).toBe(original.mutationId)
    expect(retry.expectedRevision).toBe(original.expectedRevision)
    expect(retry.kind === 'changes' && retry.commands).toEqual(original.kind === 'changes' && original.commands)
    response.resolve(ack(retry, latest, 2))
    expect(await afterReload.flush()).toMatchObject({ ok: true })
    expect(afterReload.getSnapshot().value?.suspended).toBe(true)
    expect(afterReload.getSnapshot().value?.statements[0]?.text).toBe('응답을 받지 못한 입력')
    expect(await createProductOutbox(h.options).readBatches(caseId)).toEqual([])
  })

  test('copy conflict retains the approved snapshot but never replays it after user resolution', async () => {
    const h = harness()
    h.server.head = reduceCase(h.server.head, { type: 'observation', observation: { id: 'user-fact', kind: 'statement', label: '사고 내용', value: '정차 중 충격', source: 'user',
      observedAt: now, confirmation: 'confirmed', legacyFactId: null, supersedes: null } })
    const latest = { ...reduceCase(h.server.head, risk()), revision: 2 }
    h.setHandler(async () => ({ ok: false, reason: 'conflict', latest }))
    const sync = new JourneyCaseSync(h.data)
    await sync.open(caseId)
    const selection = { observationIds: ['user-fact'], statementIds: [], evidenceIds: [], includeDiagram: false, includeReport: false }
    const preview = preparePayload(h.server.head, selection)
    if (!preview.ok) throw new Error('Expected reviewed payload')
    expect(await sync.approveCopy({ kind: 'share', id: 'copy-one', recipient: '내 사본', now, selection }, preview.value)).toMatchObject({ ok: false, reason: 'conflict' })
    expect(h.calls[0]?.kind).toBe('copy')
    expect(sync.getSnapshot().value?.shares).toEqual([])
    const retained = await h.outbox.readBatches(caseId)
    expect(retained[0]?.batch.local.shares[0]?.status).toBe('pending')
    h.server.head = latest
    await sync.reload()
    expect(sync.getSnapshot().recoveries).toHaveLength(1)
    expect(await sync.flush()).toMatchObject({ ok: true })
    const reopened = new JourneyCaseSync(h.data)
    await reopened.open(caseId)
    expect(reopened.getSnapshot().recoveries).toHaveLength(1)
    expect(h.calls).toHaveLength(1)
    expect(reopened.getSnapshot().value?.shares).toEqual([])
    expect(await reopened.approveCopy({ kind: 'submission', agency: 'insurance', id: 'submission-no', recipient: '보험사', now, selection }, preview.value)).toEqual({ ok: false, reason: 'unreviewed-content' })
    expect(h.calls).toHaveLength(1)
  })

  test('background risk refresh preserves in-flight editor content without clearing dirty input', async () => {
    const h = harness()
    const entered = deferred<CaseBatch>(), response = deferred<CaseWriteResult>()
    h.setHandler(batch => { entered.resolve(batch); return response.promise })
    const sync = new JourneyCaseSync(h.data)
    await sync.open(caseId)
    const saving = sync.save(statement('저장 중에도 남아야 하는 입력'))
    await entered.promise
    h.server.head = { ...reduceCase(h.server.head, risk()), revision: 2 }
    await sync.refresh()
    expect(sync.getSnapshot().value?.suspended).toBe(true)
    expect(sync.getSnapshot().value?.statements[0]?.text).toBe('저장 중에도 남아야 하는 입력')
    expect(sync.getSnapshot().reloadVersion).toBe(0)
    response.resolve({ ok: false, reason: 'conflict', latest: h.server.head })
    expect(await saving).toMatchObject({ ok: false, reason: 'conflict' })
  })

  test('access-required and unavailable are not mistaken for a missing or new case', async () => {
    const h = harness()
    h.data.load = async () => ({ kind: 'access-required' })
    const sync = new JourneyCaseSync(h.data)
    await sync.open(caseId)
    expect(sync.getSnapshot()).toMatchObject({ value: null, missing: false, loading: false, saveState: 'access-required' })
    h.data.load = async () => ({ kind: 'unavailable' })
    await sync.open(caseId)
    expect(sync.getSnapshot()).toMatchObject({ value: null, missing: false, saveState: 'unavailable' })
    expect(h.calls).toEqual([])
  })

  test('local durability failure keeps memory and does not issue an unrecorded network mutation', async () => {
    const h = harness()
    h.data.stageBatch = async () => ({ durable: false, reason: 'quota' })
    const sync = new JourneyCaseSync(h.data)
    await sync.open(caseId)
    expect(await sync.save(statement('메모리에는 남아 있는 내용'))).toMatchObject({ ok: false, reason: 'quota' })
    expect(h.calls).toEqual([])
    expect(sync.getSnapshot()).toMatchObject({ durable: false, saveState: 'quota' })
    expect(sync.getSnapshot().value?.statements[0]?.text).toBe('메모리에는 남아 있는 내용')
  })
})
