import { test, expect } from '@playwright/test'
import { createSession } from '../src/emergency/session'
import fixtures from '../../../specs/emergency-experience/journey-fixtures.json' with { type: 'json' }
import { createCase, reduceCase, validateCase, canSubmit, type CaseCommand, type JourneyCase } from '../src/journey/case'

const now = '2026-11-10T09:12:00.000Z'
const fresh = (scenario = 'SC01', scene?: string) => createCase(createSession(scenario, scene), 'case-test', now)
const act = (value: JourneyCase, command: CaseCommand) => reduceCase(value, command)

test('authored journey fixtures preserve their selected scenario and scene when loaded', () => {
  for (const fixture of fixtures.cases) {
    const value = createCase(createSession(fixture.scenarioId, fixture.sceneId), fixture.id, fixtures.createdAt)
    expect(value.emergency.scenarioId).toBe(fixture.scenarioId)
    expect(value.emergency.sceneId).toBe(fixture.sceneId)
    expect(validateCase(value)).toBe(true)
  }
})

test('import preserves legacy approvals and text without inventing media or an AI account', () => {
  const session = createSession('SC04')
  session.requests.insurance = 'declined'
  session.approvedRecord = '이전에 승인한 내용'
  const before = structuredClone(session)
  const value = createCase(session, 'imported-case', now)
  expect(value.emergency).toEqual(before)
  expect(value.statements[0].text).toBe('정차 중 충격을 느꼈어요. 정확한 사고 경위는 확인 중이에요.')
  expect(value.evidence).toEqual([])
  expect(value.diagram).toBeNull()
  expect(value.report).toBeNull()
  expect(value.activeSubmissionIds.insurance).toBeNull()
  value.emergency.approvedRecord = '새 값'
  expect(session).toEqual(before)
})

test('SC05 import gives each existing agency an identity without fabricating the old payload', () => {
  const value = fresh('SC05')
  expect(value.activeSubmissionIds.rescue).not.toBe(value.activeSubmissionIds.vehicle)
  expect(value.activeSubmissionIds.rescue).not.toBeNull()
  expect(value.activeSubmissionIds.vehicle).not.toBeNull()
  expect(value.submissions.map(s => s.kind)).toEqual(['imported', 'imported'])
  expect(value.submissions.every(s => s.payload === null && s.approvedAt === null)).toBe(true)
  expect(value.emergency.submissions).toBe(1)
  expect(canSubmit(value, 'rescue')).toBe(false)
  expect(canSubmit(value, 'vehicle')).toBe(false)
  expect(value.activeSubmissionIds.insurance).toBeNull()
})

test('unknown commands and oversized statements leave the original case untouched', () => {
  const value = fresh()
  expect(act(value, JSON.parse('{"type":"invent-success"}'))).toBe(value)
  const invalid = act(value, { type: 'statement-edit', id: 's1', text: '가'.repeat(5001), audioEvidenceIds: [] })
  expect(invalid).toBe(value)
  const valid = act(value, { type: 'statement-edit', id: 's1', text: '가'.repeat(5000), audioEvidenceIds: [] })
  expect(valid.statements[0].text.length).toBe(5000)
  expect(valid.emergency.savedRecord).toBe('')
})

test('statement confirmation is tied to the exact content revision', () => {
  let value = act(fresh(), { type: 'statement-edit', id: 's1', text: '충격을 느꼈어요.', audioEvidenceIds: [] })
  value = act(value, { type: 'statement-confirm', id: 's1' })
  expect(value.statements[0].confirmedRevision).toBe(1)
  value = act(value, { type: 'statement-edit', id: 's1', text: '오른쪽에서 충격을 느꼈어요.', audioEvidenceIds: [] })
  expect(value.statements[0].revision).toBe(2)
  expect(value.statements[0].confirmedRevision).toBeNull()
  expect(value.statementHistory[0].text).toBe('충격을 느꼈어요.')
  expect(value.revision).toBe(0)
})

