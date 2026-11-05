import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const study = '/studies/optical-materials.html'

test('three materials render differently, share a baseline, and remain static', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(study)
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true')
  const images = () => page.locator('#comparison canvas').evaluateAll(nodes => nodes.map(node => (node as HTMLCanvasElement).toDataURL()))
  const initial = await images()
  expect(new Set(initial).size).toBe(3)
  await page.waitForTimeout(200)
  expect(await images()).toEqual(initial)
  await page.getByRole('button', { name: '효과 전 비교', exact: true }).click()
  await expect(page.locator('#readout')).toContainText('BASE GRADIENT')
  expect(new Set(await images()).size).toBe(1)
  await page.getByRole('button', { name: '효과 다시 보기', exact: true }).click()
  await expect(page.locator('#readout')).not.toContainText('BASE GRADIENT')
  expect(await images()).toEqual(initial)
  expect(errors).toEqual([])
  await expect(page.locator('#error')).toBeHidden()
})

test('focus, light, inspection, content and reset affect the visible preview', async ({ page }) => {
  await page.goto(study + '?variant=B&view=focus')
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('#focus-title')).toHaveText('B / Etched glass')
  const surface = () => page.locator('#focus-canvas').evaluate(node => (node as HTMLCanvasElement).toDataURL())
  const initial = await surface()
  await page.locator('#light').fill('-65')
  await expect(page.locator('#readout')).toContainText('light -65°')
  expect(await surface()).not.toBe(initial)
  await page.locator('#texture').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#focus-title')).toHaveText('B / Etched glass')
  await page.locator('#focus-view').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/variant=C&view=focus/)
  await expect(page.locator('#focus-title')).toHaveText('C / Satin metal')
  const detail = () => page.locator('#detail').evaluate(node => (node as HTMLCanvasElement).toDataURL())
  const before = await detail()
  await page.locator('#focus-surface').hover({ position: { x: 80, y: 110 } })
  expect(await detail()).not.toBe(before)
  await page.getByRole('button', { name: '배경만 보기', exact: true }).click()
  await expect(page.locator('#focus .sample-copy')).toBeHidden()
  await page.getByRole('button', { name: '초기화', exact: true }).click()
  await expect(page.locator('#readout')).toContainText('texture 70 · optics 65 · light 35° · content on')
  await expect(page.locator('#focus .sample-copy')).toBeVisible()
  await page.reload()
  await expect(page.locator('#focus-title')).toHaveText('C / Satin metal')
})

test('mobile controls fit and the standalone file renders without network dependencies', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  const requests: string[] = []
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
  await page.goto(pathToFileURL(resolve('public/studies/optical-materials.html')).href)
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('[data-variant="B"]').click()
  await expect(page.locator('#focus-title')).toHaveText('B / Etched glass')
  await page.locator('#light').fill('70')
  await expect(page.locator('#readout')).toContainText('light 70°')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(requests).toEqual([])
})

test('unavailable WebGL is reported instead of presenting the fallback as a material', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl2') return null
      return Reflect.apply(getContext, this, [type, ...args])
    } as typeof getContext
  })
  await page.goto(study)
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'error')
  await expect(page.locator('#error')).toContainText('WebGL 2를 사용할 수 없어')
})
