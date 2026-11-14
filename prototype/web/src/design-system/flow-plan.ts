import type {FlowFrame,FlowPlan,FlowPlane,FlowShape,FlowShapeFrame} from './flow-contract'
import type {CellId,FlowLayout} from './flow-study-model'
import {roundedPath,type Point,type SlotRect} from './split-geometry'

export const cellIds:CellId[]=['emergency','guide','record','scene','vehicle']
export const layoutPriority:Record<FlowLayout,CellId>={detect:'guide',emergency:'emergency',evacuate:'guide',safe:'record',review:'guide',sending:'guide',calm:'guide'}
// Wide boards keep three columns: scene over vehicle, guide with the 119 cell entering on top, record.
// `record` is the record column's share of the width, `call` the share of height the 119 cell takes when it leads.
// The scene/vehicle column never changes, so the vehicle context holds still while emphasis moves between the others.
const layoutWeights:Record<FlowLayout,{record:number;call:number}>={
 detect:{record:.3,call:0},emergency:{record:.3,call:.46},evacuate:{record:.3,call:0},safe:{record:.41,call:0},
 review:{record:.3,call:0},sending:{record:.3,call:0},calm:{record:.35,call:0},
}
const contextShare=.3,sceneShare=.56,tilt=.03,kink=.02,pinch=.015,rise=.03
const emptySlot:SlotRect={left:0,top:0,width:0,height:0}
// Content keeps `padding` from a seam and `Sizes.edge` from the app window border, whose corners the system may round.
const inset=8,padding=24,focusRing=4
type Part={polygon:Point[];slot:SlotRect;full:boolean}
type Partition=Partial<Record<CellId,Part>>
type Sizes={edge:number;call:number;decoration:SlotRect;summary:number;context:number;workspace:number;full:{width:number;height:number}}

function area(polygon:Point[]):number{return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1]},0))/2}
function rect(left:number,top:number,right:number,bottom:number):Point[]{return [[left,top],[right,top],[right,bottom],[left,bottom]]}
function box(left:number,top:number,right:number,bottom:number):SlotRect{return {left,top,width:right-left,height:bottom-top}}
const along=(p:Point,q:Point,y:number)=>p[0]+(q[0]-p[0])*(y-p[1])/(q[1]-p[1])
function insidePolygon(p:Point,polygon:Point[]):boolean{
 return polygon.every((a,i)=>{const b=polygon[(i+1)%polygon.length];return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])>=-1e-5})
}

function sizes(frame:FlowFrame):Sizes{
 const {rem,bodyLineHeight:body,headingLineHeight:heading,callLineHeight,labelLineHeight:label,touch}=frame.metrics,scale=rem/16
 const number=(callLineHeight/scale>=50?141:80)*scale,edge=frame.mode==='mobile'?padding:32
 return {
  edge,
  call:Math.max(106*scale,callLineHeight+2*label+24*scale),
  decoration:{left:8,top:16,width:2*number,height:number+64},
  summary:padding+edge+label+body+12*scale,
  context:padding+edge+4*label,
  // A stacked task row must hold an editor: a heading that wraps to three lines, three body lines and a touch target.
  workspace:padding+edge+3*heading+3*body+touch,
  full:{width:280*scale,height:3*body+heading+touch},
 }
}

// Seams lean a few percent and the scene/vehicle junction pulls left, so the columns read as one Voronoi surface.
function columns(layout:FlowLayout,w:number,h:number){
 const lean=tilt*w/2,left=contextShare*w,right=(1-layoutWeights[layout].record)*w,y=sceneShare*h
 const a:Point=[left-lean,0],b:Point=[left+lean,h],c:Point=[right-lean,0],d:Point=[right+lean,h]
 return {a,b,c,d,j1:[along(a,b,y)-kink*w,y] as Point,l:[0,y+rise*h] as Point}
}

// Both ends of the 119 seam pinch inward, which keeps every cell convex at the two junctions it adds.
function callSeam(layout:FlowLayout,w:number,h:number,coreBottom:number):[Point,Point]{
 const {a,c,d,j1}=columns(layout,w,h),right=Math.max(coreBottom+padding,layoutWeights[layout].call*h),left=right+rise*h*2/3
 return [[along(a,j1,left)+pinch*w,left],[along(c,d,right)-pinch*w,right]]
}

// The live call core is one rectangle shared by every layout that can show 119, so call text never moves or fades.
function callCore(w:number,h:number,call:number,edge:number):SlotRect{
 const bottom=edge+call
 const spans=(Object.keys(layoutWeights) as FlowLayout[]).filter(layout=>layout!=='calm').map(layout=>{
  const {a,c}=columns(layout,w,h),[j2,j3]=callSeam(layout,w,h,bottom)
  return [Math.max(a[0],j2[0]),Math.min(c[0],j3[0])]
 })
 return box(Math.max(...spans.map(span=>span[0]))+padding,edge,Math.min(...spans.map(span=>span[1]))-padding,bottom)
}

