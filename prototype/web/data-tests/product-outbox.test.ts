import { describe, expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createProductOutbox, type ProductOutboxOptions } from '../src/product/product-outbox'
import { createProductCase } from '../src/product/product-case'
import { reduceCase, type Evidence } from '../src/journey/case'
import type { CaseChangeBatch } from '../src/journey/case-data'

const now = '2026-11-14T01:00:00.000Z'
const caseId = 'case-outbox'
function options(): ProductOutboxOptions {
  return { origin: 'https://accident.example', clientId: 'phone-one', draftId: 'tab-one', indexedDB: new IDBFactory() }
}
function textBatch(mutationId: string, text: string, revision = 1): CaseChangeBatch {
  const base = { ...createProductCase(caseId, now), revision }
  const command = { type: 'statement-edit', id: 'statement-one', text, audioEvidenceIds: [] } as const
  return { kind: 'changes', mutationId, expectedRevision: revision, base, local: reduceCase(base, { ...command, audioEvidenceIds: [] }),
    commands: [{ ...command, audioEvidenceIds: [] }], assets: [], createdAt: now }
}
function audioBatch(bytes: string): CaseChangeBatch {
  const base = { ...createProductCase(caseId, now), revision: 1 }
  const blob = new Blob([bytes], { type: 'audio/wav' })
  const evidence: Evidence = { id: 'audio-one', label: '직접 남긴 음성', kind: 'audio', revision: 1, origin: 'user', assetId: 'asset-one', availability: 'available', captureTarget: null,
    metadata: { mime: blob.type, bytes: blob.size, duration: 1, capturedAt: now, sourceLabel: '직접 녹음' } }
  const command = { type: 'voice-save' as const, evidence: [evidence], statement: { id: 'statement-one', text: '정차 중 충격을 느꼈어요.', audioEvidenceIds: [evidence.id] } }
  return { kind: 'changes', mutationId: 'mutation-audio', expectedRevision: 1, base, local: reduceCase(base, command), commands: [command],
    assets: [{ id: 'asset-one', caseId, blob }], createdAt: now }
}

