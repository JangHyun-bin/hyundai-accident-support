import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Run with the existing Vite server: node evidence/response-concepts/verify.mjs
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1180 }, reducedMotion: 'reduce' })
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  for (const variant of ['compare', 'A', 'B', 'C', 'B1', 'B2']) {
    await page.goto(`http://127.0.0.1:5173/?study=response-alts&variant=${variant}`)
    await page.evaluate(() => document.fonts.ready)
    for (const width of [1600, 1024, 768, 393]) {
      await page.setViewportSize({ width, height: 1180 })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${variant}, ${width}: overflow`)
    }
    await page.setViewportSize({ width: 1600, height: 1180 })
    await page.screenshot({ path: new URL(`${variant}-desktop.png`, import.meta.url).pathname, fullPage: true })
    if (variant !== 'compare') {
      assert.equal(await page.locator('.rc-spectrum i').first().evaluate(el => getComputedStyle(el).animationName), 'none')
      await page.getByRole('button', { name: '안전한 곳에서 말로 기록하기' }).click()
      assert.match(await page.getByRole('status').innerText(), /녹음은 시작하지 않았어요/)
      await page.getByRole('button', { name: '안내 닫기' }).click()
    }
  }
  await page.goto('http://127.0.0.1:5173/?study=response-alts&variant=compare')
  await page.getByRole('button', { name: 'A 크게 보기' }).click()
  await page.getByRole('button', { name: '차량 상태', exact: true }).click()
  assert.equal(await page.getByText('차량에서 확인한 내용').isVisible(), true)
  await page.getByRole('button', { name: '119 통화', exact: true }).click()
  assert.equal(await page.getByRole('heading', { name: '통화 연결됨', exact: true }).isVisible(), true)
  await page.getByRole('button', { name: '다음 시안' }).click()
  assert.equal(new URL(page.url()).searchParams.get('variant'), 'B')
  await page.reload()
  assert.equal(await page.getByRole('heading', { name: 'Signal', exact: true }).isVisible(), true)
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('ArrowRight')
  assert.equal(new URL(page.url()).searchParams.get('variant'), 'C')
  await page.keyboard.press('ArrowRight')
  assert.equal(new URL(page.url()).searchParams.get('variant'), 'A')
  await page.getByRole('button', { name: '이전 시안' }).focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(new URL(page.url()).searchParams.get('variant'), 'A', 'focused control must keep arrow keys')
  await page.goto('http://127.0.0.1:5173/?study=response-alts&variant=B1')
  await page.getByRole('button', { name: '이전 시안' }).click()
  assert.equal(new URL(page.url()).searchParams.get('variant'), 'B')
  assert.equal(new URL(page.url()).searchParams.get('family'), 'B')
  await page.reload()
  await page.getByRole('button', { name: '다음 시안' }).click()
  assert.equal(new URL(page.url()).searchParams.get('variant'), 'B1')
  await page.getByRole('button', { name: '다음 시안' }).click()
  assert.equal(new URL(page.url()).searchParams.get('variant'), 'B2')
  await page.getByRole('button', { name: '세 시안 비교' }).click()
  assert.equal(await page.getByRole('button', { name: 'B′ 크게 보기', exact: true }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'B″ 크게 보기', exact: true }).count(), 1)
  await page.screenshot({ path: new URL('refined-compare-desktop.png', import.meta.url).pathname, fullPage: true })
  for (const suffix of ['', '&family=art&variant=F3', '&family=studio&variant=S2']) {
    await page.goto('http://127.0.0.1:5173/?study=response-alts' + suffix)
    assert.equal(await page.locator('.rc-B2').count(), 1, 'default and retired experiment URLs must restore plain B double prime')
    assert.equal(await page.locator('.rc-dot-number').count(), 1)
    assert.equal(await page.locator('.rc-art').count(), 0)
  }
  for (const variant of ['compare', 'A', 'B', 'C', 'B1', 'B2']) {
    const mobile = await browser.newPage({ viewport: { width: 393, height: 900 }, reducedMotion: 'reduce' })
    mobile.on('pageerror', error => errors.push(error.message))
    await mobile.goto(`http://127.0.0.1:5173/?study=response-alts&variant=${variant}`)
    await mobile.evaluate(() => document.fonts.ready)
    await mobile.screenshot({ path: new URL(`${variant}-mobile.png`, import.meta.url).pathname, fullPage: true })
    await mobile.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS: six views × four widths; controls; URL reload; default and retired URLs restore plain B double prime; reduced motion; no browser errors.')
} finally {
  await browser.close()
}
