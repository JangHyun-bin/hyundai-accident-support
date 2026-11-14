import type {FlowFrame,FlowPlan,FlowPlane,FlowShape,FlowShapeFrame} from './flow-contract'
import {insidePolygon,layoutPriority,type CellId} from './flow-geometry'
import type {FlowLayout} from './flow-study-model'
import {roundedPath,type Point,type SlotRect} from './split-geometry'

const ids:CellId[]=['guide','record','insurer','emergency']
const emptySlot:SlotRect={left:0,top:0,width:0,height:0}
const inset=8,padding=24,focusRing=4
type Partition=Partial<Record<CellId,{polygon:Point[];slot:SlotRect}>>

function area(polygon:Point[]):number{return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1]},0))/2}
function rect(left:number,top:number,right:number,bottom:number):Point[]{return [[left,top],[right,top],[right,bottom],[left,bottom]]}
function box(left:number,top:number,right:number,bottom:number):SlotRect{return {left,top,width:right-left,height:bottom-top}}

// Every cell keeps its own side of the board in every layout: guide on the left edge, record in the top-right corner,
// insurer on the bottom edge between them, 119 in the bottom-right corner. Emphasis changes size, never position.
function widePartition(layout:FlowLayout,w:number,h:number,callHeight:number):Partition{
 const primary=layoutPriority[layout],split=w*.6,call=box(w*.66+16,h-padding-callHeight,w-padding,h-padding)
 if(layout==='safe'){
  const y=Math.min(h*.7,h-callHeight-2*padding-h*.04)
  const top:Point=[w*.24,0],junction:Point=[w*.28,y],foot:Point=[w*.24,h],fork:Point=[w*.62,y+h*.02],edge:Point=[w,y-h*.02],base:Point=[split,h]
  return {
   guide:{polygon:[[0,0],top,junction,foot,[0,h]],slot:box(padding,padding,top[0]-padding,h-padding)},
   record:{polygon:[top,[w,0],edge,fork,junction],slot:box(junction[0]+padding,padding,w-padding,edge[1]-padding)},
   insurer:{polygon:[junction,fork,base,foot],slot:box(junction[0]+padding,fork[1]+padding,base[0]-padding,h-padding)},
   emergency:{polygon:[fork,edge,[w,h],base],slot:call},
  }
 }
 const main=box(padding,padding,split-padding,h-padding)
 if(layout==='evacuate'||layout==='review'){
  const tip:Point=[split+w*.095,h*.5],rise:Point=[w,h*.5-Math.min(24,h*.02)]
  return {
   [primary]:{polygon:[[0,0],[split,0],tip,[split,h],[0,h]],slot:main},
   record:{polygon:[[split,0],[w,0],rise,tip],slot:box(tip[0]+padding,padding,w-padding,rise[1]-padding)},
   emergency:{polygon:[tip,rise,[w,h],[split,h]],slot:call},
  }
 }
 return {[primary]:{polygon:[[0,0],[w*.7,0],[split,h],[0,h]],slot:main},emergency:{polygon:[[w*.7,0],[w,0],[w,h],[split,h]],slot:call}}
}

