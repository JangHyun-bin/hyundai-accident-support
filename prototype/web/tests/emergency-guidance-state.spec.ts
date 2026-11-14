import { expect, test, type Page } from '@playwright/test'
import variants from '../src/audio/emergency-guidance.json' with { type: 'json' }
import type { Session } from '../src/emergency/session'
import type * as ReactRuntime from './react-runtime'
import type * as SessionModule from '../src/emergency/session'
import type * as GuidanceModule from '../src/emergency/guidance'
import type * as SurfaceModule from '../src/emergency/EmergencySurface'

declare global {
  interface Window {
    guidanceCalls: { src: string; paused: boolean }[]
    guidanceFails: boolean
    guidanceEnd: (index: number) => void
    guidancePatch: (change: { insurance?: string; persistent?: boolean }) => void
    guidanceSession: Session
    guidanceContext: string
  }
}
function playback() {
  window.guidanceCalls = []; window.guidanceFails = false
  const instances: { record: { src: string; paused: boolean }; dispatchEvent: (event: Event) => boolean }[] = []
  class Playback extends EventTarget {
    preload = ''; record: { src: string; paused: boolean }
    constructor(src = '') { super(); this.record = { src, paused: false }; window.guidanceCalls.push(this.record); instances.push(this) }
    play() { if (window.guidanceFails) return Promise.reject(new Error('unavailable')); this.dispatchEvent(new Event('playing')); return Promise.resolve() }
    pause() { this.record.paused = true }
    removeAttribute() {} load() {}
  }
  window.guidanceEnd = index => instances.find(instance => instance.record === window.guidanceCalls[index])!.dispatchEvent(new Event('ended'))
  Object.defineProperty(window, 'Audio', { value: Playback })
}
const surface = (page: Page) => page.locator('.emergency-screen:visible')
const touch = (page: Page, name: string) => surface(page).getByRole('button', { name, exact: true }).click()
const calls = (page: Page) => page.evaluate(() => window.guidanceCalls.length)
const latest = (page: Page) => page.evaluate(() => window.guidanceCalls.at(-1)?.src)
async function currentScript(page: Page) {
  await page.getByRole('button', { name: '현재 장면 spec', exact: true }).click()
  return page.locator('#emergency-spec h3').filter({ hasText: '음성 원고' }).locator('+ p').innerText()
}
async function mount(page: Page, sceneId: string) {
  await page.addInitScript(playback)
  await page.goto('/?study=design-system')
  // Guidance speaks only after a driver gesture, so the harness presses a key before the surface mounts.
  await page.keyboard.press('Shift')
  await page.evaluate(async sceneId => {
    const paths = { runtime: '/tests/react-runtime.ts', domain: '/src/emergency/session.ts', resolver: '/src/emergency/guidance.ts', surface: '/src/emergency/EmergencySurface.tsx' }
    // Browser-side module loading must use Vite's runtime, not Playwright's Node module instances.
    const { React, createRoot } = await import(paths.runtime) as typeof ReactRuntime
    const { createSession, sceneFor } = await import(paths.domain) as typeof SessionModule
    const { resolveGuidance } = await import(paths.resolver) as typeof GuidanceModule
    const { EmergencySurface } = await import(paths.surface) as typeof SurfaceModule
    function App() {
      const [session, setSession] = React.useState(() => createSession(sceneId === 'record_saved' ? 'SC02' : 'SC04', sceneId))
      const [persistent, setPersistent] = React.useState(true)
      const heading = React.useRef<HTMLHeadingElement>(null)
      const guidance = resolveGuidance(session, sceneFor(session), persistent)
      window.guidanceSession = session; window.guidanceContext = guidance.contextKey
      window.guidancePatch = change => {
        if (change.insurance) setSession(value => ({ ...value, requests: { ...value.requests, insurance: change.insurance! } }))
        if (change.persistent !== undefined) setPersistent(change.persistent)
      }
      return React.createElement(EmergencySurface, { selection: session, paused: false, present: 'off', storageAvailable: persistent, countdownKey: sceneId, secondsLeft: 0, heading, onAction: () => {}, onCancel: () => {}, onEditDraft: () => {} })
    }
    // The hidden catalog behind the harness may already have spoken; count only the surface under test.
    document.getElementById('root')!.hidden = true; window.guidanceCalls = []
    const target = document.createElement('div'); document.body.append(target)
    createRoot(target).render(React.createElement(App))
  }, sceneId)
  await expect(surface(page)).toHaveAttribute('data-scene', sceneId)
}

