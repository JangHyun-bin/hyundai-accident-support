import {insetEdges,roundedPath,type Point,type SlotRect} from './split-geometry'
import type {FlowLayout} from './flow-study-model'
export type CellId='guide'|'record'|'insurer'|'emergency'
export type Weights=Record<CellId,number>
export type FlowCell={id:CellId;polygon:Point[];path:string;bounds:SlotRect;content:SlotRect;areaFraction:number}
const seeds:Record<CellId,Point>={guide:[300,560],record:[980,240],insurer:[640,720],emergency:[1010,1000]}
const absent=-5
export const layoutWeights:Record<FlowLayout,Weights>={
 detect:{guide:.75,record:absent,insurer:absent,emergency:1},
 evacuate:{guide:1,record:.35,insurer:absent,emergency:.35},
 safe:{guide:.1,record:1,insurer:.3,emergency:.35},
 review:{guide:absent,record:.5,insurer:1,emergency:.6},
 sending:{guide:absent,record:absent,insurer:1,emergency:.6},
 calm:{guide:absent,record:absent,insurer:1,emergency:.6},
}
export const layoutPriority:Record<FlowLayout,CellId>={detect:'guide',evacuate:'guide',safe:'record',review:'insurer',sending:'insurer',calm:'insurer'}
function clip(points:Point[],a:number,b:number,c:number):Point[]{
 const out:Point[]=[]
 for(let i=0;i<points.length;i++){
  const p=points[i],q=points[(i+1)%points.length],d=a*p[0]+b*p[1]-c,e=a*q[0]+b*q[1]-c
  if(d<=1e-7)out.push(p)
  if((d<0&&e>0)||(d>0&&e<0)){const t=d/(d-e);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])])}
 }
 return out.filter((p,i)=>Math.hypot(p[0]-out[(i+1)%out.length][0],p[1]-out[(i+1)%out.length][1])>1e-5)
}
export function insidePolygon(p:Point,polygon:Point[]):boolean{
 return polygon.every((a,i)=>{const b=polygon[(i+1)%polygon.length];return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])>=-1e-5})
}
function area(points:Point[]):number{return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1]},0))/2}
function bounds(points:Point[]):SlotRect{
 const x=points.map(p=>p[0]),y=points.map(p=>p[1]),left=Math.min(...x),top=Math.min(...y)
 return {left,top,width:Math.max(...x)-left,height:Math.max(...y)-top}
}
function contentRect(points:Point[],padding:number):SlotRect{
 const b=bounds(points);let best={left:b.left+b.width/2,top:b.top+b.height/2,width:0,height:0},score=0
 const xs=(y:number)=>points.flatMap((p,i)=>{const q=points[(i+1)%points.length];if(Math.abs(p[1]-q[1])<1e-6)return Math.abs(y-p[1])<1e-5?[p[0],q[0]]:[];return y>=Math.min(p[1],q[1])-1e-6&&y<=Math.max(p[1],q[1])+1e-6?[p[0]+(y-p[1])/(q[1]-p[1])*(q[0]-p[0])]:[]})
 for(let i=0;i<18;i++)for(let j=i+1;j<=18;j++){
  const top=b.top+b.height*i/18,bottom=b.top+b.height*j/18
  const slices=[top,bottom,...points.map(p=>p[1]).filter(y=>y>top&&y<bottom)].map(xs)
  const left=Math.max(...slices.map(s=>Math.min(...s)))+padding,right=Math.min(...slices.map(s=>Math.max(...s)))-padding
  const width=right-left,height=bottom-top-2*padding,next=width*height
  if(width>0&&height>0&&next>score){score=next;best={left,top:top+padding,width,height}}
 }
 return best
}
export function flowCells(layout:FlowLayout,width:number,height:number,weights:Weights=layoutWeights[layout]):FlowCell[]{
 if(width<=0||height<=0)return []
 const ids=Object.keys(seeds) as CellId[],output:FlowCell[]=[]
 for(const id of ids){
  let polygon:Point[]=[[0,0],[1236,0],[1236,1184],[0,1184]]
  const p=seeds[id],w=(.1+weights[id])*1236*1184*.18
  for(const other of ids){if(other===id)continue;const q=seeds[other],v=(.1+weights[other])*1236*1184*.18;polygon=clip(polygon,2*(q[0]-p[0]),2*(q[1]-p[1]),q[0]**2+q[1]**2-p[0]**2-p[1]**2+w-v)}
  const fraction=area(polygon)/(1236*1184)
  if(polygon.length<3||fraction<.0005)continue
  polygon=polygon.map(([x,y])=>[x/1236*width,y/1184*height])
  const gap=24*width/1236,radius=36*width/1236
  const inset=insetEdges(polygon,polygon.map(()=>gap/2))
  if(!inset.every(p=>p.every(Number.isFinite)&&insidePolygon(p,polygon)))continue
  const box=bounds(inset),content=contentRect(inset,Math.max(12,28*width/1236))
  output.push({id,polygon:inset,path:roundedPath(inset.map(([x,y])=>[x-box.left,y-box.top]),radius),bounds:box,content,areaFraction:fraction})
 }
 return output
}
