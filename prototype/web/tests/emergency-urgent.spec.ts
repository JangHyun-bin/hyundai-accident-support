import { expect, test } from '@playwright/test'
import manifest from '../../../specs/emergency-experience/scenarios.json' with { type: 'json' }

type Scene = (typeof manifest.scenarios)[number]['states'][number] & { phase: string; self_action?: { condition?: string; now: string; next?: string } }
const scenes = manifest.scenarios.flatMap(scenario => (scenario.states as Scene[]).map(scene => ({ scenario, scene })))
const RED = 'rgb(255, 69, 58)'

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

test('red_appears_only_inside_the_rescue_decision', async ({ page }) => {
  for (const { scenario, scene } of scenes) {
    await page.goto(`/?study=emergency&scenario=${scenario.id}&scene=${scene.id}`)
    const screen = page.locator('.emergency-screen')
    const where = `${scenario.id}/${scene.id}`
    await expect(screen.locator('[data-urgent]'), where).toHaveCount(scene.phase === 'decide' ? 1 : 0)
    const strays = await screen.evaluate((root, red) => [...root.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node)
      return [style.color, style.backgroundColor, style.borderTopColor, style.fill, style.stroke].includes(red) && !node.closest('[data-urgent]')
    }).map(node => node.outerHTML.slice(0, 80)), RED)
    expect(strays, where).toEqual([])
  }
})

test('screen_never_says_unconscious', async ({ page }) => {
  for (const { scenario, scene } of scenes) {
    await page.goto(`/?study=emergency&scenario=${scenario.id}&scene=${scene.id}`)
    await expect(page.locator('[data-slot="car"]')).toBeVisible()
    expect(await page.locator('.emergency-screen').innerText(), `${scenario.id}/${scene.id}`).not.toContain('의식 없음')
  }
})

test('scaled_canvas_keeps_three_slots_inside', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/?study=emergency&scenario=SC03&scene=initial')
  // 축소 배율은 ResizeObserver 뒤에 정해진다. 배율이 정해지기 전에 재면 box 가 서로 어긋난다.
  await expect.poll(async () => (await page.locator('.emergency-screen').boundingBox())?.width ?? Infinity).toBeLessThanOrEqual(375)
  const screen = (await page.locator('.emergency-screen').boundingBox())!
  for (const target of ['[data-slot="detected"]', '[data-slot="car"]', '[data-slot="self"]', '[data-urgent]', 'button:text-is("취소")']) {
    const box = (await page.locator('.emergency-screen').locator(target).boundingBox())!
    expect(box, target).toBeTruthy()
    expect(box.x, target).toBeGreaterThanOrEqual(screen.x - .5)
    expect(box.y, target).toBeGreaterThanOrEqual(screen.y - .5)
    expect(box.x + box.width, target).toBeLessThanOrEqual(screen.x + screen.width + .5)
    expect(box.y + box.height, target).toBeLessThanOrEqual(screen.y + screen.height + .5)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
