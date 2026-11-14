import { test, expect, type Page } from '@playwright/test'
import type { JourneyCase, CaseCommand, AssetWrite } from '../src/journey/case'
import type { JourneyCaseController } from '../src/journey/useJourneyCase'

declare global {
  interface Window {
    journeyController: JourneyCaseController
    mediaSave: { command: CaseCommand; assets: AssetWrite[] }
  }
}

async function setup(page: Page) {
  await page.goto('/?study=journey-catalog')
  await page.evaluate(async () => {
    const root = '/src/'
    const hookSource = await (await fetch(root + 'journey/useJourneyCase.ts')).text()
    const mainSource = await (await fetch(root + 'main.tsx')).text()
    const reactUrl = hookSource.match(/from "([^"]*\/react\.js[^\"]*)"/)![1]
    const clientUrl = mainSource.match(/from "([^"]*\/react-dom_client\.js[^\"]*)"/)![1]
    const React = (await import(reactUrl)).default as typeof import('react')
    const { createRoot } = (await import(clientUrl)).default as typeof import('react-dom/client')
    const { useJourneyCase } = await import(root + 'journey/useJourneyCase.ts')
    const caseDataUrl = hookSource.match(/from "([^"]*\/journey\/case-data\.tsx[^"]*)"/)![1]
    const { CaseDataProvider, studyCaseData } = await import(caseDataUrl)
    const { createCase } = await import(root + 'journey/case.ts')
    const { createSession } = await import(root + 'emergency/session.ts')
    const { commitCase } = await import(root + 'journey/case-store.ts')
    const value: JourneyCase = createCase(createSession('SC01', 'connected'), 'recovery-case', new Date().toISOString())
    value.stage = 'record'
    value.statements = [{ id: 'statement', text: '기존 기록', audioEvidenceIds: [], revision: 1, confirmedRevision: 1 }]
    await commitCase(value, null)
    function Harness() { window.journeyController = useJourneyCase(value.id); return null }
    const container = document.createElement('div')
    document.body.append(container)
    createRoot(container).render(React.createElement(CaseDataProvider, { data: studyCaseData, children: React.createElement(Harness) }))
  })
  await expect.poll(() => page.evaluate(() => window.journeyController?.value?.id)).toBe('recovery-case')
}

for (const kind of ['photo', 'audio', 'text'] as const) {
  test(`failed ${kind} save preserves prior content and urgent state, then retries the same asset once`, async ({ page }) => {
    await setup(page)
    const failed = await page.evaluate(async kind => {
      const controller = window.journeyController
      const blob = new Blob(['media'], { type: kind === 'photo' ? 'image/png' : 'audio/webm' })
      const evidence = { id: 'new-media', assetId: 'new-asset', kind: kind === 'photo' ? 'photo' as const : 'audio' as const, label: '새 기록', revision: 1, origin: 'user' as const,
        availability: 'available' as const, captureTarget: kind === 'photo' ? 'scene' as const : null,
        metadata: { mime: blob.type, bytes: blob.size, duration: kind === 'audio' ? 2 : null, capturedAt: null, sourceLabel: '직접 입력' } }
      window.mediaSave = {
        command: kind === 'photo' ? { type: 'evidence-put', evidence } : { type: 'voice-save', evidence: kind === 'text' ? [] : [evidence],
          statement: { id: 'statement', text: '새로 말한 내용', audioEvidenceIds: kind === 'text' ? [] : [evidence.id] } },
        assets: kind === 'text' ? [] : [{ id: evidence.assetId, caseId: controller.value!.id, blob }],
      }
      const original = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function () { throw new DOMException('No space', 'QuotaExceededError') }
      const pending = controller.save(window.mediaSave.command, window.mediaSave.assets)
      controller.dispatch({ type: 'observation', observation: { id: 'risk', kind: 'risk', label: '위험', value: '확인 필요',
        source: 'fixture', observedAt: null, confirmation: 'attention', legacyFactId: null, supersedes: null } })
      const result = await pending
      IDBObjectStore.prototype.put = original
      await controller.flush()
      return result.ok
    }, kind)
    expect(failed).toBe(false)
    await expect.poll(() => page.evaluate(() => window.journeyController.value?.stage)).toBe('response')
    const beforeRetry = await page.evaluate(() => window.journeyController.value!)
    expect(beforeRetry.evidence).toEqual([])
    expect(beforeRetry.evidenceHistory).toEqual([])
    expect(beforeRetry.statements[0].text).toBe('기존 기록')
    expect(beforeRetry.statements[0].confirmedRevision).toBe(1)
    expect(await page.evaluate(async () => (await window.journeyController.save(window.mediaSave.command, window.mediaSave.assets)).ok)).toBe(true)
    const afterRetry = await page.evaluate(async () => {
      const root = '/src/'
      const { loadCase } = await import(root + 'journey/case-store.ts')
      return await loadCase('recovery-case') as JourneyCase
    })
    expect(afterRetry.evidence).toHaveLength(kind === 'text' ? 0 : 1)
    expect(afterRetry.evidenceHistory).toEqual([])
    expect(afterRetry.stage).toBe('response')
    expect(afterRetry.returnStage).toBe('record')
    expect(afterRetry.statements[0].text).toBe(kind === 'photo' ? '기존 기록' : '새로 말한 내용')
  })
}

