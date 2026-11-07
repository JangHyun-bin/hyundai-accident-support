import { expect, test } from '@playwright/test'
import manifest from '../../../specs/emergency-experience/scenarios.json' with { type: 'json' }
import book from '../../../specs/emergency-experience/glyphs.json' with { type: 'json' }

const facts = book.facts as Record<string, string>
const actions = book.actions as Record<string, string>

test('vehicle_screen_draws_mapped_glyphs_and_marks', async ({ page }) => {
  for (const scenario of manifest.scenarios) for (const scene of scenario.states) {
    await page.goto(`/?study=emergency&scenario=${scenario.id}&scene=${scene.id}`)
    const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
    await expect(screen.getByRole('heading', { name: scene.title, exact: true })).toBeVisible()
    const where = `${scenario.id}/${scene.id}`
    // 음성 button 은 spec 비목표라 Lucide 를 유지한다.
    await expect(screen.locator('svg.lucide:not(.emergency-voice-button svg)'), where).toHaveCount(0)
    await expect(screen.locator('.emergency-symbol > [data-glyph]'), where).toHaveAttribute('data-glyph', book.cue[scene.cue.symbol as keyof typeof book.cue])
    await expect(screen.locator('.emergency-symbol-state [data-mark]'), where).toHaveAttribute('data-mark', scene.cue.status)
    for (const id of scenario.presentation.visible_facts) {
      await expect(screen.locator(`[data-fact="${id}"] [data-glyph]`), `${where} ${id}`).toHaveAttribute('data-glyph', facts[id])
    }
    for (const request of await screen.locator('[data-request]').all()) {
      const tone = (await request.getAttribute('class'))!.match(/tone-(\w+)/)![1]
      await expect(request.locator('[data-mark]'), where).toHaveAttribute('data-mark', tone)
    }
    const buttons = screen.locator('.emergency-primary-action')
    await expect(buttons, where).toHaveCount(scene.actions.length)
    for (const [index, action] of scene.actions.entries()) {
      await expect(buttons.nth(index).locator('[data-glyph]').first(), `${where} ${action.id}`).toHaveAttribute('data-glyph', actions[action.id] ?? actions.default)
    }
  }
})

test('attention_cue_keeps_warning_label_with_metal_glyph', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC01&scene=initial')
  const cue = page.getByRole('region', { name: '핵심 상황' })
  await expect(cue.locator('h2')).toHaveCSS('color', 'rgb(240, 181, 156)')
  await expect(cue.locator('[data-mark="attention"]')).toBeVisible()
  const fills = await cue.locator('.emergency-symbol > [data-glyph] path').evaluateAll(paths => paths.map(path => path.getAttribute('fill')))
  expect(fills.length).toBeGreaterThan(0)
  for (const fill of fills) expect(fill).toMatch(/^url\(#/)
})

test('scaled_canvas_keeps_glyph_inside_plate', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/?study=emergency&scenario=SC05')
  const plate = await page.locator('.emergency-symbol').boundingBox()
  const glyph = await page.locator('.emergency-symbol > [data-glyph]').boundingBox()
  expect(plate && glyph).toBeTruthy()
  expect(glyph!.x).toBeGreaterThanOrEqual(plate!.x)
  expect(glyph!.y).toBeGreaterThanOrEqual(plate!.y)
  expect(glyph!.x + glyph!.width).toBeLessThanOrEqual(plate!.x + plate!.width)
  expect(glyph!.y + glyph!.height).toBeLessThanOrEqual(plate!.y + plate!.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
