import { expect, test } from '@playwright/test'
import manifest from '../../../specs/emergency-experience/scenarios.json' with { type: 'json' }

test.setTimeout(120_000)

test('all_scenes_use_flat_paint_and_aligned_agency_rows', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const scenario of manifest.scenarios) for (const scene of scenario.states) {
    await page.goto(`/?study=emergency&scenario=${scenario.id}&scene=${scene.id}`)
    await page.evaluate(() => document.fonts.ready)
    const screen = page.locator('.emergency-screen')
    await expect(screen.getByRole('heading', { name: scene.title, exact: true })).toBeVisible()
    await expect(screen.locator('canvas, filter, linearGradient, radialGradient')).toHaveCount(0)
    await expect(screen).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    const panels = await screen.evaluate(root => {
      const top = root.querySelector('[data-slot="detected"]')!
      const bottom = root.querySelector('.emergency-response-panel')!
      const a = top.getBoundingClientRect(), b = bottom.getBoundingClientRect()
      const scale = root.getBoundingClientRect().width / 1232
      const inside = [...bottom.querySelectorAll('h1, .emergency-ring, .emergency-primary-action, [data-request], [data-slot="self"]')].every(node => {
        const r = node.getBoundingClientRect()
        return r.top >= b.top - 1 && r.bottom <= b.bottom + 1 && r.left >= b.left - 1 && r.right <= b.right + 1
      })
      return { gap: (b.top - a.bottom) / scale, sameWidth: Math.abs(a.width - b.width) < 1,
        radius: [top, bottom].map(node => getComputedStyle(node).borderRadius), inside }
    })
    expect(panels.gap).toBeCloseTo(24, 1)
    expect(panels.sameWidth).toBe(true)
    expect(panels.radius).toEqual(['32px', '32px'])
    expect(panels.inside, `${scene.id}: response content fits its own panel`).toBe(true)
    const result = await screen.evaluate(root => {
      const decoration = [...root.querySelectorAll('*')].filter(node => {
        const style = getComputedStyle(node)
        return style.backgroundImage !== 'none' || style.boxShadow !== 'none' || style.filter !== 'none'
      }).map(node => node.outerHTML.slice(0, 100))
      const rows = [...root.querySelectorAll('[data-request]')].map(node => {
        const box = node.getBoundingClientRect()
        const title = node.querySelector('.emergency-request-name')!.getBoundingClientRect()
        const status = node.querySelector('strong')!.getBoundingClientRect()
        const lines = [...node.querySelectorAll('.emergency-request-line')].map(line => {
          const rect = line.getBoundingClientRect()
          const range = document.createRange()
          range.selectNodeContents(line)
          const text = [...range.getClientRects()].filter(item => item.width > 2 && item.height > 2)
          return { nowrap: getComputedStyle(line).whiteSpace, fits: text.every(item => item.right <= rect.right + 1 && item.bottom <= rect.bottom + 1) }
        })
        return { top: box.top, height: box.height, title: title.top, status: status.top, lines }
      })
      return { decoration, rows }
    })
    expect(result.decoration, `${scenario.id}/${scene.id}`).toEqual([])
    for (const key of ['top', 'height', 'title', 'status'] as const) {
      const values = result.rows.map(row => row[key])
      expect(Math.max(...values) - Math.min(...values), `${scene.id}: ${key}`).toBeLessThan(1)
    }
    for (const row of result.rows) for (const line of row.lines) {
      expect(line.nowrap).toBe('nowrap')
      expect(line.fits, `${scene.id}: no split or clipped status`).toBe(true)
    }
  }
  expect(errors).toEqual([])
})

test('legacy_satin_url_uses_flat_design_and_mobile_controls_fit', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/?study=emergency&material=satin&scenario=SC01&scene=connected')
  await expect(page.locator('.emergency-screen')).toHaveAttribute('data-surface-status', 'flat')
  await expect(page.getByRole('heading', { name: '119 통화 연결됨', exact: true })).toBeVisible()
  await expect(page.locator('.emergency-screen canvas')).toHaveCount(0)
  await expect(page.getByRole('group', { name: '화면 재질' })).toHaveCount(0)
  await expect.poll(() => new URL(page.url()).searchParams.get('material')).toBeNull()
  await page.getByRole('button', { name: '현재 장면 spec', exact: true }).click()
  await expect(page.getByRole('region', { name: '현재 장면 spec', exact: true })).toContainText('SC01')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
