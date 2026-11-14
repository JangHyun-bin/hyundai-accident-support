import { test, expect, type Page } from '@playwright/test'
import { createCase, makeSubmission, reduceCase, type Stage } from '../src/journey/case'
import { createSession } from '../src/emergency/session'
import { readFile } from 'node:fs/promises'

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const saved = (page: Page) => expect(page.locator('.journey-save-status')).toHaveText('이 기기에 보관됨')

async function seed(page: Page, stage: Stage) {
  await page.goto('/?study=journey')
  const id = await page.evaluate(async stage => {
    const domainPath = '/src/journey/case.ts', sessionPath = '/src/emergency/session.ts', storePath = '/src/journey/case-store.ts'
    const { createCase } = await import(/* @vite-ignore */ domainPath) as typeof import('../src/journey/case')
    const { createSession } = await import(/* @vite-ignore */ sessionPath) as typeof import('../src/emergency/session')
    const { commitCase } = await import(/* @vite-ignore */ storePath) as typeof import('../src/journey/case-store')
    const value = createCase(createSession('SC01', 'connected'), crypto.randomUUID(), new Date().toISOString())
    value.stage = stage; value.fixtureId = 'partial-evidence'
    value.diagram = { revision: 1, origin: 'fixture', road: 'straight', vehicles: [{ id: 'own', position: { x: .4, y: .5 }, heading: 0 }], contact: null, confirmedRevision: null }
    value.report = { revision: 1, basedOnRevision: 0, paragraphs: [{ id: 'paragraph', text: '초기 문장', kind: 'statement', references: [], revision: 1, confirmedRevision: null }] }
    value.followUp.shopId = 'gaon-service'
    const result = await commitCase(value, null)
    if (!result.ok) throw new Error(result.reason)
    return value.id
  }, stage)
  await page.goto('/?study=journey&device=mobile&case=' + id)
  await saved(page)
}

test('conflicting reports remain readable after two successive latest-record reloads', async ({ page, context }) => {
  await seed(page, 'review')
  const other = await context.newPage(); await other.goto(page.url()); await saved(other)
  for (const current of [page, other]) await button(current, '경위서').click()
  for (let round = 1; round <= 2; round++) {
    for (const [current, text] of [[page, `다른 화면의 문장 ${round}`], [other, `내가 보존할 정정 ${round}`]] as const) {
      await button(current, '정정하기').click()
      await current.getByLabel('문장 내용', { exact: true }).fill(text)
      await button(current, '정정 저장').click()
      if (current === page) await saved(page)
    }
    await expect(other.locator('.journey-save-status')).toContainText('다른 화면에서 기록이 바뀌었어요')
    await expect(other.getByLabel('문장 내용', { exact: true })).toHaveValue(`내가 보존할 정정 ${round}`)
    await expect(other.getByLabel('문장 내용', { exact: true })).toBeFocused()
    await button(other, '최신 기록 불러오기').click()
    await saved(other)
    await expect(other.locator('.journey-report')).toContainText(`다른 화면의 문장 ${round}`)
  }
  await other.getByText('내 임시 기록 확인', { exact: true }).click()
  await expect(other.locator('.journey-recovery')).toContainText('내가 보존할 정정 1')
  await expect(other.locator('.journey-recovery')).toContainText('내가 보존할 정정 2')
  const first = other.getByRole('article', { name: '임시 기록 1', exact: true })
  const downloadPromise = other.waitForEvent('download')
  await first.getByRole('link', { name: '전체 기록 사본 내려받기', exact: true }).click()
  const download = await downloadPromise
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(backup.report.paragraphs[0].text).toBe('내가 보존할 정정 1')
  await first.getByRole('button', { name: '이 경위서 다시 불러오기', exact: true }).click(); await saved(other)
  await expect(other.locator('.journey-report')).toContainText('내가 보존할 정정 1')
  await expect(other.locator('.journey-report')).toContainText('확인 필요')
  expect(await other.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); dispatchEvent(event); return event.defaultPrevented })).toBe(true)
})

