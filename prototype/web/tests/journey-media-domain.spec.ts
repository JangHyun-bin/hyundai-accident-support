import { test, expect } from '@playwright/test'
import { createSession } from '../src/emergency/session'
import { createCase, reduceCase, validateCase, type Diagram, type Evidence } from '../src/journey/case'

const now = '2026-11-10T09:12:00.000Z'
const fresh = () => createCase(createSession('SC01', 'connected'), 'media-case', now)
const photo = (id = 'photo-1', assetId = 'asset-1', revision = 1): Evidence => ({
  id, label: '현장 전체', kind: 'photo', revision, origin: 'user', assetId, availability: 'available', captureTarget: 'scene',
  metadata: { mime: 'image/png', bytes: 3, duration: null, capturedAt: now, sourceLabel: '직접 선택' },
})
const audio = (): Evidence => ({ ...photo('audio-1', 'audio-asset'), kind: 'audio', captureTarget: null,
  metadata: { mime: 'audio/webm', bytes: 3, duration: 2, capturedAt: now, sourceLabel: '직접 녹음' } })
const diagram = (): Diagram => ({ revision: 1, origin: 'fixture', road: 'straight', confirmedRevision: null, contact: null,
  vehicles: [{ id: 'own', position: { x: .4, y: .6 }, heading: 0 }, { id: 'other', position: { x: .6, y: .4 }, heading: 0 }] })

test('replacing photo evidence preserves the old revision and rejects stale or reused assets', () => {
  let value = reduceCase(fresh(), { type: 'evidence-put', evidence: photo() })
  expect(value.evidence).toEqual([photo()])
  expect(value.contentRevision).toBe(1)
  value = reduceCase(value, { type: 'evidence-put', evidence: photo('photo-1', 'asset-2', 2) })
  expect(value.evidence[0].assetId).toBe('asset-2')
  expect(value.evidenceHistory).toEqual([photo()])
  expect(reduceCase(value, { type: 'evidence-put', evidence: photo('photo-1', 'stale', 2) })).toBe(value)
  expect(reduceCase(value, { type: 'evidence-put', evidence: photo('photo-1', 'asset-1', 3) })).toBe(value)
  expect(reduceCase(value, { type: 'evidence-put', evidence: photo('photo-2', 'asset-2') })).toBe(value)
})

test('photo limits reject the new item and keep all accepted evidence', () => {
  let value = fresh()
  for (let i = 0; i < 12; i++) value = reduceCase(value, { type: 'evidence-put', evidence: photo('photo-' + i, 'asset-' + i) })
  expect(value.evidence).toHaveLength(12)
  expect(reduceCase(value, { type: 'evidence-put', evidence: photo('photo-13', 'asset-13') })).toBe(value)
  const oversized = photo('photo-0', 'large', 2)
  oversized.metadata.bytes = 15 * 1024 * 1024 + 1
  expect(reduceCase(value, { type: 'evidence-put', evidence: oversized })).toBe(value)
  const skipped: Evidence = { ...photo('skipped-target', ''), assetId: null, availability: 'skipped',
    metadata: { mime: '', bytes: 0, duration: null, capturedAt: null, sourceLabel: '사용자 생략' } }
  const withSkipped = reduceCase(value, { type: 'evidence-put', evidence: skipped })
  expect(withSkipped.evidence).toHaveLength(13)
  expect(validateCase(withSkipped)).toBe(true)
})

test('voice save confirms only actual entered text and atomically rejects invalid audio', () => {
  let value = reduceCase(fresh(), { type: 'voice-save', evidence: [audio()],
    statement: { id: 'statement', text: '충격을 느꼈어요.', audioEvidenceIds: ['audio-1'] } })
  expect(value.evidence).toHaveLength(1)
  expect(value.statements[0]).toMatchObject({ text: '충격을 느꼈어요.', revision: 1, confirmedRevision: 1 })
  expect(validateCase(value)).toBe(true)
  const before = value
  value = reduceCase(value, { type: 'voice-save', evidence: [{ ...audio(), id: 'audio-2', assetId: 'audio-2', metadata: { ...audio().metadata, duration: 121 } }],
    statement: { id: 'statement', text: '기존 내용을 덮으면 안 됨', audioEvidenceIds: ['audio-2'] } })
  expect(value).toBe(before)
  const audioOnly = reduceCase(fresh(), { type: 'voice-save', evidence: [audio()], statement: null })
  expect(audioOnly.evidence).toHaveLength(1)
  expect(audioOnly.statements).toEqual([])
  const cleared = reduceCase(before, { type: 'voice-save', evidence: [], statement: { id: 'statement', text: '', audioEvidenceIds: ['audio-1'] } })
  expect(cleared.statements[0]).toMatchObject({ text: '', confirmedRevision: null })
  expect(reduceCase(before, { type: 'voice-save', evidence: [audio()],
    statement: { id: 'statement', text: '충격을 느꼈어요.', audioEvidenceIds: ['audio-1'] } })).toBe(before)
})

test('clip event time cannot name a point outside the actual duration', () => {
  const clip: Evidence = { ...photo('front', 'front'), kind: 'video', captureTarget: null,
    metadata: { mime: 'video/mp4', bytes: 3, duration: 20, eventTime: 11, capturedAt: null, sourceLabel: '합성 전방 영상' } }
  const value = reduceCase(fresh(), { type: 'evidence-put', evidence: clip })
  expect(value.evidence[0].metadata.eventTime).toBe(11)
  const invalid = { ...clip, id: 'rear', assetId: 'rear', metadata: { ...clip.metadata, eventTime: 21 } }
  expect(reduceCase(value, { type: 'evidence-put', evidence: invalid })).toBe(value)
})

test('removing recorded audio preserves text and archived evidence but clears its confirmation', () => {
  let value = reduceCase(fresh(), { type: 'voice-save', evidence: [audio()],
    statement: { id: 's', text: '내가 기억한 내용', audioEvidenceIds: ['audio-1'] } })
  value = reduceCase(value, { type: 'evidence-remove', id: 'audio-1' })
  expect(value.evidence).toEqual([])
  expect(value.evidenceHistory).toEqual([audio()])
  expect(value.statements[0]).toMatchObject({ text: '내가 기억한 내용', audioEvidenceIds: [], revision: 2, confirmedRevision: null })
  expect(value.statementHistory[0].audioEvidenceIds).toEqual(['audio-1'])
  expect(validateCase(value)).toBe(true)
})

test('diagram corrections retain the original and invalidate confirmation', () => {
  let value = reduceCase(fresh(), { type: 'diagram-edit', diagram: diagram() })
  expect(value.diagram).toEqual(diagram())
  value = reduceCase(value, { type: 'diagram-confirm' })
  expect(value.diagram?.confirmedRevision).toBe(1)
  value = reduceCase(value, { type: 'diagram-edit', diagram: { ...value.diagram!, origin: 'user', contact: { x: .5, y: .5 } } })
  expect(value.diagram).toMatchObject({ revision: 2, confirmedRevision: null, contact: { x: .5, y: .5 } })
  expect(value.diagramHistory[0]).toMatchObject({ origin: 'fixture', confirmedRevision: 1, contact: null })
  expect(reduceCase(value, { type: 'diagram-edit', diagram: { ...value.diagram!, contact: { x: 2, y: 0 } } })).toBe(value)
  const unsupported = reduceCase(fresh(), { type: 'diagram-edit', diagram: { ...diagram(), road: 'unsupported', vehicles: [] } })
  expect(reduceCase(unsupported, { type: 'diagram-confirm' })).toBe(unsupported)
})