test('blocked record storage shares the exact failure script with the surface and error fallback', async ({ page }) => {
  await page.addInitScript(playback)
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError') } })
  await page.goto('/?study=emergency&scenario=SC02&scene=record')
  await page.locator('#accident-record').fill('현재 입력만 남아 있어요.')
  await page.evaluate(() => { window.guidanceFails = true })
  await touch(page, '기록 저장')
  await expect(surface(page).getByRole('heading', { name: '기기에 저장하지 못했어요' })).toBeVisible()
  await expect(surface(page)).toContainText(variants.record_storage_failed)
  await expect(surface(page)).not.toContainText('기록은 이 기기에 보관돼요')
  expect(await currentScript(page)).toBe(variants.record_storage_failed)
  await expect(surface(page).getByRole('status')).toContainText(variants.record_storage_failed)
  await expect(surface(page).getByRole('status')).not.toContainText('사고 기록을 저장했어요')
})

for (const decision of ['보내지 않기', '나중에 보내기']) test(`SC04 ${decision} retains its actual decision through support and pause`, async ({ page }) => {
  await page.addInitScript(playback)
  await page.goto('/?study=emergency&scenario=SC04&scene=review')
  await touch(page, decision)
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('after-care-session-v1-SC04')!))
  const expected = decision === '보내지 않기' ? '보험사에 보내지 않았어요.' : '전송을 보류했어요.'
  await touch(page, '다른 지원 확인')
  await expect(surface(page)).toContainText(expected)
  await expect.poll(() => calls(page)).toBeGreaterThan(0)
  const first = await latest(page), count = await calls(page)
  await touch(page, '나중에 이어하기')
  await expect(surface(page)).toHaveAttribute('data-scene', 'paused')
  await expect(surface(page)).toContainText(expected)
  await expect.poll(() => calls(page)).toBeGreaterThan(count)
  expect(await latest(page)).toBe(first)
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('after-care-session-v1-SC04')!))
  expect(after.requests).toEqual(before.requests)
  expect(after.requestId).toBe(before.requestId); expect(after.submissions).toBe(before.submissions)
  expect(after.approvedScope).toEqual(before.approvedScope)
  if (decision === '보내지 않기') {
    await expect(surface(page)).not.toContainText('보류')
    expect(await currentScript(page)).not.toContain('보류')
  }
})

const insuranceGuidanceStates = [
  ['declined', '거절 유지', 'declined'], ['deferred', '보류 유지', 'deferred'], ['not_sent', '요청 전', 'declined'],
  ['sent', '전송됨', 'sent'], ['unknown', '접수 미확인', 'insurance_unconfirmed'], ['checking', '접수 확인 중', 'checking'],
  ['received', '접수 확인', 'received'], ['failed', '전송 실패', 'failed'], ['not_received', '미접수 확인', 'insurance_not_received'],
  ['connected', '통화 연결', 'insurance_unconfirmed'], ['connection_unknown', '연결 미확인', 'insurance_unconfirmed'],
]
for (const sceneId of ['support', 'paused']) for (const [status, label, source] of insuranceGuidanceStates) test(`SC04 ${sceneId}/${status} keeps the actual decision without mutating the request`, async ({ page }) => {
  await mount(page, sceneId)
  await page.evaluate(insurance => window.guidancePatch({ insurance }), status)
  await expect(surface(page).locator('[data-workflow="support"]')).toContainText(label)
  await expect(surface(page).locator('[data-slot="detected"]')).toContainText(label)
  if (status === 'failed') await expect(surface(page).locator('[data-workflow="support"]')).not.toContainText('접수되지 않음')
  const expected = await page.evaluate(async source => {
    // Static Node imports cannot enter this callback; load the actual Vite/browser module instances.
    const path = '/src/emergency/session.ts', audioPath = '/src/audio/manifest.ts', variantsPath = '/src/audio/emergency-guidance.json'
    const { scenarioFor } = await import(path); const { guidanceAsset } = await import(audioPath)
    const variants = (await import(variantsPath)).default
    const text = variants[source] ?? scenarioFor('SC04').states.find((state: { id: string }) => state.id === source)!.voice
    return { text, path: guidanceAsset(text)?.path }
  }, source)
  await expect(surface(page)).toContainText(expected.text)
  const before = await page.evaluate(() => JSON.stringify(window.guidanceSession))
  if (expected.path) await expect.poll(() => latest(page)).toBe(expected.path)
  else await expect(surface(page).getByRole('status')).toContainText(expected.text)
  expect(await page.evaluate(() => JSON.stringify(window.guidanceSession))).toBe(before)
  expect(expected.path, 'C05 requires the exact real asset for this reachable guidance').toBeDefined()
})