test('failed approval leaves no request, then duplicate approval commits exactly once', async ({ page }) => {
  await setup(page)
  const result = await page.evaluate(async () => {
    const controller = window.journeyController
    const casePath = '/src/journey/case.ts'
    const { preparePayload } = await import(/* @vite-ignore */ casePath) as typeof import('../src/journey/case')
    const selection = { observationIds: [], statementIds: ['statement'], evidenceIds: [], includeDiagram: false, includeReport: false }
    const payload = preparePayload(controller.value!, selection)
    if (!payload.ok) throw new Error(payload.reason)
    const input = { kind: 'submission' as const, agency: 'insurance' as const, recipient: '선택한 보험사', selection, id: 'approved-once', now: new Date().toISOString() }
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function () { throw new DOMException('No space', 'QuotaExceededError') }
    const failed = await controller.approve(input, payload.value)
    IDBObjectStore.prototype.put = original
    await controller.flush()
    const before = window.journeyController.value!.submissions.filter(item => item.kind === 'new').length
    const attempts = await Promise.all([controller.approve(input, payload.value), controller.approve(input, payload.value)])
    await controller.flush()
    return { failed: failed.ok, before, attempts: attempts.map(item => item.ok) }
  })
  expect(result).toEqual({ failed: false, before: 0, attempts: [true, false] })
  await expect.poll(() => page.evaluate(() => window.journeyController.value!.submissions.filter(item => item.kind === 'new').length)).toBe(1)
})

test('approval commit preserves an urgent event arriving during the transaction', async ({ page }) => {
  await setup(page)
  const result = await page.evaluate(async () => {
    const controller = window.journeyController
    const casePath = '/src/journey/case.ts'
    const { preparePayload } = await import(/* @vite-ignore */ casePath) as typeof import('../src/journey/case')
    const selection = { observationIds: [], statementIds: ['statement'], evidenceIds: [], includeDiagram: false, includeReport: false }
    const payload = preparePayload(controller.value!, selection)
    if (!payload.ok) throw new Error(payload.reason)
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      const request = original.apply(this, args)
      if (this.name === 'cases' && args[0].submissions.some((item: { id: string }) => item.id === 'urgent-approval')) {
        IDBObjectStore.prototype.put = original
        controller.dispatch({ type: 'observation', observation: { id: 'approval-risk', kind: 'risk', label: '위험', value: '확인 필요',
          source: 'fixture', observedAt: null, confirmation: 'attention', legacyFactId: null, supersedes: null } })
      }
      return request
    }
    const result = await controller.approve({ kind: 'submission', agency: 'insurance', recipient: '선택한 보험사', selection, id: 'urgent-approval', now: new Date().toISOString() }, payload.value)
    IDBObjectStore.prototype.put = original
    await controller.flush()
    const storePath = '/src/journey/case-store.ts'
    const { loadCase } = await import(/* @vite-ignore */ storePath) as typeof import('../src/journey/case-store')
    return { ok: result.ok, saved: await loadCase('recovery-case') as JourneyCase }
  })
  expect(result.ok).toBe(true)
  expect(result.saved.stage).toBe('response')
  expect(result.saved.returnStage).toBe('record')
  expect(result.saved.submissions.filter(item => item.kind === 'new')).toHaveLength(1)
  expect(result.saved.emergency.requests.insurance).toBe('sent')
  expect(result.saved.statements[0].text).toBe('기존 기록')
})
