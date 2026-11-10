import { expect, test } from '@playwright/test'
import manifest from '../../../specs/emergency-experience/scenarios.json' with { type: 'json' }

type Scene = (typeof manifest.scenarios)[number]['states'][number] & { phase: string; self_action?: { id: string; condition?: string; now: string; next?: string } }
const scenes = manifest.scenarios.flatMap(scenario => (scenario.states as Scene[]).map(scene => ({ scenario, scene })))
const contrast = (a: number[], b: number[]) => {
  const luminance = (rgb: number[]) => rgb.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + .05) / (low + .05)
}
const channels = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number)

test.setTimeout(120_000)

test('every_scene_has_three_slots_and_three_agencies', async ({ page }) => {
  for (const { scenario, scene } of scenes) {
    await page.goto(`/?study=emergency&scenario=${scenario.id}&scene=${scene.id}`)
    const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
    const where = `${scenario.id}/${scene.id}`
    for (const slot of ['detected', 'car', 'self']) await expect(screen.locator(`[data-slot="${slot}"]`), `${where} ${slot}`).toBeVisible()
    await expect(screen.locator('[data-slot="car"] h1'), where).toHaveText(scene.title)
    await expect(screen.locator('[data-slot="detected"]'), where).toContainText(scene.cue.label)
    await expect(screen.locator('[data-request]'), where).toHaveCount(3)
    if (scene.self_action) await expect(screen.locator('[data-slot="self"]'), where).toContainText(scene.self_action.now)
  }
})

test('rescue decision is explicit, readable and uses shared actions', async ({page})=>{
  await page.goto('/?study=emergency&scenario=SC01&scene=initial')
  const urgent=page.locator('[data-urgent]')
  await expect(urgent.getByRole('button',{name:'지금 연결',exact:true})).toBeVisible()
  await expect(urgent.getByRole('button',{name:'취소',exact:true})).toBeVisible()
  const button=urgent.getByRole('button',{name:'지금 연결',exact:true})
  const [color,background]=await button.evaluate(n=>[getComputedStyle(n).color,getComputedStyle(n).backgroundColor])
  expect(contrast(channels(color),channels(background))).toBeGreaterThanOrEqual(4.5)
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  await expect(button).toHaveCSS('background-image','none')
})

test('vehicle shell uses two equal columns with independent rounded summary',async({page})=>{
  await page.goto('/?study=emergency&scenario=SC01&scene=connected')
  const a=(await page.locator('[data-care-slot=primary]').boundingBox())!
  const b=(await page.locator('[data-care-slot=navigation]').boundingBox())!
  expect(Math.abs(a.width-b.width)).toBeLessThan(1)
  await expect(page.locator('[data-care-component=vehicle-shell]')).toHaveCSS('transform','none')
  const summary=(await page.locator('[data-care-slot=summary]').boundingBox())!
  expect(a.y-summary.y-summary.height).toBeCloseTo(16,0)
})

