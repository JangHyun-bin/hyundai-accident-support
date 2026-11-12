/// <reference lib="es2024.promise" />
import { test, expect, type Page } from '@playwright/test'
import type ReactModule from 'react'
import type * as ReactDOMClient from 'react-dom/client'
import type * as CaseDomain from '../src/journey/case'
import type * as CaseStore from '../src/journey/case-store'
import type * as EmergencySession from '../src/emergency/session'
import type * as JourneyHook from '../src/journey/useJourneyCase'
import type * as VoicePanel from '../src/journey/VoiceRecordPanel'
import type * as ReportEditor from '../src/journey/ReportPanel'
import type { JourneyCaseController } from '../src/journey/useJourneyCase'

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const saved = (page: Page) => expect(page.locator('.journey-save-status')).toHaveText('이 기기에 보관됨')
const statement = (page: Page) => page.locator('.journey-voice textarea:visible')

declare global {
  interface Window {
    recordController: JourneyCaseController
    recordSetId: (id: string) => void
    recordRestorePut: () => void
    recordReleaseCommit: () => void
    recordCommitWaiting: boolean
    recordInput: HTMLTextAreaElement
    recordReleasePermission: () => void
  }
}

async function seed(page: Page, stage: 'record' | 'review' = 'record', paragraphs = 0) {
  await page.goto('/?study=journey&device=mobile')
  const id = await page.evaluate(async ({ stage, paragraphs }) => {
    // These modules must execute inside the browser's Vite realm, not Playwright's Node realm.
    const domainPath = '/src/journey/case.ts', sessionPath = '/src/emergency/session.ts', storePath = '/src/journey/case-store.ts'
    const { createCase } = await import(/* @vite-ignore */ domainPath) as typeof CaseDomain
    const { createSession } = await import(/* @vite-ignore */ sessionPath) as typeof EmergencySession
    const { commitCase } = await import(/* @vite-ignore */ storePath) as typeof CaseStore
    const value = createCase(createSession('SC01', 'connected'), crypto.randomUUID(), new Date().toISOString())
    value.stage = stage; value.fixtureId = 'partial-evidence'
    value.statements = [{ id: 'primary-statement', text: '처음 남긴 진술', audioEvidenceIds: [], revision: 1, confirmedRevision: 1 }]
    if (paragraphs) value.report = { revision: 1, basedOnRevision: 0, paragraphs: Array.from({ length: paragraphs }, (_, index) => ({
      id: `paragraph-${index + 1}`, text: `기존 문장 ${index + 1}`, kind: 'statement' as const, references: [], revision: 1, confirmedRevision: null,
    })) }
    const result = await commitCase(value, null)
    if (!result.ok) throw new Error(result.reason)
    return value.id
  }, { stage, paragraphs })
  await page.goto(`/?study=journey&device=mobile&case=${id}`)
  await saved(page)
  return id
}

async function blockWrites(page: Page) {
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    window.recordRestorePut = () => { IDBObjectStore.prototype.put = original }
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'cases') throw new DOMException('Full', 'QuotaExceededError')
      return original.apply(this, args)
    }
  })
}

