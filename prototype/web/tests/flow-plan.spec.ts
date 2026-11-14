import {test,expect,type Page} from '@playwright/test'
import {cellIds,createFlowPlan,flowShapes,layoutPriority,sampleFlowShapes} from '../src/design-system/flow-plan'
import type {FlowFrame,FlowMetrics,FlowPlan,FlowShape,FlowShapeFrame} from '../src/design-system/flow-contract'
import type {CellId,FlowLayout} from '../src/design-system/flow-study-model'

type PlanAPI={createFlowPlan:typeof createFlowPlan;flowShapes:typeof flowShapes;sampleFlowShapes:typeof sampleFlowShapes}
declare global{interface Window{flowPlanner?:PlanAPI}}
// page.evaluate runs in the browser, so the planner is loaded there through the Vite dev server instead of a static import.
async function loadPlanner(page:Page){
 await page.goto('/')
 await page.evaluate(async path=>{window.flowPlanner=await import(path)},'/src/design-system/flow-plan.ts')
}
type Target=[FlowLayout,boolean]
type Mode=FlowFrame['mode']
const pleosType:FlowMetrics={rem:16,bodyLineHeight:34.06,headingLineHeight:56.12,callLineHeight:52.4,labelLineHeight:31.44,touch:64}
const hostType=(scale=1,touch=64):FlowMetrics=>({rem:16*scale,bodyLineHeight:27*scale,headingLineHeight:34*scale,callLineHeight:36.68*scale,labelLineHeight:21*scale,touch:touch*scale})
// Two smaller wide hosts and the Pleos app window, which the board fills edge to edge.
const environments:[number,number,FlowMetrics][]=[[1296,700,hostType()],[1440,960,hostType()],[1682,1210,pleosType]]
const appWindow=environments[2]
const frame=(width:number,height:number,metrics:FlowMetrics,mode:Mode='wide'):FlowFrame=>({width,height,mode,device:mode==='mobile'?'mobile':'vehicle',contentHeight:height,statusHeight:0,dockHeight:0,revision:`${width}:${height}:${mode}:${metrics.rem}`,reason:'test fixture',metrics})
const layouts:FlowLayout[]=['detect','emergency','evacuate','safe','review','sending','calm']
const targets:Target[]=layouts.flatMap(layout=>layout==='emergency'||layout==='calm'?[[layout,false] as Target]:[[layout,false],[layout,true]] as Target[])
// The two paths a driver takes: a reported emergency with a live call, and no emergency at all.
const journeys:Target[][]=[
 [['detect',false],['emergency',true],['evacuate',true],['safe',true],['review',true],['sending',true],['sending',false],['calm',false]],
 [['detect',false],['evacuate',false],['safe',false],['review',false],['sending',false],['calm',false]],
]
const steps=journeys.flatMap(journey=>journey.slice(1).flatMap((target,index)=>[[journey[index],target],[target,journey[index]]] as [Target,Target][]))
const shows119=([layout,active]:Target)=>layout==='emergency'||active&&layout!=='calm'
const plan=(target:Target,width:number,height:number,metrics:FlowMetrics,mode:Mode='wide')=>createFlowPlan(target[0],width,height,frame(width,height,metrics,mode),target[1])
const name=(target:Target)=>`${target[0]}${target[1]?'+119':''}`
const column:Record<CellId,number>={scene:0,vehicle:0,emergency:1,guide:1,record:2}
const centre=(shape:FlowShape)=>shape.polygon.reduce((sum,p)=>[sum[0]+p[0]/shape.polygon.length,sum[1]+p[1]/shape.polygon.length],[0,0])
function disorder(shapes:FlowShapeFrame['shapes']):string[]{
 const present=cellIds.filter(id=>shapes[id]),failures:string[]=[]
 for(const a of present)for(const b of present)if(column[a]<column[b]&&centre(shapes[a]!)[0]>=centre(shapes[b]!)[0])failures.push(`${a} not left of ${b}`)
 for(const [upper,lower] of [['scene','vehicle'],['emergency','guide']] as const)if(shapes[upper]&&shapes[lower]&&centre(shapes[upper]!)[1]>=centre(shapes[lower]!)[1])failures.push(`${upper} not above ${lower}`)
 return failures
}

