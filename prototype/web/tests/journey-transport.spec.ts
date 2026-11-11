import { test, expect } from '@playwright/test'
import { createSession } from '../src/emergency/session'
import { createCase, makeSubmission, reduceCase, validateCase, type JourneyCase } from '../src/journey/case'
import { checklistLabels } from '../src/design-system/flow-study-model'
import { journeyFlow, safetyChecklist } from '../src/journey/journey-flow'

const now = '2026-11-12T00:00:00.000Z'
function approved(explicit = true) {
  let value = createCase(createSession('SC01'), 'transport-case', now)
  value = reduceCase(value, { type: 'statement-edit', id: 'note', text: '정차 중 오른쪽에서 충격을 느꼈어요.', audioEvidenceIds: [] })
  value = reduceCase(value, { type: 'statement-confirm', id: 'note' })
  const result = makeSubmission(value, { agency: 'insurance', recipient: '선택한 보험사', id: 'approved-record', now,
    transport: explicit ? 'explicit' : undefined,
    selection: { observationIds: [], statementIds: ['note'], evidenceIds: [], includeDiagram: false, includeReport: false } })
  if (!result.ok) throw new Error(result.reason)
  return result.value
}
const identity = (value: JourneyCase) => ({ caseId: value.id, submissionId: value.activeSubmissionIds.insurance!, now })

test('explicit approval, start and result preserve the approved snapshot across failure and retry', () => {
  let value = approved()
  const snapshot = structuredClone(value.submissions[0].payload)
  expect(value.emergency.requests.insurance).toBe('checking')
  expect(value.submissions[0].transport).toBe('approved')
  expect(reduceCase(value, { type: 'transport-result', ...identity(value), status: 'sent' })).toBe(value)
  value = reduceCase(value, { type: 'transport-start', ...identity(value) })
  expect(reduceCase(value, { type: 'navigate', stage: 'record' })).toBe(value)
  expect(reduceCase(value, { type: 'transport-start', ...identity(value) })).toBe(value)
  expect(reduceCase(value, { type: 'request-result', ...identity(value), agency: 'insurance', status: 'received', externalReceipt: null })).toBe(value)
  value = reduceCase(value, { type: 'transport-result', ...identity(value), status: 'failed' })
  value = reduceCase(value, { type: 'navigate', stage: 'record' })
  value = reduceCase(value, { type: 'statement-edit', id: 'note', text: '새로 작성한 내용', audioEvidenceIds: [] })
  const failedIdentity = identity(value)
  expect(reduceCase(value, { type: 'transport-start', ...identity(value) })).toBe(value)
  value = reduceCase(value, { type: 'transport-start', ...identity(value), retryId: 'retry-record' })
  expect(reduceCase(value, { type: 'transport-result', ...failedIdentity, status: 'sent' })).toBe(value)
  value = reduceCase(value, { type: 'transport-result', ...identity(value), status: 'sent' })
  expect(value.submissions).toHaveLength(2)
  expect(value.submissions[0].status).toBe('failed')
  expect(value.submissions[1].payload).toEqual(snapshot)
  expect(value.submissions[0].payload).toEqual(snapshot)
  expect(value.submissions[1].status).toBe('sent')
  expect(value.submissions[0].externalReceipt).toBeNull()
  expect(reduceCase(value, { type: 'request-result', ...identity(value), agency: 'insurance', status: 'failed', externalReceipt: null })).toBe(value)
  expect(reduceCase(value, { type: 'request-result', ...identity(value), agency: 'insurance', status: 'connected', externalReceipt: null })).toBe(value)
  expect(value.statements[0].text).toBe('새로 작성한 내용')
  expect(validateCase(value)).toBe(true)
})

test('legacy sent loads unchanged and stale transport events do not affect the current request', () => {
  const legacy = approved(false)
  expect(validateCase(legacy)).toBe(true)
  expect(legacy.submissions[0].status).toBe('sent')
  expect(legacy.submissions[0].transport).toBeUndefined()
  expect(reduceCase(legacy, { type: 'transport-start', ...identity(legacy) })).toBe(legacy)
  const value = approved()
  expect(reduceCase(value, { type: 'transport-start', ...identity(value), caseId: 'other-case' })).toBe(value)
  expect(reduceCase(value, { type: 'transport-start', ...identity(value), submissionId: 'other-request' })).toBe(value)
  expect(validateCase({ ...value, submissions: [{ ...value.submissions[0], transport: 'sending', status: 'sent' }] })).toBe(false)
})

