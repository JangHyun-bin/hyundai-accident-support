import {useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode,type CSSProperties} from 'react'
import {gsap} from 'gsap'
import {CustomEase} from 'gsap/CustomEase'
import {CareSurface} from '@/components/ui/after-care'
import {cellIds,createFlowPlan,flowShapes,layoutPriority,sampleFlowShapes} from './flow-plan'
import {useFlowFrame,type FlowFrame,type FlowPlan,type FlowShapeFrame} from './flow-contract'
import type {CellId,FlowLayout} from './flow-study-model'

gsap.registerPlugin(CustomEase)
const breathEase=CustomEase.create('flow-breath','.65,0,.35,1')
const titles:Record<CellId,string>={emergency:'긴급 통화',guide:'현재 안내',record:'사고 기록',scene:'주변 상황',vehicle:'차량 상태'}
const initialFrame:FlowFrame={width:680,height:800,device:'vehicle',mode:'narrow',contentHeight:600,statusHeight:0,dockHeight:0,revision:'initial',reason:'initial measurement',metrics:{rem:16,bodyLineHeight:23.58,headingLineHeight:36.4,callLineHeight:35,labelLineHeight:21,touch:64}}
const emptyShape={left:0,top:0,width:1,height:1,path:'M0 0 Z'}
const restingLight={'--fs-light':.5,'--fs-chroma':1}
const sameTarget=(a:FlowPlan,b:FlowPlan)=>a.layout===b.layout&&a.cells.emergency.visible===b.cells.emergency.visible