describe('durable product outbox', () => {
  test('reload retains the immutable operation identity, commands, base, local and media bytes', async () => {
    const config = options()
    const batch = audioBatch('original-audio-bytes')
    const first = createProductOutbox(config)
    expect(await first.stageBatch(batch)).toEqual({ durable: true })
    const second = createProductOutbox(config)
    const records = await second.readBatches(caseId)
    expect(records).toHaveLength(1)
    expect(records[0]?.batch.mutationId).toBe('mutation-audio')
    expect(records[0]?.batch.expectedRevision).toBe(1)
    expect(records[0]?.batch.base?.statements).toEqual([])
    expect(records[0]?.batch.local.statements[0]?.text).toBe('정차 중 충격을 느꼈어요.')
    expect(await records[0]?.batch.assets[0]?.blob.text()).toBe('original-audio-bytes')
    expect(await second.stageBatch(batch)).toEqual({ durable: true })
    expect(await second.stageBatch(audioBatch('changed--audio-bytes'))).toEqual({ durable: false, reason: 'invalid' })
    expect(await (await createProductOutbox(config).readBatches(caseId))[0]?.batch.assets[0]?.blob.text()).toBe('original-audio-bytes')
  })

  test('an exact ACK removes only its batch and never submitted or unsubmitted newer text', async () => {
    const config = options()
    const store = createProductOutbox(config)
    await store.stageBatch(textBatch('mutation-old', '먼저 남긴 내용'))
    await store.stageBatch(textBatch('mutation-new', '나중에 남긴 내용', 2))
    const draft = await store.writeEditorDraft(caseId, { kind: 'voice', text: '아직 제출하지 않은 입력', clips: [] })
    await store.acknowledgeBatch(caseId, 'not-the-ack')
    expect(await store.readBatches(caseId)).toHaveLength(2)
    await store.acknowledgeBatch(caseId, 'mutation-old')
    const reloaded = createProductOutbox(config)
    expect((await reloaded.readBatches(caseId)).map(record => record.batch.mutationId)).toEqual(['mutation-new'])
    expect(await reloaded.readEditorDraft(caseId, 'voice')).toMatchObject({ version: draft.version, text: '아직 제출하지 않은 입력' })
  })

  test('a stale archive racing the exact ACK cannot resurrect a committed batch', async () => {
    const config = options()
    const store = createProductOutbox(config)
    await store.stageBatch(textBatch('mutation-committed', '서버에 보관한 내용'))
    const ack = store.acknowledgeBatch(caseId, 'mutation-committed')
    const staleArchive = store.markBatch(caseId, 'mutation-committed', 'recovery', createProductCase(caseId, now))
    await Promise.all([ack, staleArchive])
    expect(await createProductOutbox(config).readBatches(caseId)).toEqual([])
  })

  test('clearing an acknowledged editor version does not erase input written meanwhile', async () => {
    const config = options()
    const store = createProductOutbox(config)
    const old = await store.writeEditorDraft(caseId, { kind: 'voice', text: '확인한 입력', clips: [] })
    const clear = store.clearEditorDraft(caseId, 'voice', old.version)
    const newer = store.writeEditorDraft(caseId, { kind: 'voice', text: '저장 중 새로 쓴 입력', clips: [] })
    await Promise.all([clear, newer])
    expect(await createProductOutbox(config).readEditorDraft(caseId, 'voice')).toMatchObject({ text: '저장 중 새로 쓴 입력' })
  })

  test('media and report and scope editor drafts survive refresh separately from commands', async () => {
    const config = options()
    const store = createProductOutbox(config)
    const audio = audioBatch('voice-draft-bytes')
    const clip = audio.local.evidence[0]!
    await store.writeEditorDraft(caseId, { kind: 'voice', text: '녹음과 함께 고친 내용', clips: [{ evidence: clip, blob: audio.assets[0]!.blob }] })
    await store.writeEditorDraft(caseId, { kind: 'report', id: 'paragraph-one', text: '확인 중인 경위서 문장', references: [], isNew: true })
    const empty = { recipient: '', selection: { observationIds: [], statementIds: [], evidenceIds: [], includeDiagram: false, includeReport: false } }
    await store.writeEditorDraft(caseId, { kind: 'scope', target: 'share', drafts: { insurance: empty, vehicle: empty,
      share: { recipient: '내 사본', selection: { ...empty.selection, statementIds: ['statement-one'] } } } })
    const reloaded = createProductOutbox(config)
    const voice = await reloaded.readEditorDraft(caseId, 'voice')
    expect(voice?.text).toBe('녹음과 함께 고친 내용')
    expect(await voice?.clips[0]?.blob.text()).toBe('voice-draft-bytes')
    expect(await reloaded.readEditorDraft(caseId, 'report')).toMatchObject({ text: '확인 중인 경위서 문장', isNew: true })
    expect((await reloaded.readEditorDraft(caseId, 'scope'))?.drafts.share.selection.statementIds).toEqual(['statement-one'])
    expect(await reloaded.readBatches(caseId)).toEqual([])
  })

  test('a replacement grant recovers editors and exposes old actor operations only as recovery', async () => {
    const config = options()
    const previous = createProductOutbox(config)
    await previous.writeEditorDraft(caseId, { kind: 'voice', text: '다시 연결하기 전 입력', clips: [] })
    await previous.stageBatch(textBatch('previous-actor-mutation', '서버에 아직 보내지 못한 내용'))
    const replacement = createProductOutbox({ ...config, clientId: 'phone-repaired' })
    expect(await replacement.readEditorDraft(caseId, 'voice')).toMatchObject({ text: '다시 연결하기 전 입력' })
    expect((await replacement.readBatches(caseId)).map(record => record.status)).toEqual(['recovery'])
    await replacement.clearEditorDraft(caseId, 'voice')
    expect(await createProductOutbox({ ...config, clientId: 'phone-repaired' }).readEditorDraft(caseId, 'voice')).toBeNull()
    expect(await createProductOutbox({ ...config, draftId: 'another-tab' }).readEditorDraft(caseId, 'voice')).toBeNull()
    expect(await createProductOutbox({ ...config, origin: 'https://other.example' }).readBatches(caseId)).toEqual([])
    expect(await createProductOutbox(config).readEditorDraft('another-case', 'voice')).toBeNull()
  })

  test('quota failure retains memory and reports that the editor is not durable', async () => {
    const config = options()
    const factory = config.indexedDB!
    const originalOpen = factory.open.bind(factory)
    Object.defineProperty(factory, 'open', { configurable: true, value: () => { throw new DOMException('Full', 'QuotaExceededError') } })
    const store = createProductOutbox(config)
    expect(await store.writeEditorDraft(caseId, { kind: 'voice', text: '공간 부족 중 입력', clips: [] })).toMatchObject({ durable: false, reason: 'quota' })
    expect(await store.readEditorDraft(caseId, 'voice')).toMatchObject({ text: '공간 부족 중 입력' })
    Object.defineProperty(factory, 'open', { configurable: true, value: originalOpen })
    expect(await store.writeEditorDraft(caseId, { kind: 'voice', text: '공간 부족 중 입력', clips: [] })).toMatchObject({ durable: true })
    expect(await createProductOutbox(config).readEditorDraft(caseId, 'voice')).toMatchObject({ text: '공간 부족 중 입력' })
  })
})