test('receipt and call lifecycle are independent and insurance success does not end a call', () => {
  let value = reduceCase(approved(), { type: 'contact-start', now })
  const rescue = { caseId: value.id, submissionId: value.activeSubmissionIds.rescue!, agency: 'rescue' as const, now, externalReceipt: null }
  value = reduceCase(value, { type: 'request-result', ...rescue, status: 'received' })
  value = reduceCase(value, { type: 'request-result', ...rescue, status: 'connected' })
  value = reduceCase(value, { type: 'transport-start', ...identity(value) })
  value = reduceCase(value, { type: 'transport-result', ...identity(value), status: 'sent' })
  expect(value.submissions.find(item => item.id === rescue.submissionId)?.call).toBe('connected')
  expect(value.emergency.requests.rescue).toBe('received')
  expect(reduceCase(value, { type: 'call-end', ...rescue, caseId: 'other-case' })).toBe(value)
  value = reduceCase(value, { type: 'call-end', ...rescue })
  expect(value.submissions.find(item => item.id === rescue.submissionId)?.call).toBe('ended')
  expect(value.emergency.requests.rescue).toBe('received')
  expect(reduceCase(value, { type: 'request-result', ...rescue, status: 'connected' })).toBe(value)
  expect(validateCase(value)).toBe(true)
})


test('failed contact ends that call attempt and later results cannot reopen it', () => {
  let value = reduceCase(createCase(createSession('SC01'), 'contact-failure', now), { type: 'contact-start', now })
  const first = value.activeSubmissionIds.rescue!
  value = reduceCase(value, { type: 'request-result', caseId: value.id, submissionId: first, agency: 'rescue', status: 'failed', externalReceipt: null, now })
  expect(value.submissions[0].call).toBe('ended')
  value = reduceCase(value, { type: 'contact-start', now })
  const current = value.activeSubmissionIds.rescue
  value = reduceCase(value, { type: 'request-result', caseId: value.id, submissionId: first, agency: 'rescue', status: 'connected', externalReceipt: null, now })
  expect(value.submissions[0].call).toBe('ended')
  expect(value.activeSubmissionIds.rescue).toBe(current)
  expect(value.submissions[1].call).toBe('connecting')
  expect(validateCase(value)).toBe(true)
})

test('a contact failure ends a connected call while preserving its confirmed receipt', () => {
  let value = reduceCase(createCase(createSession('SC01'), 'received-contact', now), { type: 'contact-start', now })
  const result = { caseId: value.id, submissionId: value.activeSubmissionIds.rescue!, agency: 'rescue' as const, now, externalReceipt: null }
  value = reduceCase(value, { type: 'request-result', ...result, status: 'connected' })
  const receipt = { number: 'confirmed-receipt', receivedAt: now, agencyName: '구호', next: '안내 대기' }
  value = reduceCase(value, { type: 'request-result', ...result, status: 'received', externalReceipt: receipt })
  const endedAt = '2026-11-12T00:01:00.000Z'
  value = reduceCase(value, { type: 'request-result', ...result, status: 'failed', now: endedAt })
  expect(value.submissions[0]).toMatchObject({ status: 'received', call: 'ended', externalReceipt: receipt })
  expect(value.emergency.requests.rescue).toBe('received')
  expect(value.updatedAt).toBe(endedAt)
  expect(reduceCase(value, { type: 'request-result', ...result, status: 'connected' })).toBe(value)
  expect(validateCase(value)).toBe(true)
})

test('approved checklist labels stay shared and checking never asserts vehicle operation or arrival', async ({ page }) => {
  let value = createCase(createSession('SC01'), 'checklist-case', now)
  expect(safetyChecklist.map(item => item.label)).toEqual(checklistLabels)
  for (const item of safetyChecklist) value = reduceCase(value, { type: 'safety-action', action: { ...item, source: 'user', status: 'user-confirmed', confirmedAt: now } })
  value = reduceCase(value, { type: 'safety-action', action: { id: 'evacuation', label: '대피 확인', source: 'user', status: 'user-confirmed', confirmedAt: now } })
  expect(journeyFlow(value, 3).step).toBe(3)
  expect(value.safetyActions.some(item => item.id === 'safe-arrival')).toBe(false)
  await page.goto('/')
  const vehicle = await page.evaluate(async value => { const path = '/src/journey/vehicle-state.ts'; return (await import(path)).vehicleContourState(value) }, value)
  expect(vehicle).toMatchObject({ hazard: { value: '미확인', tone: 'unknown' }, trunk: { value: '미확인', tone: 'unknown' } })
})
