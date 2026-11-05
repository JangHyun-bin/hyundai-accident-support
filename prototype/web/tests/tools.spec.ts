import { expect, test } from '@playwright/test'

const views = ['impeccable', 'uiux', 'hallmark', 'antislop']

test('each_tool_keeps_case_content_and_guidance', async ({ page }) => {
  for (const view of views) {
    await page.goto(`/?study=tools&view=${view}`)
    const screen = page.getByRole('region', { name: '사고 대응 화면 왼쪽' })
    for (const fact of ['부상 있음', '고속도로', '이동 가능', '조작·경로 미확인']) {
      await expect(screen.getByText(fact, { exact: true })).toBeVisible()
    }
    await expect(screen.getByText('요청 전', { exact: true })).toHaveCount(3)
    for (const status of await screen.getByText('요청 전', { exact: true }).all()) await expect(status).toBeVisible()
    await screen.getByRole('button', { name: '도움 요청 안내 보기' }).click()
    await expect(screen.getByRole('heading', { name: '긴급 도움 요청' })).toBeFocused()
    await screen.getByRole('button', { name: '안내 접기' }).click()
    await expect(screen.getByRole('button', { name: '도움 요청 안내 보기' })).toBeFocused()
  }
})

test('paired_comparison_syncs_state_without_stealing_focus_or_duplicate_ids', async ({ page }) => {
  await page.goto('/?study=tools&view=impeccable&compare=uiux')
  const left = page.getByRole('region', { name: '사고 대응 화면 왼쪽' })
  const right = page.getByRole('region', { name: '사고 대응 화면 오른쪽' })
  await left.getByRole('button', { name: '도움 요청 안내 보기' }).click()
  await expect(left.getByRole('heading', { name: '긴급 도움 요청' })).toBeFocused()
  await expect(right.getByRole('heading', { name: '긴급 도움 요청' })).toBeVisible()
  await page.getByLabel('오른쪽 안').selectOption('hallmark')
  await expect(right.getByRole('heading', { name: '긴급 도움 요청' })).toBeVisible()
  await expect(page).toHaveURL(/compare=hallmark/)
  await right.getByRole('button', { name: '안내 접기' }).click()
  await expect(right.getByRole('button', { name: '도움 요청 안내 보기' })).toBeFocused()
  await expect(left.getByRole('button', { name: '도움 요청 안내 보기' })).toBeVisible()
  const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(n => n.id))
  expect(new Set(ids).size).toBe(ids.length)
  await expect(page.getByText('요청 전', { exact: true })).toHaveCount(6)
})

test('names_reveal_and_url_fallback_work_on_small_browser', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?study=tools&view=missing&compare=missing')
  await expect(page.getByLabel('왼쪽 안')).toHaveValue('impeccable')
  await expect(page.getByLabel('오른쪽 안')).toHaveValue('uiux')
  await expect(page.getByRole('button', { name: '도구 이름 공개' })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: '도구 이름 공개' }).click()
  await expect(page.getByLabel('왼쪽 안').locator('option:checked')).toHaveText('안 1 · Impeccable')
  await page.reload()
  await expect(page.getByRole('button', { name: '도구 이름 숨기기' })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
