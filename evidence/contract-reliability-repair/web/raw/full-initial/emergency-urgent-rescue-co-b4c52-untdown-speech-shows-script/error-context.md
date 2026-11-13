# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: emergency-urgent.spec.ts >> rescue countdown >> blocked_countdown_speech_shows_script
- Location: tests/emergency-urgent.spec.ts:184:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('status')
Expected substring: "음성 원고"
Received string:    ""
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByRole('status') with timeout 5000ms
  - waiting for getByRole('status')
    13 × locator resolved to <div role="status" class="emergency-voice-status"></div>
       - unexpected value ""

```

```yaml
- main:
  - link "AFTER / CARE Emergency storyboard":
    - /url: /?study=emergency
  - text: 가상 scenario · 실제 전화·전송 없음 안전 안내 시안 · 승인 전
  - link "Design system":
    - /url: /?study=design-system
  - link "이전 design 비교":
    - /url: /?study=tools
  - heading "상황을 보고, 다음 행동으로." [level=1]
  - paragraph: 장면을 바꿔 핵심 상황·행동·미확인이 어떻게 전달되는지 확인해 보세요.
  - button "현재 장면 spec"
  - navigation "상황 선택":
    - button "부상 있음":
      - text: SC01
      - strong: 부상 있음
    - button "차량 이동 불가":
      - text: SC02
      - strong: 차량 이동 불가
    - button "응답 미확인" [pressed]:
      - text: SC03
      - strong: 응답 미확인
    - button "전송 보류·거절":
      - text: SC04
      - strong: 전송 보류·거절
    - button "접수 미확인":
      - text: SC05
      - strong: 접수 미확인
  - paragraph: "시작 상황: 사용자 응답 없음 · 부상·의식·현장 상태 미확인"
  - button "3초 보기"
  - button "시연 일시 중단"
  - region "차량 상태 표시":
    - time: 오후 9:12
    - text: 차분 · 사고 대응 모드 5G 18°C
  - region "시각 중심 사고 대응":
    - heading "충돌 감지 · 응답 미확인" [level=2]
    - button "음성 안내 듣기"
    - term: 부상 여부
    - definition: 미확인
    - term: 의식 상태
    - definition: 미확인
    - heading "119에 연결합니다" [level=1]
    - paragraph: 응답이 없으면 자동 연결
    - button "지금 연결"
    - button "취소"
    - heading "비상등을 켜세요" [level=2]
    - paragraph: 트렁크 열기
    - term: 구호
    - definition:
      - strong: 요청 전
    - term: 차량 지원
    - definition:
      - strong: 요청 전
    - term: 보험사
    - definition:
      - strong: 요청 전
    - heading "위치 확인 중" [level=2]
    - paragraph: 아직 안내 지점이 확인되지 않았어요.
  - status
  - navigation "장면 선택":
    - button "응답 대기 현재" [pressed]
    - button "응답 없음"
    - button "연결 중"
    - button "연결 취소"
    - button "119 통화 연결됨"
    - button "119 연결을 다시 시도하세요"
    - button "구호 접수가 확인됐어요"
    - button "구호 인계가 확인됐어요"
    - button "119 통화 연결됨"
    - button "구호 접수가 확인됐어요"
    - button "119 연결을 다시 시도하세요"
    - button "무응답 인계"
  - text: 외부 결과 시연
  - 'button "시연 event: 응답 없음 (즉시)"': 응답 없음 (즉시)
  - 'button "시연 event: 차량 위험 감지"': 차량 위험 감지
  - text: Spec v0.2 · 5 scenarios / 60 scenes 이해도 평가 전 · 실제 차량 동작 미검증