for (const kind of ['diagram', 'follow-up'] as const) {
  test(`conflicting ${kind} stays accessible separately from the latest saved content`, async ({ page, context }) => {
    await seed(page, kind === 'diagram' ? 'review' : 'follow-up')
    const other = await context.newPage(); await other.goto(page.url()); await saved(other)
    for (const [current, index] of [[page, 0], [other, 1]] as const) {
      if (kind === 'diagram') {
        await button(current, '사고 도식').click()
        await button(current, index ? '아래로 이동' : '오른쪽으로 이동').click()
        await button(current, '도식 정정 저장').click()
      } else {
        await current.getByRole('checkbox', { name: index ? '전면등 작동' : '앞 범퍼 외관', exact: true }).check()
        await button(current, '선택한 항목 검토').click()
        await button(current, '검토 내용 저장').click()
      }
      if (!index) await saved(page)
    }
    await button(other, '최신 기록 불러오기').click(); await saved(other)
    await other.getByText('내 임시 기록 확인', { exact: true }).click()
    const recovery = other.locator('.journey-recovery')
    if (kind === 'diagram') {
      await expect(other.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', 'translate(450 500)')
      await expect(recovery.getByRole('img', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', 'translate(400 550)')
      await recovery.getByRole('button', { name: '이 도식 다시 불러오기', exact: true }).click(); await saved(other)
      await expect(other.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', 'translate(400 550)')
    } else {
      await expect(other.getByRole('checkbox', { name: '전면등 작동', exact: true })).not.toBeChecked()
      await expect(recovery).toContainText('전면등 작동')
      await recovery.getByRole('button', { name: '점검 선택 다시 불러오기', exact: true }).click(); await saved(other)
      await expect(other.getByRole('checkbox', { name: '전면등 작동', exact: true })).toBeChecked()
    }
  })
}

for (const kind of ['photo', 'diagram'] as const) {
  test(`reload can be cancelled without losing an unsaved ${kind}`, async ({ page }) => {
    await seed(page, kind === 'photo' ? 'record' : 'review')
    if (kind === 'photo') {
      await button(page, '사진 남기기').click(); await button(page, '현장 전체 사진').click()
      await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles('public/journey-samples/scene.png')
      await expect(button(page, '이 사진 사용')).toBeVisible()
    } else {
      await button(page, '사고 도식').click(); await button(page, '오른쪽으로 이동').click()
    }
    let dialogs = 0
    page.on('dialog', async dialog => { dialogs++; await dialog.dismiss() })
    await page.reload({ timeout: 1000 }).catch(error => { if (dialogs !== 1) throw error })
    expect(dialogs).toBe(1)
    if (kind === 'photo') await expect(button(page, '이 사진 사용')).toBeVisible()
    else await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', 'translate(450 500)')
    await button(page, kind === 'photo' ? '이 사진 사용' : '도식 정정 저장').click(); await saved(page)
    await expect.poll(() => page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); dispatchEvent(event); return event.defaultPrevented })).toBe(false)
  })
}

test('failed report commit keeps its editor draft and unload protection', async ({ page }) => {
  await seed(page, 'review'); await button(page, '경위서').click()
  await button(page, '정정하기').click(); await page.getByLabel('문장 내용', { exact: true }).fill('저장되지 않은 경위서')
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'cases') throw new DOMException('Full', 'QuotaExceededError')
      return original.apply(this, args)
    }
  })
  await button(page, '정정 저장').click()
  await expect(page.locator('.journey-save-status')).toContainText('이 기기에 저장하지 못했어요')
  await expect(page.getByLabel('문장 내용', { exact: true })).toHaveValue('저장되지 않은 경위서')
  await expect(page.getByLabel('문장 내용', { exact: true })).toBeFocused()
  expect(await page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); dispatchEvent(event); return event.defaultPrevented })).toBe(true)
})

for (const device of ['vehicle', 'mobile']) {
  test(`new risk is visible on the ${device} response without discarding the current report`, async ({ page }) => {
    await seed(page, 'review')
    if (device === 'vehicle') await button(page, '차량 보기').click()
    await button(page, '시연 event: 위험 정보').click()
    await expect(page.locator('[data-journey-stage="response"]')).toBeVisible()
    await expect(page.locator('[data-case-id]').getByRole('alert')).toContainText('새로운 위험 감지')
    await button(page, '내용 확인으로 돌아가기').click(); await button(page, '경위서').click()
    await expect(page.locator('.journey-report')).toContainText('초기 문장')
  })
}

test('SC05 handoff becomes an observation without changing agency requests', () => {
  const before = createCase(createSession('SC05', 'initial'), 'handoff-case', '2026-11-10T00:00:00Z')
  const after = reduceCase(before, { type: 'emergency-edge', edgeId: 'handoff', now: '2026-11-10T00:01:00Z' })
  expect(after.observations.at(-1)).toMatchObject({ kind: 'handoff', value: '인계 확인', confirmation: 'confirmed', source: 'fixture' })
  expect(after.emergency.facts.handoff).toEqual({ value: '인계 확인', status: 'confirmed' })
  expect(after.emergency.requests).toEqual(before.emergency.requests)
  expect(after.submissions).toEqual(before.submissions)
})

