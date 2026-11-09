import { test, expect } from '@playwright/test'
import { createSession } from '../src/emergency/session'
import { createCase, reduceCase, type Evidence, type Report, type JourneyCase } from '../src/journey/case'

const now = '2026-11-10T09:12:00.000Z'
const clip: Evidence = { id: 'front', label: '전방 영상', kind: 'video', revision: 1, origin: 'sample', assetId: 'front-asset',
  availability: 'available', captureTarget: null, metadata: { mime: 'video/mp4', bytes: 3, duration: 20, capturedAt: now, sourceLabel: '합성 전방 영상' } }
function fresh() {
  const value = createCase(createSession('SC01', 'connected'), 'report-case', now)
  value.fixtureId = 'partial-evidence'
  return reduceCase(value, { type: 'evidence-put', evidence: clip })
}
const report = (value: JourneyCase): Report => ({ revision: 1, basedOnRevision: value.contentRevision, paragraphs: [
  { id: 'p1', text: '오른쪽 차량이 내 차량 쪽으로 이동하는 모습이 보여요.', kind: 'observation', revision: 1, confirmedRevision: null,
    references: [{ evidenceId: 'front', evidenceRevision: 1, start: 8, end: 16 }] },
  { id: 'p2', text: '접촉했을 가능성이 있어요.', kind: 'inference', revision: 1, confirmedRevision: null, references: [] },
] })
function withReport() { const value = fresh(); return reduceCase(value, { type: 'report-result', report: report(value) }) }

test('paragraph edits archive the original and invalidate only its own confirmation', () => {
  let value = withReport()
  expect(value.report?.paragraphs).toHaveLength(2)
  value = reduceCase(value, { type: 'paragraph-confirm', id: 'p1' })
  value = reduceCase(value, { type: 'paragraph-confirm', id: 'p2' })
  value = reduceCase(value, { type: 'paragraph-edit', id: 'p1', text: '차량 이동 방향은 확인 중이에요.', references: [] })
  expect(value.report?.paragraphs[0]).toMatchObject({ text: '차량 이동 방향은 확인 중이에요.', revision: 2, confirmedRevision: null })
  expect(value.report?.paragraphs[1]).toMatchObject({ kind: 'inference', confirmedRevision: 1 })
  expect(value.reportHistory.at(-1)?.paragraphs[0].text).toBe(report(fresh()).paragraphs[0].text)
})

test('changed or deleted evidence clears report confirmation while approved payloads stay immutable', () => {
  let value = reduceCase(withReport(), { type: 'paragraph-confirm', id: 'p1' })
  value.submissions.push({ id: 'approved', kind: 'new', agency: 'insurance', recipient: '보험사', approvedAt: now, status: 'sent', externalReceipt: null,
    payload: { observations: [], statements: [], evidence: [structuredClone(clip)], diagram: null, report: structuredClone(value.report) } })
  const sent = structuredClone(value.submissions[1].payload)
  value = reduceCase(value, { type: 'evidence-remove', id: 'front' })
  expect(value.report?.paragraphs[0].confirmedRevision).toBeNull()
  expect(reduceCase(value, { type: 'paragraph-confirm', id: 'p1' })).toBe(value)
  expect(value.submissions[1].payload).toEqual(sent)
})

test('statement and diagram changes invalidate the current report review', () => {
  let value = reduceCase(withReport(), { type: 'paragraph-confirm', id: 'p2' })
  value = reduceCase(value, { type: 'statement-edit', id: 's', text: '기억나는 내용', audioEvidenceIds: [] })
  expect(value.report?.paragraphs[1].confirmedRevision).toBeNull()
  value = reduceCase(value, { type: 'paragraph-confirm', id: 'p2' })
  value = reduceCase(value, { type: 'diagram-edit', diagram: { revision: 1, origin: 'user', road: 'straight', vehicles: [
    { id: 'own', position: { x: .4, y: .6 }, heading: 0 }, { id: 'other', position: { x: .6, y: .4 }, heading: 0 },
  ], contact: null, confirmedRevision: null } })
  expect(value.report?.paragraphs[1].confirmedRevision).toBeNull()
})

test('a late result stays pending until explicit replacement, retaining the edited report', () => {
  let value = withReport()
  const late = report(value)
  value = reduceCase(value, { type: 'paragraph-edit', id: 'p2', text: '내가 직접 정정한 내용', references: [] })
  const edited = structuredClone(value.report)
  value = reduceCase(value, { type: 'report-result', report: late })
  expect(value.report).toEqual(edited)
  expect(value.pendingReport).not.toBeNull()
  value = reduceCase(value, { type: 'report-apply-pending' })
  expect(value.report?.paragraphs[1].text).toBe(late.paragraphs[1].text)
  expect(value.reportHistory.at(-1)).toEqual(edited)
  expect(value.pendingReport).toBeNull()
})

