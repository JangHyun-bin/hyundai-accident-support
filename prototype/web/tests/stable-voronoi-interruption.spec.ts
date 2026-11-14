import {test,expect,type Page,type TestInfo} from '@playwright/test'
import {createHash} from 'node:crypto'
import {writeFile} from 'node:fs/promises'
import {startLiveCall} from './stable-voronoi-journey'

type Frame={geometry:number[];path:string;paths:string;visible:{id:string;opacity:number;inert:boolean}[];criticalOpacity:number|null;time:number}
declare global{interface Window{fontLoadAudit?:string[]}}
const starts=new Map<string,{time:string;sources:Record<string,string>}>()
async function sources(page:Page){
 const paths=['/src/design-system/FlowBoard.tsx','/src/design-system/FlowStudy.tsx','/src/journey/JourneyFlow.tsx','/src/design-system/flow-study.css','/src/journey/journey-flow.css']
 return Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await(await page.request.get(path)).text()).digest('hex')])))
}
test.beforeEach(async({page},info)=>{
 await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'no-preference'})
 starts.set(info.testId,{time:new Date().toISOString(),sources:await sources(page)})
})
test.afterEach(async({page},info)=>{
 const start=starts.get(info.testId)!,end={time:new Date().toISOString(),sources:await sources(page)}
 await attach(info,'source-context',{start,end,changed:JSON.stringify(start.sources)!==JSON.stringify(end.sources)})
})
const click=async(page:Page,testId:string)=>page.getByTestId(testId).evaluate((node:HTMLButtonElement)=>node.click())
const back=async(page:Page)=>page.getByRole('button',{name:'이전 단계',exact:true}).evaluate((node:HTMLButtonElement)=>node.click())
// Geometry follows the guide material, which every layout shows; the call core counts only while the 119 cell is visible.
async function frames(page:Page,count:number){
 return page.evaluate(count=>{
  const {promise,resolve}=Promise.withResolvers<Frame[]>(),samples:Frame[]=[]
  const sample=()=>{
   const board=document.querySelector<HTMLElement>('[data-testid=flow-board]')!,material=board.querySelector<HTMLElement>('[data-cell=guide] .ac-material-frame')!
   const call=board.querySelector<HTMLElement>('[data-cell=emergency]')!,core=call.querySelector<HTMLElement>('.fs-call-core')
   const opacity=(node:HTMLElement)=>{let value=1;for(let e:HTMLElement|null=node;e&&e!==board;e=e.parentElement)value*=Number(getComputedStyle(e).opacity);return value}
   samples.push({geometry:(['left','top','width','height'] as const).map(key=>parseFloat(material.style[key])),path:material.dataset.shapePath!,paths:[...board.querySelectorAll<HTMLElement>('.ac-material-frame')].map(node=>node.dataset.shapePath).join('/'),
    criticalOpacity:call.dataset.cellVisible==='true'&&core?opacity(core):null,visible:[...board.querySelectorAll<HTMLElement>('[data-cell-visible=true] .fs-cell-body')].map(body=>({id:body.closest<HTMLElement>('[data-cell]')!.dataset.cell!,opacity:opacity(body),inert:body.inert})),time:performance.now()})
   if(samples.length<count)requestAnimationFrame(sample);else resolve(samples)
  };requestAnimationFrame(sample)
  return promise
 },count)
}
const difference=(a:number[],b:number[])=>Math.max(...a.map((value,index)=>Math.abs(value-b[index])))
async function settle(page:Page,layout:string){
 const board=page.getByTestId('flow-board')
 await expect(board).toHaveAttribute('data-layout',layout,{timeout:8000});await expect(board).toHaveAttribute('data-moving','false')
 const [sample]=await frames(page,1)
 if(sample.criticalOpacity!==null)expect(sample.criticalOpacity).toBeGreaterThanOrEqual(.999)
 expect(sample.visible.every(body=>body.opacity>=.999&&!body.inert)).toBe(true)
 expect(sample.path).not.toMatch(/NaN|Infinity/)
}
async function study(page:Page){await page.goto('/?study=flow');await page.evaluate(()=>document.fonts.ready);await expect(page.getByTestId('flow-board')).toHaveAttribute('data-profile','wide');await settle(page,'detect')}
async function attach(info:TestInfo,name:string,value:unknown){const path=info.outputPath(name+'.json');await writeFile(path,JSON.stringify(value,null,2));await info.attach(name,{path,contentType:'application/json'})}

