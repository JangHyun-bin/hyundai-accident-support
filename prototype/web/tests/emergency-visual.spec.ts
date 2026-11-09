import { mkdirSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import manifest from '../../../specs/emergency-experience/scenarios.json' with { type: 'json' }

for (const size of ['desktop', 'mobile'] as const) for (const scenario of manifest.scenarios) {
  test(`${size} ${scenario.id}: every scene fits and uses the shared palette`, async ({ page }) => {
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('requestfailed', r => errors.push(r.url()))
    await page.setViewportSize(size === 'desktop' ? { width: 2560, height: 1800 } : { width: 375, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const dir = `evidence/emergency-complete/${size}`
    mkdirSync(dir, { recursive: true })
    for (const scene of scenario.states) {
      await page.goto(`/?study=emergency&scenario=${scenario.id}&scene=${scene.id}`)
      await page.evaluate(() => document.fonts.ready)
      if (size === 'desktop') await page.getByRole('button', { name: '원래 크기', exact: true }).click()
      const root = page.locator('.emergency-screen')
      await expect(root).toHaveAttribute('data-scene', scene.id)
      const issues = await root.evaluate(root => {
        const scale = root.getBoundingClientRect().width / 1232
        const main = root.querySelector('.emergency-car-main')!.getBoundingClientRect()
        const requests = root.querySelector('.emergency-requests')!.getBoundingClientRect()
        const self = root.querySelector('.emergency-self')!.getBoundingClientRect()
        const issues: string[] = []
        const palette = ['rgba(0, 0, 0, 0)', 'rgb(237, 238, 242)', 'rgb(29, 30, 33)', 'rgb(49, 50, 54)', 'rgb(164, 168, 174)', 'rgb(0, 224, 116)', 'rgb(255, 76, 40)', 'rgb(19, 20, 23)', 'rgb(199, 201, 206)']
        for (const el of root.querySelectorAll<HTMLElement>('h1, h2, p, button, textarea, fieldset, .emergency-workflow, .emergency-request-line')) {
          const box = el.getBoundingClientRect(), css = getComputedStyle(el)
          if (!palette.includes(css.backgroundColor)) issues.push(`background ${css.backgroundColor}`)
          if (!palette.includes(css.color)) issues.push(`color ${css.color}`)
          if (el.closest('.emergency-car-main') && box.bottom > requests.top + scale) issues.push(`main overlaps requests: ${el.tagName}/${el.textContent?.slice(0, 25)}`)
          if (el.tagName !== 'TEXTAREA' && el.scrollWidth > el.clientWidth + 2) issues.push(`horizontal clip: ${el.tagName}`)
          if (el.tagName === 'BUTTON' && box.height / scale < 63.9) issues.push('small target')
        }
        if (main.bottom > requests.top + scale || requests.bottom > self.top + scale) issues.push('regions overlap')
        return issues
      })
      expect(issues, `${scenario.id}/${scene.id}`).toEqual([])
      if (size === 'mobile') expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await root.screenshot({ path: `${dir}/${scenario.id}-${scene.id}.png`, animations: 'disabled' })
    }
    expect(errors).toEqual([])
  })
}

test('component catalog exposes actual editable workflow components', async ({ page }) => {
  await page.goto('/?study=emergency-catalog')
  await expect(page.getByRole('heading', { name: 'Pleos flat', exact: true })).toBeVisible()
  await page.getByLabel('사고 위치', { exact: true }).uncheck()
  await expect(page.getByLabel('사고 위치', { exact: true })).not.toBeChecked()
  await page.locator('#accident-record').fill('Catalog input')
  await expect(page.locator('#accident-record')).toHaveValue('Catalog input')
})