// Solves one plane per visible cell so that each shared polygon edge is exactly where the two planes meet.
function solvePlanes(partition:Partition):Partial<Record<CellId,FlowPlane>>{
 const present=ids.filter(id=>partition[id]),same=(a:Point,b:Point)=>Math.abs(a[0]-b[0])<1e-6&&Math.abs(a[1]-b[1])<1e-6
 const seams=new Map<string,{normal:Point;point:Point}>()
 for(const i of present)for(const j of present){
  const a=partition[i]!.polygon,b=partition[j]!.polygon
  if(i!==j)a.forEach((p,k)=>{
   const q=a[(k+1)%a.length],length=Math.hypot(q[0]-p[0],q[1]-p[1])
   if(b.some((r,m)=>same(r,q)&&same(b[(m+1)%b.length],p)))seams.set(`${i}>${j}`,{normal:[(q[1]-p[1])/length,-(q[0]-p[0])/length],point:p})
  })
 }
 const planes:Partial<Record<CellId,FlowPlane>>={[present[0]]:{x:0,y:0,offset:0}}
 while(present.some(id=>!planes[id]))for(const k of present){
  const known=present.filter(id=>planes[id]&&seams.has(`${id}>${k}`))
  if(planes[k]||!known.length)continue
  const [i,j]=known,into=seams.get(`${i}>${k}`)!
  let lambda=1
  if(j){
   // Around a three-cell junction the slope steps must close: lambda*n(i>k) - mu*n(j>k) = slope(j) - slope(i).
   const other=seams.get(`${j}>${k}`)!.normal,gx=planes[j]!.x-planes[i]!.x,gy=planes[j]!.y-planes[i]!.y
   lambda=(other[0]*gy-other[1]*gx)/(other[0]*into.normal[1]-other[1]*into.normal[0])
  }
  const base=planes[i]!,[nx,ny]=into.normal
  planes[k]={x:base.x+lambda*nx,y:base.y+lambda*ny,offset:base.offset-lambda*(nx*into.point[0]+ny*into.point[1])}
 }
 const steps=[...seams.keys()].map(key=>{const [i,j]=key.split('>') as CellId[];return Math.hypot(planes[j]!.x-planes[i]!.x,planes[j]!.y-planes[i]!.y)})
 const scale=steps.reduce((sum,step)=>sum+step,0)/steps.length
 return Object.fromEntries(present.map(id=>[id,{x:planes[id]!.x/scale,y:planes[id]!.y/scale,offset:planes[id]!.offset/scale}]))
}

// Absent cells sit exactly on a seam or just outside an edge, so a morph grows them out of their anchor.
function absentPlane(id:CellId,planes:Partial<Record<CellId,FlowPlane>>,primary:CellId):FlowPlane{
 const own=planes[primary]!,call=planes.emergency!
 if(id==='guide')return {x:own.x-1,y:own.y,offset:own.offset-inset}
 if(id==='record')return {x:call.x,y:call.y-1,offset:call.offset-inset}
 return {x:(own.x+call.x)/2,y:(own.y+call.y)/2,offset:(own.offset+call.offset)/2}
}

function clip(points:Point[],a:number,b:number,c:number):Point[]{
 const out:Point[]=[]
 points.forEach((p,i)=>{
  const q=points[(i+1)%points.length],d=a*p[0]+b*p[1]-c,e=a*q[0]+b*q[1]-c
  if(d<=1e-7)out.push(p)
  if((d<0&&e>0)||(d>0&&e<0)){const t=d/(d-e);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])])}
 })
 return out.filter((p,i)=>Math.hypot(p[0]-out[(i+1)%out.length][0],p[1]-out[(i+1)%out.length][1])>1e-5)
}

function shapesOf(planes:Record<CellId,FlowPlane>,width:number,height:number):Record<CellId,FlowShape|null>{
 return Object.fromEntries(ids.map(id=>{
  const own=planes[id]
  let polygon=rect(0,0,width,height)
  for(const other of ids){
   if(other===id)continue
   const plane=planes[other],dx=plane.x-own.x,dy=plane.y-own.y
   polygon=clip(polygon,dx,dy,own.offset-plane.offset-inset*Math.hypot(dx,dy))
  }
  if(polygon.length<3||area(polygon)<1)return [id,null]
  const left=Math.min(...polygon.map(p=>p[0])),top=Math.min(...polygon.map(p=>p[1]))
  const bounds={left,top,width:Math.max(...polygon.map(p=>p[0]))-left,height:Math.max(...polygon.map(p=>p[1]))-top}
  return [id,{polygon,bounds,path:roundedPath(polygon.map(([x,y])=>[x-left,y-top]),24),areaFraction:area(polygon)/(width*height)}]
 })) as Record<CellId,FlowShape|null>
}

