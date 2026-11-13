# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: emergency-guidance-state.spec.ts >> same-scene persistence changes cancel success audio and remove durable-storage claims
- Location: tests/emergency-guidance-state.spec.ts:158:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: locator('.emergency-screen')
Expected: "record_saved"
Error: strict mode violation: locator('.emergency-screen') resolved to 2 elements:
    1) <section data-scenario="SC01" data-scene="connected" data-request-count="0" aria-label="시각 중심 사고 대응" data-surface-status="flat" data-care-motion-key="SC01/connected" class="emergency-screen ac-emergency ac-system">…</section> aka getByLabel('Response layout preview').getByLabel('시각 중심 사고 대응')
    2) <section data-scenario="SC02" data-request-count="0" aria-label="시각 중심 사고 대응" data-scene="record_saved" data-surface-status="flat" data-care-motion-key="SC02/record_saved" class="emergency-screen ac-emergency ac-system">…</section> aka getByRole('region', { name: '시각 중심 사고 대응' })

Call log:
  - Expect "toHaveAttribute" locator('.emergency-screen') with timeout 5000ms
  - waiting for locator('.emergency-screen')

```

# Page snapshot

```yaml
- region "시각 중심 사고 대응" [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - heading "차량 상태 · 진행 확인" [level=2] [ref=e14]
        - button "음성 안내 듣기" [ref=e15] [cursor=pointer]
      - generic [ref=e20]:
        - generic [ref=e21]:
          - term [ref=e22]: 차량 이동
          - definition [ref=e23]:
            - generic [ref=e24]: 이동 불가
        - generic [ref=e28]:
          - term [ref=e29]: 부상 여부
          - definition [ref=e30]:
            - generic [ref=e31]: 없음 확인
    - generic [ref=e36]:
      - generic [ref=e37]:
        - heading "사고 기록을 저장했어요" [level=1] [ref=e38]
        - paragraph [ref=e39]: 사고 기록을 저장했어요. 필요할 때 이어서 고칠 수 있어요.
      - generic [ref=e40]:
        - generic [ref=e41]: 이 기기에 보관된 기록
        - paragraph [ref=e42]: 정차 중 충격을 느꼈어요. 정확한 사고 경위는 확인 중이에요.
      - button "지원 상황으로" [ref=e44] [cursor=pointer]
    - heading "안전한 곳에서 기다리세요" [level=2] [ref=e51]
    - generic "기관별 요청 상태" [ref=e53]:
      - generic [ref=e54]:
        - term [ref=e55]: 구호
        - definition [ref=e56]:
          - strong [ref=e57]:
            - generic [ref=e58]: 요청 전
      - generic [ref=e65]:
        - term [ref=e66]: 차량 지원
        - definition [ref=e67]:
          - strong [ref=e68]:
            - generic [ref=e69]: 요청 전
      - generic [ref=e76]:
        - term [ref=e77]: 보험사
        - definition [ref=e78]:
          - strong [ref=e79]:
            - generic [ref=e80]: 요청 전
    - generic [ref=e88]:
      - heading "위치 확인 중" [level=2] [ref=e92]
      - paragraph [ref=e93]: 아직 안내 지점이 확인되지 않았어요.
    - button "기록 고치기" [ref=e96] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | import variants from '../src/audio/emergency-guidance.json' with { type: 'json' }
  3   | import type { Session } from '../src/emergency/session'
  4   | import type * as ReactRuntime from './react-runtime'
  5   | import type * as SessionModule from '../src/emergency/session'
  6   | import type * as GuidanceModule from '../src/emergency/guidance'
  7   | import type * as SurfaceModule from '../src/emergency/EmergencySurface'
  8   | import type * as AudioModule from '../src/audio/useGuidanceAudio'
  9   | 
  10  | declare global {
  11  |   interface Window {
  12  |     guidanceCalls: { src: string; paused: boolean }[]
  13  |     guidanceFails: boolean
  14  |     guidanceEnd: (index: number) => void
  15  |     guidancePatch: (change: { insurance?: string; persistent?: boolean }) => void
  16  |     guidanceSession: Session
  17  |     guidanceContext: string
  18  |   }
  19  | }
  20  | function playback() {
  21  |   window.guidanceCalls = []; window.guidanceFails = false
  22  |   const instances: EventTarget[] = []
  23  |   class Playback extends EventTarget {
  24  |     preload = ''; record: { src: string; paused: boolean }
  25  |     constructor(src = '') { super(); this.record = { src, paused: false }; window.guidanceCalls.push(this.record); instances.push(this) }
  26  |     play() { if (window.guidanceFails) return Promise.reject(new Error('unavailable')); this.dispatchEvent(new Event('playing')); return Promise.resolve() }
  27  |     pause() { this.record.paused = true }
  28  |     removeAttribute() {} load() {}
  29  |   }
  30  |   window.guidanceEnd = index => instances[index].dispatchEvent(new Event('ended'))
  31  |   Object.defineProperty(window, 'Audio', { value: Playback })
  32  | }
  33  | const surface = (page: Page) => page.locator('.emergency-screen')
  34  | const touch = (page: Page, name: string) => surface(page).getByRole('button', { name, exact: true }).click()
  35  | async function currentScript(page: Page) {
  36  |   await page.getByRole('button', { name: '현재 장면 spec', exact: true }).click()
  37  |   return page.locator('#emergency-spec h3').filter({ hasText: '음성 원고' }).locator('+ p').innerText()
  38  | }
  39  | async function mount(page: Page, sceneId: string) {
  40  |   await page.addInitScript(playback)
  41  |   await page.goto('/?study=design-system')
  42  |   await page.evaluate(async sceneId => {
  43  |     const paths = { runtime: '/tests/react-runtime.ts', domain: '/src/emergency/session.ts', resolver: '/src/emergency/guidance.ts', surface: '/src/emergency/EmergencySurface.tsx', audio: '/src/audio/useGuidanceAudio.ts' }
  44  |     // Browser-side module loading must use Vite's runtime, not Playwright's Node module instances.
  45  |     const { React, createRoot } = await import(paths.runtime) as typeof ReactRuntime
  46  |     const { createSession, sceneFor } = await import(paths.domain) as typeof SessionModule
  47  |     const { resolveGuidance } = await import(paths.resolver) as typeof GuidanceModule
  48  |     const { EmergencySurface } = await import(paths.surface) as typeof SurfaceModule
  49  |     const { useGuidanceAudio } = await import(paths.audio) as typeof AudioModule
  50  |     function App() {
  51  |       const [session, setSession] = React.useState(() => createSession(sceneId === 'record_saved' ? 'SC02' : 'SC04', sceneId))
  52  |       const [persistent, setPersistent] = React.useState(true)
  53  |       const heading = React.useRef<HTMLHeadingElement>(null)
  54  |       const guidance = resolveGuidance(session, sceneFor(session), persistent)
  55  |       const audio = useGuidanceAudio({ text: guidance.text, key: guidance.contextKey })
  56  |       window.guidanceSession = session; window.guidanceContext = guidance.contextKey
  57  |       window.guidancePatch = change => {
  58  |         if (change.insurance) setSession(value => ({ ...value, requests: { ...value.requests, insurance: change.insurance! } }))
  59  |         if (change.persistent !== undefined) setPersistent(change.persistent)
  60  |       }
  61  |       return React.createElement(React.Fragment, {},
  62  |         React.createElement(EmergencySurface, { selection: session, paused: false, present: 'off', voiceState: audio.state, storageAvailable: persistent, countdownKey: sceneId, secondsLeft: 0, heading, onAction: () => {}, onCancel: () => {}, onVoice: audio.toggle, onEditDraft: () => {} }),
  63  |         audio.state === 'error' ? React.createElement('p', { role: 'status' }, '음성 재생을 사용할 수 없어요. 음성 원고: ' + guidance.text) : null)
  64  |     }
  65  |     document.getElementById('root')!.hidden = true
  66  |     const target = document.createElement('div'); document.body.append(target)
  67  |     createRoot(target).render(React.createElement(App))
  68  |   }, sceneId)
> 69  |   await expect(surface(page)).toHaveAttribute('data-scene', sceneId)
      |                               ^ Error: expect(locator).toHaveAttribute(expected) failed
  70  | }
  71  | 
  72  | test('blocked record storage shares the exact failure script with the surface and error fallback', async ({ page }) => {
  73  |   await page.addInitScript(playback)
  74  |   await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError') } })
  75  |   await page.goto('/?study=emergency&scenario=SC02&scene=record')
  76  |   await page.locator('#accident-record').fill('현재 입력만 남아 있어요.')
  77  |   await touch(page, '기록 저장')
  78  |   await expect(surface(page).getByRole('heading', { name: '기기에 저장하지 못했어요' })).toBeVisible()
  79  |   await expect(surface(page)).toContainText(variants.record_storage_failed)
  80  |   await expect(surface(page)).not.toContainText('기록은 이 기기에 보관돼요')
  81  |   expect(await currentScript(page)).toBe(variants.record_storage_failed)
  82  |   await page.evaluate(() => { window.guidanceFails = true })
  83  |   await touch(page, '음성 안내 듣기')
  84  |   await expect(page.getByRole('status')).toContainText(variants.record_storage_failed)
  85  |   await expect(page.getByRole('status')).not.toContainText('사고 기록을 저장했어요')
  86  | })
  87  | 
  88  | for (const decision of ['보내지 않기', '나중에 보내기']) test(`SC04 ${decision} retains its actual decision through support and pause`, async ({ page }) => {
  89  |   await page.addInitScript(playback)
  90  |   await page.goto('/?study=emergency&scenario=SC04&scene=review')
  91  |   await touch(page, decision)
  92  |   const before = await page.evaluate(() => JSON.parse(localStorage.getItem('after-care-session-v1-SC04')!))
  93  |   const expected = decision === '보내지 않기' ? '보험사에 보내지 않았어요.' : '전송을 보류했어요.'
  94  |   await touch(page, '다른 지원 확인')
  95  |   await expect(surface(page)).toContainText(expected)
  96  |   await touch(page, '음성 안내 듣기')
  97  |   const first = await page.evaluate(() => window.guidanceCalls.at(-1)!.src)
  98  |   await touch(page, '나중에 이어하기')
  99  |   await expect(surface(page)).toHaveAttribute('data-scene', 'paused')
  100 |   await expect(surface(page)).toContainText(expected)
  101 |   await touch(page, '음성 안내 듣기')
  102 |   expect(await page.evaluate(() => window.guidanceCalls.at(-1)!.src)).toBe(first)
  103 |   const after = await page.evaluate(() => JSON.parse(localStorage.getItem('after-care-session-v1-SC04')!))
  104 |   expect(after.requests).toEqual(before.requests)
  105 |   expect(after.requestId).toBe(before.requestId); expect(after.submissions).toBe(before.submissions)
  106 |   expect(after.approvedScope).toEqual(before.approvedScope)
  107 |   if (decision === '보내지 않기') {
  108 |     await expect(surface(page)).not.toContainText('보류')
  109 |     expect(await currentScript(page)).not.toContain('보류')
  110 |   }
  111 | })
  112 | 
  113 | for (const sceneId of ['support', 'paused']) test(`SC04 ${sceneId} selects every insurance state without mutating the request`, async ({ page }) => {
  114 |   await mount(page, sceneId)
  115 |   const cases = [
  116 |     ['declined', '거절 유지', 'declined'], ['deferred', '보류 유지', 'deferred'], ['not_sent', '요청 전', 'declined'],
  117 |     ['sent', '전송됨', 'sent'], ['unknown', '접수 미확인', 'insurance_unconfirmed'], ['checking', '접수 확인 중', 'checking'],
  118 |     ['received', '접수 확인', 'received'], ['failed', '전송 실패', 'failed'], ['not_received', '미접수 확인', 'insurance_not_received'],
  119 |     ['connected', '통화 연결', 'insurance_unconfirmed'], ['connection_unknown', '연결 미확인', 'insurance_unconfirmed'],
  120 |   ]
  121 |   for (const [status, label, source] of cases) {
  122 |     await page.evaluate(insurance => window.guidancePatch({ insurance }), status)
  123 |     await expect(surface(page).locator('[data-workflow="support"]')).toContainText(label)
  124 |     if (status === 'failed') await expect(surface(page).locator('[data-workflow="support"]')).not.toContainText('접수되지 않음')
  125 |     const expected = await page.evaluate(async source => {
  126 |       // Browser-side lookup must share Vite's manifest and runtime-variant JSON.
  127 |       const path = '/src/emergency/session.ts', audioPath = '/src/audio/manifest.ts', variantsPath = '/src/audio/emergency-guidance.json'
  128 |       const { scenarioFor } = await import(path); const { guidanceAsset } = await import(audioPath)
  129 |       const variants = (await import(variantsPath)).default
  130 |       const text = variants[source] ?? scenarioFor('SC04').states.find((state: { id: string }) => state.id === source)!.voice
  131 |       return { text, path: guidanceAsset(text)?.path }
  132 |     }, source)
  133 |     await expect(surface(page)).toContainText(expected.text)
  134 |     expect(expected.path, 'C05 requires the exact real asset for this reachable guidance').toBeDefined()
  135 |     const before = await page.evaluate(() => JSON.stringify(window.guidanceSession))
  136 |     await touch(page, '음성 안내 듣기')
  137 |     expect(await page.evaluate(() => window.guidanceCalls.at(-1)!.src)).toBe(expected.path)
  138 |     expect(await page.evaluate(() => JSON.stringify(window.guidanceSession))).toBe(before)
  139 |   }
  140 | })
  141 | 
  142 | test('same-scene request changes stop audio, reject stale completion and use the latest script', async ({ page }) => {
  143 |   await mount(page, 'support')
  144 |   await page.evaluate(() => window.guidancePatch({ insurance: 'declined' }))
  145 |   await expect(surface(page)).toContainText('거절 유지')
  146 |   await touch(page, '음성 안내 듣기')
  147 |   const context = await page.evaluate(() => window.guidanceContext)
  148 |   await page.evaluate(() => window.guidancePatch({ insurance: 'deferred' }))
  149 |   await expect(surface(page)).toContainText('보류 유지')
  150 |   expect(await page.evaluate(() => window.guidanceCalls[0].paused)).toBe(true)
  151 |   expect(await page.evaluate(() => window.guidanceContext)).not.toBe(context)
  152 |   await touch(page, '음성 안내 듣기')
  153 |   await page.evaluate(() => window.guidanceEnd(0))
  154 |   await expect(surface(page).getByRole('button', { name: '음성 안내 중지', exact: true })).toBeVisible()
  155 |   expect(await page.evaluate(() => window.guidanceCalls[1].paused)).toBe(false)
  156 | })
  157 | 
  158 | test('same-scene persistence changes cancel success audio and remove durable-storage claims', async ({ page }) => {
  159 |   await mount(page, 'record_saved')
  160 |   await touch(page, '음성 안내 듣기')
  161 |   await page.evaluate(() => window.guidancePatch({ persistent: false }))
  162 |   await expect(surface(page)).toContainText(variants.record_storage_failed)
  163 |   expect(await page.evaluate(() => window.guidanceCalls[0].paused)).toBe(true)
  164 |   await page.evaluate(() => { window.guidanceFails = true })
  165 |   await touch(page, '음성 안내 듣기')
  166 |   await expect(page.getByRole('status')).toContainText(variants.record_storage_failed)
  167 | })
  168 | 
  169 | test('deferred storage failure never promises that the record is kept on this device', async ({ page }) => {
```