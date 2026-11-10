import { test, expect, type Page } from '@playwright/test'

async function begin(page: Page, fixture = 'partial-evidence') {
  await page.goto('/?study=journey&fixture=' + fixture)
  await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  await expect(page.locator('[data-case-id]')).toBeVisible()
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
}

test('vehicle observations preserve unknown mobility and device confirmations require an event', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: '차량 상태 보기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '차량에서 확인한 내용' })).toBeVisible()
  await expect(page.locator('[data-observation="impact-direction"]')).toContainText('확인되지 않았어요')
  await page.getByRole('button', { name: '시연 event: 차량 감지 자료', exact: true }).click()
  await expect(page.locator('[data-observation="impact-direction"]')).toContainText('우측 전방')
  await expect(page.locator('[data-fact="driver"]:visible')).toContainText('미확인')
  await expect(page.locator('[data-fact="route"]:visible')).toContainText('미확인')
  await page.getByRole('button', { name: '비상등을 켰어요', exact: true }).click()
  await expect(page.locator('[data-safety-action="hazard"]')).toContainText('사용자 확인')
  await expect(page.locator('[data-safety-action="hazard"]')).not.toContainText('차량 확인')
  await page.getByRole('button', { name: '시연 event: 비상등 작동 확인', exact: true }).click()
  await expect(page.locator('[data-safety-action="hazard"]')).toContainText('차량 확인')
})

test('device switching restores the same case while another browser cannot claim the handoff', async ({ page, browser }) => {
  await begin(page)
  const id = new URL(page.url()).searchParams.get('case')
  await page.getByRole('button', { name: 'Mobile 보기', exact: true }).click()
  await expect(page.locator('[data-journey-device="mobile"]:visible')).toBeVisible()
  expect(new URL(page.url()).searchParams.get('case')).toBe(id)
  await page.reload()
  await expect(page.locator('[data-case-id]')).toHaveAttribute('data-case-id', id!)
  const other = await browser.newContext()
  const phone = await other.newPage()
  await phone.goto(page.url())
  await expect(phone.getByRole('heading', { name: '이 기기에서 기록을 찾지 못했어요' })).toBeVisible()
  await expect(phone.locator('[data-case-id]')).toHaveCount(0)
  await other.close()
})

test('unknown position has no invented marker or evacuation distance', async ({ page }) => {
  await begin(page)
  await expect(page.locator('[data-navigation-state="unknown"]:visible')).toBeVisible()
  await expect(page.locator('[data-vehicle-position]')).toHaveCount(0)
  await page.getByRole('button', { name: '시연 event: 안내 지점 자료', exact: true }).click()
  await expect(page.locator('[data-navigation-state="fixture"]:visible')).toBeVisible()
  await expect(page.locator('[data-vehicle-position]:visible')).toBeVisible()
})

test('review controls do not override the vehicle primary action typography', async ({ page }) => {
  await begin(page)
  const action = page.getByRole('button', { name: '사고 기록 남기기', exact: true })
  expect(await action.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBe(17)
})

test('conflicting impact observations remain visible without asserting a direction', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: '차량 상태 보기', exact: true }).click()
  await expect(page.getByRole('img', { name: '충격 방향 미확인', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '시연 event: 차량 감지 자료', exact: true }).click()
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: '우측 전방 충격 방향', exact: true })).toBeVisible()
  await page.evaluate(async () => {
    const domainPath = '/src/journey/case.ts'
    const storePath = '/src/journey/case-store.ts'
    const domain = await import(/* @vite-ignore */ domainPath) as typeof import('../src/journey/case')
    const store = await import(/* @vite-ignore */ storePath) as typeof import('../src/journey/case-store')
    const value = (await store.loadCase(new URL(location.href).searchParams.get('case')!))!
    const next = domain.reduceCase(value, { type: 'observation', observation: { id: 'conflicting-direction', kind: 'impact-direction',
      label: '충격 방향', value: '좌측 후방', source: 'user', observedAt: new Date().toISOString(), confirmation: 'confirmed', legacyFactId: null, supersedes: null } })
    const saved = await store.commitCase(next, value.revision)
    if (!saved.ok) throw new Error(saved.reason)
  })
  await page.reload()
  await page.getByRole('button', { name: '차량 상태 보기', exact: true }).click()
  await expect(page.getByRole('img', { name: '충격 방향 미확인', exact: true })).toBeVisible()
  const detail = page.locator('[data-observation="impact-direction"]')
  await expect(detail).toContainText('정보 확인 필요')
  await expect(detail).toContainText('우측 전방')
  await expect(detail).toContainText('좌측 후방')
})

test('urgent interruption is immediate during a pending save and the record returns intact', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: '사고 기록 남기기', exact: true }).click()
  await page.getByRole('button', { name: '직접 입력', exact: true }).click()
  await expect(page.getByLabel('사고 기록', { exact: true })).toBeVisible()
  await page.evaluate(() => {
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { configurable: true, get: descriptor.get,
      set(handler) { descriptor.set!.call(this, function (this: IDBTransaction, event: Event) { setTimeout(() => handler.call(this, event), 800) }) } })
  })
  await page.getByLabel('사고 기록', { exact: true }).fill('오른쪽에서 충격을 느꼈어요.')
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response', { timeout: 400 })
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible({ timeout: 5000 })
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  await page.getByRole('button', { name: '기록으로 돌아가기', exact: true }).click()
  await expect(page.getByLabel('사고 기록', { exact: true })).toHaveValue('오른쪽에서 충격을 느꼈어요.')
})

test('a risk event does not restart the rescue countdown', async ({ page }) => {
  await page.clock.install()
  await begin(page, 'unanswered')
  await page.clock.runFor(4000)
  const before = Number(await page.locator('[data-countdown]').getAttribute('data-countdown'))
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  expect(Number(await page.locator('[data-countdown]').getAttribute('data-countdown'))).toBeLessThanOrEqual(before)
  await page.clock.runFor(6500)
  await expect(page.locator('[data-request="rescue"]:visible')).toContainText('연결 미확인')
  await expect(page.locator('[data-request="insurance"]:visible')).toContainText('요청 전')
})

test('mobile status text stays inside its own column at 200 percent text size', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await begin(page)
  await page.getByRole('button', { name: 'Mobile 보기', exact: true }).click()
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  const fits = await page.locator('.ac-facts:visible > div, .ac-request-list:visible > div').evaluateAll(columns => columns.every(column => {
    const outer = column.getBoundingClientRect()
    return [...column.querySelectorAll('span,strong')].every(node => {
      const range = document.createRange(); range.selectNodeContents(node)
      const text = range.getBoundingClientRect()
      return text.right <= outer.right + 1 && text.left >= outer.left - 1
    })
  }))
  expect(fits).toBe(true)
})
