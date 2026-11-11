import assert from 'node:assert/strict'
import {chromium} from 'playwright'

const browser = await chromium.launch({channel:'chrome',headless:true})
const key = 'response-surface-study-v1'
const base = 'http://127.0.0.1:5173/?study=response-alts&focus=surface'
try {
  const page = await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1,reducedMotion:'reduce'})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base)
  const draft=JSON.parse(await page.locator('.rs-values pre').textContent())
  Object.assign(draft.call,{chromatic:23.25,chromaticAngle:201,grain:22,grainSize:1.1,grainClumping:11,grainTone:59,grainSeed:303,blur:49,height:97,radius:25,rim:43})
  Object.assign(draft.safety,{blur:49,bottomSpread:23,y:56.5,radius:68})
  const initial={version:1,draft,presets:[{name:'C',surfaces:structuredClone(draft)},{name:'C_02',surfaces:structuredClone(draft)}]}
  await page.evaluate(({key,initial})=>localStorage.setItem(key,JSON.stringify(initial)),{key,initial})
  await page.goto(base+'&finish=studio')
  await page.evaluate(()=>document.fonts.ready)
  const next=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
  const finish={chromatic:1,chromaticAngle:0,grain:12,grainSize:.8,grainClumping:12,grainTone:75,grainSeed:303}
  for(const target of ['call','safety']) {
    assert.deepEqual(next.draft[target],{...draft[target],...finish}, 'finish must reach both cards and preserve their colours/shades')
  }
  assert.deepEqual(next.presets,initial.presets,'named C/C_02 must remain unchanged')
  assert.equal(new URL(page.url()).searchParams.has('finish'),false,'one-time command must be consumed')
  await page.waitForFunction(()=>document.querySelectorAll('.rs-product-preview feImage[result=grain]').length===2)
  const card=await page.locator('.rs-canvas .rc-call').screenshot()
  const corners=await page.evaluate(async url=>{
    const image=new Image();image.src=url;await image.decode()
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0)
    return [[2,2],[image.width-3,2],[2,image.height-3],[image.width-3,image.height-3]].map(([x,y])=>[...ctx.getImageData(x,y,1,1).data].slice(0,3))
  },'data:image/png;base64,'+card.toString('base64'))
  assert.ok(corners.every(rgb=>rgb.every((v,i)=>Math.abs(v-[9,9,12][i])<=1)),`grain must not fill transparent rounded corners: ${JSON.stringify(corners)}`)
  await page.locator('.rs-product-preview').screenshot({path:new URL('studio-finish-context.png',import.meta.url).pathname})
  await page.getByLabel('Grain 강도',{exact:true}).focus();await page.keyboard.press('ArrowRight')
  await page.reload()
  assert.equal(await page.getByLabel('Grain 강도',{exact:true}).inputValue(),'13','reload must preserve later edits')
  await page.getByRole('button',{name:'추천 질감 · 두 card에 적용'}).click()
  assert.equal(await page.getByLabel('Grain 강도',{exact:true}).inputValue(),'12')
  await page.setViewportSize({width:393,height:900})
  await page.waitForFunction(()=>document.querySelectorAll('.rs-product-preview feImage[result=grain]').length===2)
  await page.locator('.rs-product-preview').screenshot({path:new URL('studio-finish-mobile.png',import.meta.url).pathname})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.evaluate(key=>localStorage.setItem(key,'{broken'),key)
  await page.goto(base+'&finish=studio')
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'{broken','failed reads must never overwrite stored presets')
  assert.deepEqual(errors,[])
  console.log('PASS: shared finish on both cards; colours/shades and C/C_02 preserved; URL consumed; later edits survive reload; mobile; corrupt storage protected.')
}finally{await browser.close()}