test('a stale first result cannot silently become current and external confirmations are discarded', () => {
  let value = fresh()
  const late = report(value)
  late.paragraphs[0].confirmedRevision = 1
  value = reduceCase(value, { type: 'statement-edit', id: 's', text: '더 최근의 기록', audioEvidenceIds: [] })
  value = reduceCase(value, { type: 'report-result', report: late })
  expect(value.report).toBeNull()
  expect(value.pendingReport?.paragraphs[0].confirmedRevision).toBeNull()
})

test('an empty case supports manual statements without manufacturing observations', () => {
  let value = createCase(createSession('SC01', 'connected'), 'empty-report', now)
  expect(value.report).toBeNull()
  value = reduceCase(value, { type: 'paragraph-edit', id: 'manual', text: '기억나는 내용을 직접 남겼어요.', references: [] })
  expect(value.report?.paragraphs[0]).toMatchObject({ kind: 'statement', confirmedRevision: null })
  value = reduceCase(value, { type: 'paragraph-confirm', id: 'manual' })
  expect(value.report?.paragraphs[0].confirmedRevision).toBe(1)
  expect(value.evidence).toEqual([])
})

test('fixture generation cannot fill an empty case or a case outside fixture mode', () => {
  const value = createCase(createSession('SC01', 'connected'), 'empty-report', now)
  value.fixtureId = 'no-evidence'
  expect(reduceCase(value, { type: 'report-result', report: report(value) })).toBe(value)
  const actual = fresh()
  actual.fixtureId = null
  expect(reduceCase(actual, { type: 'report-result', report: report(actual) })).toBe(actual)
})

test('new observations invalidate report review and make a waiting result stale', () => {
  const value = reduceCase(withReport(), { type: 'paragraph-confirm', id: 'p1' })
  const changed = reduceCase(value, { type: 'observation', observation: { id: 'new-impact', kind: 'impact-direction',
    label: '충격 방향', value: '우측 전방', source: 'user', observedAt: now, confirmation: 'confirmed', legacyFactId: null, supersedes: null } })
  expect(changed.contentRevision).toBeGreaterThan(value.contentRevision)
  expect(changed.report?.paragraphs[0].confirmedRevision).toBeNull()
})

async function openReport(page: import('@playwright/test').Page, samples = true) {
  await page.setViewportSize({ width: 393, height: 852 })
  await page.goto('/?study=journey&fixture=partial-evidence&device=mobile')
  await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  if (samples) {
    await page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true }).click()
    await expect(page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: '시연 event: 경위서 초안', exact: true }).click()
  }
  await page.getByRole('button', { name: '사고 기록 남기기', exact: true }).click()
  await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
  await page.getByRole('button', { name: '경위서', exact: true }).click()
}

test('report UI preserves an urgent draft, requires review after editing, and restores the original', async ({ page }) => {
  await openReport(page)
  const paragraph = page.getByRole('article', { name: '문장 1', exact: true })
  await paragraph.getByRole('button', { name: '문장 확인', exact: true }).click()
  await expect(paragraph.getByText('내용 확인함', { exact: true })).toBeVisible()
  await paragraph.getByRole('button', { name: '정정하기', exact: true }).click()
  await paragraph.getByLabel('문장 내용', { exact: true }).fill('차량 이동 방향은 확인 중이에요.')
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  await page.getByRole('button', { name: '내용 확인으로 돌아가기', exact: true }).click()
  await expect(paragraph.getByLabel('문장 내용', { exact: true })).toHaveValue('차량 이동 방향은 확인 중이에요.')
  await paragraph.getByRole('button', { name: '정정 저장', exact: true }).click()
  await expect(paragraph.getByText('확인 필요', { exact: true })).toBeVisible()
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '경위서', exact: true }).click()
  await expect(paragraph.getByText('차량 이동 방향은 확인 중이에요.', { exact: true })).toBeVisible()
  await paragraph.getByText('원문 보기', { exact: true }).click()
  await expect(paragraph.getByText('오른쪽 차량이 내 차량 쪽으로 이동하는 모습이 보여요.', { exact: true })).toBeVisible()
})

