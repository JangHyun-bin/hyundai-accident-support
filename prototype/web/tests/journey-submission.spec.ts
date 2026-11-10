import { test, expect } from '@playwright/test'
import { createSession } from '../src/emergency/session'
import { createCase, makeSubmission, makeShare, reduceCase, type JourneyCase, type PayloadSelection, type Evidence, type RequestStatus } from '../src/journey/case'

const now = '2026-11-10T09:12:00.000Z'
const selection: PayloadSelection = { observationIds: [], statementIds: [], evidenceIds: [], includeDiagram: false, includeReport: false }
const photo: Evidence = { id: 'photo', label: '현장 사진', kind: 'photo', revision: 1, origin: 'sample', assetId: 'photo-asset', availability: 'available', captureTarget: 'scene',
  metadata: { mime: 'image/png', bytes: 100, duration: null, capturedAt: now, sourceLabel: '합성 사진' } }
function fresh() {
  const value = createCase(createSession('SC01', 'connected'), 'submission-case', now)
  return reduceCase(value, { type: 'evidence-put', evidence: photo })
}
function approve(value: JourneyCase, selected = { ...selection, evidenceIds: ['photo'] }, id = 'submit-1') {
  return makeSubmission(value, { agency: 'insurance', recipient: '선택한 보험사', selection: selected, id, now })
}
function submitted() {
  const result = approve(fresh())
  if (!result.ok) throw new Error(result.reason)
  return result.value
}
function result(value: JourneyCase, status: RequestStatus, submissionId = value.activeSubmissionIds.insurance!) {
  return reduceCase(value, { type: 'request-result', caseId: value.id, agency: 'insurance', submissionId, status, externalReceipt: null, now })
}

test('approval requires recipient, a selection and current confirmation only for included content', () => {
  const value = fresh()
  expect(makeSubmission(value, { agency: 'insurance', recipient: ' ', selection, id: 's', now })).toMatchObject({ ok: false, reason: 'recipient' })
  expect(approve(value, selection)).toMatchObject({ ok: false, reason: 'empty-selection' })
  const pending = reduceCase(value, { type: 'statement-edit', id: 'statement', text: '내가 남긴 내용', audioEvidenceIds: [] })
  expect(approve(pending, { ...selection, statementIds: ['statement'] })).toMatchObject({ ok: false, reason: 'unreviewed-content' })
  expect(approve(pending).ok).toBe(true)
  const confirmed = reduceCase(pending, { type: 'statement-confirm', id: 'statement' })
  expect(approve(confirmed, { ...selection, statementIds: ['statement'] }).ok).toBe(true)
})

test('snapshots contain exactly selected content and remain unchanged after edits', () => {
  const value = submitted()
  const request = value.submissions.at(-1)!
  expect(request.payload?.observations).toEqual([])
  expect(request.payload?.evidence).toEqual([photo])
  expect(request.payload?.report).toBeNull()
  const snapshot = structuredClone(request.payload)
  const edited = reduceCase(value, { type: 'evidence-put', evidence: { ...photo, revision: 2, assetId: 'replacement' } })
  expect(edited.submissions.at(-1)?.payload).toEqual(snapshot)
  expect(approve(edited)).toMatchObject({ ok: false, reason: 'retry-not-allowed' })
  expect(approve(result(edited, 'failed'), { ...selection, evidenceIds: ['photo'] }, 'submit-2').ok).toBe(true)
})

test('unknown results cannot resend and old results cannot regress a newer request', () => {
  const value = submitted()
  expect(approve(value)).toMatchObject({ ok: false, reason: 'retry-not-allowed' })
  expect(approve(result(value, 'unknown'))).toMatchObject({ ok: false, reason: 'retry-not-allowed' })
  const next = approve(result(value, 'not_received'), { ...selection, evidenceIds: ['photo'] }, 'submit-2')
  expect(next.ok).toBe(true)
  if (!next.ok) return
  const late = result(next.value, 'received', 'submit-1')
  expect(late.emergency.requests.insurance).toBe('sent')
  expect(late.activeSubmissionIds.insurance).toBe('submit-2')
  const received = result(late, 'received', 'submit-2')
  expect(result(received, 'unknown')).toBe(received)
  expect(reduceCase(received, { type: 'request-result', caseId: received.id, agency: 'vehicle', submissionId: 'submit-2', status: 'failed', externalReceipt: null, now })).toBe(received)
})

