import { test, expect } from '@playwright/test'

test('journey catalog presents each representative view without losing its primary content', async ({ page }) => {
  await page.goto('/?study=journey-catalog')
  await expect(page.getByRole('heading', { name: '전체 여정 · 표현 기준' })).toBeVisible()
  await expect(page.locator('[data-journey-device="vehicle"]')).toBeVisible()
  await page.getByRole('button', { name: '음성 기록', exact: true }).click()
  await expect(page.getByRole('heading', { name: '이렇게 기록할까요?' })).toBeVisible()
  await expect(page.getByRole('button', { name: '기록 저장', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '경위서 확인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '기록을 확인해주세요' })).toBeVisible()
  await expect(page.getByText('전방 영상 · 00:08–00:16', { exact: true })).toBeVisible()
})

for (const width of [360, 393]) {
  test(`mobile at ${width}px keeps long Korean labels and primary action accessible at 200% text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?study=journey-catalog&preview=report')
    await expect(page.locator('[data-journey-device="mobile"]')).toBeVisible()
    await page.addStyleTag({ content: 'html { font-size: 200% }' })
    const next = page.getByRole('button', { name: '전송할 내용 확인', exact: true })
    await next.scrollIntoViewIfNeeded()
    await expect(next).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await next.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(await page.locator('.journey-surface').evaluate(el => getComputedStyle(el).wordBreak)).toBe('keep-all')
    const repeating = await page.locator('.journey-surface').evaluate(el =>
      el.getAnimations({ subtree: true }).filter(a => a.effect?.getTiming().iterations === Infinity).length)
    expect(repeating).toBe(0)
  })
}

test('vehicle preview fits the full display and a scaled desktop without horizontal clipping', async ({ page }) => {
  for (const width of [2560, 1440]) {
    await page.setViewportSize({ width, height: 1500 })
    await page.goto('/?study=journey-catalog')
    const display = page.locator('.pleos-display')
    await expect(display).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const rect = await display.boundingBox()
    expect(rect!.width).toBeLessThanOrEqual(width)
    await expect(page.getByRole('heading', { name: '차량에서 확인한 내용' })).toBeVisible()
  }
})
