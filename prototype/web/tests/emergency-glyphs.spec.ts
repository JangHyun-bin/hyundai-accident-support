import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import manifest from '../../../specs/emergency-experience/scenarios.json' with { type: 'json' }
import book from '../../../specs/emergency-experience/glyphs.json' with { type: 'json' }

const facts = book.facts as Record<string, string>
const actions = book.actions as Record<string, string>

test.setTimeout(120_000)

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
    const buttons = screen.locator('.emergency-primary-action, .emergency-secondary-action')
    await expect(buttons, where).toHaveCount(scene.actions.length)
    for (const [index, action] of scene.actions.entries()) {
      await expect(buttons.nth(index).locator('[data-glyph]').first(), `${where} ${action.id}`).toHaveAttribute('data-glyph', actions[action.id] ?? actions.default)
    }
  }
})

test('attention_cue_keeps_attention_mark_with_flat_glyph', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC01&scene=initial')
  const cue = page.getByRole('region', { name: '핵심 상황' })
  await expect(cue.locator('[data-mark="attention"]')).toBeVisible()
  const fills = await cue.locator('.emergency-symbol > [data-glyph] path').evaluateAll(paths => paths.map(path => path.getAttribute('fill')))
  expect(fills.length).toBeGreaterThan(0)
  for (const fill of fills) expect(fill).toBe('currentColor')
})

