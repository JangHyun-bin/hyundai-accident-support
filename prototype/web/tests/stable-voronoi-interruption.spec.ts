import {test,expect,type Page,type TestInfo} from '@playwright/test'
import {createHash} from 'node:crypto'
import {writeFile} from 'node:fs/promises'

const starts=new Map<string,unknown>()
async function sources(page:Page){
 const paths=['/src/design-system/FlowBoard.tsx','/src/design-system/FlowStudy.tsx','/src/journey/JourneyFlow.tsx','/src/design-system/flow-study.css','/src/journey/journey-flow.css']
 return Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await(await page.request.get(path)).text()).digest('hex')])))
}
test.beforeEach(async({page},info)=>{
 await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'no-preference'})
 starts.set(info.testId,{time:new Date().toISOString(),sources:await sources(page)})
})
test.afterEach(async({page},info)=>{
 const start=starts.get(info.testId) as {time:string;sources:unknown},end={time:new Date().toISOString(),sources:await sources(page)}
 await attach(info,'source-context',{start,end,changed:JSON.stringify(start.sources)!==JSON.stringify(end.sources)})
})
const click=async(page:Page,testId:string)=>page.getByTestId(testId).evaluate((node:HTMLButtonElement)=>node.click())
const back=async(page:Page)=>page.getByRole('button',{name:'이전 단계',exact:true}).evaluate((node:HTMLButtonElement)=>node.click())
async function frames(page:Page,count:number){
 return page.evaluate(count=>new Promise<{geometry:number[];path:string;visible:{id:string;opacity:number;inert:boolean}[];criticalOpacity:number;time:number}[]>(resolve=>{
  const samples:{geometry:number[];path:string;visible:{id:string;opacity:number;inert:boolean}[];criticalOpacity:number;time:number}[]=[]
  const sample=()=>{
   const board=document.querySelector<HTMLElement>('[data-testid=flow-board]')!,material=board.querySelector<HTMLElement>('[data-cell=emergency] .ac-material-frame')!,core=board.querySelector<HTMLElement>('.fs-call-core')!
   const left=parseFloat(material.style.left),top=parseFloat(material.style.top),path=material.dataset.shapePath!,numbers=(path.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number)
   const opacity=(node:HTMLElement)=>{let value=1;for(let e:HTMLElement|null=node;e&&e!==board;e=e.parentElement)value*=Number(getComputedStyle(e).opacity);return value}
   samples.push({geometry:numbers.map((n,index)=>n+(index%2?top:left)),path,criticalOpacity:opacity(core),visible:[...board.querySelectorAll<HTMLElement>('[data-cell-visible=true] .fs-cell-body')].map(body=>({id:body.closest<HTMLElement>('[data-cell]')!.dataset.cell!,opacity:opacity(body),inert:body.inert})),time:performance.now()})
   if(samples.length<count)requestAnimationFrame(sample);else resolve(samples)
  };requestAnimationFrame(sample)
 }),count)
}
const difference=(a:number[],b:number[])=>Math.max(...a.map((value,index)=>Math.abs(value-b[index])))
async function settle(page:Page,layout:string){
 const board=page.getByTestId('flow-board')
 await expect(board).toHaveAttribute('data-layout',layout,{timeout:8000});await expect(board).toHaveAttribute('data-moving','false')
 const [sample]=await frames(page,1)
 expect(sample.criticalOpacity).toBeGreaterThanOrEqual(.999)
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
 const outbound=await frames(page,42),current=outbound.at(-1)!
 expect(new Set(outbound.map(sample=>sample.path)).size).toBeGreaterThanOrEqual(10)
 expect(difference(initial.geometry,current.geometry)).toBeGreaterThan(20)
 const retarget=await page.evaluate(()=>new Promise<{before:number[];after:number[]}>(resolve=>requestAnimationFrame(()=>{
  const geometry=()=>{const material=document.querySelector<HTMLElement>('[data-cell=emergency] .ac-material-frame')!,left=parseFloat(material.style.left),top=parseFloat(material.style.top);return material.dataset.shapePath!.match(/-?\d+(?:\.\d+)?/g)!.map(Number).map((n,index)=>n+(index%2?top:left))}
  const before=geometry();document.querySelector<HTMLButtonElement>('[data-testid=flow-primary]')!.click()
  requestAnimationFrame(()=>resolve({before,after:geometry()}))
 })))
 expect(difference(retarget.before,retarget.after)).toBeLessThanOrEqual(1)
 expect(difference(initial.geometry,retarget.after)).toBeGreaterThan(difference(initial.geometry,retarget.before)*.75)
 await back(page);await frames(page,6);await back(page)
 await settle(page,'detect')
 expect(Math.min(...outbound.map(sample=>sample.criticalOpacity))).toBeGreaterThanOrEqual(.999)
 await attach(info,'retarget-frames',{initial,outbound,retarget})
})