async function harness(page: Page, kind: 'voice' | 'report', paragraphs = 0, mode: 'sample' | 'device' = 'sample') {
  const id = await seed(page, kind === 'report' ? 'review' : 'record', paragraphs)
  await page.evaluate(async ({ id, kind, mode }) => {
    const root = '/src/'
    const source = await (await fetch(root + 'journey/useJourneyCase.ts')).text()
    const main = await (await fetch(root + 'main.tsx')).text()
    const reactUrl = source.match(/from "([^"]*\/react\.js[^\"]*)"/)![1]
    const clientUrl = main.match(/from "([^"]*\/react-dom_client\.js[^\"]*)"/)![1]
    // Loading the Vite/browser module instances avoids a second React runtime across realms.
    const React = (await import(reactUrl)).default as typeof ReactModule
    const { createRoot } = (await import(clientUrl)).default as typeof ReactDOMClient
    const { useJourneyCase } = await import(root + 'journey/useJourneyCase.ts') as typeof JourneyHook
    const { VoiceRecordPanel } = await import(root + 'journey/VoiceRecordPanel.tsx') as typeof VoicePanel
    const { ReportPanel } = await import(root + 'journey/ReportPanel.tsx') as typeof ReportEditor
    function Harness() {
      const [caseId, setCaseId] = React.useState(id)
      const controller = useJourneyCase(caseId)
      window.recordController = controller; window.recordSetId = setCaseId
      if (!controller.value) return null
      return kind === 'voice'
        ? React.createElement(VoiceRecordPanel, { value: controller.value, mode, onSave: controller.save, durable: controller.saveState === 'saved', reloadVersion: controller.reloadVersion })
        : React.createElement(ReportPanel, { value: controller.value, onCommand: controller.save, reloadVersion: controller.reloadVersion })
    }
    const container = document.createElement('div')
    container.id = 'record-reliability-harness'
    document.getElementById('root')!.hidden = true
    document.body.append(container)
    createRoot(container).render(React.createElement(Harness))
  }, { id, kind, mode })
  await expect.poll(() => page.evaluate(() => window.recordController?.value?.id)).toBe(id)
  return id
}

for (const existing of [false, true]) test(`first durable retry publishes the current case with existing=${existing}`, async ({ page }) => {
  const previous = existing ? await seed(page) : null
  if (!existing) await page.goto('/?study=journey&fixture=partial-evidence&device=mobile&keep=retained')
  else await page.evaluate(() => { const url = new URL(location.href); url.searchParams.set('keep', 'retained'); history.replaceState(null, '', url) })
  await page.getByRole('combobox', { name: '시연 상황', exact: true }).selectOption('partial-evidence')
  await blockWrites(page)
  await button(page, existing ? '새 시연 시작' : '이 상황으로 시작').click()
  await expect(page.locator('.journey-save-status')).toContainText('이 기기에 저장하지 못했어요')
  const current = await page.locator('[data-case-id]').getAttribute('data-case-id')
  expect(current).not.toBe(previous)
  expect(new URL(page.url()).searchParams.get('case')).toBe(previous)
  await page.evaluate(() => window.recordRestorePut())
  await button(page, '저장 다시 시도').click(); await saved(page)
  await expect.poll(() => new URL(page.url()).searchParams.get('case')).toBe(current)
  expect(new URL(page.url()).searchParams.get('keep')).toBe('retained')
  expect(new URL(page.url()).searchParams.get('device')).toBe('mobile')
  await button(page, '사고 기록 남기기').click()
  if (await button(page, '직접 입력').isVisible()) await button(page, '직접 입력').click()
  await statement(page).fill('재시도 뒤 실제로 남긴 내용')
  await button(page, '기록 저장').click(); await saved(page)
  await page.reload()
  await expect(statement(page)).toHaveValue('재시도 뒤 실제로 남긴 내용')
  expect(new URL(page.url()).searchParams.get('case')).toBe(current)
})

test('a late commit cannot adopt into a newer open case', async ({ page }) => {
  const first = await harness(page, 'voice')
  const second = await page.evaluate(async () => {
    const storePath = '/src/journey/case-store.ts'
    // Import the real browser persistence module to hold its completion callback, not its transaction.
    const { commitCase } = await import(/* @vite-ignore */ storePath) as typeof CaseStore
    const value = structuredClone(window.recordController.value!)
    value.id = crypto.randomUUID(); value.revision = 0
    value.statements[0].text = '새로 연 기록'
    const saved = await commitCase(value, null)
    if (!saved.ok) throw new Error(saved.reason)
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    let delayed = false
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { ...descriptor, set(handler) {
      if (!delayed && this.mode === 'readwrite') {
        delayed = true
        descriptor.set!.call(this, (event: Event) => {
          window.recordCommitWaiting = true
          window.recordReleaseCommit = () => handler.call(this, event)
        })
      } else descriptor.set!.call(this, handler)
    } })
    void window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '늦은 이전 기록', audioEvidenceIds: [] })
    return value.id
  })
  await expect.poll(() => page.evaluate(() => window.recordCommitWaiting)).toBe(true)
  await page.evaluate(id => window.recordSetId(id), second)
  await expect.poll(() => page.evaluate(() => window.recordController.value?.id)).toBe(second)
  await page.evaluate(() => window.recordReleaseCommit())
  await expect(statement(page)).toHaveValue('새로 연 기록')
  expect(await page.evaluate(() => window.recordController.value?.id)).not.toBe(first)
  expect(await page.evaluate(() => window.recordController.saveState)).toBe('saved')
})

