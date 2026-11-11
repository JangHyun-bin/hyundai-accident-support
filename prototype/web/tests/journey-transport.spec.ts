import { test, expect } from '@playwright/test'
import { createSession } from '../src/emergency/session'
import { createCase, makeSubmission, reduceCase, validateCase, type JourneyCase } from '../src/journey/case'

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
  value = reduceCase(value, { type: 'transport-start', ...identity(value) })
  value = reduceCase(value, { type: 'transport-result', ...identity(value), status: 'sent' })
  expect(value.submissions).toHaveLength(1)
  expect(value.submissions[0].payload).toEqual(snapshot)
  expect(value.submissions[0].status).toBe('sent')
  expect(value.submissions[0].externalReceipt).toBeNull()
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
