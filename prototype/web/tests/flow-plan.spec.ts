import {test,expect} from '@playwright/test'
import * as implementation from '../src/design-system/flow-plan'
import {flowCells,insidePolygon,layoutPriority,type CellId} from '../src/design-system/flow-geometry'
import type {FlowFrame,FlowPlan,FlowShapeFrame} from '../src/design-system/flow-contract'
import type {FlowLayout} from '../src/design-system/flow-study-model'

type PlanAPI={createFlowPlan:(layout:FlowLayout,width:number,height:number,frame:FlowFrame)=>FlowPlan;flowShapes:(plan:FlowPlan)=>FlowShapeFrame;sampleFlowShapes:(from:FlowShapeFrame,to:FlowShapeFrame,progress:number)=>FlowShapeFrame}
const api=implementation as Partial<PlanAPI>
const layouts:FlowLayout[]=['detect','evacuate','safe','review','sending','calm']
const ids:CellId[]=['guide','record','insurer','emergency']
// Bounded vehicle boards: narrowest wide profile, then the 1440, 1920 and 2560 hosts.
const environments=[[624,553],[696,634],[936,904],[1256,1257]]
const frame=(width:number,height:number,mode:FlowFrame['mode']='wide',scale=1):FlowFrame=>({width,height,mode,device:mode==='mobile'?'mobile':'vehicle',contentHeight:height,statusHeight:0,dockHeight:0,revision:`${width}:${height}:${mode}:${scale}`,reason:'test fixture',metrics:{rem:16*scale,bodyLineHeight:27*scale,headingLineHeight:34*scale,callLineHeight:(mode==='wide'&&width>=1200?52.4:mode==='wide'&&width>=900?47.16:36.68)*scale,labelLineHeight:(mode==='wide'&&width>=1200?36:mode==='wide'&&width>=900?27:21)*scale,touch:(mode==='mobile'?48:64)*scale}})
function plans(width:number,height:number,mode:FlowFrame['mode']='wide',scale=1){expect(typeof api.createFlowPlan).toBe('function');return layouts.map(layout=>api.createFlowPlan!(layout,width,height,frame(width,height,mode,scale)))}

test('content-first endpoints are deterministic, reserve usable slots and keep four identities',()=>{
 for(const [width,height] of environments){
  const planned=plans(width,height),workspace=planned[0].cells.guide.slot
  for(const [index,plan] of planned.entries()){
   expect(plan).toEqual(api.createFlowPlan!(layouts[index],width,height,frame(width,height)))
   expect(Object.keys(plan.cells)).toEqual(ids)
   expect(ids.filter(id=>plan.cells[id].visible)).toHaveLength([2,3,4,3,2,2][index])
   const primary=plan.cells[layoutPriority[plan.layout]]
   expect(primary.variant).toBe('full');expect(primary.scroll).toBe(true)
   expect(primary.slot.width).toBeGreaterThanOrEqual(width*.60-48-.01)
   // The record editor grows inside its own top-right corner instead of borrowing the guide's left column.
   if(plan.layout==='safe')expect(primary.slot.height).toBeGreaterThanOrEqual(3*27+64+34+48)
   else expect(primary.slot).toEqual(workspace)
   expect(plan.cells.emergency.slot).toEqual(planned[0].cells.emergency.slot)
   expect(plan.cells.emergency.slot.width).toBeGreaterThanOrEqual(width*.34-40-.01)
   expect(plan.cells.emergency.slot.height).toBeGreaterThanOrEqual(106)
   for(const id of ids){const cell=plan.cells[id];expect(cell.shape!==null).toBe(cell.visible);if(!cell.visible)expect(cell.slot).toEqual({left:0,top:0,width:0,height:0})}
   expect(Object.values(api.flowShapes!(plan).shapes).filter(Boolean)).toHaveLength([2,3,4,3,2,2][index])
  }
 }
})