test('same-scene request changes stop audio, reject stale completion and use the latest script', async ({ page }) => {
  await mount(page, 'support')
  await page.evaluate(() => window.guidancePatch({ insurance: 'declined' }))
  await expect(surface(page)).toContainText('거절 유지')
  await expect.poll(() => calls(page)).toBe(2)
  const context = await page.evaluate(() => window.guidanceContext)
  await page.evaluate(() => window.guidancePatch({ insurance: 'deferred' }))
  await expect(surface(page)).toContainText('보류 유지')
  await expect.poll(() => calls(page)).toBe(3)
  expect(await page.evaluate(() => window.guidanceCalls[1].paused)).toBe(true)
  expect(await page.evaluate(() => window.guidanceContext)).not.toBe(context)
  await page.evaluate(() => window.guidanceEnd(1))
  await expect(surface(page).locator('[data-guidance-state]')).toHaveAttribute('data-guidance-state', 'speaking')
  expect(await page.evaluate(() => window.guidanceCalls[2].paused)).toBe(false)
})

test('same-scene persistence changes cancel success audio and remove durable-storage claims', async ({ page }) => {
  await mount(page, 'record_saved')
  await expect.poll(() => calls(page)).toBe(1)
  await page.evaluate(() => { window.guidanceFails = true })
  await page.evaluate(() => window.guidancePatch({ persistent: false }))
  await expect(surface(page)).toContainText(variants.record_storage_failed)
  expect(await page.evaluate(() => window.guidanceCalls[0].paused)).toBe(true)
  await expect(surface(page).getByRole('status')).toContainText(variants.record_storage_failed)
})

test('deferred storage failure never promises that the record is kept on this device', async ({ page }) => {
  await mount(page, 'support')
  await page.evaluate(() => { window.guidanceFails = true })
  await page.evaluate(() => window.guidancePatch({ insurance: 'deferred', persistent: false }))
  await expect(surface(page)).toContainText(variants.deferred_storage_failed)
  await expect(surface(page)).not.toContainText('기록은 보관돼요')
  await expect(surface(page).getByRole('status')).toContainText(variants.deferred_storage_failed)
})

for (const change of [{ insurance: 'declined' }, { persistent: false }]) test(`same-script context change ${Object.keys(change)[0]} still cancels playback`, async ({ page }) => {
  await mount(page, 'support')
  await expect.poll(() => calls(page)).toBe(1)
  const context = await page.evaluate(() => window.guidanceContext)
  const source = await page.evaluate(() => window.guidanceCalls[0].src)
  await page.evaluate(change => window.guidancePatch(change), change)
  await expect.poll(() => page.evaluate(() => window.guidanceContext)).not.toBe(context)
  expect(await page.evaluate(() => window.guidanceCalls[0].paused)).toBe(true)
  await expect.poll(() => calls(page)).toBe(2)
  expect(await page.evaluate(() => window.guidanceCalls[1].src)).toBe(source)
})

test('storage warnings do not delay the emergency countdown or submit a request', async ({ page }) => {
  await page.clock.install()
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError') } })
  await page.goto('/?study=emergency&scenario=SC01')
  await expect(page.getByRole('alert')).toContainText('보관할 수 없어요')
  await expect(surface(page).locator('[data-countdown]')).toHaveAttribute('data-countdown', '10')
  await page.clock.runFor(4_000)
  await expect(surface(page).locator('[data-countdown]')).toHaveAttribute('data-countdown', '6')
  await page.clock.runFor(6_000)
  await expect(surface(page)).toHaveAttribute('data-scene', 'auto_contact')
  await expect(surface(page)).toHaveAttribute('data-request-count', '0')
  await expect(surface(page).locator('[data-request="rescue"] strong')).toHaveText('연결 미확인')
})