test('endpoints are deterministic and give every target its cells, priority workspace and one fixed 119 core',()=>{
 for(const [width,height,metrics] of environments){
  const planned=targets.map(target=>plan(target,width,height,metrics)),full=3*metrics.bodyLineHeight+metrics.headingLineHeight+metrics.touch
  for(const [index,current] of planned.entries()){
   const target=targets[index],label=`${width}x${height} ${name(target)}`,priority=layoutPriority[target[0]]
   expect(current,label).toEqual(plan(target,width,height,metrics))
   expect(Object.keys(current.cells)).toEqual(cellIds)
   expect(cellIds.filter(id=>current.cells[id].visible),label).toEqual(cellIds.filter(id=>id!=='emergency'||shows119(target)))
   for(const id of cellIds){
    const cell=current.cells[id]
    expect(cell.shape!==null,`${label} ${id} shape`).toBe(cell.visible)
    expect(cell.scroll,`${label} ${id} scroll`).toBe(cell.visible&&id===priority&&id!=='emergency')
    if(!cell.visible)expect(cell.slot).toEqual({left:0,top:0,width:0,height:0})
    else if(id===priority&&id!=='emergency')expect(cell.variant).toBe('full')
    else if(id!=='emergency')expect(cell.variant,`${label} ${id} variant`).toBe(cell.slot.width>=280&&cell.slot.height>=full?'full':'summary')
   }
   if(width>=1600)for(const id of cellIds.filter(id=>id!=='emergency'))expect(current.cells[id].variant,`${label} ${id} at the app window`).toBe('full')
  }
  const cores=planned.filter(current=>current.cells.emergency.visible).map(current=>current.cells.emergency.slot)
  expect(cores).toHaveLength(targets.filter(shows119).length)
  for(const core of cores)expect(core).toEqual(cores[0])
  expect(cores[0].top).toBe(32)
  expect(cores[0].height).toBeGreaterThanOrEqual(Math.max(106,metrics.callLineHeight+2*metrics.labelLineHeight+24))
  expect(cores[0].width).toBeGreaterThanOrEqual(width*.18)
 }
})

test('cells keep their column and their place in it, so no layout or morph frame swaps them',()=>{
 for(const [width,height,metrics] of environments){
  const planned=targets.map(target=>plan(target,width,height,metrics))
  for(const [index,current] of planned.entries())for(const id of cellIds){
   const shape=current.cells[id].shape;if(!shape)continue
   const xs=shape.polygon.map(p=>p[0]),ys=shape.polygon.map(p=>p[1])
   const anchored={scene:Math.min(...xs)<=1&&Math.min(...ys)<=1,vehicle:Math.min(...xs)<=1&&Math.max(...ys)>=height-1,emergency:Math.min(...ys)<=1,guide:Math.max(...ys)>=height-1,record:Math.max(...xs)>=width-1&&Math.min(...ys)<=1&&Math.max(...ys)>=height-1}[id]
   expect(anchored,`${width}x${height} ${name(targets[index])}/${id} keeps its anchor edges`).toBe(true)
  }
  for(const [a,from] of planned.entries())for(const [b,to] of planned.entries())for(const t of [0,.25,.5,.75,1]){
   expect(disorder(sampleFlowShapes(flowShapes(from),flowShapes(to),t).shapes),`${width}x${height} ${name(targets[a])}->${name(targets[b])} @${t}`).toEqual([])
  }
 }
})