test('cells keep their own side of the board, so consecutive layouts never swap horizontal order',()=>{
 for(const [width,height] of environments){
  const planned=plans(width,height)
  for(const plan of planned)for(const id of ids){
   const shape=plan.cells[id].shape;if(!shape)continue
   const xs=shape.polygon.map(p=>p[0]),ys=shape.polygon.map(p=>p[1])
   const anchored={guide:Math.min(...xs)<=1,record:Math.min(...ys)<=1&&Math.max(...xs)>=width-1,insurer:Math.max(...ys)>=height-1,emergency:Math.max(...xs)>=width-1&&Math.max(...ys)>=height-1}[id]
   expect(anchored,`${width}x${height} ${plan.layout}/${id} keeps its anchor edge`).toBe(true)
  }
  for(let index=1;index<planned.length;index++){
   const from=planned[index-1],to=planned[index],shared=ids.filter(id=>id!=='emergency'&&from.cells[id].visible&&to.cells[id].visible)
   const order=(plan:FlowPlan)=>[...shared].sort((a,b)=>{const center=(id:CellId)=>{const polygon=plan.cells[id].shape!.polygon;return polygon.reduce((sum,p)=>sum+p[0],0)/polygon.length};return center(a)-center(b)})
   expect(order(to),`${width}x${height} ${from.layout}->${to.layout}`).toEqual(order(from))
  }
 }
})

test('every morph frame is one continuous surface: cells never overlap and only seams stay uncovered',async({page})=>{
 await page.goto('/')
 const failures=await page.evaluate(async({environment,layouts})=>{
  const modulePath='/src/design-system/flow-plan.ts'
  const {createFlowPlan,flowShapes,sampleFlowShapes}=await import(modulePath) as PlanAPI
  const planned=layouts.map(layout=>flowShapes(createFlowPlan(layout,environment.width,environment.height,environment)))
  const ctx=document.createElement('canvas').getContext('2d')!,failures:string[]=[]
  for(const [from,to] of planned.slice(1).flatMap((plan,index)=>[[planned[index],plan],[plan,planned[index]]]))for(const t of [.25,.5,.75]){
   const shapes=Object.values(sampleFlowShapes(from,to,t).shapes).flatMap(shape=>shape?[{shape,path:new Path2D(shape.path)}]:[])
   const covering=(x:number,y:number)=>shapes.filter(({shape,path})=>ctx.isPointInPath(path,x-shape.bounds.left,y-shape.bounds.top)).length
   for(let x=4;x<environment.width;x+=8)for(let y=4;y<environment.height;y+=8){
    const count=covering(x,y)
    if(count>1)failures.push(`overlap at ${x},${y} t=${t}`)
    if(!count&&![[-20,0],[20,0],[0,-20],[0,20],[-14,-14],[14,14],[-14,14],[14,-14]].some(([dx,dy])=>covering(x+dx,y+dy)))failures.push(`hole at ${x},${y} t=${t}`)
   }
  }
  return failures.slice(0,12)
 },{environment:frame(696,634),layouts})
 expect(failures).toEqual([])
})

test('old power candidate remains available but cannot contain the measured record workspace',()=>{
 const plan=plans(672,500).find(plan=>plan.layout==='safe')!,slot=plan.cells.record.slot
 const old=flowCells('safe',672,500).find(cell=>cell.id==='record')!
 expect([[slot.left,slot.top],[slot.left+slot.width,slot.top],[slot.left+slot.width,slot.top+slot.height],[slot.left,slot.top+slot.height]].every(point=>insidePolygon(point as [number,number],old.polygon))).toBe(false)
 expect(plan.cells.record.shape!.areaFraction).toBeGreaterThan(old.areaFraction)
})

test('rounded endpoint paths contain slot perimeters and four-pixel focus rings',async({page})=>{
 const fixtures=environments.flatMap(([width,height])=>plans(width,height))
 for(const mode of ['narrow','mobile','document'] as const)fixtures.push(...plans(360,600,mode),...plans(360,900,mode,2))
 await page.goto('/')
 const failures=await page.evaluate(planned=>{
  const ctx=document.createElement('canvas').getContext('2d')!,failures:string[]=[]
  for(const plan of planned)for(const cell of Object.values(plan.cells)){
   if(!cell.visible||!cell.shape)continue
   const path=new Path2D(cell.shape.path),slot=cell.slot,bounds=cell.shape.bounds
   for(let index=0;index<=40;index++){
    const t=index/40,l=slot.left-4,r=slot.left+slot.width+4,top=slot.top-4,bottom=slot.top+slot.height+4
    for(const [x,y] of [[l+(r-l)*t,top],[l+(r-l)*t,bottom],[l,top+(bottom-top)*t],[r,top+(bottom-top)*t]]){
     if(!ctx.isPointInPath(path,x-bounds.left,y-bounds.top))failures.push(`${plan.mode}/${plan.width}x${plan.height}/${plan.layout}/${cell.id}: ${x},${y}`)
    }
   }
  }
  return failures.slice(0,12)
 },fixtures)
 expect(failures).toEqual([])
})