test('two tabs reload the latest statement and review while preserving old text and audio bytes in recovery', async ({ page, context }) => {
  await seed(page)
  const other = await context.newPage(); await other.goto(page.url()); await saved(other)
  await statement(page).fill('다른 탭에서 확정한 최신 진술')
  await button(page, '기록 저장').click(); await saved(page)
  await other.getByRole('combobox', { name: '음성 입력', exact: true }).selectOption('sample')
  await button(other, '추가로 말하기').click()
  await expect(other.locator('.journey-voice audio')).toHaveCount(1)
  await statement(other).fill('내 화면의 오래된 진술과 pending 음성')
  await button(other, '기록 저장').click()
  await expect(other.locator('.journey-save-status')).toContainText('다른 화면에서 기록이 바뀌었어요')
  await expect(statement(other)).toHaveValue('내 화면의 오래된 진술과 pending 음성')
  await statement(other).evaluate((node: HTMLTextAreaElement) => {
    window.recordInput = node
    node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '옛' }))
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(node, '조합 중이던 옛 진술과 pending 음성')
  })
  await button(other, '최신 기록 불러오기').click(); await saved(other)
  await expect(statement(other)).toHaveValue('다른 탭에서 확정한 최신 진술')
  expect(await statement(other).evaluate(node => node === window.recordInput)).toBe(true)
  await expect(other.locator('.journey-voice audio')).toHaveCount(0)
  await other.getByText('내 임시 기록 확인', { exact: true }).click()
  await expect(other.locator('.journey-recovery')).toContainText('조합 중이던 옛 진술과 pending 음성')
  const media = other.locator('.journey-recovery').getByRole('link', { name: '자료 사본 내려받기', exact: true })
  await expect(media).toHaveAttribute('href', /^blob:/)
  const bytes = await media.evaluate(async (node: HTMLAnchorElement) => Array.from(new Uint8Array(await (await fetch(node.href)).arrayBuffer())))
  const source = await other.evaluate(async () => Array.from(new Uint8Array(await (await fetch('/journey-samples/voice-statement-ko-v1.wav')).arrayBuffer())))
  expect(bytes).toEqual(source)
  await button(other, '내용 확인으로').click()
  await button(other, '보낼 내용 확인').click()
  await expect(other.locator('.journey-submission')).toContainText('다른 탭에서 확정한 최신 진술')
  await expect(other.locator('.journey-submission')).not.toContainText('조합 중이던 옛 진술과 pending 음성')
})

test('clean statement identity changes synchronize without remounting and unrelated commits preserve caret', async ({ page }) => {
  await harness(page, 'voice')
  await statement(page).focus()
  await statement(page).evaluate((node: HTMLTextAreaElement) => { window.recordInput = node; node.setSelectionRange(2, 5) })
  await page.evaluate(async () => {
    await window.recordController.save({ type: 'safety-action', action: { id: 'hazard', label: '비상등', status: 'user-confirmed', source: 'user', confirmedAt: null } })
  })
  expect(await statement(page).evaluate((node: HTMLTextAreaElement) => ({ same: node === window.recordInput, start: node.selectionStart, end: node.selectionEnd, focused: document.activeElement === node }))).toEqual({ same: true, start: 2, end: 5, focused: true })
  await page.evaluate(async () => {
    await window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '새 revision의 진술', audioEvidenceIds: [] })
  })
  await expect(statement(page)).toHaveValue('새 revision의 진술')
  expect(await statement(page).evaluate(node => node === window.recordInput)).toBe(true)
  await expect(button(page, '기록 저장')).toBeEnabled()
})