test('report approval preserves unknown kinds and requires selected, current evidence references', () => {
  let value = fresh()
  value.report = { revision: 1, basedOnRevision: value.contentRevision, paragraphs: [{ id: 'p', text: '접촉 여부는 확인 중이에요.', kind: 'unknown', revision: 1, confirmedRevision: 1,
    references: [{ evidenceId: 'photo', evidenceRevision: 1, start: null, end: null }] }] }
  expect(approve(value, { ...selection, includeReport: true })).toMatchObject({ ok: false, reason: 'missing-evidence' })
  const valid = approve(value, { ...selection, evidenceIds: ['photo'], includeReport: true })
  expect(valid.ok && valid.value.submissions.at(-1)?.payload?.report?.paragraphs[0].kind).toBe('unknown')
  value = reduceCase(value, { type: 'evidence-remove', id: 'photo' })
  expect(approve(value, { ...selection, includeReport: true }).ok).toBe(false)
})

test('sharing starts from its own selection and never changes agency state or payloads', () => {
  const value = submitted()
  const agencyState = structuredClone({ active: value.activeSubmissionIds, requests: value.emergency.requests, submissions: value.submissions })
  expect(makeShare(value, { recipient: '상대 운전자', selection, id: 'share-1', now })).toMatchObject({ ok: false, reason: 'empty-selection' })
  const shared = makeShare(value, { recipient: '상대 운전자', selection: { ...selection, evidenceIds: ['photo'] }, id: 'share-1', now })
  expect(shared.ok).toBe(true)
  if (!shared.ok) return
  expect(shared.value.shares[0].status).toBe('pending')
  expect(makeShare(shared.value, { recipient: '상대 운전자', selection: { ...selection, evidenceIds: ['photo'] }, id: 'share-1', now }).ok).toBe(false)
  for (const status of ['failed', 'unknown', 'confirmed'] as const) {
    const changed = reduceCase(shared.value, { type: 'share-result', caseId: value.id, shareId: 'share-1', status })
    expect(changed.shares[0].status).toBe(status)
    expect({ active: changed.activeSubmissionIds, requests: changed.emergency.requests, submissions: changed.submissions }).toEqual(agencyState)
  }
  const delivered = reduceCase(shared.value, { type: 'share-result', caseId: value.id, shareId: 'share-1', status: 'confirmed' })
  expect(reduceCase(delivered, { type: 'share-result', caseId: value.id, shareId: 'share-1', status: 'unknown' })).toBe(delivered)
})

test('deferring or declining cannot cancel an existing request and received rescue survives reconnection', () => {
  const value = fresh()
  const declined = reduceCase(value, { type: 'agency-decision', agency: 'insurance', decision: 'declined' })
  expect(declined.emergency.requests.insurance).toBe('declined')
  const approved = approve(declined)
  expect(approved.ok).toBe(true)
  if (!approved.ok) return
  expect(reduceCase(approved.value, { type: 'agency-decision', agency: 'insurance', decision: 'declined' })).toBe(approved.value)
  const rescued = createCase(createSession('SC05', 'suspended'), 'received-case', now)
  const connectedAgain = reduceCase(rescued, { type: 'contact-start', now })
  const received = reduceCase(connectedAgain, { type: 'request-result', caseId: rescued.id, agency: 'rescue', submissionId: connectedAgain.activeSubmissionIds.rescue!, status: 'connected', externalReceipt: null, now })
  expect(received.emergency.requests.rescue).toBe('received')
})