test('malformed persisted data and nonexistent audio references fail validation', () => {
  const value = fresh()
  expect(validateCase(value)).toBe(true)
  expect(validateCase({ ...value, stage: 'finished-everything' })).toBe(false)
  expect(validateCase({ ...value, revision: -1 })).toBe(false)
  expect(validateCase({ ...value, activeSubmissionIds: { rescue: 'missing', vehicle: null, insurance: null } })).toBe(false)
  expect(act(value, { type: 'statement-edit', id: 's1', text: '진술', audioEvidenceIds: ['missing'] })).toBe(value)
})

test('review and record stages preserve the original emergency scenario and agency requests', () => {
  const value = fresh('SC01', 'connected')
  const next = act(value, { type: 'navigate', stage: 'review' })
  expect(next.emergency.scenarioId).toBe('SC01')
  expect(next.emergency.requests.rescue).toBe('connected')
  expect(next.stage).toBe('review')
  const record = act(value, { type: 'emergency-edge', edgeId: 'record', now })
  expect(record.stage).toBe('record')
  expect(record.emergency.sceneId).toBe('connected')
  expect(record.emergency.requests).toEqual(value.emergency.requests)
})

test('contact attempts are independent of payload approval and late results target their own attempt', () => {
  const initial = fresh()
  const connected = act(initial, { type: 'emergency-edge', edgeId: 'connect', now })
  const first = connected.activeSubmissionIds.rescue!
  expect(connected.submissions[0].kind).toBe('contact')
  expect(connected.submissions[0].payload).toBeNull()
  expect(connected.emergency.requests.vehicle).toBe('not_sent')
  expect(connected.emergency.requests.insurance).toBe('not_sent')
  let failed = act(connected, { type: 'request-result', caseId: initial.id, agency: 'rescue', submissionId: first, status: 'failed', now, externalReceipt: null })
  const retry = act(failed, { type: 'contact-start', now })
  expect(retry.activeSubmissionIds.rescue).not.toBe(first)
  const late = act(retry, { type: 'request-result', caseId: initial.id, agency: 'rescue', submissionId: first, status: 'received', now, externalReceipt: null })
  expect(late.emergency.requests.rescue).toBe('connection_unknown')
  expect(late.submissions.find(s => s.id === first)!.status).toBe('received')
})

test('countdown only accepts its own cancel or expire target and cannot auto-request other agencies', () => {
  const value = fresh('SC03')
  expect(act(value, { type: 'countdown', target: 'received', now })).toBe(value)
  const next = act(value, { type: 'countdown', target: 'unanswered', now })
  expect(next.emergency.sceneId).toBe('unanswered')
  expect(next.emergency.requests.rescue).toBe('connection_unknown')
  expect(next.activeSubmissionIds.rescue).not.toBeNull()
  expect(next.activeSubmissionIds.vehicle).toBeNull()
})

test('contradictory observations stay visible and project uncertainty into the summary', () => {
  const value = fresh('SC02')
  const next = act(value, { type: 'observation', observation: {
    id: 'user-mobility', kind: 'mobility', label: '차량 이동', value: '이동할 수 있어요', source: 'user',
    observedAt: now, confirmation: 'confirmed', legacyFactId: 'mobility', supersedes: null,
  } })
  expect(next.observations.filter(o => o.legacyFactId === 'mobility')).toHaveLength(2)
  expect(next.emergency.facts.mobility.value).toBe('정보 확인 필요')
  expect(next.emergency.facts.mobility.status).toBe('unknown')
})

test('agency results work outside the emergency cursor and cannot regress a confirmed receipt', () => {
  let value = act(fresh('SC05'), { type: 'navigate', stage: 'review' })
  const id = value.activeSubmissionIds.vehicle!
  value = act(value, { type: 'request-result', caseId: value.id, agency: 'vehicle', submissionId: id, status: 'received', now, externalReceipt: null })
  expect(value.stage).toBe('review')
  expect(value.emergency.requests.vehicle).toBe('received')
  const next = act(value, { type: 'request-result', caseId: value.id, agency: 'vehicle', submissionId: id, status: 'unknown', now, externalReceipt: null })
  expect(next.emergency.requests.vehicle).toBe('received')
  expect(act(value, { type: 'request-result', caseId: value.id, agency: 'insurance', submissionId: id, status: 'received', now, externalReceipt: null })).toBe(value)
})