test('scaled_canvas_keeps_glyph_inside_plate', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/?study=emergency&scenario=SC05')
  // 축소 배율은 ResizeObserver 뒤에 정해진다. 배율이 정해지기 전에 재면 box 가 서로 어긋난다.
  await expect.poll(async () => (await page.locator('.emergency-screen').boundingBox())?.width ?? Infinity).toBeLessThanOrEqual(375)
  // 두 box 를 따로 재면 그 사이에 배율이 바뀔 수 있다. 같은 frame 에서 잰다.
  const [plate, glyph] = await page.locator('.emergency-symbol').evaluate(node => [node, node.querySelector(':scope > [data-glyph]')!].map(item => item.getBoundingClientRect().toJSON()))
  expect(glyph.x).toBeGreaterThanOrEqual(plate.x)
  expect(glyph.y).toBeGreaterThanOrEqual(plate.y)
  expect(glyph.x + glyph.width).toBeLessThanOrEqual(plate.x + plate.width)
  expect(glyph.y + glyph.height).toBeLessThanOrEqual(plate.y + plate.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

// A = 평소 render, B = data-measure (면·기호 흰색, 주변 면·원판 검은색, 나머지 회색).
// 1 px anti-aliasing 은 8 이웃 검사로 제외한다.
const REACH = 6
const DSF = 3
async function contrast(page: Page, target: Locator, hide?: string) {
  const screen = page.locator('.emergency-screen')
  const toggle = (value: string) => hide && page.locator(hide).evaluate((node, value) => { (node as HTMLElement).style.visibility = value }, value)
  await toggle('hidden')
  const normal = (await target.screenshot()).toString('base64')
  await screen.evaluate(node => node.setAttribute('data-measure', ''))
  const mask = (await target.screenshot()).toString('base64')
  await screen.evaluate(node => node.removeAttribute('data-measure'))
  await toggle('')
  return page.evaluate(async ({ normal, mask, reach }) => {
    const read = async (data: string) => {
      const image = new Image()
      image.src = `data:image/png;base64,${data}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, canvas.width, canvas.height)
    }
    const a = await read(normal)
    const b = await read(mask)
    const { width, height } = b
    const red = (x: number, y: number) => b.data[(y * width + x) * 4]
    const solid = (x: number, y: number, pass: (value: number) => boolean) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || !pass(red(nx, ny))) return false
      }
      return true
    }
    const linear = (value: number) => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }
    const luminance = (index: number) => .2126 * linear(a.data[index]) + .7152 * linear(a.data[index + 1]) + .0722 * linear(a.data[index + 2])
    // face 개수의 2D 누적합으로 주변 판정을 한다.
    const sum = new Int32Array((width + 1) * (height + 1))
    const face: number[] = []
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const isFace = solid(x, y, value => value >= 250) ? 1 : 0
      if (isFace) face.push((y * width + x) * 4)
      sum[(y + 1) * (width + 1) + x + 1] = isFace + sum[y * (width + 1) + x + 1] + sum[(y + 1) * (width + 1) + x] - sum[y * (width + 1) + x]
    }
    const near = (x: number, y: number) => {
      const x0 = Math.max(0, x - reach), y0 = Math.max(0, y - reach), x1 = Math.min(width, x + reach + 1), y1 = Math.min(height, y + reach + 1)
      return sum[y1 * (width + 1) + x1] - sum[y0 * (width + 1) + x1] - sum[y1 * (width + 1) + x0] + sum[y0 * (width + 1) + x0] > 0
    }
    const plate: number[] = []
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (solid(x, y, value => value <= 5) && near(x, y)) plate.push((y * width + x) * 4)
    const extreme = (set: number[], pick: (x: number, y: number) => boolean) => set.reduce((best, index) => pick(luminance(index), luminance(best)) ? index : best, set[0])
    const mean = (set: number[]) => set.reduce((total, index) => total + luminance(index), 0) / set.length
    const rgb = (index: number) => [a.data[index], a.data[index + 1], a.data[index + 2]]
    const lighterFace = mean(face) > mean(plate)
    const faceWorst = extreme(face, lighterFace ? (x, y) => x < y : (x, y) => x > y)
    const plateWorst = extreme(plate, lighterFace ? (x, y) => x > y : (x, y) => x < y)
    const [high, low] = lighterFace ? [faceWorst, plateWorst] : [plateWorst, faceWorst]
    return { ratio: (luminance(high) + .05) / (luminance(low) + .05), face_pixels: face.length, plate_pixels: plate.length, face_worst_rgb: rgb(faceWorst), plate_worst_rgb: rgb(plateWorst) }
  }, { normal, mask, reach: REACH * DSF })
}

test.describe('contrast', () => {
  test.use({ deviceScaleFactor: DSF })

  test('flat_glyphs_and_marks_reach_3_to_1', async ({ page }) => {
    const results: Record<string, unknown> = {}
    const check = async (name: string, query: string, target: string, hide?: string) => {
      await page.goto(`/?study=emergency&${query}`)
      const screen = page.locator('.emergency-screen')
      await expect(screen).toHaveAttribute('data-surface-status', 'flat')
      await page.evaluate(() => document.fonts.ready)
      // Pleos 화면(2560 px)을 창에 맞추면 표식이 너무 작아져 면 pixel 이 남지 않는다. 실제 크기에서 잰다.
      await page.getByRole('button', { name: '원래 크기' }).click()
      const result = await contrast(page, screen.locator(target).first(), hide)
      results[name] = { query, target, ...result }
      expect(result.face_pixels, `${name} face`).toBeGreaterThan(20)
      expect(result.plate_pixels, `${name} plate`).toBeGreaterThan(20)
      expect.soft(result.ratio, name).toBeGreaterThanOrEqual(3)
    }
    const seen = new Set<string>()
    for (const scenario of manifest.scenarios) for (const scene of scenario.states) {
      if (seen.has(scene.cue.symbol)) continue
      seen.add(scene.cue.symbol)
      await check(`cue ${scene.cue.symbol}`, `scenario=${scenario.id}&scene=${scene.id}`, '.emergency-symbol', '.emergency-symbol-state')
    }
    for (const scenario of manifest.scenarios) for (const id of scenario.presentation.visible_facts) {
      await check(`fact ${id}`, `scenario=${scenario.id}`, `[data-fact="${id}"] .emergency-fact-plate`)
    }
    for (const [id, scene] of [['hazard', 'scenario=SC01&scene=initial'], ['evacuate', 'scenario=SC01&scene=contact_unknown'], ['wait', 'scenario=SC05&scene=initial']]) await check(`self ${id}`, scene, '.emergency-self-plate')
    await check('mark unknown', 'scenario=SC05&scene=initial', '.emergency-symbol-state [data-mark]')
    await check('mark attention', 'scenario=SC01&scene=initial', '.emergency-symbol-state [data-mark]')
    await check('mark confirmed', 'scenario=SC05&scene=initial', '[data-request] [data-mark="confirmed"]')
    await check('mark neutral', 'scenario=SC05&scene=initial', '[data-request] [data-mark="neutral"]')
    if (process.env.RECORD_EVIDENCE) {
      const folder = new URL('../evidence/emergency-flat/', import.meta.url)
      mkdirSync(folder, { recursive: true })
      writeFileSync(new URL('contrast-check.json', folder), `${JSON.stringify({
        definition: 'WCAG 1.4.11 non-text contrast on rendered pixels at deviceScaleFactor 3. Face = glyph face or mark symbol, plate = surrounding plate or mark disc within 6 CSS px of the face. 1 px anti-aliasing excluded by an 8-neighbour test; Flat glyph and status-mark paint only; no material or shadow. Ratio pairs the worst face pixel with the worst plate pixel.',
        results,
        note: 'Chrome render of the web prototype only. Actual vehicle display, viewing angle and glare are not covered.',
      }, null, 2)}\n`)
    }
  })
})
