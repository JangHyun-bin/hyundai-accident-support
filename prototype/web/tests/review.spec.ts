import { expect, test } from '@playwright/test'

test('same_urgent_case_in_both_variants', async ({ page }) => {
  await page.goto('/?view=focus')
  const app = page.getByRole('region', { name: '사고 대응 화면' })
  for (const view of ['행동 중심', '상황 중심']) {
    await page.getByRole('button', { name: view, exact: true }).click()
    await expect(app.getByText('부상 있음', { exact: true })).toBeVisible()
    await expect(app.getByText('고속도로', { exact: true })).toBeVisible()
    await expect(app.getByText('이동 가능', { exact: true })).toBeVisible()
    await expect(app.getByText('조작·경로 미확인', { exact: true })).toBeVisible()
    await expect(app.getByRole('button', { name: '도움 요청 안내 보기' })).toBeVisible()
    await expect(app.getByRole('button', { name: /운전|차량 이동|출발/ })).toHaveCount(0)
    await expect(app.getByText('요청 전', { exact: true })).toHaveCount(3)
  }
})

test('guidance_survives_variant_switch_without_creating_request', async ({ page }) => {
  await page.goto('/?view=focus')
  const app = page.getByRole('region', { name: '사고 대응 화면' })
  await app.getByRole('button', { name: '도움 요청 안내 보기' }).click()
  await expect(app.getByRole('heading', { name: '긴급 도움 요청' })).toBeVisible()
  await expect(app.getByRole('heading', { name: '긴급 도움 요청' })).toBeFocused()
  await page.getByRole('button', { name: '상황 중심', exact: true }).click()
  await expect(page).toHaveURL(/view=context/)
  await expect(app.getByRole('heading', { name: '긴급 도움 요청' })).toBeVisible()
  await expect(app.getByText('요청 전', { exact: true })).toHaveCount(3)
  await app.getByRole('button', { name: '안내 접기' }).click()
  await expect(app.getByRole('button', { name: '도움 요청 안내 보기' })).toBeFocused()
})

test('unknown_view_falls_back_and_review_fits_small_browser', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?view=missing')
  await expect(page.getByRole('button', { name: '행동 중심', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '도움 요청 안내 보기' }).click()
  await expect(page.getByRole('heading', { name: '긴급 도움 요청' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('comparison_controls_fit_laptop_without_scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: '화면 구조 비교' })).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('region', { name: '사고 대응 화면' })).toBeInViewport({ ratio: 1 })
})