async function openSubmission(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 393, height: 852 })
  await page.goto('/?study=journey&device=mobile&fixture=partial-evidence')
  await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  await page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true }).click()
  await expect(page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '사고 기록 남기기', exact: true }).click()
  await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
  await page.getByRole('button', { name: '보낼 내용 확인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '보낼 범위를 직접 선택해주세요', exact: true })).toBeFocused()
}

test('insurance approval previews exactly selected content and receipt needs an explicit result', async ({ page }) => {
  await openSubmission(page)
  await expect(page.getByRole('checkbox', { name: '전방 영상', exact: true })).not.toBeChecked()
  await page.getByLabel('수신처', { exact: true }).fill('선택한 보험사')
  await page.getByRole('checkbox', { name: '전방 영상', exact: true }).check()
  await page.getByRole('button', { name: '선택한 내용 미리보기', exact: true }).click()
  const preview = page.getByRole('region', { name: '보낼 내용 미리보기', exact: true })
  await expect(preview.getByText('선택한 보험사', { exact: true })).toBeVisible()
  await expect(preview.getByText('전방 영상', { exact: true })).toBeVisible()
  await expect(preview.getByText('후방 영상', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '이 내용으로 요청', exact: true }).click()
  await expect(page.getByText('승인한 내용이 보관됐어요', { exact: true })).toBeVisible()
  await expect(page.getByText('접수번호 확인 중', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '시연 event: 보험사 접수 확인', exact: true }).click()
  await expect(page.getByText('접수번호 확인 중', { exact: true })).toBeVisible()
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '보낼 내용 확인', exact: true }).click()
  await expect(page.getByText('접수번호 확인 중', { exact: true })).toBeVisible()
})

test('sharing has independent empty selection and confirmation leaves insurance untouched', async ({ page }) => {
  await openSubmission(page)
  await page.getByLabel('수신처', { exact: true }).fill('선택한 보험사')
  await page.getByRole('checkbox', { name: '전방 영상', exact: true }).check()
  await page.getByRole('button', { name: '선택한 내용 미리보기', exact: true }).click()
  await page.getByRole('button', { name: '이 내용으로 요청', exact: true }).click()
  await expect(page.getByText('승인한 내용이 보관됐어요', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '상대방 공유', exact: true }).click()
  await expect(page.getByLabel('수신처', { exact: true })).toHaveValue('')
  await expect(page.getByRole('checkbox', { name: '전방 영상', exact: true })).not.toBeChecked()
  await page.getByLabel('수신처', { exact: true }).fill('상대 운전자')
  await page.getByRole('checkbox', { name: '전방 영상', exact: true }).check()
  await page.getByRole('button', { name: '선택한 내용 미리보기', exact: true }).click()
  await page.getByRole('button', { name: '이 내용으로 공유 요청', exact: true }).click()
  await expect(page.getByText('공유 결과 확인 중', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '시연 event: 상대방 공유 확인', exact: true }).click()
  await expect(page.getByText('공유 확인됨', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '보험사 접수', exact: true }).click()
  await expect(page.getByText('접수 결과 확인 중', { exact: true })).toBeVisible()
})