function widePartition(layout:FlowLayout,w:number,h:number,edge:number,core:SlotRect|null):Partition{
 const {a,b,c,d,j1,l}=columns(layout,w,h),corner:Point=[0,0],foot:Point=[0,h],top:Point=[w,0],bottom:Point=[w,h]
 const scene=box(edge,edge,Math.min(a[0],j1[0])-padding,j1[1]-padding),record=box(Math.max(c[0],d[0])+padding,edge,w-edge,h-edge)
 const vehicle:Part={polygon:[l,j1,b,foot],slot:box(edge,l[1]+padding,Math.min(j1[0],b[0])-padding,h-edge),full:true}
 if(!core)return {
  guide:{polygon:[a,c,d,b,j1],slot:box(Math.max(a[0],b[0])+padding,edge,Math.min(c[0],d[0])-padding,h-edge),full:true},
  record:{polygon:[c,top,bottom,d],slot:record,full:true},scene:{polygon:[corner,a,j1,l],slot:scene,full:true},vehicle,
 }
 const [j2,j3]=callSeam(layout,w,h,core.top+core.height)
 return {
  emergency:{polygon:[a,c,j3,j2],slot:core,full:true},
  guide:{polygon:[j2,j3,d,b,j1],slot:box(Math.max(j2[0],b[0])+padding,Math.max(j2[1],j3[1])+padding,Math.min(j3[0],d[0])-padding,h-edge),full:true},
  record:{polygon:[c,top,bottom,d,j3],slot:record,full:true},scene:{polygon:[corner,a,j2,j1,l],slot:scene,full:true},vehicle,
 }
}

// Narrow and phone boards stack 119, guide, record, then scene beside vehicle. The task row absorbs the height;
// when it would drop below a usable workspace, the 119 numeral, then the context row, then the summary row give way.
function stackPartition(layout:FlowLayout,w:number,h:number,size:Sizes,call:boolean,fit:boolean):{partition:Partition;height:number}{
 const priority=layoutPriority[layout],flex:CellId=priority==='record'?'record':'guide',{edge}=size,core=edge+padding+size.call
 const context=Math.max(size.context,.2*h),decoration=size.decoration.top+size.decoration.height
 type Extra='summary'|'context'|'decoration'
 const extras:[Extra,number][]=[['summary',size.summary],['context',context]]
 if(call&&priority==='emergency')extras.push(['decoration',decoration])
 let used=call?core:0
 const kept=new Set<Extra>()
 for(const [extra,height] of extras)if(!fit||h-used-height>=size.workspace){kept.add(extra);used+=height}
 const height=fit?h:Math.max(h,used+size.workspace),split=kept.has('context')?height-context:height,dip=Math.max(12,.03*w)
 const callRow=call?core+(kept.has('decoration')?decoration:0):0,rows:[CellId,number][]=call?[['emergency',callRow]]:[]
 for(const id of ['guide','record'] as const)if(id===flex)rows.push([id,split-callRow-(kept.has('summary')?size.summary:0)])
  else if(kept.has('summary'))rows.push([id,size.summary])
 const partition:Partition={}
 let y=0
 rows.forEach(([id,rowHeight],index)=>{
  const last=index===rows.length-1,end=last?split:y+rowHeight
  const top=y?y+padding:edge,bottom=id==='emergency'?top+size.call:end===height?end-edge:end-padding
  partition[id]={polygon:last&&split<height?[[0,y],[w,y],[w,end],[w/2,end+dip],[0,end]]:rect(0,y,w,end),slot:box(edge,top,w-edge,bottom),full:id===flex||id==='emergency'}
  y=end
 })
 if(split<height){
  const left:Point=[0,split],middle:Point=[w/2,split+dip],right:Point=[w,split]
  partition.scene={polygon:[left,middle,[w/2,height],[0,height]],slot:box(edge,split+dip+padding,w/2-padding,height-edge),full:false}
  partition.vehicle={polygon:[middle,right,[w,height],[w/2,height]],slot:box(w/2+padding,split+dip+padding,w-edge,height-edge),full:false}
 }
 return {partition,height}
}

