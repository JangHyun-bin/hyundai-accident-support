import { expect, test } from '@playwright/test'
import manifest from '../../../specs/emergency-experience/scenarios.json' with { type: 'json' }

test('all scenes retain their content, semantic colors and geometry across surface changes', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const scenario of manifest.scenarios) for (const scene of scenario.states) {
    await page.goto(`/?study=emergency&material=satin&scenario=${scenario.id}&scene=${scene.id}`)
    const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
    await expect(screen).toHaveAttribute('data-surface-status', 'ready')
    await expect(screen.getByRole('heading', { name: scene.title, exact: true })).toBeVisible()
    // Asta web font load 전에 snapshot 을 찍으면 글자 폭이 1–2 px 달라진다.
    await page.evaluate(() => document.fonts.ready)
    const snapshot = () => screen.evaluate(element => ({
      text: (element as HTMLElement).innerText,
      parts: [...element.querySelectorAll('h1, h2, p, button, [data-fact], [data-request], [data-glyph], [data-mark]')].map(node => ({
        text: node.textContent,
        color: getComputedStyle(node).color,
        size: [node.getBoundingClientRect().width, node.getBoundingClientRect().height],
      })),
    }))
    const satin = await snapshot()
    await page.getByRole('button', { name: '기존 flat', exact: true }).click()
    await expect(screen).toHaveAttribute('data-surface-status', 'flat')
    expect(await snapshot()).toEqual(satin)
    expect(new URL(page.url()).searchParams.get('scene')).toBe(scene.id)
    await page.getByRole('button', { name: 'C · Satin', exact: true }).click()
    await expect(screen).toHaveAttribute('data-surface-status', 'ready')
    expect(await snapshot()).toEqual(satin)
  }
  expect(errors).toEqual([])
})

test('material controls preserve unknowns, agency states and pause while actions stay usable', async ({ page }) => {
  await page.goto('/?study=emergency&material=satin&scenario=SC01')
  const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  await screen.getByRole('button', { name: '지금 연결', exact: true }).click()
  await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeFocused()
  await page.getByRole('button', { name: '시연 일시 중단' }).click()
  await page.getByRole('button', { name: '기존 flat', exact: true }).click()
  await page.getByRole('button', { name: 'C · Satin', exact: true }).click()
  await page.getByRole('slider', { name: '표면 강도', exact: true }).fill('100')
  await expect(page.getByRole('button', { name: '시연 event: 통화 연결 확인' })).toBeDisabled()
  await page.getByRole('button', { name: '시연 재개' }).click()
  await expect(screen.locator('[data-fact="driver"]')).toContainText('미확인')
  await expect(screen.locator('[data-fact="route"]')).toContainText('미확인')
  await page.getByRole('button', { name: '시연 event: 통화 연결 확인' }).click()
  await expect(screen.locator('[data-request="rescue"]')).toContainText('접수 미확인')
  await page.reload()
  await expect(screen).toHaveAttribute('data-surface-status', 'ready')
  await expect(screen.getByRole('heading', { name: '119 통화 연결됨' })).toBeVisible()
  await expect(screen.locator('[data-request="rescue"]')).toContainText('접수 미확인')
})

for (const failure of ['unavailable', 'lost']) test(`graphics ${failure} falls back without disabling emergency actions`, async ({ page }) => {
  if (failure === 'unavailable') await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      return kind === 'webgl2' ? null : Reflect.apply(original, this, [kind, ...args])
    } as typeof original
  })
  await page.goto('/?study=emergency&material=satin')
  const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  if (failure === 'lost') {
    await expect(screen).toHaveAttribute('data-surface-status', 'ready')
    await screen.locator('canvas').evaluate(node => (node as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext())
  }
  await expect(screen).toHaveAttribute('data-surface-status', 'unavailable')
  await expect(page.getByText('C render 불가 · 기본 background로 표시')).toBeVisible()
  await expect(screen.locator('canvas')).toBeHidden()
  await screen.getByRole('button', { name: '지금 연결', exact: true }).click()
  await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeVisible()
})

test('surface review controls and spec fit at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?study=emergency&material=satin&scenario=SC05')
  await expect(page.locator('.emergency-screen')).toHaveAttribute('data-surface-status', 'ready')
  await page.getByRole('slider', { name: '표면 강도', exact: true }).fill('30')
  await page.getByRole('button', { name: '현재 장면 spec' }).click()
  await expect(page.getByRole('region', { name: '현재 장면 spec' })).toContainText('SC05')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