test('dirty text and in-progress DOM IME survive statement revisions, unrelated saves and hidden risk transitions', async ({ page }) => {
  await harness(page, 'voice')
  await statement(page).fill('내 dirty 진술')
  await statement(page).evaluate((node: HTMLTextAreaElement) => {
    window.recordInput = node
    node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '입' }))
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(node, '조합 중인 입력')
    node.setSelectionRange(3, 3)
  })
  await page.evaluate(async () => {
    await window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '외부에서 바뀐 진술', audioEvidenceIds: [] })
    await window.recordController.save({ type: 'observation', observation: { id: 'risk', kind: 'risk', label: '위험', value: '확인 필요', source: 'fixture', observedAt: null, confirmation: 'attention', legacyFactId: null, supersedes: null } })
    await window.recordController.save({ type: 'navigate', stage: 'record' })
  })
  await expect(statement(page)).toHaveValue('조합 중인 입력')
  expect(await statement(page).evaluate((node: HTMLTextAreaElement) => ({ same: node === window.recordInput, start: node.selectionStart }))).toEqual({ same: true, start: 3 })
  await statement(page).dispatchEvent('compositionend', { data: '입력' })
  await button(page, '기록 저장').click()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.recordController.value?.statements[0].text)).toBe('조합 중인 입력')
})

test('pending audio is not replaced by incoming statement revisions', async ({ page }) => {
  await harness(page, 'voice')
  await button(page, '추가로 말하기').click()
  await expect(page.locator('#record-reliability-harness audio')).toHaveCount(1)
  await page.evaluate(async () => { await window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '다른 진술 revision', audioEvidenceIds: [] }) })
  await expect(statement(page)).toHaveValue('처음 남긴 진술\n\n정차 중 오른쪽에서 충격을 느꼈어요. 정확한 사고 경위는 확인 중이에요.')
  await expect(page.locator('#record-reliability-harness audio')).toHaveCount(1)
})

test('permission preparation survives incoming statement revisions without adopting over local state', async ({ page }) => {
  await harness(page, 'voice', 0, 'device')
  await page.evaluate(() => {
    const permission = Promise.withResolvers<MediaStream>()
    navigator.mediaDevices.getUserMedia = () => permission.promise
    window.recordReleasePermission = () => permission.reject(new DOMException('Denied', 'NotAllowedError'))
  })
  await button(page, '추가로 말하기').click()
  await expect(page.locator('#record-reliability-harness [data-voice-phase]')).toHaveAttribute('data-voice-phase', 'requesting-permission')
  await page.evaluate(async () => { await window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '권한 대기 중 새 진술', audioEvidenceIds: [] }) })
  await expect(page.locator('#record-reliability-harness [data-voice-phase]')).toHaveAttribute('data-voice-phase', 'requesting-permission')
  await expect(statement(page)).toHaveValue('처음 남긴 진술')
  await page.evaluate(() => window.recordReleasePermission())
  await expect(page.locator('#record-reliability-harness [data-voice-phase]')).not.toHaveAttribute('data-voice-phase', 'requesting-permission')
})

test('report limits share the 99 to 100 boundary and preserve edit/delete at the limit', async ({ page }) => {
  await seed(page, 'review', 99); await button(page, '경위서').click()
  await button(page, '문장 추가').click(); await page.getByLabel('문장 내용', { exact: true }).fill('100번째 문장')
  await button(page, '정정 저장').click(); await saved(page)
  await expect(page.locator('.journey-report-paragraph')).toHaveCount(100)
  await expect(button(page, '문장 추가')).toBeDisabled()
  await expect(page.locator('.journey-report')).toContainText('문장 추가 한도에 도달했어요')
  const last = page.getByRole('article', { name: '문장 100', exact: true })
  await last.getByRole('button', { name: '정정하기', exact: true }).click()
  await last.getByLabel('문장 내용', { exact: true }).fill('수정한 100번째 문장')
  await button(page, '정정 저장').click(); await saved(page)
  await expect(last).toContainText('수정한 100번째 문장')
  await last.getByRole('button', { name: '문장 제외', exact: true }).click(); await saved(page)
  await expect(button(page, '문장 추가')).toBeEnabled()
  await button(page, '문장 추가').click(); await page.getByLabel('문장 내용', { exact: true }).fill('삭제 후 다시 추가')
  await button(page, '정정 저장').click(); await saved(page)
  await page.reload(); await button(page, '경위서').click()
  await expect(page.locator('.journey-report-paragraph')).toHaveCount(100)
  await expect(page.locator('.journey-report')).toContainText('삭제 후 다시 추가')
})