test('emphasis only resizes: guide leads tasks, record leads recording, 119 leads emergencies, calm balances',()=>{
 for(const [width,height,metrics] of environments){
  const planned=targets.map(target=>plan(target,width,height,metrics))
  for(const [index,current] of planned.entries()){
   const [layout]=targets[index],label=`${width}x${height} ${name(targets[index])}`,area=(id:CellId)=>current.cells[id].shape?.areaFraction??0
   if(layout==='safe')expect(area('record'),label).toBeGreaterThan(area('guide')+area('emergency'))
   else if(layout==='calm')expect(Math.abs(area('guide')-area('record')),label).toBeLessThan(.03)
   else expect(area('guide')+area('emergency'),label).toBeGreaterThan(1.25*area('record'))
   const call=current.cells.emergency.shape
   if(call&&layout==='emergency')expect(call.bounds.height/height,label).toBeGreaterThan(.4)
   else if(call)expect(call.bounds.height/height,label).toBeLessThan(.3)
  }
  for(const id of ['scene','vehicle'] as const)for(const current of planned)expect(current.cells[id].slot,`${id} holds still`).toEqual(planned[0].cells[id].slot)
 }
})

test('every morph frame is one continuous surface: cells never overlap and only seams stay uncovered',async({page})=>{
 await loadPlanner(page)
 const [width,height,metrics]=appWindow
 const failures=await page.evaluate(({pairs,environment})=>{
  const {createFlowPlan,flowShapes,sampleFlowShapes}=window.flowPlanner!
  const ctx=document.createElement('canvas').getContext('2d')!,failures:string[]=[]
  for(const [from,to] of pairs)for(const t of [.25,.5,.75]){
   const sample=sampleFlowShapes(flowShapes(createFlowPlan(from[0],environment.width,environment.height,environment,from[1])),flowShapes(createFlowPlan(to[0],environment.width,environment.height,environment,to[1])),t)
   const shapes=Object.values(sample.shapes).flatMap(shape=>shape?[{shape,path:new Path2D(shape.path)}]:[])
   const covering=(x:number,y:number)=>shapes.filter(({shape,path})=>ctx.isPointInPath(path,x-shape.bounds.left,y-shape.bounds.top)).length
   for(let x=6;x<environment.width;x+=12)for(let y=6;y<environment.height;y+=12){
    const count=covering(x,y)
    if(count>1)failures.push(`overlap at ${x},${y} ${from.join('/')}->${to.join('/')} t=${t}`)
    if(!count&&![[-20,0],[20,0],[0,-20],[0,20],[-14,-14],[14,14],[-14,14],[14,-14]].some(([dx,dy])=>covering(x+dx,y+dy)))failures.push(`hole at ${x},${y} ${from.join('/')}->${to.join('/')} t=${t}`)
   }
  }
  return failures.slice(0,12)
 },{pairs:steps,environment:frame(width,height,metrics)})
 expect(failures).toEqual([])
})