test('rapid NEXT and BACK retarget from the displayed geometry without an endpoint reset',async({page},info)=>{
 await study(page)
 const [initial]=await frames(page,1)
 await click(page,'flow-primary');await click(page,'flow-primary')
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-moving','true')
 const outbound=await frames(page,66),current=outbound.at(-1)!
 expect(new Set(outbound.map(sample=>sample.paths)).size).toBeGreaterThanOrEqual(10)
 expect(difference(initial.geometry,current.geometry)).toBeGreaterThan(20)
 const retarget=await page.evaluate(()=>{
  const {promise,resolve}=Promise.withResolvers<{before:number[];after:number[]}>()
  const geometry=()=>{const material=document.querySelector<HTMLElement>('[data-cell=guide] .ac-material-frame')!;return (['left','top','width','height'] as const).map(key=>parseFloat(material.style[key]))}
  requestAnimationFrame(()=>{
   const before=geometry();document.querySelector<HTMLButtonElement>('[data-testid=flow-primary]')!.click()
   requestAnimationFrame(()=>resolve({before,after:geometry()}))
  })
  return promise
 })
 expect(difference(retarget.before,retarget.after)).toBeLessThanOrEqual(1)
 expect(difference(initial.geometry,retarget.after)).toBeGreaterThan(difference(initial.geometry,retarget.before)*.75)
 await back(page);await frames(page,6);await back(page)
 await settle(page,'emergency')
 expect(Math.min(...outbound.flatMap(sample=>sample.criticalOpacity??[]))).toBeGreaterThanOrEqual(.999)
 await attach(info,'retarget-frames',{initial,outbound,retarget})
})

test('driving during a morph lands on the current plan at once and keeps every cell readable',async({page},info)=>{
 await study(page);await click(page,'flow-primary');await click(page,'flow-primary')
 const moving=await frames(page,42)
 expect(new Set(moving.map(sample=>sample.paths)).size).toBeGreaterThanOrEqual(10)
 await page.getByRole('checkbox',{name:'주행 중 시연',exact:true}).evaluate((node:HTMLInputElement)=>node.click())
 await expect(page.getByTestId('flow-primary')).toBeDisabled()
 await expect(page.getByRole('button',{name:'통화 종료 시연',exact:true})).toBeEnabled()
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-moving','false')
 const driving=await frames(page,14)
 expect(new Set(driving.map(sample=>sample.paths)).size,'no geometry moves while driving').toBe(1)
 expect(driving.at(-1)!.visible.every(body=>body.opacity>=.999&&!body.inert),'task content stays readable while driving').toBe(true)
 expect(Math.min(...driving.flatMap(sample=>sample.criticalOpacity??[]))).toBeGreaterThanOrEqual(.999)
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-layout','evacuate')
 await page.getByRole('checkbox',{name:'주행 중 시연',exact:true}).evaluate((node:HTMLInputElement)=>node.click())
 await settle(page,'evacuate');await expect(page.getByTestId('flow-primary')).toBeEnabled()
 await attach(info,'driving-frames',{moving,driving})
})