test('a limit reached during drafting explicitly rejects 101 and keeps the same focused editor', async ({ page }) => {
  await harness(page, 'report', 99)
  await button(page, '문장 추가').click(); const input = page.getByLabel('문장 내용', { exact: true })
  await input.fill('거절되어도 남아야 하는 101번째 문장')
  await input.evaluate((node: HTMLTextAreaElement) => { window.recordInput = node })
  await page.evaluate(async () => { await window.recordController.save({ type: 'paragraph-edit', id: 'racing-100', text: '먼저 저장된 100번째 문장', references: [] }) })
  await button(page, '정정 저장').click()
  await expect(page.getByText('경위서는 100문장까지 남길 수 있어요. 기존 문장을 수정하거나 제외해주세요.', { exact: true })).toBeVisible()
  await expect(input).toHaveValue('거절되어도 남아야 하는 101번째 문장')
  await expect(input).toBeFocused()
  expect(await input.evaluate(node => node === window.recordInput)).toBe(true)
  expect(await page.evaluate(() => window.recordController.value?.report?.paragraphs.length)).toBe(100)
  const rejected = await page.evaluate(() => window.recordController.save({ type: 'paragraph-edit', id: 'rejected-101', text: '추가 거절', references: [] }))
  expect(rejected).toMatchObject({ ok: false, reason: 'invalid', rejection: 'paragraph-limit' })
})

test('quota failure keeps the new report draft mounted and only durable success closes it', async ({ page }) => {
  await harness(page, 'report', 99)
  await button(page, '문장 추가').click(); const input = page.getByLabel('문장 내용', { exact: true })
  await input.fill('quota 뒤에도 보존할 문장'); await input.evaluate((node: HTMLTextAreaElement) => { window.recordInput = node })
  await blockWrites(page); await button(page, '정정 저장').click()
  await expect(page.getByText('저장하지 못했어요. 정정 내용은 이 화면에 남아 있어요.', { exact: true })).toBeVisible()
  await expect(input).toHaveValue('quota 뒤에도 보존할 문장'); await expect(input).toBeFocused()
  expect(await input.evaluate(node => node === window.recordInput)).toBe(true)
  await page.evaluate(() => window.recordRestorePut())
  await button(page, '정정 저장').click()
  await expect(input).toHaveCount(0)
  expect(await page.evaluate(() => window.recordController.saveState)).toBe('saved')
})

test('incoming state commits cannot close a voice save before its durable completion', async ({ page }) => {
  await harness(page, 'voice')
  await statement(page).fill('저장 중에도 유지할 진술')
  await page.evaluate(() => {
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { ...descriptor, set(handler) {
      if (this.mode !== 'readwrite') { descriptor.set!.call(this, handler); return }
      Object.defineProperty(IDBTransaction.prototype, 'oncomplete', descriptor)
      descriptor.set!.call(this, (event: Event) => {
        window.recordCommitWaiting = true
        window.recordReleaseCommit = () => handler.call(this, event)
      })
    } })
  })
  await button(page, '기록 저장').click()
  await expect.poll(() => page.evaluate(() => window.recordCommitWaiting)).toBe(true)
  await page.evaluate(() => {
    window.recordController.dispatch({ type: 'safety-action', action: { id: 'hazard', label: '비상등', status: 'user-confirmed', source: 'user', confirmedAt: null } })
  })
  await expect(page.locator('#record-reliability-harness [data-voice-phase]')).toHaveAttribute('data-voice-phase', 'saving')
  await expect(statement(page)).toHaveValue('저장 중에도 유지할 진술')
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toHaveCount(0)
  await page.evaluate(() => window.recordReleaseCommit())
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.recordController.value?.statements[0].text)).toBe('저장 중에도 유지할 진술')
})
