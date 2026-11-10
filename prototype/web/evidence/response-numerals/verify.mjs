import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
async function surroundingDesign(screen) {
  return screen.evaluate(root => {
    const clone = root.cloneNode(true)
    clone.querySelector('.rc-dot-number').replaceChildren()
    clone.querySelector('.rc-dot-number').removeAttribute('data-numeral')
    const origin = root.getBoundingClientRect()
    const layout = [root, ...root.querySelectorAll('*')].filter(el => !el.closest('.rc-dot-number')).map(el => {
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return { box: rect.width === 0 && rect.height === 0 ? null : [rect.x - origin.x, rect.y - origin.y, rect.width, rect.height].map(v => Math.round(v * 10) / 10),
        color: style.color, background: style.background, font: style.font, border: style.border, padding: style.padding }
    })
    return { markup: clone.outerHTML, layout }
  })
}
try {
  for (const width of [1600, 393]) {
    const page = await browser.newPage({ viewport: { width, height: 1500 }, reducedMotion: 'reduce' })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:5173/?study=response-alts&family=B&variant=B2')
    await page.evaluate(() => document.fonts.ready)
    const original = await surroundingDesign(page.locator('.rc-study > .rc-device'))
    await page.goto('http://127.0.0.1:5173/?study=response-alts&focus=numeral')
    await page.evaluate(() => document.fonts.ready)
    for (const [kind, label] of [['dot', 'Original dot'], ['micro', 'Micro-dot'], ['capsule', 'Capsule'], ['solid', 'Solid']]) {
      await page.getByRole('group', { name: '119 숫자 디자인' }).getByRole('button').filter({ hasText: label }).click()
      const screen = page.locator('.rc-study > .rc-device')
      assert.equal(await screen.locator('[data-numeral]').getAttribute('data-numeral'), kind)
      if (kind === 'solid' || kind === 'micro') {
        const widthRatio = await screen.locator('[data-numeral] text').evaluate(text => {
          const native = text.cloneNode(true)
          native.removeAttribute('textLength')
          native.removeAttribute('lengthAdjust')
          text.parentNode.appendChild(native)
          const ratio = text.getBBox().width / native.getBBox().width
          native.remove()
          return ratio
        })
        assert.ok(Math.abs(widthRatio - 1) < .001, `${kind}: glyph width must retain the font's natural proportions`)
      }
      const actual = await surroundingDesign(screen)
      assert.equal(isDeepStrictEqual(actual, original), true, `${kind} at ${width}: layout, styles and content outside 119 must match B double prime`)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      assert.equal(new URL(page.url()).searchParams.get('numeral'), kind)
      await page.reload()
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.locator('.rc-study > .rc-device [data-numeral]').getAttribute('data-numeral'), kind)
      await page.locator('.rc-study > .rc-device .rc-call').screenshot({ path: new URL(`${kind}-${width}.png`, import.meta.url).pathname, style: '.rc-switcher { visibility:hidden !important; }' })
    }
    await page.getByRole('group', { name: '119 숫자 디자인' }).getByRole('button').filter({ hasText: 'Original dot' }).click()
    await page.screenshot({ path: new URL(`overview-${width}.png`, import.meta.url).pathname, fullPage: true })
    await page.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS: four numeral treatments, desktop/mobile, reload, no overflow or errors. All layout, colors, typography and content outside the numeral match original B double prime.')
} finally {
  await browser.close()
}