// The board is the app window: cells meet every window edge with square corners, so only seam ends leave the edge uncovered,
// including while 119 enters or leaves through the top edge.
test('cells reach all four window edges with square corners in every layout and morph frame',async({page})=>{
 await loadPlanner(page)
 const [width,height,metrics]=appWindow
 const result=await page.evaluate(({pairs,environments})=>{
  const {createFlowPlan,flowShapes,sampleFlowShapes}=window.flowPlanner!
  const ctx=document.createElement('canvas').getContext('2d')!,failures:string[]=[]
  let widest=0
  for(const environment of environments){
   const {width:w,height:h}=environment,frames:[string,FlowShapeFrame][]=[]
   for(const [from,to] of pairs){
    const source=flowShapes(createFlowPlan(from[0],w,h,environment,from[1])),target=flowShapes(createFlowPlan(to[0],w,h,environment,to[1]))
    frames.push([`${environment.mode} ${from.join('/')}`,source])
    if(environment.mode==='wide')for(let t=.05;t<1;t+=.05)frames.push([`${from.join('/')}->${to.join('/')} t=${t.toFixed(2)}`,sampleFlowShapes(source,target,t)])
   }
   for(const [label,frame] of frames){
    const shapes=Object.values(frame.shapes).flatMap(shape=>shape?[{shape,path:new Path2D(shape.path)}]:[])
    const covered=(x:number,y:number)=>shapes.some(({shape,path})=>ctx.isPointInPath(path,x-shape.bounds.left,y-shape.bounds.top))
    const edges:[string,(s:number)=>[number,number],number][]=[['top',s=>[s,.5],w],['bottom',s=>[s,h-.5],w],['left',s=>[.5,s],h],['right',s=>[w-.5,s],h]]
    for(const [name,at,length] of edges){
     let run=0,touched=0
     for(let s=.5;s<length;s+=2){
      if(covered(...at(s))){touched+=2;run=0}else{run+=2;widest=Math.max(widest,run)}
      if(run>24){failures.push(`${label}: ${name} edge open at ${Math.round(s)}`);break}
     }
     if(touched<length*.9)failures.push(`${label}: cells cover ${Math.round(100*touched/length)}% of the ${name} edge`)
    }
    for(const [x,y] of [[.5,.5],[w-.5,.5],[.5,h-.5],[w-.5,h-.5]])if(!covered(x,y))failures.push(`${label}: window corner ${x},${y} uncovered`)
   }
  }
  return {failures:failures.slice(0,12),widest}
 },{pairs:steps,environments:[frame(width,height,metrics),frame(841,1210,metrics,'narrow')]})
 expect(result.failures).toEqual([])
 expect(result.widest,'a seam end is the only gap on the edge').toBeLessThanOrEqual(24)
})

test('rounded endpoint paths contain slot perimeters and four-pixel focus rings',async({page})=>{
 const fixtures:FlowPlan[]=environments.flatMap(([width,height,metrics])=>targets.map(target=>plan(target,width,height,metrics)))
 for(const mode of ['narrow','mobile','document'] as const)for(const [width,height,metrics] of [[841,1210,pleosType],[360,600,hostType(1,48)],[360,900,hostType(2,48)]] as const)fixtures.push(...targets.map(target=>plan(target,width,height,metrics,mode)))
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

test('dense journey samples keep cells finite, convex and continuous, and the live call core whole',async({page})=>{
 await loadPlanner(page)
 const result=await page.evaluate(({environments,pairs})=>{
  const {createFlowPlan,flowShapes,sampleFlowShapes}=window.flowPlanner!
  const ctx=document.createElement('canvas').getContext('2d')!,failures:string[]=[];let samples=0,maxStep=0
  for(const environment of environments)for(const [from,to] of pairs){
   const source=createFlowPlan(from[0],environment.width,environment.height,environment,from[1]),target=createFlowPlan(to[0],environment.width,environment.height,environment,to[1])
   const live=source.cells.emergency.visible&&target.cells.emergency.visible,slot=target.cells.emergency.slot
   let previous=flowShapes(source)
   for(let index=0;index<=240;index++){
    const sample=sampleFlowShapes(flowShapes(source),flowShapes(target),index/240);samples++
    for(const [id,shape] of Object.entries(sample.shapes)){
     const prior=previous.shapes[id as keyof typeof previous.shapes]
     if(!shape)continue
     if(/NaN|Infinity/.test(shape.path)||!Number.isFinite(shape.areaFraction))failures.push(`invalid ${id}`)
     for(let vertex=0;vertex<shape.polygon.length;vertex++){
      const a=shape.polygon[vertex],b=shape.polygon[(vertex+1)%shape.polygon.length],c=shape.polygon[(vertex+2)%shape.polygon.length]
      if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])<-1e-6)failures.push(`nonconvex ${id}`)
     }
     // Hairline slivers that open or close a seam have no visible extent; continuity is judged on cells covering 1% or more.
     if(prior&&Math.min(shape.areaFraction,prior.areaFraction)>=.01)for(const key of ['left','top','width','height'] as const)maxStep=Math.max(maxStep,Math.abs(shape.bounds[key]-prior.bounds[key]))
    }
    if(live){
     const paths=Object.entries(sample.shapes).flatMap(([id,shape])=>shape?[{id,shape,path:new Path2D(shape.path)}]:[])
     for(let edge=0;edge<=8;edge++)for(const [x,y] of [[slot.left-4+(slot.width+8)*edge/8,slot.top-4],[slot.left-4+(slot.width+8)*edge/8,slot.top+slot.height+4],[slot.left-4,slot.top-4+(slot.height+8)*edge/8],[slot.left+slot.width+4,slot.top-4+(slot.height+8)*edge/8]]){
      for(const {id,shape,path} of paths)if((id==='emergency')!==ctx.isPointInPath(path,x-shape.bounds.left,y-shape.bounds.top))failures.push(`critical ${id}: ${from.join('/')}->${to.join('/')} @ ${index}`)
     }
    }
    previous=sample
   }
  }
  return {failures:failures.slice(0,12),samples,maxStep}
 },{environments:environments.map(([width,height,metrics])=>frame(width,height,metrics)),pairs:steps})
 expect(result.failures).toEqual([]);expect(result.samples).toBe(environments.length*steps.length*241);expect(result.maxStep).toBeLessThan(4*Math.hypot(1682,1210)/240)
})

