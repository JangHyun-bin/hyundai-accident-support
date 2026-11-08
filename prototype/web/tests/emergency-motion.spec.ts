import { expect, test, type Page } from '@playwright/test'

type Seen = { name: string; duration: number; moves: boolean }

// View transition 이 준비되면 움직이는 pseudo-element 의 이름·시간·transform 여부를 기록한다.
function watchTransitions() {
  const seen: Seen[] = []
  Object.assign(window, { transitions: seen, transitionCount: 0 })
  const start = document.startViewTransition.bind(document)
  document.startViewTransition = ((update: Parameters<typeof start>[0]) => {
    Object.assign(window, { transitionCount: (window as unknown as { transitionCount: number }).transitionCount + 1 })
    const transition = start(update)
    transition.ready.then(() => {
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect
        if (!effect.pseudoElement?.startsWith('::view-transition')) continue
        seen.push({ name: effect.pseudoElement, duration: Number(effect.getComputedTiming().duration), moves: effect.getKeyframes().some(frame => frame.transform && frame.transform !== 'none') })
      }
    }).catch(() => {})
    return transition
  }) as typeof document.startViewTransition
}
const seen = (page: Page) => page.evaluate(() => (window as unknown as { transitions: Seen[] }).transitions)
const count = (page: Page) => page.evaluate(() => (window as unknown as { transitionCount: number }).transitionCount)

async function connectNow(page: Page) {
  await page.addInitScript(watchTransitions)
  await page.goto('/?study=emergency&scenario=SC01&scene=initial')
  const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  await screen.getByRole('button', { name: '지금 연결', exact: true }).click()
  await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
  await expect.poll(async () => (await seen(page)).length).toBeGreaterThan(0)
  return seen(page)
}

test('scene_change_morphs_each_block_in_place', async ({ page }) => {
  const names = (await connectNow(page)).map(item => item.name)
  // 같은 ring 이 빨간 countdown 에서 호박색 연결 중으로 이어진다. 나머지 블록도 제자리에서 바뀐다.
  for (const name of ['phase-ring', 'car-copy', 'cue', 'requests', 'self']) expect(names, name).toContain(`::view-transition-group(${name})`)
  expect(names, 'button 줄은 사라진다').toContain('::view-transition-old(car-actions)')
  expect(names).not.toContain('::view-transition-group(root)')
})

test('new_information_lands_within_a_quarter_second', async ({ page }) => {
  const animations = await connectNow(page)
  for (const item of animations.filter(item => item.name.startsWith('::view-transition-new'))) expect(item.duration, item.name).toBeLessThanOrEqual(250)
  for (const item of animations.filter(item => item.name.startsWith('::view-transition-group'))) expect(item.duration, item.name).toBeLessThanOrEqual(600)
})

test('reduced_motion_keeps_fades_and_drops_movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const animations = await connectNow(page)
  expect(animations.filter(item => item.moves).map(item => item.name)).toEqual([])
  for (const item of animations) expect(item.duration, item.name).toBeLessThanOrEqual(150)
})

test('countdown_ticks_do_not_start_transitions', async ({ page }) => {
  await page.addInitScript(watchTransitions)
  await page.goto('/?study=emergency&scenario=SC01&scene=initial')
  await expect(page.locator('[data-countdown]')).toHaveAttribute('data-countdown', '8', { timeout: 5_000 })
  expect(await count(page)).toBe(0)
})

test('countdown_digits_roll', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC01&scene=initial')
  await expect(page.locator('[data-countdown] number-flow-react')).toHaveCount(1)
})

test('buttons_press_down_under_the_finger', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC01&scene=initial')
  const button = page.getByRole('button', { name: '지금 연결', exact: true })
  await button.hover()
  await page.mouse.down()
  await expect(button).toHaveCSS('transform', 'matrix(0.97, 0, 0, 0.97, 0, 0)')
  await page.mouse.up()
})

test('reduced_motion_presses_without_scaling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?study=emergency&scenario=SC01&scene=initial')
  const button = page.getByRole('button', { name: '취소', exact: true })
  await button.hover()
  await page.mouse.down()
  await page.waitForTimeout(200)
  await expect(button).toHaveCSS('transform', 'none')
  await page.mouse.up()
})