test('closing an approved snapshot stops its hidden media playback', async ({ page }) => {
  await openSubmission(page)
  await page.getByLabel('수신처', { exact: true }).fill('선택한 보험사')
  await page.getByRole('checkbox', { name: '전방 영상', exact: true }).check()
  await page.getByRole('button', { name: '선택한 내용 미리보기', exact: true }).click()
  await page.getByRole('button', { name: '이 내용으로 요청', exact: true }).click()
  await expect(page.getByText('승인한 내용이 보관됐어요', { exact: true })).toBeVisible()
  await page.getByText('승인했던 내용', { exact: true }).click()
  await page.getByRole('button', { name: '전방 영상 열기', exact: true }).click()
  const request = page.getByRole('region', { name: '요청 결과', exact: true })
  await request.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  await expect.poll(() => request.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  await page.getByText('승인했던 내용', { exact: true }).click()
  await expect(request.locator('video')).toHaveJSProperty('paused', true)
})

test('unknown cannot resend, explicit failure needs a fresh selection, and agency receipt number is displayed', async ({ page }) => {
  await openSubmission(page)
  await page.getByLabel('수신처', { exact: true }).fill('첫 보험사')
  await page.getByRole('checkbox', { name: '전방 영상', exact: true }).check()
  await page.getByRole('button', { name: '선택한 내용 미리보기', exact: true }).click()
  await page.getByRole('button', { name: '이 내용으로 요청', exact: true }).click()
  await expect(page.getByText('승인한 내용이 보관됐어요', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '시연 event: 보험사 결과 미확인', exact: true }).click()
  await expect(page.getByRole('button', { name: '선택한 내용 미리보기', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '시연 event: 보험사 전송 실패', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: '전방 영상', exact: true })).not.toBeChecked()
  await page.getByLabel('수신처', { exact: true }).fill('다시 선택한 보험사')
  await page.getByRole('checkbox', { name: '전방 영상', exact: true }).check()
  await page.getByRole('button', { name: '선택한 내용 미리보기', exact: true }).click()
  await page.getByRole('button', { name: '이 내용으로 요청', exact: true }).click()
  await expect(page.getByText('승인한 내용이 보관됐어요', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '시연 event: 보험사 접수번호 확인', exact: true }).click()
  await expect(page.getByText('AC-20261110-001', { exact: true })).toBeVisible()
  await page.getByText('이전 요청 내용', { exact: true }).click()
  await expect(page.getByRole('heading', { name: '첫 보험사', exact: true })).toBeVisible()
})

test('submission preview preserves layout at small sizes and has inspectable visual evidence', async ({ page }, testInfo) => {
  const { mkdir } = await import('node:fs/promises')
  const directory = testInfo.outputPath('screenshots')
  await mkdir(directory, { recursive: true })
  await openSubmission(page)
  await page.getByLabel('수신처', { exact: true }).fill('선택한 보험사')
  await page.getByRole('checkbox', { name: '전방 영상', exact: true }).check()
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: directory + '/mobile-selection.png' })
  await page.getByRole('button', { name: '선택한 내용 미리보기', exact: true }).click()
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: directory + '/mobile-preview.png' })
  await page.setViewportSize({ width: 360, height: 800 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.getByRole('button', { name: '이 내용으로 요청', exact: true }).click()
  await expect(page.getByText('승인한 내용이 보관됐어요', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '시연 event: 보험사 접수 확인', exact: true }).click()
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: directory + '/mobile-receipt-200.png' })
})

test('unselected diagrams and audio stay outside the approved payload and imported receipts stay unchanged', () => {
  let value = fresh()
  value.diagram = { revision: 1, origin: 'user', road: 'straight', vehicles: [{ id: 'own', position: { x: .5, y: .5 }, heading: 0 }], contact: null, confirmedRevision: null }
  expect(approve(value).ok).toBe(true)
  expect(approve(value, { ...selection, includeDiagram: true })).toMatchObject({ ok: false, reason: 'unreviewed-content' })
  value = reduceCase(value, { type: 'evidence-put', evidence: { ...photo, id: 'audio', kind: 'audio', assetId: 'audio-asset', captureTarget: null, metadata: { ...photo.metadata, mime: 'audio/webm', duration: 2 } } })
  value = reduceCase(value, { type: 'statement-edit', id: 's', text: '확인한 내 이야기', audioEvidenceIds: ['audio'] })
  value = reduceCase(value, { type: 'statement-confirm', id: 's' })
  const approved = approve(value, { ...selection, statementIds: ['s'] })
  expect(approved.ok).toBe(true)
  if (approved.ok) {
    expect(approved.value.submissions.at(-1)?.payload?.evidence).toEqual([])
    expect(approved.value.submissions.at(-1)?.payload?.statements[0].audioEvidenceIds).toEqual([])
  }
  const imported = reduceCase(createCase(createSession('SC05', 'suspended'), 'imported-case', now), { type: 'evidence-put', evidence: photo })
  const original = structuredClone(imported.submissions)
  const next = approve(imported)
  expect(next.ok).toBe(true)
  if (next.ok) expect(next.value.submissions.slice(0, -1)).toEqual(original)
})