export function FlowBoard({layout:target,emergencyActive=false,attention=[],notificationKey,reduced,driving=false,renderCell,readout=true,onSettled,onPlan}:{layout:FlowLayout;emergencyActive?:boolean;attention?:CellId[];notificationKey:string;reduced:boolean;driving?:boolean;renderCell:(id:CellId,compact:boolean)=>ReactNode;readout?:boolean;persistentCells?:boolean;onSettled?:()=>void;onPlan?:(plan:FlowPlan)=>void}){
 const inherited=useFlowFrame(),frame=inherited??initialFrame
 const host=useRef<HTMLDivElement>(null)
 const [size,setSize]=useState({width:680,height:600})
 const [fontsReady,setFontsReady]=useState(false)
 const plan=useMemo(()=>createFlowPlan(target,size.width,size.height,frame,emergencyActive),[target,size.width,size.height,frame,emergencyActive])
 const [display,setDisplay]=useState(plan),[moving,setMoving]=useState(false)
 const shown=useRef(display),current=useRef<FlowShapeFrame>(flowShapes(display))
 const tween=useRef<gsap.core.Timeline|null>(null),generation=useRef(0),environment=useRef('')
 const commit=useRef<{generation:number;fade:CellId[]}|null>(null),phase=useRef<'idle'|'moving'>('idle')
 const measured=useRef(false)
 const callback=useRef(onSettled);callback.current=onSettled
 const revision=`${frame.revision}/${size.width}/${size.height}`
 useLayoutEffect(()=>{
  const element=host.current!
  if(element.closest('[data-composing=true]')||element.clientWidth<=0||element.clientHeight<=0)return
  // 환경 commit과 같은 paint에서 slot·material 크기를 맞춤.
  measured.current=true
  setSize(old=>old.width===element.clientWidth&&old.height===element.clientHeight?old:{width:element.clientWidth,height:element.clientHeight})
 },[frame.revision])
 useLayoutEffect(()=>{
  const element=host.current!;let raf:ReturnType<typeof setTimeout>|undefined
  const measure=()=>{clearTimeout(raf);raf=setTimeout(()=>{
   if(element.clientWidth<=0||element.clientHeight<=0||element.closest('[data-composing=true]'))return
   measured.current=true
   setSize(old=>old.width===element.clientWidth&&old.height===element.clientHeight?old:{width:element.clientWidth,height:element.clientHeight})
  },measured.current?120:0)}
  const observer=new ResizeObserver(measure);observer.observe(element);measure()
  let alive=true
  const ready=()=>{if(alive){setFontsReady(true);measure()}}
  const loading=()=>setFontsReady(false)
  const compositionEnd=()=>queueMicrotask(measure)
  element.closest('.journey-flow')?.addEventListener('compositionend',compositionEnd)
  document.fonts.addEventListener('loading',loading)
  document.fonts.ready.then(ready)
  document.fonts.addEventListener('loadingdone',ready)
  return()=>{alive=false;observer.disconnect();clearTimeout(raf);document.fonts.removeEventListener('loadingdone',ready);document.fonts.removeEventListener('loading',loading);element.closest('.journey-flow')?.removeEventListener('compositionend',compositionEnd)}
 },[])
 function paint(next:FlowShapeFrame){
  current.current=next
  for(const id of cellIds){
   const surface=host.current?.querySelector<HTMLElement>(`[data-cell="${id}"]`)
   const background=surface?.querySelector<HTMLElement>('.ac-material-frame'),shape=next.shapes[id]
   if(!background)continue
   background.style.display=frame.mode==='document'||shape?'':'none'
   if(frame.mode==='document')continue
   if(!shape)continue
   const {bounds,path}=shape
   Object.assign(background.style,{left:`${bounds.left}px`,top:`${bounds.top}px`,width:`${bounds.width}px`,height:`${bounds.height}px`})
   background.style.setProperty('--ac-clip',`path("${path}")`);background.dataset.shapePath=path
  }
 }
 const body=(id:CellId)=>host.current!.querySelector<HTMLElement>(`[data-cell="${id}"] .fs-cell-body`)!
 function reveal(next:FlowPlan){
  for(const id of cellIds){
   const node=body(id),cell=next.cells[id]
   node.inert=!cell.visible;node.setAttribute('aria-hidden',String(!cell.visible))
   node.style.opacity=cell.visible?'1':'0'
  }
  const decoration=host.current?.querySelector<HTMLElement>('.fs-call-decoration')
  if(decoration)decoration.style.opacity='1'
  return decoration
 }
 useLayoutEffect(()=>{
  const ticket=++generation.current
  tween.current?.kill();tween.current=null;commit.current=null
  const changedEnvironment=environment.current!==revision
  environment.current=revision
  const destination=flowShapes(plan)
  const settle=()=>{
   if(generation.current!==ticket)return
   shown.current=plan;setDisplay(plan);paint(destination);reveal(plan);phase.current='idle';setMoving(false)
  }
  // Driving stops animation, not information: the board lands on the current plan at once so every visible cell stays readable.
  if(!measured.current||!fontsReady||changedEnvironment||reduced||driving||frame.mode!=='wide'){
   settle();return
  }
  if(sameTarget(shown.current,plan)&&phase.current==='idle'){paint(destination);return}
  const source=current.current
  if(source.width===destination.width&&source.height===destination.height&&cellIds.every(id=>(['x','y','offset'] as const).every(key=>source.planes[id][key]===destination.planes[id][key]))){settle();return}
  const canvas=document.createElement('canvas').getContext('2d')!,samples=Array.from({length:25},(_,i)=>sampleFlowShapes(source,destination,i/24).shapes)
  // A body stays put only if its slot is unchanged and every sampled frame still contains it; the 119 core keeps its slot across variants.
  const keep=new Set(cellIds.filter(id=>{
   const from=shown.current.cells[id],to=plan.cells[id],r=to.slot
   if(!from.visible||!to.visible||id!=='emergency'&&from.variant!==to.variant||(['left','top','width','height'] as const).some(key=>Math.abs(from.slot[key]-r[key])>=.01))return false
   const corners=[[r.left-4,r.top-4],[r.left+r.width+4,r.top-4],[r.left+r.width+4,r.top+r.height+4],[r.left-4,r.top+r.height+4]]
   return samples.every(shapes=>{const shape=shapes[id];if(!shape)return false;const path=new Path2D(shape.path);return corners.every(([x,y])=>canvas.isPointInPath(path,x-shape.bounds.left,y-shape.bounds.top))})
  }))
  for(const id of keep)body(id).style.opacity='1'
  const fade=cellIds.filter(id=>!keep.has(id))
  const decoration=host.current?.querySelector<HTMLElement>('.fs-call-decoration')
  const changing=[...fade.map(body),...(decoration?[decoration]:[])]
  phase.current='moving';setMoving(true)
  const progress={value:0}
  const tl=gsap.timeline()
  tween.current=tl
  if(changing.length)tl.to(changing,{opacity:0,duration:.36,ease:'power2.out'})
  tl.call(()=>{if(ticket!==generation.current)return;fade.map(body).forEach(e=>{e.inert=true;e.setAttribute('aria-hidden','true')})})
  tl.to(progress,{value:1,duration:target==='calm'?1.6:1.2,ease:breathEase,onUpdate:()=>{
   if(ticket===generation.current)paint(sampleFlowShapes(source,destination,progress.value))
  }})
  tl.call(()=>{
   if(ticket!==generation.current)return
   commit.current={generation:ticket,fade}
   shown.current=plan;setDisplay(plan);paint(destination)
  })
  return()=>{tl.kill()}
  // Presentation moves only on target/environment events, never on a content render.
 },[plan,revision,fontsReady,reduced,driving])
 useLayoutEffect(()=>{
  const transaction=commit.current
  const decoration=reveal(display)
  if(!transaction||transaction.generation!==generation.current)return
  commit.current=null
  const nodes=transaction.fade.filter(id=>display.cells[id].visible).map(body)
  if(decoration)nodes.push(decoration)
  gsap.set(nodes,{opacity:0})
  const tl=gsap.timeline({onComplete:()=>{if(transaction.generation===generation.current){phase.current='idle';setMoving(false)}}})
  tween.current=tl
  tl.to(nodes,{opacity:1,duration:reduced?0:.36,ease:'power2.out'})
  return()=>{tl.kill()}
 },[display,reduced])
 useEffect(()=>{onPlan?.(display)},[display,onPlan])
 useEffect(()=>{
  if(!moving&&sameTarget(display,plan)&&!driving)callback.current?.()
 },[display,plan,moving,driving,onSettled])
 useEffect(()=>()=>{generation.current++;tween.current?.kill()},[])
 useEffect(()=>{
  const element=host.current!
  // The active task and a live call keep their material lit; a notification pulses above that resting level.
  if(reduced||driving){gsap.set(element,restingLight);return}
  const tl=gsap.timeline().to(element,{'--fs-light':.95,'--fs-chroma':1,duration:.7,ease:'power2.out'})
   .to(element,{'--fs-light':.68,duration:1.2,ease:'sine.inOut'},'+=.35')
   .to(element,{...restingLight,duration:1.4,ease:'power2.inOut'},'+=.6')
  return()=>{tl.kill()}
 },[notificationKey,reduced,driving])
 const quiet=reduced||driving,priority=layoutPriority[target],visible=cellIds.filter(id=>display.cells[id].visible)
 return <div className="fs-board-wrap"><div ref={host} className="fs-board" data-testid="flow-board" data-layout={display.layout} data-target={target} data-emergency={display.cells.emergency.visible} data-moving={moving} data-profile={frame.mode} data-quiet={quiet}>
  {cellIds.map(id=>{
   const cell=display.cells[id],r=cell.slot,warm=attention.includes(id)
   const style:CSSProperties={left:0,top:0,width:r.width,height:r.height,transform:`translate(${r.left}px, ${r.top}px)`}
   return <CareSurface key={id} data-cell={id} data-cell-visible={cell.visible} data-compact={cell.variant==='summary'} data-priority={id===priority} data-lit={id===priority||id==='emergency'||priority==='emergency'&&id==='guide'} data-attention={warm} tone={warm||id==='emergency'?'call':id==='guide'?'safety':'plain'} shape={frame.mode==='document'?undefined:emptyShape} interactiveMaterial className="fs-cell">
    <div className="fs-cell-body" hidden={!cell.visible} data-scroll={cell.scroll} data-slot-x={r.left} data-slot-y={r.top} style={style} aria-hidden={!cell.visible} inert={!cell.visible}>{renderCell(id,cell.variant==='summary')}</div>
   </CareSurface>
  })}
 </div>{readout&&<div className="fs-layout-readout" aria-live="polite"><span>{visible.length} cells</span><span>{driving?'주행 중 · 움직임 정지':moving?'배치 전환 중':'배치 유지'}</span><span>{visible.map(id=>`${titles[id]} ${Math.round((display.cells[id].shape?.areaFraction??0)*100)}%`).join(' · ')}</span></div>}</div>
}