// Rounded cubic의 안쪽 chord로 검사하므로 polygon corner만 통과하는 slot을 허용하지 않음.
function containsSlot(shape:FlowShape,slot:SlotRect):boolean{
 const numbers=shape.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number),boundary:Point[]=[]
 for(let i=0;i<numbers.length;i+=8)for(let step=0;step<=16;step++){
  const t=step/16,u=1-t
  boundary.push([u**3*numbers[i]+3*u*u*t*numbers[i+2]+3*u*t*t*numbers[i+4]+t**3*numbers[i+6],u**3*numbers[i+1]+3*u*u*t*numbers[i+3]+3*u*t*t*numbers[i+5]+t**3*numbers[i+7]])
 }
 const left=slot.left-shape.bounds.left-focusRing,top=slot.top-shape.bounds.top-focusRing,right=left+slot.width+2*focusRing,bottom=top+slot.height+2*focusRing
 return rect(left,top,right,bottom).every(point=>insidePolygon(point,boundary))
}

export function createFlowPlan(layout:FlowLayout,width:number,height:number,frame:FlowFrame):FlowPlan{
 const cells=Object.fromEntries(ids.map(id=>[id,{id,shape:null,slot:{...emptySlot},variant:'summary',visible:false,scroll:false}])) as FlowPlan['cells']
 const flat={x:0,y:0,offset:0},plan:FlowPlan={layout,mode:frame.mode,width,height,planes:{guide:flat,record:flat,insurer:flat,emergency:flat},cells}
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return plan
 const primary=layoutPriority[layout],scale=frame.metrics.rem/16
 const callHeight=Math.max(106*scale,frame.metrics.callLineHeight+2*frame.metrics.labelLineHeight+24*scale)
 const callTop=height-callHeight-2*padding
 const partition:Partition=frame.mode==='wide'?widePartition(layout,width,height,callHeight):{
  [primary]:{polygon:rect(0,0,width,callTop),slot:box(padding,padding,width-padding,callTop-padding)},
  emergency:{polygon:rect(0,callTop,width,height),slot:box(padding,height-padding-callHeight,width-padding,height-padding)},
 }
 const solved=solvePlanes(partition)
 plan.planes=Object.fromEntries(ids.map(id=>[id,solved[id]??absentPlane(id,solved,primary)])) as FlowPlan['planes']
 const shapes=shapesOf(plan.planes,width,height)
 for(const id of ids){
  const part=partition[id];if(!part)continue
  cells[id]={...cells[id],shape:shapes[id],slot:part.slot,visible:true,variant:id===primary?'full':'summary',scroll:id===primary}
 }
 const emergency=cells.emergency,number=(frame.metrics.callLineHeight/scale>=50?141:80)*scale
 const decoration={left:emergency.slot.left+8,top:emergency.slot.top-number-32-64*scale,width:2*number,height:number+32+64*scale}
 if(frame.mode==='wide'&&containsSlot(emergency.shape!,decoration))emergency.variant='full'
 return plan
}

export function flowShapes(plan:FlowPlan):FlowShapeFrame{
 return {width:plan.width,height:plan.height,planes:plan.planes,shapes:Object.fromEntries(ids.map(id=>[id,plan.cells[id].shape])) as FlowShapeFrame['shapes']}
}
export function sampleFlowShapes(from:FlowShapeFrame,to:FlowShapeFrame,progress:number):FlowShapeFrame{
 const t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0))
 if(t===0)return from
 if(t===1)return to
 const mix=(a:number,b:number)=>a+(b-a)*t,width=mix(from.width,to.width),height=mix(from.height,to.height)
 const planes=Object.fromEntries(ids.map(id=>{const a=from.planes[id],b=to.planes[id];return [id,{x:mix(a.x,b.x),y:mix(a.y,b.y),offset:mix(a.offset,b.offset)}]})) as FlowShapeFrame['planes']
 return {width,height,planes,shapes:shapesOf(planes,width,height)}
}