test('resize during the real Journey review morph commits a valid plan and retains editor DOM',async({page},info)=>{
 await startLiveCall(page)
 await click(page,'journey-primary');await settle(page,'evacuate');await click(page,'journey-primary');await settle(page,'evacuate');await click(page,'journey-primary');await settle(page,'safe')
 await page.getByRole('button',{name:'직접 입력',exact:true}).click()
 const input=page.getByRole('textbox',{name:'사고 기록',exact:true}),note='resize 중에도 남아 있어야 하는 실제 기록'
 await input.fill(note);const original=await input.elementHandle(),scene=await page.locator('[data-cell=scene] .fs-cell-body > *').first().elementHandle()
 await page.getByRole('button',{name:'기록 저장',exact:true}).click();await click(page,'journey-primary')
 const moving=await frames(page,42)
 expect(new Set(moving.map(sample=>sample.paths)).size).toBeGreaterThanOrEqual(10)
 await page.setViewportSize({width:1920,height:1080});await settle(page,'review')
 expect(await original!.evaluate((node:HTMLTextAreaElement)=>({connected:node.isConnected,value:node.value}))).toEqual({connected:true,value:note})
 expect(await scene!.evaluate(node=>node.isConnected)).toBe(true)
 await expect(page.locator('#journey-review-editor')).toBeVisible()
 const geometry=await page.getByTestId('flow-board').evaluate(board=>{
  const context=document.createElement('canvas').getContext('2d')!,material=board.querySelector<HTMLElement>('[data-cell=emergency] .ac-material-frame')!,bounds=material.getBoundingClientRect(),path=new Path2D(material.dataset.shapePath!),core=board.querySelector('[data-cell=emergency] .fs-call-core')!.getBoundingClientRect()
  // Shape paths are in board pixels; the Pleos display is scaled to the page.
  const scale=bounds.width/parseFloat(material.style.width)
  return {width:board.clientWidth,height:board.clientHeight,valid:!!material.dataset.shapePath&&!/NaN|Infinity/.test(material.dataset.shapePath),criticalContained:[[core.left,core.top],[core.right,core.top],[core.right,core.bottom],[core.left,core.bottom]].every(([x,y])=>context.isPointInPath(path,(x-bounds.left)/scale,(y-bounds.top)/scale))}
 })
 expect(geometry.width).toBeGreaterThan(1200);expect(geometry.valid).toBe(true);expect(geometry.criticalContained).toBe(true)
 await attach(info,'resize-frames',{moving,geometry})
})

test('delayed real Asta font requests fire loadingdone and commit the latest plan without remounting',async({page},info)=>{
 let requests=0
 const {promise:gate,resolve:release}=Promise.withResolvers<void>()
 await page.route('**/fonts/asta_*.ttf',async route=>{requests++;await gate;await route.continue()})
 await page.addInitScript(()=>{
  const events:string[]=[];window.fontLoadAudit=events
  document.fonts.addEventListener('loading',()=>events.push('loading'))
  document.fonts.addEventListener('loadingdone',()=>events.push('loadingdone'))
 })
 try{
  await page.goto('/?study=flow',{waitUntil:'domcontentloaded'})
  await expect.poll(()=>requests).toBeGreaterThan(0)
  expect(await page.evaluate(()=>document.fonts.status)).toBe('loading')
  const body=await page.locator('[data-cell=emergency] .fs-cell-body').elementHandle()
  await click(page,'flow-primary');await click(page,'flow-primary')
  await expect(page.getByTestId('flow-board')).toHaveAttribute('data-target','evacuate')
  const waiting=await frames(page,14)
  expect(Math.min(...waiting.flatMap(sample=>sample.criticalOpacity??[]))).toBeGreaterThanOrEqual(.999)
  release();await page.evaluate(()=>document.fonts.ready)
  await settle(page,'evacuate')
  const font=await page.evaluate(()=>({status:document.fonts.status,loaded:document.fonts.check('28px Asta','119 긴급 통화'),events:window.fontLoadAudit??[]}))
  expect(font.status).toBe('loaded');expect(font.loaded).toBe(true);expect(font.events).toContain('loadingdone')
  expect(await body!.evaluate(node=>node.isConnected)).toBe(true)
  await attach(info,'delayed-font',{requests,font,waiting})
 }finally{release()}
})