test('interrupted samples can retarget from their exact current shape and settle without mutating inputs',()=>{
 const [width,height,metrics]=appWindow,planned=journeys[0].map(target=>flowShapes(plan(target,width,height,metrics)))
 for(const source of planned)for(const target of planned)for(const next of planned){
  const before=JSON.stringify([source,target,next]),interrupted=sampleFlowShapes(source,target,.37)
  expect(sampleFlowShapes(interrupted,next,0)).toEqual(interrupted)
  expect(sampleFlowShapes(interrupted,next,1)).toEqual(next)
  for(let index=0;index<=20;index++)for(const shape of Object.values(sampleFlowShapes(interrupted,next,index/20).shapes))if(shape)expect(shape.path).not.toMatch(/NaN|Infinity/)
  expect(JSON.stringify([source,target,next])).toBe(before)
 }
 expect(sampleFlowShapes(planned[0],planned[2],-1)).toEqual(planned[0]);expect(sampleFlowShapes(planned[0],planned[2],2)).toEqual(planned[2])
})

test('interrupted and reversed paths never cross the fixed 119 core while the call is live',async({page})=>{
 await loadPlanner(page)
 const [width,height,metrics]=appWindow
 const result=await page.evaluate(({live,environment})=>{
  const {createFlowPlan,flowShapes,sampleFlowShapes}=window.flowPlanner!
  const planned=live.map(([layout,active])=>createFlowPlan(layout,environment.width,environment.height,environment,active)),ctx=document.createElement('canvas').getContext('2d')!,failures:string[]=[]
  const slot=planned[0].cells.emergency.slot;let samples=0
  for(const from of planned)for(const to of planned)for(const next of planned)for(const interrupt of [.13,.51,.87]){
   const current=sampleFlowShapes(flowShapes(from),flowShapes(to),interrupt)
   for(let index=0;index<=48;index++){
    const sample=sampleFlowShapes(current,flowShapes(next),index/48);samples++
    for(const [id,shape] of Object.entries(sample.shapes)){
     if(!shape)continue
     const path=new Path2D(shape.path)
     for(let edge=0;edge<=8;edge++)for(const [x,y] of [[slot.left-4+(slot.width+8)*edge/8,slot.top-4],[slot.left-4+(slot.width+8)*edge/8,slot.top+slot.height+4],[slot.left-4,slot.top-4+(slot.height+8)*edge/8],[slot.left+slot.width+4,slot.top-4+(slot.height+8)*edge/8]]){
      if((id==='emergency')!==ctx.isPointInPath(path,x-shape.bounds.left,y-shape.bounds.top))failures.push(`${from.layout}->${to.layout}@${interrupt}->${next.layout}@${index}: ${id}`)
     }
    }
   }
  }
  return {samples,failures:failures.slice(0,12)}
 },{live:targets.filter(shows119),environment:frame(width,height,metrics)})
 expect(result.samples).toBe(6**3*3*49);expect(result.failures).toEqual([])
})