test('evidence drawer opens the referenced clip and returns keyboard focus on Escape', async ({ page }) => {
  await openReport(page)
  const trigger = page.getByRole('article', { name: '문장 1', exact: true }).getByRole('button', { name: '근거 보기', exact: true })
  await trigger.click()
  const drawer = page.getByRole('dialog', { name: '문장의 근거', exact: true })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('button', { name: '전방 영상 재생', exact: true })).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('an empty report accepts manual text and a later candidate requires explicit comparison', async ({ page }) => {
  await openReport(page, false)
  await expect(page.getByText('아직 작성된 경위서가 없어요.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '문장 추가', exact: true }).click()
  await page.getByLabel('문장 내용', { exact: true }).fill('내가 기억하는 사고 상황이에요.')
  await page.getByRole('button', { name: '정정 저장', exact: true }).click()
  await page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true }).click()
  await expect(page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '시연 event: 경위서 초안', exact: true }).click()
  await expect(page.getByRole('article', { name: '문장 1', exact: true }).getByText('내가 기억하는 사고 상황이에요.', { exact: true })).toBeVisible()
  await page.getByText('새 초안 비교', { exact: true }).click()
  await page.getByRole('button', { name: '이 초안으로 교체', exact: true }).click()
  await expect(page.getByRole('article', { name: '문장 1', exact: true }).getByText('오른쪽 차량이 내 차량 쪽으로 이동하는 모습이 보여요.', { exact: true })).toBeVisible()
})

test('an unreadable referenced clip invalidates review and can be excluded before reconfirmation', async ({ page }) => {
  await openReport(page)
  const paragraph = page.getByRole('article', { name: '문장 1', exact: true })
  await paragraph.getByRole('button', { name: '문장 확인', exact: true }).click()
  await expect(paragraph.getByText('내용 확인함', { exact: true })).toBeVisible()
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  await page.evaluate(async () => {
    const caseId = new URLSearchParams(location.search).get('case')!
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('after-care-journey-v1', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('assets', 'readwrite')
        const store = tx.objectStore('assets')
        const assets = store.index('caseId').getAll(caseId)
        assets.onsuccess = () => {
          for (const asset of assets.result) if (asset.blob.type === 'video/mp4') store.put({ ...asset, blob: new Blob([new Uint8Array(asset.blob.size)], { type: 'video/mp4' }) })
        }
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onabort = () => { db.close(); reject(tx.error) }
      }
    })
  })
  await paragraph.getByRole('button', { name: '근거 보기', exact: true }).click()
  await expect(page.getByRole('dialog').getByText('근거를 열 수 없어요', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(paragraph.getByText('확인 필요', { exact: true })).toBeVisible()
  await paragraph.getByRole('button', { name: '문장 확인', exact: true }).click()
  await expect(paragraph.getByText('내용 확인함', { exact: true })).toHaveCount(0)
  await paragraph.getByRole('button', { name: '정정하기', exact: true }).click()
  await paragraph.getByRole('checkbox', { name: '전방 영상 포함', exact: true }).uncheck()
  await paragraph.getByRole('button', { name: '정정 저장', exact: true }).click()
  await paragraph.getByRole('button', { name: '문장 확인', exact: true }).click()
  await expect(paragraph.getByText('내용 확인함', { exact: true })).toBeVisible()
  await expect(paragraph.getByRole('button', { name: '근거 보기', exact: true })).toHaveCount(0)
})