```

# Test source

```ts
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
  125 |     await page.clock.runFor(10_000)
  126 |     await screen.getByRole('button', { name: '응답할 수 있어요' }).click()
  127 |     await expect(screen.locator('[data-slot="detected"]')).toContainText('응답 확인')
  128 |     await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
  129 |     await expect(screen.locator('[data-request="rescue"]')).toContainText('연결 미확인')
  130 |     await expect(screen.getByRole('button', { name: /취소|끊기/ })).toHaveCount(0)
  131 |   })
  132 | 
  133 |   // 설치한 clock 은 실제 시간으로도 흐른다. 숫자는 고정값 대신 같은 순간에 읽은 값과 비교한다.
  134 |   const readCountdown = (page: import('@playwright/test').Page) => page.evaluate(() => {
  135 |     const urgent = document.querySelector('[data-urgent]')!
  136 |     return { number: Number(urgent.querySelector('[data-countdown]')!.getAttribute('data-countdown')), sentence: urgent.querySelector('p')!.textContent! }
  137 |   })
  138 | 
  139 |   test('restart_shows_full_countdown_from_first_frame', async ({ page }) => {
  140 |     const screen = await open(page)
  141 |     await page.clock.runFor(4_000)
  142 |     await expect(screen.locator('[data-countdown]')).not.toHaveAttribute('data-countdown', '10')
  143 |     const before = (await readCountdown(page)).number
  144 |     await page.evaluate(() => {
  145 |       const runtime = window as typeof window & { shown: number[] }
  146 |       runtime.shown = []
  147 |       // 차량 화면 안의 변화와 3초 보기 class 변화만 본다. Playwright 가 page 에 남기는 변화는 섞지 않는다.
  148 |       const observer = new MutationObserver(() => runtime.shown.push(Number(document.querySelector('[data-countdown]')?.getAttribute('data-countdown'))))
  149 |       observer.observe(document.querySelector('.emergency-screen')!, { subtree: true, childList: true, characterData: true, attributes: true })
  150 |       observer.observe(document.querySelector('.emergency-study')!, { attributes: true })
  151 |     })
  152 |     await page.getByRole('button', { name: '3초 보기' }).click()
  153 |     await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', /^(10|9)$/)
  154 |     const shown = await page.evaluate(() => (window as typeof window & { shown: number[] }).shown)
  155 |     expect(shown.filter(number => number <= before), `stale numbers after restart: ${shown}`).toEqual([])
  156 | 
  157 |   })
  158 | 
  159 |   test('countdown_sentence_agrees_with_number', async ({ page }) => {
  160 |     await open(page)
  161 |     await page.clock.runFor(4_000)
  162 |     const { number, sentence } = await readCountdown(page)
  163 |     expect(number).toBeLessThan(10)
  164 |     const said = sentence.match(/(\d+)초/)?.[1]
  165 |     expect(said ?? String(number)).toBe(String(number))
  166 |   })
  167 | 
  168 |   test('expiry_moves_focus_from_vanished_button_to_heading', async ({ page }) => {
  169 |     const screen = await open(page)
  170 |     await screen.getByRole('button', { name: '취소', exact: true }).focus()
  171 |     await page.clock.runFor(10_000)
  172 |     await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeFocused()
  173 |   })
  174 | 
  175 |   test('countdown_start_speaks_once', async ({ page }) => {
  176 |     await page.addInitScript(mockGuidanceAudio)
  177 |     await open(page)
  178 |     await page.clock.runFor(3_000)
  179 |     const spoken = await page.evaluate(() => window.guidanceMock.played)
  180 |     expect(spoken).toHaveLength(1)
  181 |     expect(assets.find(asset=>asset.path===spoken[0])?.script).toContain('10초 후 119에 연결')
  182 |   })
  183 | 
  184 |   test('blocked_countdown_speech_shows_script', async ({ page }) => {
  185 |     await page.addInitScript(mockGuidanceAudio)
  186 |     await page.addInitScript(()=>{window.guidanceMock.fail=true})
  187 |     await open(page)
> 188 |     await expect(page.getByRole('status')).toContainText('음성 원고')
      |                                            ^ Error: expect(locator).toContainText(expected) failed
  189 |   })
  190 | })
  191 | 
  192 | test('three_second_view_hides_review_ui_and_covers_after_3s', async ({ page }) => {
  193 |   await page.clock.install()
  194 |   await page.goto('/?study=emergency&scenario=SC03&scene=initial')
  195 |   const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  196 |   await page.clock.runFor(4_000)
  197 |   await page.getByRole('button', { name: '3초 보기' }).click()
  198 |   await expect(page.getByRole('navigation', { name: '장면 선택' })).toBeHidden()
  199 |   await expect(page.getByRole('navigation', { name: '상황 선택' })).toBeHidden()
  200 |   await expect(page.getByText('시작 상황:')).toBeHidden()
  201 |   await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '10')
  202 |   await expect(page.locator('[data-cover]')).toHaveCount(0)
  203 |   await page.clock.runFor(3_000)
  204 |   await expect(page.locator('[data-cover]')).toBeVisible()
  205 |   await expect(page.getByRole('button', { name: '다시 3초' })).toBeVisible()
  206 |   await page.clock.runFor(20_000)
  207 |   await page.getByRole('button', { name: '닫기' }).click()
  208 |   await expect(page.getByRole('navigation', { name: '장면 선택' })).toBeVisible()
  209 |   await expect(screen.locator('[data-slot="detected"]')).toContainText('응답 미확인')
  210 |   await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '7')
  211 | })
  212 | 
  213 | test('three_second_view_silences_speech_when_covered', async ({ page }) => {
  214 |   await page.addInitScript(mockGuidanceAudio)
  215 |   await page.clock.install()
  216 |   await page.goto('/?study=emergency&scenario=SC03&scene=initial')
  217 |   await page.getByRole('button', { name: '3초 보기' }).click()
  218 |   await expect(page.locator('[data-slot=detected]').getByRole('button')).toHaveText('음성 안내 중지')
  219 |   const cancels = () => page.evaluate(() => window.guidanceMock.cancels)
  220 |   const before = await cancels()
  221 |   await page.clock.runFor(3_000)
  222 |   await expect(page.locator('[data-cover]')).toBeVisible()
  223 |   await expect.poll(cancels).toBeGreaterThan(before)
  224 |   await expect(page.locator('[data-slot=detected]').getByRole('button')).toHaveText('음성 안내 듣기')
  225 | })
  226 | 
  227 | test('three_second_view_keeps_natural_width_and_allows_content_scroll',async({page})=>{
  228 |   await page.setViewportSize({width:1280,height:720})
  229 |   await page.goto('/?study=emergency&scenario=SC03&scene=initial')
  230 |   await page.getByRole('button',{name:'3초 보기'}).click()
  231 |   const screen=(await page.locator('.emergency-screen').boundingBox())!
  232 |   expect(screen.x+screen.width).toBeLessThanOrEqual(1280)
  233 |   await expect(page.locator('.emergency-viewport')).toHaveCSS('overflow-y','auto')
  234 | })
  235 | 
  236 | test('review_header_marks_safety_copy_as_draft', async ({ page }) => {
  237 |   await page.goto('/?study=emergency&scenario=SC05')
  238 |   await expect(page.getByText('안전 안내 시안 · 승인 전')).toBeVisible()
  239 |   await page.getByRole('button', { name: '현재 장면 spec' }).click()
  240 |   await expect(page.getByRole('region', { name: '현재 장면 spec' })).toContainText('비트박스')
  241 | })
  242 | 
  243 | test('footer_counts_scenes_from_data', async ({ page }) => {
  244 |   await page.goto('/?study=emergency&scenario=SC05')
  245 |   await expect(page.getByText(`${manifest.scenarios.length} scenarios / ${manifest.scenarios.reduce((n, s) => n + s.states.length, 0)} scenes`)).toBeVisible()
  246 | })
  247 | 
```