test('the 119 cell grows down from the top of the centre column and leaves the same way',()=>{
 const [width,height,metrics]=appWindow
 for(const [from,to] of steps.filter(([from,to])=>shows119(from)!==shows119(to))){
  const source=plan(from,width,height,metrics),target=plan(to,width,height,metrics),guide=(shows119(from)?target:source).cells.guide.shape!
  for(let index=1;index<20;index++){
   const shape=sampleFlowShapes(flowShapes(source),flowShapes(target),index/20).shapes.emergency
   if(!shape)continue
   expect(shape.bounds.top,`${name(from)}->${name(to)} @${index}`).toBeLessThanOrEqual(1)
   expect(shape.bounds.left,`${name(from)}->${name(to)} @${index}`).toBeGreaterThanOrEqual(guide.bounds.left-width*.03)
   expect(shape.bounds.left+shape.bounds.width).toBeLessThanOrEqual(guide.bounds.left+guide.bounds.width+width*.03)
  }
 }
})

test('narrow, phone and document boards stack 119, guide, record, then scene beside vehicle',()=>{
 const fixtures:[number,number,FlowMetrics,Mode][]=[[841,1210,pleosType,'narrow'],...(['narrow','mobile','document'] as const).flatMap(mode=>[[360,900,hostType(1,48),mode],[360,900,hostType(2,48),mode]] as [number,number,FlowMetrics,Mode][])]
 for(const [width,height,metrics,mode] of fixtures){
  const planned=targets.map(target=>plan(target,width,height,metrics,mode)),scale=metrics.rem/16
  const cores=planned.filter(current=>current.cells.emergency.visible).map(current=>current.cells.emergency.slot)
  for(const core of cores)expect(core).toEqual(cores[0])
  expect(cores[0].height).toBeGreaterThanOrEqual(106*scale)
  for(const [index,current] of planned.entries()){
   const label=`${mode} ${width}x${height}@${scale} ${name(targets[index])}`,cells=current.cells,priority=cells[layoutPriority[targets[index][0]]]
   expect(priority.visible,label).toBe(true)
   expect(priority.slot.width,label).toBeGreaterThanOrEqual(width-2*(mode==='mobile'?24:32))
   expect(priority.slot.height,label).toBeGreaterThanOrEqual(priority.id==='emergency'?106*scale:3*27*scale+64*scale)
   const order=(['emergency','guide','record','scene'] as const).filter(id=>cells[id].visible).map(id=>cells[id].slot.top)
   expect(order,label).toEqual([...order].sort((a,b)=>a-b))
   if(cells.scene.visible){expect(cells.vehicle.visible).toBe(true);expect(cells.scene.slot.top).toBe(cells.vehicle.slot.top);expect(cells.scene.slot.left).toBeLessThan(cells.vehicle.slot.left);expect([cells.scene.variant,cells.vehicle.variant]).toEqual(['summary','summary'])}
   if(mode==='document'||width===841)expect(cellIds.filter(id=>cells[id].visible),label).toEqual(cellIds.filter(id=>id!=='emergency'||shows119(targets[index])))
  }
 }
})

test('the large 119 numeral is offered only while 119 leads and the rounded surface has room below the core',async({page})=>{
 const fixtures=environments.flatMap(([width,height,metrics])=>targets.filter(shows119).map(target=>{
  const current=plan(target,width,height,metrics),cell=current.cells.emergency,number=metrics.callLineHeight>=50?141:80
  expect(cell.variant,`${width}x${height} ${name(target)}`).toBe(target[0]==='emergency'?'full':'summary')
  return {cell,decoration:{left:cell.slot.left+8,top:cell.slot.top+cell.slot.height+16,width:2*number,height:number+48}}
 }))
 expect(plan(['emergency',true],1296,330,hostType()).cells.emergency.variant).toBe('summary')
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
