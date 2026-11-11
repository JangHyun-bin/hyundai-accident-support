import { test, expect } from '@playwright/test'

test('legacy palettes render semantic roles without rewriting stored originals', async ({ page }) => {
  await page.goto('/?study=design-system')
  const originals = await page.evaluate(async () => {
    const path = '/src/design-system/surfaces.ts'
    const { originalSurfaces } = await import(path)
    const library = JSON.stringify({ version: 1, draft: originalSurfaces, presets: [{ name: 'C', surfaces: originalSurfaces }, { name: 'C_02', surfaces: originalSurfaces }] })
    const theme = JSON.stringify({ version: 1, surfaces: originalSurfaces })
    localStorage.setItem('response-surface-study-v1', library)
    localStorage.setItem('after-care-theme-v1', theme)
    localStorage.setItem('after-care-interaction-study-v1', 'preserve-existing-settings')
    return { library, theme }
  })
  await page.reload()
  const surfaces = page.getByRole('region', { name: 'Surface components' })
  expect(await surfaces.locator('[data-care-surface=call]').evaluate(node => getComputedStyle(node).getPropertyValue('--rs-gradient'))).toContain('#c2683a')
  expect(await surfaces.locator('[data-care-surface=safety]').evaluate(node => getComputedStyle(node).getPropertyValue('--rs-gradient'))).toContain('#2e43ff')
  expect(await surfaces.locator('.ac-material-illumination').first().evaluate(node => getComputedStyle(node).opacity)).toBe('0')
  await surfaces.getByRole('button', { name: '알림 시연' }).click()
  await expect.poll(() => surfaces.locator('.ac-material-illumination').first().evaluate(node => Number(getComputedStyle(node).opacity))).toBeGreaterThan(0)
  expect(await page.evaluate(() => localStorage.getItem('response-surface-study-v1'))).toBe(originals.library)
  expect(await page.evaluate(() => localStorage.getItem('after-care-theme-v1'))).toBe(originals.theme)
  expect(await page.evaluate(() => localStorage.getItem('after-care-interaction-study-v1'))).toBe('preserve-existing-settings')
})

test('2560 IVI renders the approved typography and small semantic status colors', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 })
  await page.goto('/?study=design-system')
  const style = (selector: string) => page.locator(selector).first().evaluate(node => {
    const css = getComputedStyle(node)
    return { size: parseFloat(css.fontSize), weight: css.fontWeight, leading: parseFloat(css.lineHeight), spacing: parseFloat(css.letterSpacing) || 0 }
  })
  expect(await style('.ac-catalog-number')).toEqual({ size: 141, weight: '400', leading: 141, spacing: -7.755 })
  expect(await style('.ac-material-grid [data-care-surface=safety] h3')).toEqual({ size: 46, weight: '600', leading: 56.12, spacing: -.92 })
  expect(await style('.ac-material-grid [data-care-surface=call] h3')).toEqual({ size: 40, weight: '400', leading: 50, spacing: -1.4 })
  expect(await style('.ac-situation-top h2')).toMatchObject({ size: 36, weight: '600', leading: 50.04 })
  expect(await style('.ac-guidance-content p')).toMatchObject({ size: 26, weight: '400', leading: 34.06 })
  expect(await style('.ac-heading p')).toMatchObject({ size: 22, weight: '400', leading: 29.04 })
  expect(await style('.ac-catalog-statuses .ac-status')).toMatchObject({ size: 24, weight: '600', leading: 31.2 })
  expect(await style('.ac-contour-header h2')).toEqual({ size: 40, weight: '600', leading: 52, spacing: 0 })
  expect(await style('.ac-unknown-map h2')).toEqual({ size: 40, weight: '600', leading: 52, spacing: 0 })
  for (const [tone, color] of [['pending', 'rgb(242, 165, 65)'], ['confirmed', 'rgb(167, 227, 191)'], ['failed', 'rgb(255, 179, 156)'], ['info', 'rgb(108, 142, 245)']]) {
    expect(await page.locator(`.ac-catalog-statuses [data-tone=${tone}]`).evaluate(node => getComputedStyle(node).color)).toBe(color)
  }
  await page.goto('/?study=surroundings')
  expect(await style('.ss-header h2')).toEqual({ size: 40, weight: '600', leading: 52, spacing: 0 })
})

test('Catalog keeps long titles within 360px at 200 percent text', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 852 })
  await page.goto('/?study=design-system')
  await page.getByRole('button', { name: '긴 문구 보기', exact: true }).click()
  await page.addStyleTag({ content: 'html { font-size:200% }' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('narrow vehicle retains 64px targets, actual mobile uses 48px, and text enlargement doubles roles', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await page.goto('/?study=design-system')
  const action = page.getByRole('button', { name: '말로 기록하기', exact: true }).first()
  expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(64)
  const before = await action.evaluate(node => parseFloat(getComputedStyle(node).fontSize))
  expect(before).toBeGreaterThanOrEqual(18)
  await page.addStyleTag({ content: 'html { font-size:200% }' })
  expect(await action.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBe(before * 2)
  await action.focus()
  expect(await action.evaluate(node => getComputedStyle(node).outlineWidth)).toBe('4px')
  await page.goto('/?device=mobile')
  const start = page.getByRole('button', { name: '이 상황으로 시작', exact: true })
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  expect(await start.evaluate(node => getComputedStyle(node).getPropertyValue('--ac-touch'))).toBe('48px')
})
