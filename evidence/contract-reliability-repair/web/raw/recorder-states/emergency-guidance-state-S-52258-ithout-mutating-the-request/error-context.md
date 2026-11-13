# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: emergency-guidance-state.spec.ts >> SC04 support/connection_unknown keeps the actual decision without mutating the request
- Location: tests/emergency-guidance-state.spec.ts:119:109

# Error details

```
Error: C05 requires the exact real asset for this reachable guidance

expect(received).toBeDefined()

Received: undefined
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "시각 중심 사고 대응" [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - heading "사고 기록 · 연결 미확인 · 접수 미확인" [level=2] [ref=e14]
          - button "음성 안내 듣기" [active] [ref=e15] [cursor=pointer]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - term [ref=e22]: 사고 기록
            - definition [ref=e23]:
              - generic [ref=e24]: 초안 있음
          - generic [ref=e28]:
            - term [ref=e29]: 전송 승인
            - definition [ref=e30]:
              - generic [ref=e31]: 승인 전
      - generic [ref=e37]:
        - generic [ref=e38]:
          - heading "다른 지원은 계속 진행돼요" [level=1] [ref=e39]
          - paragraph [ref=e40]: 보험 접수는 아직 확인되지 않았어요. 전송과 접수는 별도로 확인해요. 구호·차량 지원은 계속 진행돼요.
        - generic [ref=e42]:
          - generic [ref=e43]:
            - term [ref=e44]: 구호·차량 지원
            - definition [ref=e45]: 접수 확인 · 도착은 별도 확인
          - generic [ref=e46]:
            - term [ref=e47]: 보험사 전송
            - definition [ref=e48]: 연결 미확인 · 접수 미확인
        - generic [ref=e49]:
          - button "보험사 전송 다시 검토" [ref=e50] [cursor=pointer]
          - button "나중에 이어하기" [ref=e51] [cursor=pointer]
      - heading "안전한 곳에서 기다리세요" [level=2] [ref=e58]
      - generic "기관별 요청 상태" [ref=e60]:
        - generic [ref=e61]:
          - term [ref=e62]: 구호
          - definition [ref=e63]:
            - strong [ref=e64]:
              - generic [ref=e65]: 접수 확인
        - generic [ref=e71]:
          - term [ref=e72]: 차량 지원
          - definition [ref=e73]:
            - strong [ref=e74]:
              - generic [ref=e75]: 접수 확인
        - generic [ref=e81]:
          - term [ref=e82]: 보험사
          - definition [ref=e83]:
            - strong [ref=e84]:
              - generic [ref=e85]: 연결 미확인
      - generic [ref=e93]:
        - heading "위치 확인 중" [level=2] [ref=e97]
        - paragraph [ref=e98]: 아직 안내 지점이 확인되지 않았어요.
  - status [ref=e100]: "음성 재생을 사용할 수 없어요. 음성 원고: 보험 접수는 아직 확인되지 않았어요. 전송과 접수는 별도로 확인해요. 구호·차량 지원은 계속 진행돼요."
```

# Test source

