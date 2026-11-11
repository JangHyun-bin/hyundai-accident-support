import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = 'http://127.0.0.1:5173/?study=response-alts&focus=surface'
const key = 'response-surface-study-v1'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, reducedMotion: 'reduce' })
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url)
  await page.evaluate(() => document.fonts.ready)
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const callBackground = () => page.locator('.rs-canvas .rc-call').evaluate(el => getComputedStyle(el).backgroundImage)
  const originalBackground = await callBackground()
  const originalSafety = await page.locator('.rs-study > .rc-device .rc-safety').evaluate(el => getComputedStyle(el).backgroundImage)

  await page.getByLabel('Gradient 방향', { exact: true }).focus()
  await page.keyboard.press('End')
  assert.equal((await read()).draft.call.angle, 360)
  assert.notEqual(await callBackground(), originalBackground)
  assert.equal(await callBackground(), await page.locator('.rs-study > .rc-device .rc-call').evaluate(el => getComputedStyle(el).backgroundImage))
  assert.equal(await page.locator('.rs-study > .rc-device .rc-safety').evaluate(el => getComputedStyle(el).backgroundImage), originalSafety)
  await page.getByLabel('Blur', { exact: true }).focus()
  await page.keyboard.press('End')
  assert.equal(await page.locator('.rs-canvas .rc-call').evaluate(el => getComputedStyle(el, '::before').filter), 'blur(100px)')
  await page.getByRole('button', { name: '원본 비교', exact: true }).click()
  assert.equal(await callBackground(), originalBackground)
  assert.equal(await page.getByLabel('Blur', { exact: true }).isDisabled(), true)
  assert.equal((await read()).draft.call.blur, 100)
  await page.getByRole('button', { name: '편집 화면으로' }).click()

  await page.getByRole('group', { name: '조절할 card' }).getByRole('button', { name: '대피 안내', exact: true }).click()
  await page.getByLabel('Shade 농도', { exact: true }).focus()
  await page.keyboard.press('Home')
  assert.equal(await page.locator('.rs-canvas .rc-safety').evaluate(el => getComputedStyle(el, '::before').opacity), '0')
  assert.equal((await read()).draft.call.blur, 100)
  await page.getByLabel('Preset 이름').fill('Quiet test')
  await page.getByRole('button', { name: '새 preset 저장', exact: true }).click()
  const saved = (await read()).draft
  await page.getByRole('button', { name: '이 card 초기화' }).click()
  assert.equal((await read()).draft.safety.opacity, 100)
  assert.equal((await read()).draft.call.blur, 100)
  await page.reload()
  assert.equal((await read()).presets[0].surfaces.safety.opacity, 0)
  await page.getByLabel('불러오기', { exact: true }).selectOption('0')
  assert.deepEqual((await read()).draft, saved)

  await page.getByLabel('Blur', { exact: true }).focus()
  await page.keyboard.press('Home')
  await page.getByRole('button', { name: '이 preset 업데이트' }).click()
  assert.equal((await read()).presets.length, 1)
  assert.equal((await read()).presets[0].surfaces.call.blur, 0)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '현재 조합 JSON 내려받기' }).click()
  const download = await downloadPromise
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'))
  assert.equal(exported.name, 'Quiet test')
  assert.deepEqual(exported.surfaces, (await read()).draft)

  await page.getByLabel('불러오기', { exact: true }).selectOption('original')
  await page.evaluate(() => document.fonts.ready)
  for (const width of [1600, 1024, 768, 393]) {
    await page.setViewportSize({ width, height: 1100 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`)
    if (width === 1600 || width === 393) {
      await page.screenshot({ path: new URL(`surface-${width}.png`, import.meta.url).pathname, fullPage: true })
    }
  }
  await page.getByLabel('Blur', { exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  assert.equal((await read()).draft.call.blur, 47, 'range keyboard works at mobile width')
  await page.getByRole('button', { name: '이 card 초기화' }).click()
  await page.getByRole('group', { name: '조절할 card' }).getByRole('button', { name: '대피 안내', exact: true }).click()
  assert.equal(await page.locator('.rs-canvas .rc-safety').count(), 1)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)

  await page.evaluate(key => localStorage.setItem(key, '{broken'), key)
  await page.reload()
  assert.match(await page.locator('.rs-status').innerText(), /읽지 못했어요/)
  assert.equal(await page.getByLabel('Blur', { exact: true }).inputValue(), '46')
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), '{broken', 'reading invalid storage must not overwrite it')
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, draft: { call: { blur: Infinity } }, presets: [] })), key)
  await page.reload()
  assert.match(await page.locator('.rs-status').innerText(), /읽지 못했어요/)
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') } })
  await page.getByLabel('Blur', { exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  assert.match(await page.locator('.rs-status').innerText(), /저장하지 못했어요/)
  assert.equal(await page.getByLabel('Blur', { exact: true }).inputValue(), '47')
  assert.deepEqual(errors, [])
  console.log('PASS: live surface edits, independent cards, non-destructive original comparison, reset, save/update/load/reload, JSON export, four widths, keyboard, corrupt storage and failed writes.')
} finally {
  await browser.close()
}
