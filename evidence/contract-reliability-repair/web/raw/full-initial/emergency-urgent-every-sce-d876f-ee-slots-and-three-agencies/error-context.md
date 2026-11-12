# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: emergency-urgent.spec.ts >> every_scene_has_three_slots_and_three_agencies
- Location: tests/emergency-urgent.spec.ts:17:1

# Error details

```
Error: SC04/deferred

expect(locator).toContainText(expected) failed

Locator: getByRole('region', { name: '시각 중심 사고 대응' }).locator('[data-slot="detected"]')
Expected substring: "전송 보류"
Received string:    "사고 기록 · 보류 유지 · 보내지 않음음성 안내 듣기사고 기록초안 있음전송 승인승인 전"
Timeout: 5000ms

Call log:
  - SC04/deferred getByRole('region', { name: '시각 중심 사고 대응' }).locator('[data-slot="detected"]') with timeout 5000ms
  - waiting for getByRole('region', { name: '시각 중심 사고 대응' }).locator('[data-slot="detected"]')
    14 × locator resolved to <div data-slot="detected">…</div>
       - unexpected value "사고 기록 · 보류 유지 · 보내지 않음음성 안내 듣기사고 기록초안 있음전송 승인승인 전"

```

```yaml
- heading "사고 기록 · 보류 유지 · 보내지 않음" [level=2]
- button "음성 안내 듣기"
- term: 사고 기록
- definition: 초안 있음
- term: 전송 승인
- definition: 승인 전
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | import {mockGuidanceAudio} from './guidance-mock'
  3   | import assets from '../src/audio/assets.json' with {type:'json'}
  4   | import manifest from '../../../specs/emergency-experience/scenarios.json' with { type: 'json' }
  5   | 
  6   | type Scene = (typeof manifest.scenarios)[number]['states'][number] & { phase: string; self_action?: { id: string; condition?: string; now: string; next?: string } }
  7   | const scenes = manifest.scenarios.flatMap(scenario => (scenario.states as Scene[]).map(scene => ({ scenario, scene })))
  8   | const contrast = (a: number[], b: number[]) => {
  9   |   const luminance = (rgb: number[]) => rgb.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
  10  |   const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  11  |   return (high + .05) / (low + .05)
  12  | }
  13  | const channels = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number)
  14  | 
  15  | test.setTimeout(120_000)
  16  | 
  17  | test('every_scene_has_three_slots_and_three_agencies', async ({ page }) => {
  18  |   for (const { scenario, scene } of scenes) {
  19  |     await page.goto(`/?study=emergency&scenario=${scenario.id}&scene=${scene.id}`)
  20  |     const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  21  |     const where = `${scenario.id}/${scene.id}`
  22  |     for (const slot of ['detected', 'car', 'self']) await expect(screen.locator(`[data-slot="${slot}"]`), `${where} ${slot}`).toBeVisible()
  23  |     await expect(screen.locator('[data-slot="car"] h1'), where).toHaveText(scene.title)
> 24  |     await expect(screen.locator('[data-slot="detected"]'), where).toContainText(scene.cue.label)
      |                                                                   ^ Error: SC04/deferred
  25  |     await expect(screen.locator('[data-request]'), where).toHaveCount(3)
  26  |     if (scene.self_action) await expect(screen.locator('[data-slot="self"]'), where).toContainText(scene.self_action.now)
  27  |   }
  28  | })
  29  | 
  30  | test('rescue decision is explicit, readable and uses shared actions', async ({page})=>{
  31  |   await page.goto('/?study=emergency&scenario=SC01&scene=initial')
  32  |   const urgent=page.locator('[data-urgent]')
  33  |   await expect(urgent.getByRole('button',{name:'지금 연결',exact:true})).toBeVisible()
  34  |   await expect(urgent.getByRole('button',{name:'취소',exact:true})).toBeVisible()
  35  |   const button=urgent.getByRole('button',{name:'지금 연결',exact:true})
  36  |   const [color,background]=await button.evaluate(n=>[getComputedStyle(n).color,getComputedStyle(n).backgroundColor])
  37  |   expect(contrast(channels(color),channels(background))).toBeGreaterThanOrEqual(4.5)
  38  |   expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  39  |   await expect(button).toHaveCSS('background-image','none')
  40  | })
  41  | 
  42  | test('vehicle shell uses two equal columns with independent rounded summary',async({page})=>{
  43  |   await page.goto('/?study=emergency&scenario=SC01&scene=connected')
  44  |   const a=(await page.locator('[data-care-slot=primary]').boundingBox())!
  45  |   const b=(await page.locator('[data-care-slot=navigation]').boundingBox())!
  46  |   expect(Math.abs(a.width-b.width)).toBeLessThan(1)
  47  |   await expect(page.locator('[data-care-component=vehicle-shell]')).toHaveCSS('transform','none')
  48  |   const summary=(await page.locator('[data-care-slot=summary]').boundingBox())!
  49  |   expect(a.y-summary.y-summary.height).toBeCloseTo(16,0)
  50  | })
  51  | 
  52  | test.describe('rescue countdown', () => {
  53  |   const open = async (page: import('@playwright/test').Page, scenario = 'SC03', scene = 'initial') => {
  54  |     await page.clock.install()
  55  |     await page.goto(`/?study=emergency&scenario=${scenario}&scene=${scene}`)
  56  |     return page.getByRole('region', { name: '시각 중심 사고 대응' })
  57  |   }
  58  | 
  59  |   test('countdown_expires_into_auto_rescue_and_keeps_unknowns', async ({ page }) => {
  60  |     const screen = await open(page)
  61  |     await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '10')
  62  |     await page.clock.runFor(3_000)
  63  |     await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '7')
  64  |     await page.clock.runFor(7_000)
  65  |     await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
  66  |     await expect(screen.getByText('응답이 없어 자동으로 연결했어요.')).toBeVisible()
  67  |     await expect(screen.locator('[data-request="rescue"]')).toContainText('연결 미확인')
  68  |     await expect(screen.locator('[data-request="vehicle"]')).toContainText('요청 전')
  69  |     await expect(screen.locator('[data-request="insurance"]')).toContainText('요청 전')
  70  |     await expect(screen.locator('[data-fact="injury"]')).toContainText('미확인')
  71  |     await expect(screen.locator('[data-fact="consciousness"]')).toContainText('미확인')
  72  |   })
  73  | 
  74  |   test('connect_now_and_cancel_paths', async ({ page }) => {
  75  |     let screen = await open(page)
  76  |     await screen.getByRole('button', { name: '지금 연결', exact: true }).click()
  77  |     await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
  78  |     screen = await open(page)
  79  |     await screen.getByRole('button', { name: '취소', exact: true }).click()
  80  |     await expect(screen.getByRole('heading', { name: '구호 연결 안 함' })).toBeVisible()
  81  |     await expect(screen.getByRole('button', { name: '다시 연결' })).toBeVisible()
  82  |     await expect(screen.locator('[data-request="rescue"]')).toContainText('요청 전')
  83  |     await page.clock.runFor(15_000)
  84  |     await expect(screen.getByRole('heading', { name: '구호 연결 안 함' })).toBeVisible()
  85  |   })
  86  | 
  87  |   test('clicking_outside_buttons_does_not_cancel', async ({ page }) => {
  88  |     const screen = await open(page)
  89  |     await screen.locator('[data-slot="detected"]').click()
  90  |     await screen.locator('[data-slot="self"]').click()
  91  |     await page.clock.runFor(10_000)
  92  |     await expect(screen.getByText('응답이 없어 자동으로 연결했어요.')).toBeVisible()
  93  |   })
  94  | 
  95  |   test('pause_freezes_and_reentry_restarts_countdown', async ({ page }) => {
  96  |     const screen = await open(page)
  97  |     await page.clock.runFor(4_000)
  98  |     await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '6')
  99  |     await page.getByRole('button', { name: '시연 일시 중단' }).click()
  100 |     await page.clock.runFor(10_000)
  101 |     await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '6')
  102 |     await page.getByRole('button', { name: '시연 재개' }).click()
  103 |     await page.clock.runFor(6_000)
  104 |     await expect(screen.locator('[data-slot="detected"]')).toContainText('응답 없음')
  105 |     await page.getByRole('navigation', { name: '장면 선택' }).getByRole('button', { name: /응답 대기/ }).click()
  106 |     await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '10')
  107 |   })
  108 | 
  109 |   test('stale_timer_does_not_fire_after_scene_change', async ({ page }) => {
  110 |     // 설치한 clock 은 실제 시간으로도 흐른다. 0.5초 여유는 부하가 걸리면 click 전에 사라지므로 page 를 열기 전에 clock 을 멈춘다.
  111 |     await page.clock.install({ time: 0 })
  112 |     await page.clock.pauseAt(1_000)
  113 |     await page.goto('/?study=emergency&scenario=SC03&scene=initial')
  114 |     const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  115 |     await page.clock.runFor(9_500)
  116 |     await screen.getByRole('button', { name: '지금 연결', exact: true }).click()
  117 |     await page.clock.runFor(2_000)
  118 |     await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
  119 |     await expect(screen.locator('[data-slot="detected"]')).toContainText('응답 확인')
  120 |     await expect(screen.getByText('응답이 없어 자동으로 연결했어요.')).toHaveCount(0)
  121 |   })
  122 | 
  123 |   test('late_response_after_auto_connect_keeps_rescue_connecting', async ({ page }) => {
  124 |     const screen = await open(page)
```