```ts
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
  69  |   await expect(surface(page)).toHaveAttribute('data-scene', sceneId)
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
  113 | const insuranceGuidanceStates = [
  114 |   ['declined', '거절 유지', 'declined'], ['deferred', '보류 유지', 'deferred'], ['not_sent', '요청 전', 'declined'],
  115 |   ['sent', '전송됨', 'sent'], ['unknown', '접수 미확인', 'insurance_unconfirmed'], ['checking', '접수 확인 중', 'checking'],
  116 |   ['received', '접수 확인', 'received'], ['failed', '전송 실패', 'failed'], ['not_received', '미접수 확인', 'insurance_not_received'],
  117 |   ['connected', '통화 연결', 'insurance_unconfirmed'], ['connection_unknown', '연결 미확인', 'insurance_unconfirmed'],
  118 | ]
  119 | for (const sceneId of ['support', 'paused']) for (const [status, label, source] of insuranceGuidanceStates) test(`SC04 ${sceneId}/${status} keeps the actual decision without mutating the request`, async ({ page }) => {
  120 |   await mount(page, sceneId)
  121 |   await page.evaluate(insurance => window.guidancePatch({ insurance }), status)
  122 |   await expect(surface(page).locator('[data-workflow="support"]')).toContainText(label)
  123 |   await expect(surface(page).locator('[data-slot="detected"]')).toContainText(label)
  124 |   if (status === 'failed') await expect(surface(page).locator('[data-workflow="support"]')).not.toContainText('접수되지 않음')
  125 |   const expected = await page.evaluate(async source => {
  126 |     // Static Node imports cannot enter this callback; load the actual Vite/browser module instances.
  127 |     const path = '/src/emergency/session.ts', audioPath = '/src/audio/manifest.ts', variantsPath = '/src/audio/emergency-guidance.json'
  128 |     const { scenarioFor } = await import(path); const { guidanceAsset } = await import(audioPath)
  129 |     const variants = (await import(variantsPath)).default
  130 |     const text = variants[source] ?? scenarioFor('SC04').states.find((state: { id: string }) => state.id === source)!.voice
  131 |     return { text, path: guidanceAsset(text)?.path }
  132 |   }, source)
  133 |   await expect(surface(page)).toContainText(expected.text)
  134 |   const before = await page.evaluate(() => JSON.stringify(window.guidanceSession))
  135 |   await touch(page, '음성 안내 듣기')
  136 |   if (expected.path) expect(await page.evaluate(() => window.guidanceCalls.at(-1)!.src)).toBe(expected.path)
  137 |   else await expect(page.getByRole('status')).toContainText(expected.text)
  138 |   expect(await page.evaluate(() => JSON.stringify(window.guidanceSession))).toBe(before)
> 139 |   expect(expected.path, 'C05 requires the exact real asset for this reachable guidance').toBeDefined()
      |                                                                                          ^ Error: C05 requires the exact real asset for this reachable guidance
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
  170 |   await mount(page, 'support')
  171 |   await page.evaluate(() => window.guidancePatch({ insurance: 'deferred', persistent: false }))
  172 |   await expect(surface(page)).toContainText(variants.deferred_storage_failed)
  173 |   await expect(surface(page)).not.toContainText('기록은 보관돼요')
  174 |   await page.evaluate(() => { window.guidanceFails = true })
  175 |   await touch(page, '음성 안내 듣기')
  176 |   await expect(page.getByRole('status')).toContainText(variants.deferred_storage_failed)
  177 | })
  178 | 
  179 | for (const change of [{ insurance: 'declined' }, { persistent: false }]) test(`same-script context change ${Object.keys(change)[0]} still cancels playback`, async ({ page }) => {
  180 |   await mount(page, 'support')
  181 |   await touch(page, '음성 안내 듣기')
  182 |   const context = await page.evaluate(() => window.guidanceContext)
  183 |   const source = await page.evaluate(() => window.guidanceCalls[0].src)
  184 |   await page.evaluate(change => window.guidancePatch(change), change)
  185 |   await expect.poll(() => page.evaluate(() => window.guidanceContext)).not.toBe(context)
  186 |   expect(await page.evaluate(() => window.guidanceCalls[0].paused)).toBe(true)
  187 |   await touch(page, '음성 안내 듣기')
  188 |   expect(await page.evaluate(() => window.guidanceCalls[1].src)).toBe(source)
  189 | })
  190 | 
  191 | test('storage warnings do not delay the emergency countdown or submit a request', async ({ page }) => {
  192 |   await page.clock.install()
  193 |   await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError') } })
  194 |   await page.goto('/?study=emergency&scenario=SC01')
  195 |   await expect(page.getByRole('alert')).toContainText('보관할 수 없어요')
  196 |   await expect(surface(page).locator('[data-countdown]')).toHaveAttribute('data-countdown', '10')
  197 |   await page.clock.runFor(4_000)
  198 |   await expect(surface(page).locator('[data-countdown]')).toHaveAttribute('data-countdown', '6')
  199 |   await page.clock.runFor(6_000)
  200 |   await expect(surface(page)).toHaveAttribute('data-scene', 'auto_contact')
  201 |   await expect(surface(page)).toHaveAttribute('data-request-count', '0')
  202 |   await expect(surface(page).locator('[data-request="rescue"] strong')).toHaveText('연결 미확인')
  203 | })
  204 | 
```