test('restoring a report preserves the approved snapshot and requires confirmation again', () => {
  const original = createCase(createSession('SC01', 'connected'), 'restore-report', '2026-11-10T00:00:00Z')
  original.report = { revision: 1, basedOnRevision: 0, paragraphs: [{ id: 'p1', kind: 'inference', text: '접촉했을 가능성이 있어요.', references: [], revision: 1, confirmedRevision: 1 }] }
  const approved = makeSubmission(original, { agency: 'insurance', recipient: '보험사', id: 'approved-report', now: original.createdAt,
    selection: { observationIds: [], statementIds: [], evidenceIds: [], includeDiagram: false, includeReport: true } })
  if (!approved.ok) throw new Error(approved.reason)
  const next = reduceCase(approved.value, { type: 'report-restore', report: { ...original.report, paragraphs: [{ ...original.report.paragraphs[0], text: '접촉 여부는 아직 모르겠어요.' }] } })
  expect(next.report?.paragraphs[0]).toMatchObject({ text: '접촉 여부는 아직 모르겠어요.', kind: 'inference', confirmedRevision: null })
  expect(next.reportHistory).toContainEqual(original.report)
  expect(next.submissions).toEqual(approved.value.submissions)
  expect(next.emergency.requests).toEqual(approved.value.emergency.requests)
})

for (const history of ['none', 'submission', 'share', 'report']) {
  test(`photo deletion ${history === 'none' ? 'removes unreferenced media from storage' : 'retains and discloses ' + history + ' media'}`, async ({ page }) => {
    await seed(page, 'record')
    const assetId = await page.evaluate(async history => {
      const storePath = '/src/journey/case-store.ts', domainPath = '/src/journey/case.ts'
      const store = await import(/* @vite-ignore */ storePath) as typeof import('../src/journey/case-store')
      const domain = await import(/* @vite-ignore */ domainPath) as typeof import('../src/journey/case')
      const value = (await store.loadCase(new URL(location.href).searchParams.get('case')!))!
      const blob = await (await fetch('/journey-samples/scene.png')).blob()
      const assetId = crypto.randomUUID()
      const evidence: import('../src/journey/case').Evidence = { id: 'deletable', label: '현장 전체 사진 1', kind: 'photo', revision: 1, origin: 'user', assetId, availability: 'available', captureTarget: 'scene', metadata: { mime: blob.type, bytes: blob.size, duration: null, capturedAt: null, sourceLabel: '직접 선택' } }
      let next = domain.reduceCase(value, { type: 'evidence-put', evidence })
      if (history === 'submission' || history === 'share') {
        const input = { recipient: '선택한 수신처', id: 'approved-photo', now: new Date().toISOString(), selection: { observationIds: [], statementIds: [], evidenceIds: [evidence.id], includeDiagram: false, includeReport: false } }
        const approval = history === 'submission' ? domain.makeSubmission(next, { ...input, agency: 'insurance' }) : domain.makeShare(next, input)
        if (!approval.ok) throw new Error(approval.reason)
        next = approval.value
      } else if (history === 'report') {
        next.report!.paragraphs[0].references = [{ evidenceId: evidence.id, evidenceRevision: 1, start: null, end: null }]
        next = domain.reduceCase(next, { type: 'paragraph-edit', id: 'paragraph', text: '정정한 문장', references: [] })
      }
      const result = await store.commitCase(next, value.revision, [{ id: assetId, caseId: value.id, blob }])
      if (!result.ok) throw new Error(result.reason)
      return assetId
    }, history)
    await page.reload(); await saved(page); await button(page, '사진 남기기').click(); await button(page, '현장 전체 사진').click()
    await button(page, '현장 전체 사진 1 삭제').click(); await saved(page)
    if (history !== 'none') await expect(page.getByText('현재 자료에서 제외했어요. 이전 경위서나 승인 기록에 연결된 원본은 보존돼요.', { exact: true })).toBeVisible()
    else await expect(page.getByText('사진을 삭제했어요.', { exact: true })).toBeVisible()
    const bytes = await page.evaluate(async assetId => {
      const path = '/src/journey/case-store.ts'
      const { readAsset } = await import(/* @vite-ignore */ path) as typeof import('../src/journey/case-store')
      return (await readAsset(new URL(location.href).searchParams.get('case')!, assetId))?.size ?? 0
    }, assetId)
    if (history !== 'none') expect(bytes).toBeGreaterThan(0)
    else expect(bytes).toBe(0)
  })
}
