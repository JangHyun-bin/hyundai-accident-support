import {test,expect,type Page} from '@playwright/test'
import type {FlowFrame,FlowFrameInput,FlowMetrics} from '../src/design-system/flow-contract'

const standard:FlowMetrics={rem:16,bodyLineHeight:23.58,headingLineHeight:34.16,callLineHeight:36.68,labelLineHeight:18.34,touch:64}
async function resolve(page:Page,input:FlowFrameInput):Promise<FlowFrame>{
 return page.evaluate(async input=>{
  const path='/src/design-system/use-bounded-frame.ts'
  const module=await import(path).catch(()=>null)
  return module?.resolveFlowFrame?.(input)??null
 },input)
}
async function fixture(page:Page,{device='vehicle',height=900,font=16}:{device?:'vehicle'|'mobile';height?:number;font?:number}={}){
 await page.route('**/bounded-frame-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html style="font-size:${font}px"><head><meta charset="utf-8"><style>body{margin:0}#host{width:100%}.test-panes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;height:100%;min-height:0}.test-editor{min-height:0;overflow:auto}.test-header{height:100%}</style></head><body><div id="host"></div><script type="module">
 import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=ReactDOM;
 const {VehicleShell}=await import('/src/components/ui/after-care-layout.tsx');const {SurroundingsScene}=await import('/src/design-system/SurroundingsStudy.tsx');import '/src/styles.css';
 const h=React.createElement;createRoot(document.getElementById('host')).render(h(VehicleShell,{presentation:'bounded',device:${JSON.stringify(device)},previewHeight:${height},header:h('div',{className:'test-header'},'사고 대응 진행')},h('div',{className:'test-panes'},h(SurroundingsScene,{bounded:true}),h('div',{className:'test-editor'},h('textarea',{'aria-label':'긴 기록',defaultValue:'기록'}),h('div',{id:'long-content'},'기록')))));
 </script></body></html>`}))
 await page.goto('/bounded-frame-fixture')
 await expect(page.locator('.ac-vehicle')).toHaveAttribute('data-flow-mode',/wide|narrow|mobile|document/)
 await page.evaluate(()=>document.fonts.ready)
}

test('frame profile uses only environment and reserves three body lines plus controls',async({page})=>{
 await page.goto('/')
 for(const [width,height] of [[1440,900],[1920,1080],[2560,1440]]){
  const frame=await resolve(page,{width,height,device:'vehicle',metrics:standard})
  expect(frame,'environment resolver must exist').not.toBeNull()
  expect(frame.mode).toBe('wide')
  expect(frame.contentHeight).toBeGreaterThanOrEqual(3*frame.metrics.bodyLineHeight+frame.metrics.touch)
  expect(frame.height).toBe(height)
  expect(await resolve(page,{width,height,device:'vehicle',metrics:standard})).toEqual(frame)
 }
 const vehicle=await resolve(page,{width:393,height:1080,device:'vehicle',metrics:standard})
 const mobile=await resolve(page,{width:393,height:852,device:'mobile',metrics:{...standard,touch:48}})
 expect(vehicle.mode).toBe('narrow');expect(vehicle.metrics.touch).toBe(64)
 expect(mobile.mode).toBe('mobile');expect(mobile.metrics.touch).toBe(48)
 const shortVehicle=await resolve(page,{width:393,height:852,device:'vehicle',metrics:standard})
 expect(shortVehicle.mode).toBe('document')
 const callHeight=Math.max(106,standard.callLineHeight+2*standard.labelLineHeight+24)
 const required=2*standard.touch+callHeight+96+3*standard.bodyLineHeight+standard.headingLineHeight
 expect(shortVehicle.contentHeight).toBeGreaterThanOrEqual(required)
 const enlarged={...standard,rem:32,bodyLineHeight:47.16,headingLineHeight:68.32,callLineHeight:73.36,labelLineHeight:36.68}
 const short=await resolve(page,{width:393,height:600,device:'vehicle',metrics:enlarged})
 expect(short.mode).toBe('document')
 expect(short.reason).toContain('essential')
 const spacious=await resolve(page,{width:2560,height:1800,device:'vehicle',metrics:enlarged})
 expect(spacious.mode).not.toBe('document')
})

test('bounded shell and scene keep their bounds through long content and every scene view',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'})
 await fixture(page)
 const shell=page.locator('.ac-vehicle'),scene=page.locator('.ss-surface'),visual=page.locator('.ss-visual')
 const start=await shell.boundingBox(),sceneStart=await scene.boundingBox(),visualStart=await visual.boundingBox()
 expect(start!.height).toBe(900)
 const editor=await page.locator('textarea').elementHandle(),sceneNode=await scene.elementHandle()
 await page.locator('textarea').fill('오른쪽 차량과 접촉한 뒤 멈췄어요. '.repeat(100))
 await page.locator('#long-content').evaluate(node=>{node.textContent='긴 기록 '.repeat(2000)})
 await page.getByRole('button',{name:'주변 상황 보기',exact:true}).click()
 for(const label of ['전방 시점','사고 재생','현재 주변']){
  await page.getByRole('button',{name:label,exact:true}).click()
  expect(Math.abs((await shell.boundingBox())!.height-start!.height)).toBeLessThanOrEqual(1)
  expect(Math.abs((await scene.boundingBox())!.height-sceneStart!.height)).toBeLessThanOrEqual(1)
  expect(Math.abs((await visual.boundingBox())!.height-visualStart!.height)).toBeLessThanOrEqual(1)
 }
 await page.getByRole('button',{name:'사고 재생',exact:true}).click()
 await page.getByRole('button',{name:'충격 시점',exact:true}).click()
 await page.getByRole('button',{name:'전방 시점',exact:true}).click()
 await page.getByRole('button',{name:'사고 재생',exact:true}).click()
 await expect(page.getByRole('slider',{name:'사고 시점 이동'})).toHaveValue('0')
 expect(await sceneNode!.evaluate(node=>node===document.querySelector('.ss-surface'))).toBe(true)
 expect(await editor!.evaluate(node=>node===document.querySelector('textarea'))).toBe(true)
 await page.getByRole('button',{name:'내 차 상태로',exact:true}).click()
 await page.getByRole('button',{name:'비상등 자세히 보기',exact:true}).click()
 const detail=page.getByRole('region',{name:'차량 부위 상세'})
 await expect(detail.getByText('켜짐',{exact:true})).toBeInViewport()
 await detail.locator('p').first().evaluate(node=>{node.textContent='상태를 확인한 뒤 주변을 살펴보세요. '.repeat(100)})
 expect(await detail.evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true)
 expect(Math.abs((await shell.boundingBox())!.height-start!.height)).toBeLessThanOrEqual(1)
 await page.screenshot({path:'/tmp/hyundai-stable-A-bounded-detail.png'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})

test('font and host changes update environment while retaining children',async({page})=>{
 await page.setViewportSize({width:393,height:1080});await page.emulateMedia({reducedMotion:'reduce'})
 await fixture(page,{height:1080})
 const shell=page.locator('.ac-vehicle'),editor=await page.locator('textarea').elementHandle()
 await expect(shell).toHaveAttribute('data-flow-mode','narrow')
 await page.evaluate(()=>{document.documentElement.style.fontSize='32px'})
 await expect(shell).toHaveAttribute('data-flow-mode','document')
 await page.evaluate(()=>{document.documentElement.style.fontSize='16px'})
 await expect(shell).toHaveAttribute('data-flow-mode','narrow')
 expect(await editor!.evaluate(node=>node===document.querySelector('textarea'))).toBe(true)
})

for(const [width,height] of [[1440,900],[1920,1080],[2560,1440]])test(`measured wide frame stays bounded at ${width}×${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'})
 await fixture(page,{height})
 const shell=page.locator('.ac-vehicle')
 await expect(shell).toHaveAttribute('data-flow-mode','wide')
 expect((await shell.boundingBox())!.height).toBe(height)
 const content=await page.locator('.ac-vehicle-content').boundingBox(),scene=await page.locator('.ss-surface').boundingBox()
 expect(Math.abs(content!.height-scene!.height)).toBeLessThanOrEqual(1)
 expect(await page.locator('.ss-part').first().evaluate(node=>getComputedStyle(node).minHeight)).toBe('64px')
})
