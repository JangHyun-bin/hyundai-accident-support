import type {FlowFrame,FlowPlan,FlowShape,FlowShapeFrame} from './flow-contract'
import {insidePolygon,layoutPriority,layoutWeights,type CellId} from './flow-geometry'
import type {FlowLayout} from './flow-study-model'
import {insetEdges,roundedPath,type Point,type SlotRect} from './split-geometry'

const ids:CellId[]=['guide','record','insurer','emergency']
const emptySlot:SlotRect={left:0,top:0,width:0,height:0}
const inset=8,padding=24,focusRing=4
function area(polygon:Point[]):number{return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1]},0))/2}
function shapeFor(polygon:Point[],boardArea:number):FlowShape{
 // 오른쪽 접점을 모든 cell에 유지해 사각형과 오각형 사이에도 vertex 대응 보존.
 if(polygon.length===4)polygon=[polygon[0],polygon[1],[(polygon[1][0]+polygon[2][0])/2,(polygon[1][1]+polygon[2][1])/2],polygon[2],polygon[3]]
 const left=Math.min(...polygon.map(p=>p[0])),top=Math.min(...polygon.map(p=>p[1]))
 const bounds={left,top,width:Math.max(...polygon.map(p=>p[0]))-left,height:Math.max(...polygon.map(p=>p[1]))-top}
 return {polygon,bounds,path:roundedPath(polygon.map(([x,y])=>[x-left,y-top]),24),areaFraction:area(polygon)/boardArea}
}
function rect(left:number,top:number,right:number,bottom:number):Point[]{return [[left,top],[right,top],[right,bottom],[left,bottom]]}

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
 const plan:FlowPlan={layout,mode:frame.mode,width,height,cells}
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return plan
 const primary=layoutPriority[layout],scale=frame.metrics.rem/16
 const callHeight=Math.max(106*scale,frame.metrics.callLineHeight+2*frame.metrics.labelLineHeight+24*scale)
 const callTop=height-callHeight-2*padding,polygons:Partial<Record<CellId,Point[]>>={}
 if(frame.mode==='wide'){
  const split=width*.60,joint=height*.5,tip=split+width*.095
  const summaries=ids.filter(id=>id!==primary&&id!=='emergency'&&layoutWeights[layout][id]>=0)
  const leftAt=(y:number)=>summaries.length?split+(tip-split)*(y<=joint?y/joint:(height-y)/(height-joint)):split+width*.10*(1-y/height)
  polygons[primary]=summaries.length?[[0,0],[split,0],[tip,joint],[split,height],[0,height]]:[[0,0],[leftAt(0),0],[split,height],[0,height]]
  cells[primary].slot={left:padding,top:padding,width:split-2*padding,height:height-2*padding}
  cells.emergency.slot={left:width*.66+16,top:height-padding-callHeight,width:width*.34-40,height:callHeight}
  const boundaries=summaries.length?Array.from({length:summaries.length+1},(_,index)=>({left:joint*index/summaries.length,right:(joint-Math.min(24,height*.02))*index/summaries.length})):[]
  summaries.forEach((id,index)=>{
   const top=boundaries[index],bottom=boundaries[index+1]
   polygons[id]=[[leftAt(top.left),top.left],[width,top.right],[width,bottom.right],[leftAt(bottom.left),bottom.left]]
   const left=Math.max(leftAt(top.left),leftAt(bottom.left))+padding,y=Math.max(top.left,top.right)+padding
   cells[id].slot={left,top:y,width:width-padding-left,height:Math.min(bottom.left,bottom.right)-padding-y}
  })
  const top=summaries.length?boundaries[summaries.length]:{left:0,right:0}
  polygons.emergency=[[leftAt(top.left),top.left],[width,top.right],[width,height],[split,height]]
 }else{
  polygons[primary]=rect(0,0,width,callTop)
  polygons.emergency=rect(0,callTop,width,height)
  cells[primary].slot={left:padding,top:padding,width:width-2*padding,height:callTop-2*padding}
  cells.emergency.slot={left:padding,top:height-padding-callHeight,width:width-2*padding,height:callHeight}
 }
 for(const id of ids){
  const polygon=polygons[id];if(!polygon)continue
  const distances=polygon.map((p,index)=>{
   const q=polygon[(index+1)%polygon.length]
   return p[0]===q[0]&&(p[0]===0||p[0]===width)||p[1]===q[1]&&(p[1]===0||p[1]===height)?0:inset
  })
  const shape=shapeFor(insetEdges(polygon,distances),width*height)
  cells[id]={...cells[id],shape,visible:true,variant:id===primary?'full':'summary',scroll:id===primary}
 }
 const emergency=cells.emergency,number=(frame.metrics.callLineHeight/scale>=50?141:80)*scale
 const decoration={left:emergency.slot.left+8,top:emergency.slot.top-number-32-64*scale,width:2*number,height:number+32+64*scale}
 if(frame.mode==='wide'&&containsSlot(emergency.shape!,decoration))emergency.variant='full'
 return plan
}

export function flowShapes(plan:FlowPlan):FlowShapeFrame{return Object.fromEntries(ids.map(id=>[id,plan.cells[id].shape])) as FlowShapeFrame}
function boardArea(frame:FlowShapeFrame):number{
 const shape=Object.values(frame).find((shape):shape is FlowShape=>shape!==null&&shape.areaFraction>0)
 return shape?area(shape.polygon)/shape.areaFraction:1
}
export function sampleFlowShapes(from:FlowShapeFrame,to:FlowShapeFrame,progress:number):FlowShapeFrame{
 const t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0))
 if(t===0)return from
 if(t===1)return to
 const total=boardArea(from)*(1-t)+boardArea(to)*t
 return Object.fromEntries(ids.map(id=>{
  const source=from[id],target=to[id]
  if(!source&&!target)return [id,null]
  const existing=(source??target)!,center:Point=[existing.polygon.reduce((sum,p)=>sum+p[0],0)/existing.polygon.length,existing.polygon.reduce((sum,p)=>sum+p[1],0)/existing.polygon.length]
  // 역할이 좌우로 바뀌면 119 core를 가로지르지 않도록 위쪽을 거쳐 이동.
  const direction=source&&target&&id!=='emergency'?Math.sign(target.bounds.left-source.bounds.left):0
  const early=1-(1-t)**4,late=t**4,tx=direction>0?late:direction<0?early:t,ty=direction>0?early:direction<0?late:t
  const polygon=existing.polygon.map((_,index):Point=>{
   const a=source?.polygon[index]??center,b=target?.polygon[index]??center
   return [a[0]+(b[0]-a[0])*tx,a[1]+(b[1]-a[1])*ty]
  })
  return [id,shapeFor(polygon,total)]
 })) as FlowShapeFrame
}
