import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5173/?study=response-alts&focus=surface')
  const draft = JSON.parse(await page.locator('.rs-values pre').textContent())
  draft.call.chromatic = 12; draft.call.grain = 0
  await page.evaluate(draft => localStorage.setItem('response-surface-study-v1', JSON.stringify({version: 1, draft, presets: []})), draft)
  await page.reload()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => !!document.querySelector('feDisplacementMap'))
  await page.locator('.rs-canvas').screenshot({path: new URL('ca-radial-after.png', import.meta.url).pathname})

  // Render white landmarks through the actual filter; opposite fringes must point away from the optical centre.
  await page.addStyleTag({content: '.rs-canvas .rc-call > :not(.rs-material){visibility:hidden}.rs-canvas .rs-material-source{background:#000}.rs-canvas .rs-material-source > i,.rs-canvas .rs-material-source:after{display:none}'})
  await page.locator('.rs-canvas .rs-material-source').evaluate(el => {
    for (const x of [15, 50, 85]) {
      const mark = document.createElement('span')
      mark.style.cssText = `position:absolute;left:calc(${x}% - 4px);top:calc(50% - 12px);width:8px;height:24px;background:white`
      el.append(mark)
    }
  })
  const shot = await page.locator('.rs-canvas').screenshot({path:new URL('ca-optical-landmarks.png', import.meta.url).pathname})
  const centroids = await page.evaluate(async url => {
    const image = new Image(); image.src = url; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
    const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return [.15, .5, .85].map(f => {
      const weights = [0,0,0], sums = [0,0,0]
      for (let y = Math.floor(canvas.height/2)-20; y < canvas.height/2+20; y++) {
        for (let x = Math.floor(canvas.width*f)-24; x < canvas.width*f+24; x++) {
          for (let c=0;c<3;c++) {const v=data[(y*canvas.width+x)*4+c];weights[c]+=v;sums[c]+=v*x}
        }
      }
      return sums.map((s,c)=>s/weights[c])
    })
  }, `data:image/png;base64,${shot.toString('base64')}`)
  const [left, centre, right] = centroids
  assert.ok(left[0] < left[1]-.3 && left[2] > left[1]+.3, `left fringe must expand red / contract blue: ${left}`)
  assert.ok(right[0] > right[1]+.3 && right[2] < right[1]-.3, `right fringe must reverse: ${right}`)
  assert.ok(Math.max(...centre)-Math.min(...centre) < .35, `centre must stay aligned: ${centre}`)
  await page.reload()
  const map = () => page.locator('.rs-canvas feImage[result=dispersion]').getAttribute('href')
  const horizontal = await map()
  await page.getByLabel('Lens 축', {exact:true}).focus()
  await page.keyboard.press('ArrowRight')
  assert.notEqual(await map(), horizontal, 'Lens axis must update dispersion')
  await page.keyboard.press('Home')
  assert.equal(await map(), horizontal, 'Lens axis must be deterministic')
  await page.setViewportSize({width:393,height:900})
  await page.locator('.rs-canvas').screenshot({path:new URL('ca-optical-mobile.png', import.meta.url).pathname})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), true)
  assert.deepEqual(errors, [])
  console.log('PASS: rendered fringes reverse across optical centre; centre stays aligned; axis deterministic; mobile fits.', centroids)
} finally { await browser.close() }
