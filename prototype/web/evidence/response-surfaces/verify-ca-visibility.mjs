import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Regression: clipping the optical output must not erase the real card's outward colour fringe.
const browser = await chromium.launch({channel: 'chrome', headless: true})
try {
  const page = await browser.newPage({viewport: {width: 1600, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'})
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5173/?study=response-alts&focus=surface')
  const draft = JSON.parse(await page.locator('.rs-values pre').textContent())
  Object.assign(draft.call, {chromatic: 0, chromaticAngle: 201, grain: 22, grainSize: 1.1, grainClumping: 11, grainTone: 59, grainSeed: 303, blur: 49, height: 97, radius: 25, rim: 43})
  await page.evaluate(draft => localStorage.setItem('response-surface-study-v1', JSON.stringify({version: 1, draft, presets: []})), draft)
  await page.reload()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => !!document.querySelector('.rs-canvas feImage[result=grain]'))
  // Keep the sticky preview from moving a subpixel when keyboard focus scrolls the controls.
  await page.addStyleTag({content: '.rs-preview{position:static!important}'})
  const screenshots = []
  for (const amount of [0, 24, 0]) {
    await page.getByLabel('색 분리', {exact:true}).focus()
    await page.keyboard.press(amount ? 'End' : 'Home')
    await page.evaluate(() => window.scrollTo(0,0))
    screenshots.push(await page.locator('.rs-stage').screenshot({path: new URL(`ca-real-${amount}.png`, import.meta.url).pathname}))
  }
  const rect = await page.locator('.rs-canvas .rc-call').evaluate(el => {
    const card = el.getBoundingClientRect(), stage = el.closest('.rs-stage').getBoundingClientRect()
    return {x:card.x-stage.x, y:card.y-stage.y, width:card.width, height:card.height}
  })
  const stats = await page.evaluate(async ({urls, rect:r}) => {
    const load = async url => {const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height)}
    const [off,on,restored] = await Promise.all(urls.map(load))
    const fringe = frame => {
      const sides = [0,0]
      for(let y=Math.ceil(r.y+r.height*.4); y<r.y+r.height*.6; y++) for(let dx=1;dx<=16;dx++) {
        for(const side of [0,1]) {
          const x=side ? Math.ceil(r.x+r.width)+dx : Math.floor(r.x)-dx
          const i=(y*frame.width+x)*4
          if(frame.data[i]>30 && frame.data[i]-Math.max(frame.data[i+1],frame.data[i+2])>12) sides[side]++
        }
      }
      return sides
    }
    let changedWhite=0, white=0
    for(let y=Math.ceil(r.y+75);y<r.y+185;y++) for(let x=Math.ceil(r.x+20);x<r.x+230;x++) {
      const i=(y*off.width+x)*4
      if(Math.min(off.data[i],off.data[i+1],off.data[i+2])<245)continue
      white++
      if(Math.max(...[0,1,2].map(c=>Math.abs(off.data[i+c]-on.data[i+c])))>8)changedWhite++
    }
    const restoredExactly = off.data.every((v,i)=>v===restored.data[i])
    return {off:fringe(off),on:fringe(on),white,changedWhite,restoredExactly}
  }, {urls:screenshots.map(b=>`data:image/png;base64,${b.toString('base64')}`),rect})
  console.log(stats)
  assert.deepEqual(stats.off,[0,0], 'CA off must not add coloured light outside the card')
  assert.ok(stats.on.every(count=>count>20), 'CA max must visibly separate colour on BOTH real card edges, not clip it away')
  assert.ok(Math.max(...stats.on)/Math.min(...stats.on)<2, 'radial output must not become one-direction RGB translation outside the source')
  assert.ok(stats.white>1000 && stats.changedWhite===0, 'material CA must preserve the actual 119 glyph pixels')
  assert.ok(stats.restoredExactly, 'turning CA off must restore the original material')
  assert.deepEqual(errors, [])
  console.log('PASS: actual card has outward radial colour fringes; 119 stays crisp; zero restores exactly.')
} finally {await browser.close()}