test.describe('rescue countdown', () => {
  const open = async (page: import('@playwright/test').Page, scenario = 'SC03', scene = 'initial') => {
    await page.clock.install()
    await page.goto(`/?study=emergency&scenario=${scenario}&scene=${scene}`)
    return page.getByRole('region', { name: '시각 중심 사고 대응' })
  }

  test('countdown_expires_into_auto_rescue_and_keeps_unknowns', async ({ page }) => {
    const screen = await open(page)
    await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '10')
    await page.clock.runFor(3_000)
    await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '7')
    await page.clock.runFor(7_000)
    await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
    await expect(screen.getByText('응답이 없어 자동으로 연결했어요.')).toBeVisible()
    await expect(screen.locator('[data-request="rescue"]')).toContainText('연결 미확인')
    await expect(screen.locator('[data-request="vehicle"]')).toContainText('요청 전')
    await expect(screen.locator('[data-request="insurance"]')).toContainText('요청 전')
    await expect(screen.locator('[data-fact="injury"]')).toContainText('미확인')
    await expect(screen.locator('[data-fact="consciousness"]')).toContainText('미확인')
  })

  test('connect_now_and_cancel_paths', async ({ page }) => {
    let screen = await open(page)
    await screen.getByRole('button', { name: '지금 연결', exact: true }).click()
    await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
    screen = await open(page)
    await screen.getByRole('button', { name: '취소', exact: true }).click()
    await expect(screen.getByRole('heading', { name: '구호 연결 안 함' })).toBeVisible()
    await expect(screen.getByRole('button', { name: '다시 연결' })).toBeVisible()
    await expect(screen.locator('[data-request="rescue"]')).toContainText('요청 전')
    await page.clock.runFor(15_000)
    await expect(screen.getByRole('heading', { name: '구호 연결 안 함' })).toBeVisible()
  })

  test('clicking_outside_buttons_does_not_cancel', async ({ page }) => {
    const screen = await open(page)
    await screen.locator('[data-slot="detected"]').click()
    await screen.locator('[data-slot="self"]').click()
    await page.clock.runFor(10_000)
    await expect(screen.getByText('응답이 없어 자동으로 연결했어요.')).toBeVisible()
  })

  test('pause_freezes_and_reentry_restarts_countdown', async ({ page }) => {
    const screen = await open(page)
    await page.clock.runFor(4_000)
    await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '6')
    await page.getByRole('button', { name: '시연 일시 중단' }).click()
    await page.clock.runFor(10_000)
    await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '6')
    await page.getByRole('button', { name: '시연 재개' }).click()
    await page.clock.runFor(6_000)
    await expect(screen.locator('[data-slot="detected"]')).toContainText('응답 없음')
    await page.getByRole('navigation', { name: '장면 선택' }).getByRole('button', { name: /응답 대기/ }).click()
    await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '10')
  })

  test('stale_timer_does_not_fire_after_scene_change', async ({ page }) => {
    // 설치한 clock 은 실제 시간으로도 흐른다. 0.5초 여유는 부하가 걸리면 click 전에 사라지므로 page 를 열기 전에 clock 을 멈춘다.
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1_000)
    await page.goto('/?study=emergency&scenario=SC03&scene=initial')
    const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
    await page.clock.runFor(9_500)
    await screen.getByRole('button', { name: '지금 연결', exact: true }).click()
    await page.clock.runFor(2_000)
    await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
    await expect(screen.locator('[data-slot="detected"]')).toContainText('응답 확인')
    await expect(screen.getByText('응답이 없어 자동으로 연결했어요.')).toHaveCount(0)
  })

  test('late_response_after_auto_connect_keeps_rescue_connecting', async ({ page }) => {
    const screen = await open(page)
    await page.clock.runFor(10_000)
    await screen.getByRole('button', { name: '응답할 수 있어요' }).click()
    await expect(screen.locator('[data-slot="detected"]')).toContainText('응답 확인')
    await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
    await expect(screen.locator('[data-request="rescue"]')).toContainText('연결 미확인')
    await expect(screen.getByRole('button', { name: /취소|끊기/ })).toHaveCount(0)
  })

  // 설치한 clock 은 실제 시간으로도 흐른다. 숫자는 고정값 대신 같은 순간에 읽은 값과 비교한다.
  const readCountdown = (page: import('@playwright/test').Page) => page.evaluate(() => {
    const urgent = document.querySelector('[data-urgent]')!
    return { number: Number(urgent.querySelector('[data-countdown]')!.getAttribute('data-countdown')), sentence: urgent.querySelector('p')!.textContent! }
  })

  test('restart_shows_full_countdown_from_first_frame', async ({ page }) => {
    const screen = await open(page)
    await page.clock.runFor(4_000)
    await expect(screen.locator('[data-countdown]')).not.toHaveAttribute('data-countdown', '10')
    const before = (await readCountdown(page)).number
    await page.evaluate(() => {
      const runtime = window as typeof window & { shown: number[] }
      runtime.shown = []
      // 차량 화면 안의 변화와 3초 보기 class 변화만 본다. Playwright 가 page 에 남기는 변화는 섞지 않는다.
      const observer = new MutationObserver(() => runtime.shown.push(Number(document.querySelector('[data-countdown]')?.getAttribute('data-countdown'))))
      observer.observe(document.querySelector('.emergency-screen')!, { subtree: true, childList: true, characterData: true, attributes: true })
      observer.observe(document.querySelector('.emergency-study')!, { attributes: true })
    })
    await page.getByRole('button', { name: '3초 보기' }).click()
    await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', /^(10|9)$/)
    const shown = await page.evaluate(() => (window as typeof window & { shown: number[] }).shown)
    expect(shown.filter(number => number <= before), `stale numbers after restart: ${shown}`).toEqual([])

  })

  test('countdown_sentence_agrees_with_number', async ({ page }) => {
    await open(page)
    await page.clock.runFor(4_000)
    const { number, sentence } = await readCountdown(page)
    expect(number).toBeLessThan(10)
    const said = sentence.match(/(\d+)초/)?.[1]
    expect(said ?? String(number)).toBe(String(number))
  })

  test('expiry_moves_focus_from_vanished_button_to_heading', async ({ page }) => {
    const screen = await open(page)
    await screen.getByRole('button', { name: '취소', exact: true }).focus()
    await page.clock.runFor(10_000)
    await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeFocused()
  })

  test('countdown_start_speaks_once', async ({ page }) => {
    await page.addInitScript(() => {
      const runtime = window as typeof window & { spoken: string[] }
      runtime.spoken = []
      Object.defineProperty(window, 'speechSynthesis', { value: { speak: (utterance: SpeechSynthesisUtterance) => runtime.spoken.push(utterance.text), cancel: () => {} } })
    })
    await open(page)
    await page.clock.runFor(3_000)
    const spoken = await page.evaluate(() => (window as typeof window & { spoken: string[] }).spoken)
    expect(spoken).toHaveLength(1)
    expect(spoken[0]).toContain('10초 후 119에 연결')
  })

  test('blocked_countdown_speech_shows_script', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { value: { speak: () => { throw new Error('blocked') }, cancel: () => {} } })
    })
    await open(page)
    await expect(page.getByRole('status')).toContainText('음성 원고')
  })
})