test('dense geometry samples retain critical containment, finite convex cells and continuous boundaries',async({page})=>{
 expect(typeof api.sampleFlowShapes).toBe('function');await page.goto('/')
 const result=await page.evaluate(async({environments,layouts,frames})=>{
  const modulePath='/src/design-system/flow-plan.ts'
  const {createFlowPlan,flowShapes,sampleFlowShapes}=await import(modulePath) as PlanAPI
  const ctx=document.createElement('canvas').getContext('2d')!,failures:string[]=[];let samples=0,maxStep=0
  for(let environment=0;environment<environments.length;environment++){
   const [width,height]=environments[environment],planned=layouts.map(layout=>createFlowPlan(layout,width,height,frames[environment])),slot=planned[0].cells.emergency.slot
   for(const source of planned)for(const target of planned){
    let previous=flowShapes(source)
    for(let index=0;index<=240;index++){
     const sample=sampleFlowShapes(flowShapes(source),flowShapes(target),index/240);samples++
     for(const id of Object.keys(sample.shapes) as CellId[]){
      const shape=sample.shapes[id],prior=previous.shapes[id]
      if(!shape)continue
      if(/NaN|Infinity/.test(shape.path)||!Number.isFinite(shape.areaFraction))failures.push(`invalid ${id}`)
      for(let vertex=0;vertex<shape.polygon.length;vertex++){
       const a=shape.polygon[vertex],b=shape.polygon[(vertex+1)%shape.polygon.length],c=shape.polygon[(vertex+2)%shape.polygon.length]
       if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])<-1e-6)failures.push(`nonconvex ${id}`)
      }
      // Hairline slivers that open or close a seam have no visible extent; continuity is judged on cells covering 1% or more.
      if(prior&&Math.min(shape.areaFraction,prior.areaFraction)>=.01)for(const key of ['left','top','width','height'] as const)maxStep=Math.max(maxStep,Math.abs(shape.bounds[key]-prior.bounds[key]))
     }
     const shape=sample.shapes.emergency!,path=new Path2D(shape.path)
     for(let edge=0;edge<=8;edge++)for(const [x,y] of [[slot.left-4+(slot.width+8)*edge/8,slot.top-4],[slot.left-4+(slot.width+8)*edge/8,slot.top+slot.height+4],[slot.left-4,slot.top-4+(slot.height+8)*edge/8],[slot.left+slot.width+4,slot.top-4+(slot.height+8)*edge/8]]){
      if(!ctx.isPointInPath(path,x-shape.bounds.left,y-shape.bounds.top))failures.push(`critical ${source.layout}->${target.layout} @ ${index}`)
      for(const [id,other] of Object.entries(sample.shapes))if(id!=='emergency'&&other&&ctx.isPointInPath(new Path2D(other.path),x-other.bounds.left,y-other.bounds.top))failures.push(`critical intrusion ${id}: ${source.layout}->${target.layout} @ ${index}`)
     }
     previous=sample
    }
   }
  }
  return {failures:failures.slice(0,12),samples,maxStep}
 },{environments,layouts,frames:environments.map(([width,height])=>frame(width,height))})
 expect(result.failures).toEqual([]);expect(result.samples).toBe(34704);expect(result.maxStep).toBeLessThan(4*Math.hypot(1256,1257)/240)
})

test('interrupted samples can retarget from their exact current shape and settle without mutating inputs',()=>{
 const planned=plans(696,634).map(plan=>api.flowShapes!(plan))
 for(const source of planned)for(const target of planned)for(const next of planned){
  const before=JSON.stringify([source,target,next]),interrupted=api.sampleFlowShapes!(source,target,.37)
  expect(api.sampleFlowShapes!(interrupted,next,0)).toEqual(interrupted)
  expect(api.sampleFlowShapes!(interrupted,next,1)).toEqual(next)
  for(let index=0;index<=20;index++)for(const shape of Object.values(api.sampleFlowShapes!(interrupted,next,index/20).shapes))if(shape)expect(shape.path).not.toMatch(/NaN|Infinity/)
  expect(JSON.stringify([source,target,next])).toBe(before)
 }
 expect(api.sampleFlowShapes!(planned[0],planned[2],-1)).toEqual(planned[0]);expect(api.sampleFlowShapes!(planned[0],planned[2],2)).toEqual(planned[2])
})