test('driving during a morph keeps readable content and resumes without hidden cells',async({page},info)=>{
 await study(page);await click(page,'flow-primary');await click(page,'flow-primary')
 const moving=await frames(page,42)
 expect(new Set(moving.map(sample=>sample.path)).size).toBeGreaterThanOrEqual(10)
 await page.getByRole('checkbox',{name:'주행 중 시연',exact:true}).evaluate((node:HTMLInputElement)=>node.click())
 await expect(page.getByTestId('flow-primary')).toBeDisabled()
 await expect(page.getByRole('button',{name:'통화 종료 시연',exact:true})).toBeEnabled()
 const paused=await frames(page,14)
 expect(new Set(paused.slice(2).map(sample=>sample.path)).size).toBe(1)
 expect.soft(paused.at(-1)!.visible.every(body=>body.opacity>=.999&&!body.inert),'paused task content must remain readable').toBe(true)
 expect(Math.min(...paused.map(sample=>sample.criticalOpacity))).toBeGreaterThanOrEqual(.999)
 await page.getByRole('checkbox',{name:'주행 중 시연',exact:true}).evaluate((node:HTMLInputElement)=>node.click())
 await settle(page,'evacuate');await expect(page.getByTestId('flow-primary')).toBeEnabled()
 await attach(info,'driving-frames',{moving,paused})
})

test('resize during the real Journey review morph commits a valid plan and retains editor DOM',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click();await page.evaluate(()=>document.fonts.ready)
 await click(page,'journey-primary');await page.getByRole('button',{name:'시연 event: 통화 연결 확인',exact:true}).evaluate((node:HTMLButtonElement)=>node.click())
 await click(page,'journey-primary');await settle(page,'evacuate');await click(page,'journey-primary');await settle(page,'safe');await click(page,'journey-primary')
 await page.getByRole('button',{name:'직접 입력',exact:true}).click()
 const input=page.getByRole('textbox',{name:'사고 기록',exact:true}),note='resize 중에도 남아 있어야 하는 실제 기록'
 await input.fill(note);const original=await input.elementHandle(),scene=await page.locator('.journey-flow-scene .ss-surface').elementHandle()
 await page.getByRole('button',{name:'기록 저장',exact:true}).click();await click(page,'journey-primary')
 const moving=await frames(page,42)
 expect(new Set(moving.map(sample=>sample.path)).size).toBeGreaterThanOrEqual(10)
 await page.setViewportSize({width:1920,height:1080});await settle(page,'review')
 expect(await original!.evaluate((node:HTMLTextAreaElement)=>({connected:node.isConnected,value:node.value}))).toEqual({connected:true,value:note})
 expect(await scene!.evaluate(node=>node.isConnected)).toBe(true)
 await expect(page.locator('#journey-review-editor')).toBeVisible()
 const geometry=await page.getByTestId('flow-board').evaluate(board=>{
  const rect=board.getBoundingClientRect(),context=document.createElement('canvas').getContext('2d')!,material=board.querySelector<HTMLElement>('[data-cell=emergency] .ac-material-frame')!,bounds=material.getBoundingClientRect(),path=new Path2D(material.dataset.shapePath!),core=board.querySelector('.fs-call-core')!.getBoundingClientRect()
  return {width:rect.width,height:rect.height,valid:!!material.dataset.shapePath&&!/NaN|Infinity/.test(material.dataset.shapePath),criticalContained:[[core.left,core.top],[core.right,core.top],[core.right,core.bottom],[core.left,core.bottom]].every(([x,y])=>context.isPointInPath(path,x-bounds.left,y-bounds.top))}
 })
 expect(geometry.width).toBeGreaterThan(800);expect(geometry.valid).toBe(true);expect(geometry.criticalContained).toBe(true)
 await attach(info,'resize-frames',{moving,geometry})
})

test('delayed real Asta font requests fire loadingdone and commit the latest plan without remounting',async({page},info)=>{
 let release!:()=>void,requests=0
 const gate=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/fonts/asta_*.ttf',async route=>{requests++;await gate;await route.continue()})
 await page.addInitScript(()=>{
  const events:string[]=[];Object.assign(window,{fontLoadAudit:events})
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
  expect(Math.min(...waiting.map(sample=>sample.criticalOpacity))).toBeGreaterThanOrEqual(.999)
  release();await page.evaluate(()=>document.fonts.ready)
  await settle(page,'evacuate')
  const font=await page.evaluate(()=>({status:document.fonts.status,loaded:document.fonts.check('28px Asta','119 긴급 통화'),events:(window as unknown as {fontLoadAudit:string[]}).fontLoadAudit}))
  expect(font.status).toBe('loaded');expect(font.loaded).toBe(true);expect(font.events).toContain('loadingdone')
  expect(await body!.evaluate(node=>node.isConnected)).toBe(true)
  await attach(info,'delayed-font',{requests,font,waiting})
 }finally{release()}
})