test('unfinished edits block normal navigation while enlarged mobile text remains accessible', async ({ page }) => {
  await openReport(page)
  await page.setViewportSize({ width: 360, height: 800 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  const paragraph = page.getByRole('article', { name: '문장 1', exact: true })
  await paragraph.getByRole('button', { name: '정정하기', exact: true }).click()
  await paragraph.getByLabel('문장 내용', { exact: true }).fill('확인하고 있는 내용')
  await page.getByRole('button', { name: '기록으로 돌아가기', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'review')
  await expect(page.getByText('남기던 기록을 확인하고 저장하거나 취소해주세요.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await paragraph.getByRole('button', { name: '정정 취소', exact: true }).click()
  await page.getByRole('button', { name: '기록으로 돌아가기', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'record')
})

for (const kind of ['photo', 'audio'] as const) test(`the report drawer opens stored ${kind} evidence`, async ({ page }) => {
  await page.goto('/?study=journey-catalog')
  const value = createCase(createSession('SC01', 'connected'), `report-${kind}`, now)
  value.stage = 'review'
  await page.evaluate(async ({ value, kind }) => {
    const path = '/src/journey/case-store.ts'
    const { commitCase } = await import(/* @vite-ignore */ path) as typeof import('../src/journey/case-store')
    const blob = await (await fetch(kind === 'photo' ? '/journey-samples/scene.png' : '/journey-samples/voice-statement-ko-v1.wav')).blob()
    value.evidence = [{ id: 'source', kind, label: '남긴 자료', revision: 1, origin: 'sample', assetId: 'source-asset', availability: 'available', captureTarget: null,
      metadata: { mime: blob.type, bytes: blob.size, duration: kind === 'audio' ? 8.827625 : null, capturedAt: null, sourceLabel: '준비된 자료' } }]
    value.report = { revision: 1, basedOnRevision: 0, paragraphs: [{ id: 'paragraph', text: '남긴 자료를 확인하고 있어요.', kind: 'unknown', revision: 1, confirmedRevision: null,
      references: [{ evidenceId: 'source', evidenceRevision: 1, start: kind === 'audio' ? .2 : null, end: kind === 'audio' ? .8 : null }] }] }
    const result = await commitCase(value, null, [{ id: 'source-asset', caseId: value.id, blob }])
    if (!result.ok) throw new Error(result.reason)
  }, { value, kind })
  await page.goto(`/?study=journey&device=mobile&case=${value.id}`)
  await page.getByRole('button', { name: '경위서', exact: true }).click()
  await page.getByRole('button', { name: '근거 보기', exact: true }).click()
  const drawer = page.getByRole('dialog')
  if (kind === 'photo') await expect(drawer.getByRole('img', { name: '남긴 자료' })).toBeVisible()
  else {
    const media = drawer.locator('audio')
    await expect(media).toHaveJSProperty('currentTime', .2)
    await media.evaluate((node: HTMLAudioElement) => node.play())
    await expect.poll(() => media.evaluate((node: HTMLAudioElement) => node.currentTime)).toBeGreaterThanOrEqual(.8)
    await expect(media).toHaveJSProperty('paused', true)
  }
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '문장 확인', exact: true }).click()
  await expect(page.getByText('내용 확인함', { exact: true })).toBeVisible()
  await expect(page.getByRole('article').getByText('미확인', { exact: true })).toBeVisible()
})

test('representative report and evidence drawer remain visually reviewable', async ({ page }, testInfo) => {
  const { mkdir } = await import('node:fs/promises')
  const directory = testInfo.outputPath('screenshots')
  await mkdir(directory, { recursive: true })
  await openReport(page)
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: directory + '/mobile-report.png' })
  await page.getByRole('button', { name: '근거 보기', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: '전방 영상 재생', exact: true })).toBeEnabled()
  await page.screenshot({ path: directory + '/mobile-evidence-drawer.png' })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '차량 보기', exact: true }).click()
  await page.setViewportSize({ width: 1600, height: 1050 })
  await page.getByRole('button', { name: '경위서', exact: true }).click()
  await expect(page.getByRole('article', { name: '문장 1', exact: true })).toBeVisible()
  await page.locator('[data-journey-stage]').screenshot({ path: directory + '/vehicle-report.png' })
  await page.getByRole('button', { name: 'Mobile 보기', exact: true }).click()
  await page.getByRole('button', { name: '경위서', exact: true }).click()
  await page.setViewportSize({ width: 360, height: 800 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: directory + '/mobile-report-200.png' })
})

test('stale asynchronous review results cannot confirm or invalidate a newer paragraph', () => {
  const original = withReport()
  const edited = reduceCase(original, { type: 'paragraph-edit', id: 'p1', text: '새로 정정한 문장', references: [] })
  expect(reduceCase(edited, { type: 'paragraph-confirm', id: 'p1', revision: 1 })).toBe(edited)
  const confirmed = reduceCase(edited, { type: 'paragraph-confirm', id: 'p1', revision: 2 })
  expect(reduceCase(confirmed, { type: 'paragraph-unconfirm', id: 'p1', revision: 1 })).toBe(confirmed)
  expect(reduceCase(confirmed, { type: 'paragraph-unconfirm', id: 'p1', revision: 2 }).report?.paragraphs[0].confirmedRevision).toBeNull()
})

test('an urgent event dismisses the evidence drawer and pauses its media', async ({ page }) => {
  await openReport(page)
  await page.getByRole('button', { name: '근거 보기', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  await page.locator('[aria-label="시연 event: 위험 정보"]').evaluate((node: HTMLButtonElement) => node.click())
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.locator('video').evaluateAll(nodes => nodes.every(node => node instanceof HTMLVideoElement && node.paused))).toBe(true)
  await page.getByRole('button', { name: '내용 확인으로 돌아가기', exact: true }).click()
  await expect(page.getByRole('button', { name: '근거 보기', exact: true })).toBeVisible()
})