// Solves one plane per visible cell so that each shared polygon edge is exactly where the two planes meet.
function solvePlanes(partition:Partition):Partial<Record<CellId,FlowPlane>>{
 const present=cellIds.filter(id=>partition[id]),same=(a:Point,b:Point)=>Math.abs(a[0]-b[0])<1e-6&&Math.abs(a[1]-b[1])<1e-6
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

// Absent cells sit just outside an edge: 119 above the guide, so a morph grows it down from the top of its column.
function absentPlane(id:CellId,planes:Partial<Record<CellId,FlowPlane>>,height:number):FlowPlane{
 const guide=planes.guide,anchor=guide??Object.values(planes)[0]!
 if(id==='emergency'&&guide)return {x:guide.x,y:guide.y-1,offset:guide.offset-inset}
 return {x:anchor.x,y:anchor.y+1,offset:anchor.offset-height-inset}
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

// Vertices on the board edge stay square so cells meet the app window edge; only a phone board, which floats in its frame, rounds them.
function shapesOf(planes:Record<CellId,FlowPlane>,width:number,height:number,square=true):Record<CellId,FlowShape|null>{
 const region=(id:CellId,others:CellId[])=>others.reduce((polygon,other)=>{
  const own=planes[id],plane=planes[other],dx=plane.x-own.x,dy=plane.y-own.y
  return other===id?polygon:clip(polygon,dx,dy,own.offset-plane.offset-inset*Math.hypot(dx,dy))
 },rect(0,0,width,height))
 const empty=(polygon:Point[])=>polygon.length<3||area(polygon)<1
 // A cell with no visible region leaves no seam, so a cell entering or leaving through the window edge never opens a gap along it.
 const live=cellIds.filter(id=>!empty(region(id,cellIds)))
 return Object.fromEntries(cellIds.map(id=>{
  if(!live.includes(id))return [id,null]
  const polygon=region(id,live)
  const left=Math.min(...polygon.map(p=>p[0])),top=Math.min(...polygon.map(p=>p[1]))
  const bounds={left,top,width:Math.max(...polygon.map(p=>p[0]))-left,height:Math.max(...polygon.map(p=>p[1]))-top}
  const radii=polygon.map(([x,y])=>square&&Math.min(x,y,width-x,height-y)<1e-6?0:24)
  return [id,{polygon,bounds,path:roundedPath(polygon.map(([x,y])=>[x-left,y-top]),radii),areaFraction:area(polygon)/(width*height)}]
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

export function createFlowPlan(layout:FlowLayout,width:number,height:number,frame:FlowFrame,emergencyActive=false):FlowPlan{
 const flat={x:0,y:0,offset:0}
 const cells=Object.fromEntries(cellIds.map(id=>[id,{id,shape:null,slot:{...emptySlot},variant:'summary',visible:false,scroll:false}])) as FlowPlan['cells']
 const plan:FlowPlan={layout,mode:frame.mode,width,height,planes:Object.fromEntries(cellIds.map(id=>[id,flat])) as FlowPlan['planes'],cells}
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return plan
 const size=sizes(frame),priority=layoutPriority[layout],call=layout==='emergency'||emergencyActive&&layout!=='calm'
 const {partition,height:extent}=frame.mode==='wide'?{partition:widePartition(layout,width,height,size.edge,call?callCore(width,height,size.call,size.edge):null),height}:stackPartition(layout,width,height,size,call,frame.mode!=='document')
 const solved=solvePlanes(partition)
 plan.height=extent
 plan.planes=Object.fromEntries(cellIds.map(id=>[id,solved[id]??absentPlane(id,solved,extent)])) as FlowPlan['planes']
 const shapes=shapesOf(plan.planes,width,extent,frame.mode!=='mobile')
 for(const id of cellIds){
  const part=partition[id];if(!part)continue
  const fits=part.slot.width>=size.full.width&&part.slot.height>=size.full.height,lead=id===priority&&id!=='emergency'
  cells[id]={...cells[id],shape:shapes[id],slot:part.slot,visible:true,variant:lead||part.full&&fits?'full':'summary',scroll:lead}
 }
 const emergency=cells.emergency,core=emergency.slot,{decoration}=size
 if(emergency.visible)emergency.variant=frame.mode!=='document'&&containsSlot(emergency.shape!,{left:core.left+decoration.left,top:core.top+core.height+decoration.top,width:decoration.width,height:decoration.height})?'full':'summary'
 return plan
}

export function flowShapes(plan:FlowPlan):FlowShapeFrame{
 return {width:plan.width,height:plan.height,planes:plan.planes,shapes:Object.fromEntries(cellIds.map(id=>[id,plan.cells[id].shape])) as FlowShapeFrame['shapes']}
}
export function sampleFlowShapes(from:FlowShapeFrame,to:FlowShapeFrame,progress:number):FlowShapeFrame{
 const t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0))
 if(t===0)return from
 if(t===1)return to
 const mix=(a:number,b:number)=>a+(b-a)*t,width=mix(from.width,to.width),height=mix(from.height,to.height)
 const planes=Object.fromEntries(cellIds.map(id=>{const a=from.planes[id],b=to.planes[id];return [id,{x:mix(a.x,b.x),y:mix(a.y,b.y),offset:mix(a.offset,b.offset)}]})) as FlowShapeFrame['planes']
 return {width,height,planes,shapes:shapesOf(planes,width,height)}
}