test('rectangular profiles keep one priority workspace and critical call without shrinking touch or text space',()=>{
 for(const mode of ['narrow','mobile','document'] as const)for(const scale of [1,2]){
  const planned=plans(360,900,mode,scale)
  for(const plan of planned){
   expect(ids.filter(id=>plan.cells[id].visible)).toEqual(ids.filter(id=>id===layoutPriority[plan.layout]||id==='emergency'))
   expect(plan.cells[layoutPriority[plan.layout]].slot.width).toBeGreaterThanOrEqual(312)
   expect(plan.cells[layoutPriority[plan.layout]].slot.height).toBeGreaterThanOrEqual(3*27*scale+64*scale)
   expect(plan.cells.emergency.slot.height).toBeGreaterThanOrEqual(106*scale)
   expect(plan.cells.emergency.slot).toEqual(planned[0].cells.emergency.slot)
  }
 }
})


test('interrupted and reversed paths never cross the fixed critical core',async({page})=>{
 await page.goto('/')
 const result=await page.evaluate(async({layouts,environment})=>{
  const modulePath='/src/design-system/flow-plan.ts'
  const {createFlowPlan,flowShapes,sampleFlowShapes}=await import(modulePath) as PlanAPI
  const planned=layouts.map(layout=>createFlowPlan(layout,environment.width,environment.height,environment)),ctx=document.createElement('canvas').getContext('2d')!,failures:string[]=[]
  const slot=planned[0].cells.emergency.slot;let samples=0
  for(const from of planned)for(const to of planned)for(const next of planned)for(const interrupt of [.13,.51,.87]){
   const current=sampleFlowShapes(flowShapes(from),flowShapes(to),interrupt)
   for(let index=0;index<=48;index++){
    const sample=sampleFlowShapes(current,flowShapes(next),index/48);samples++
    for(const [id,shape] of Object.entries(sample.shapes)){
     if(!shape)continue
     const path=new Path2D(shape.path)
     for(let edge=0;edge<=8;edge++)for(const [x,y] of [[slot.left-4+(slot.width+8)*edge/8,slot.top-4],[slot.left-4+(slot.width+8)*edge/8,slot.top+slot.height+4],[slot.left-4,slot.top-4+(slot.height+8)*edge/8],[slot.left+slot.width+4,slot.top-4+(slot.height+8)*edge/8]]){
      const inside=ctx.isPointInPath(path,x-shape.bounds.left,y-shape.bounds.top)
      if((id==='emergency')!==inside)failures.push(`${from.layout}->${to.layout}@${interrupt}->${next.layout}@${index}: ${id}`)
     }
    }
   }
  }
  return {samples,failures:failures.slice(0,12)}
 },{layouts,environment:frame(696,634)})
 expect(result.samples).toBe(31752);expect(result.failures).toEqual([])
})

test('large call decoration is offered only when the rounded surface has room above the fixed core',async({page})=>{
 const fixtures=[[1440,672,410],[1920,912,680],[2560,1232,1040]].flatMap(([host,width,height])=>layouts.map(layout=>{
  const environment={...frame(width,height),width:host},plan=api.createFlowPlan!(layout,width,height,environment),number=(host>=2400?141:80),cell=plan.cells.emergency
  expect(cell.variant).toBe(['detect','sending','calm'].includes(layout)?'full':'summary')
  return {cell,decoration:{left:cell.slot.left+8,top:cell.slot.top-number-96,width:2*number,height:number+96}}
 }))
 expect(api.createFlowPlan!('detect',672,260,frame(1440,260)).cells.emergency.variant).toBe('summary')
 const preview=frame(1200,680);preview.metrics.callLineHeight=52.4;preview.metrics.labelLineHeight=36
 expect(api.createFlowPlan!('detect',672,680,preview).cells.emergency.variant).toBe('summary')
 await page.goto('/')
 const failures=await page.evaluate(fixtures=>{
  const context=document.createElement('canvas').getContext('2d')!,failures:string[]=[]
  for(const {cell,decoration:r} of fixtures){
   if(cell.variant!=='full')continue
   const shape=cell.shape!,path=new Path2D(shape.path)
   for(let index=0;index<=40;index++)for(const [x,y] of [[r.left+r.width*index/40,r.top],[r.left+r.width*index/40,r.top+r.height],[r.left,r.top+r.height*index/40],[r.left+r.width,r.top+r.height*index/40]])if(!context.isPointInPath(path,x-shape.bounds.left,y-shape.bounds.top))failures.push(`${x},${y}`)
  }
  return failures
 },fixtures)
 expect(failures).toEqual([])
})