test('three_second_view_hides_review_ui_and_covers_after_3s', async ({ page }) => {
  await page.clock.install()
  await page.goto('/?study=emergency&scenario=SC03&scene=initial')
  const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  await page.clock.runFor(4_000)
  await page.getByRole('button', { name: '3초 보기' }).click()
  await expect(page.getByRole('navigation', { name: '장면 선택' })).toBeHidden()
  await expect(page.getByRole('navigation', { name: '상황 선택' })).toBeHidden()
  await expect(page.getByText('시작 상황:')).toBeHidden()
  await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '10')
  await expect(page.locator('[data-cover]')).toHaveCount(0)
  await page.clock.runFor(3_000)
  await expect(page.locator('[data-cover]')).toBeVisible()
  await expect(page.getByRole('button', { name: '다시 3초' })).toBeVisible()
  await page.clock.runFor(20_000)
  await page.getByRole('button', { name: '닫기' }).click()
  await expect(page.getByRole('navigation', { name: '장면 선택' })).toBeVisible()
  await expect(screen.locator('[data-slot="detected"]')).toContainText('응답 미확인')
  await expect(screen.locator('[data-countdown]')).toHaveAttribute('data-countdown', '7')
})

test('three_second_view_silences_speech_when_covered', async ({ page }) => {
  await page.addInitScript(() => {
    const runtime = window as typeof window & { cancels: number }
    runtime.cancels = 0
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: () => {}, cancel: () => { runtime.cancels++ } } })
  })
  await page.clock.install()
  await page.goto('/?study=emergency&scenario=SC03&scene=initial')
  await page.getByRole('button', { name: '3초 보기' }).click()
  await expect(page.locator('[data-slot=detected]').getByRole('button')).toHaveText('음성 안내 중지')
  const cancels = () => page.evaluate(() => (window as typeof window & { cancels: number }).cancels)
  const before = await cancels()
  await page.clock.runFor(3_000)
  await expect(page.locator('[data-cover]')).toBeVisible()
  await expect.poll(cancels).toBeGreaterThan(before)
  await expect(page.locator('[data-slot=detected]').getByRole('button')).toHaveText('음성 안내 듣기')
})

test('three_second_view_keeps_natural_width_and_allows_content_scroll',async({page})=>{
  await page.setViewportSize({width:1280,height:720})
  await page.goto('/?study=emergency&scenario=SC03&scene=initial')
  await page.getByRole('button',{name:'3초 보기'}).click()
  const screen=(await page.locator('.emergency-screen').boundingBox())!
  expect(screen.x+screen.width).toBeLessThanOrEqual(1280)
  await expect(page.locator('.emergency-viewport')).toHaveCSS('overflow-y','auto')
})

test('review_header_marks_safety_copy_as_draft', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC05')
  await expect(page.getByText('안전 안내 시안 · 승인 전')).toBeVisible()
  await page.getByRole('button', { name: '현재 장면 spec' }).click()
  await expect(page.getByRole('region', { name: '현재 장면 spec' })).toContainText('비트박스')
})

test('footer_counts_scenes_from_data', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC05')
  await expect(page.getByText(`${manifest.scenarios.length} scenarios / ${manifest.scenarios.reduce((n, s) => n + s.states.length, 0)} scenes`)).toBeVisible()
})
