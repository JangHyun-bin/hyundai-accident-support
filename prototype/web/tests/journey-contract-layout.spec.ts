import { test, expect } from '@playwright/test'

for (const [width, device] of [[2560, 'vehicle'], [1920, 'vehicle'], [1440, 'vehicle'], [960, 'vehicle'], [393, 'vehicle'], [393, 'mobile'], [360, 'mobile']] as const) {
  test(`representative ${device} at ${width}px preserves readable actions and semantic hit areas`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 1920 ? 1440 : width <= 393 ? 852 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?device=' + device)
    await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
    const flow = page.getByTestId('journey-flow')
    await expect(flow).toHaveAttribute('data-step', '1')
    const primary = page.getByTestId('journey-primary')
    await expect(primary).toBeInViewport({ratio:1})
    await primary.click()
    await page.getByRole('button', { name: '시연 event: 통화 연결 확인', exact: true }).click()
    await primary.click()
    await expect(flow).toHaveAttribute('data-step', '3')
    for (const font of [16, 32]) {
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px` }, font)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      const minimum = device === 'vehicle' ? 64 : 48
      for (const button of await flow.getByRole('button').all()) {
        const rect = await button.boundingBox()
        expect(rect!.height).toBeGreaterThanOrEqual(minimum)
        expect(rect!.width).toBeGreaterThanOrEqual(minimum)
      }
      await expect.poll(() => flow.locator('.fs-cell-body').evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1))).toBe(true)
      await primary.focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      expect(await primary.evaluate(node => getComputedStyle(node).outlineWidth)).toBe('4px')
      if (font === 32) expect(await flow.locator('.fs-step-copy h1').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(56)
    }
    expect(await flow.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations === Infinity).length)).toBe(0)
  })
}
