import {useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode,type CSSProperties} from 'react'
import {gsap} from 'gsap'
import {CustomEase} from 'gsap/CustomEase'
import {ShieldCheck} from 'lucide-react'
import {CareSurface} from '@/components/ui/after-care'
import {layoutPriority,type CellId} from './flow-geometry'
import {createFlowPlan,flowShapes,sampleFlowShapes} from './flow-plan'
import {useFlowFrame,type FlowFrame,type FlowPlan,type FlowShapeFrame} from './flow-contract'
import type {FlowLayout} from './flow-study-model'

gsap.registerPlugin(CustomEase)
const breathEase=CustomEase.create('flow-breath','.65,0,.35,1')
const ids:CellId[]=['guide','record','insurer','emergency']
const titles:Record<CellId,string>={guide:'안전 확보',record:'사고 기록',insurer:'보험사 전달',emergency:'긴급 통화'}
const initialFrame:FlowFrame={width:680,height:800,device:'vehicle',mode:'narrow',contentHeight:600,headerHeight:0,statusHeight:0,dockHeight:0,revision:'initial',reason:'initial measurement',metrics:{rem:16,bodyLineHeight:23.58,headingLineHeight:36.4,callLineHeight:35,labelLineHeight:21,touch:64}}
const emptyShape={left:0,top:0,width:1,height:1,path:'M0 0 Z'}
const sameSlot=(a:FlowPlan['cells'][CellId],b:FlowPlan['cells'][CellId])=>a.visible&&b.visible&&a.variant===b.variant&&(['left','top','width','height'] as const).every(key=>Math.abs(a.slot[key]-b.slot[key])<.01)

export function FlowBoard({layout:target,notificationKey,reduced,driving=false,renderCell,readout=true,onSettled,onPlan,device='vehicle'}:{layout:FlowLayout;notificationKey:string;reduced:boolean;driving?:boolean;renderCell:(id:CellId,compact:boolean)=>ReactNode;readout?:boolean;persistentCells?:boolean;onSettled?:()=>void;onPlan?:(plan:FlowPlan)=>void;device?:'vehicle'|'mobile'}){
 const inherited=useFlowFrame(),frame=inherited??initialFrame
 const host=useRef<HTMLDivElement>(null)
 const [size,setSize]=useState({width:680,height:600})
 const [fontsReady,setFontsReady]=useState(false)
 const plan=useMemo(()=>createFlowPlan(target,size.width,size.height,frame),[target,size.width,size.height,frame])
 const [display,setDisplay]=useState(plan),[moving,setMoving]=useState(false)
 const shown=useRef(display),current=useRef<FlowShapeFrame>(flowShapes(display))
 const tween=useRef<gsap.core.Timeline|null>(null),generation=useRef(0),environment=useRef('')
 const commit=useRef<{generation:number;fade:CellId[]}|null>(null),phase=useRef<'idle'|'moving'|'paused'>('idle')
 const measured=useRef(false)
 const callback=useRef(onSettled);callback.current=onSettled
 const revision=`${frame.revision}/${size.width}/${size.height}`
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
 function paint(shapes:FlowShapeFrame){
  current.current=shapes
  if(frame.mode==='document')return
  for(const id of ids){
   const surface=host.current?.querySelector<HTMLElement>(`[data-cell="${id}"]`)
   const background=surface?.querySelector<HTMLElement>('.ac-material-frame'),shape=shapes[id]
   if(!background)continue
   background.style.visibility=shape?'visible':'hidden'
   if(!shape)continue
   const {bounds,path}=shape
   Object.assign(background.style,{left:`${bounds.left}px`,top:`${bounds.top}px`,width:`${bounds.width}px`,height:`${bounds.height}px`})
   background.style.setProperty('--ac-clip',`path("${path}")`);background.dataset.shapePath=path
  }
 }
 const body=(id:CellId)=>host.current!.querySelector<HTMLElement>(`[data-cell="${id}"] .fs-cell-body`)!
 useLayoutEffect(()=>{
  const ticket=++generation.current
  tween.current?.kill();tween.current=null;commit.current=null
  const changedEnvironment=environment.current!==revision
  environment.current=revision
  const destination=flowShapes(plan)
  const settle=()=>{
   if(generation.current!==ticket)return
   shown.current=plan;setDisplay(plan);paint(destination);phase.current='idle';setMoving(false)
  }
  if(!measured.current||!fontsReady||changedEnvironment||reduced||frame.mode!=='wide'){
   settle();return
  }
  if(driving){phase.current='paused';setMoving(false);return}
  if(shown.current.layout===target&&phase.current==='idle'){paint(destination);return}
  const source=current.current
  const canvas=document.createElement('canvas').getContext('2d')!
  const keep=new Set<CellId>(['emergency'])
  for(const id of ids.filter(id=>id!=='emergency')){
   if(!sameSlot(shown.current.cells[id],plan.cells[id]))continue
   const r=plan.cells[id].slot
   const corners=[[r.left-4,r.top-4],[r.left+r.width+4,r.top-4],[r.left+r.width+4,r.top+r.height+4],[r.left-4,r.top+r.height+4]]
   if(Array.from({length:25},(_,i)=>sampleFlowShapes(source,destination,i/24)[id]).every(shape=>shape&&corners.every(([x,y])=>canvas.isPointInPath(new Path2D(shape.path),x-shape.bounds.left,y-shape.bounds.top))))keep.add(id)
  }
  for(const id of keep)if(shown.current.cells[id].visible)body(id).style.opacity='1'
  const fade=ids.filter(id=>!keep.has(id))
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
  for(const id of ids){
   const node=body(id),cell=display.cells[id]
   node.inert=!cell.visible;node.setAttribute('aria-hidden',String(!cell.visible))
   node.style.opacity=cell.visible?'1':'0'
  }
  const decoration=host.current?.querySelector<HTMLElement>('.fs-call-decoration')
  if(decoration)decoration.style.opacity='1'
  if(!transaction||transaction.generation!==generation.current)return
  commit.current=null
  const nodes=transaction.fade.filter(id=>display.cells[id].visible&&display.layout!=='calm').map(body)
  if(decoration)nodes.push(decoration)
  const calm=host.current?.querySelector<HTMLElement>('.fs-calm')
  if(calm)nodes.push(calm)
  gsap.set(nodes,{opacity:0})
  const tl=gsap.timeline({onComplete:()=>{if(transaction.generation===generation.current){phase.current='idle';setMoving(false)}}})
  tween.current=tl
  tl.to(nodes,{opacity:1,duration:reduced?0:.36,ease:'power2.out'})
  return()=>{tl.kill()}
 },[display,reduced])
 useEffect(()=>{onPlan?.(display)},[display,onPlan])
 useEffect(()=>{
  if(!moving&&display.layout===target&&!driving)callback.current?.()
 },[display,target,moving,driving,onSettled])
 useEffect(()=>()=>{generation.current++;tween.current?.kill()},[])
 useEffect(()=>{
  const element=host.current!;gsap.set(element,{'--fs-light':0,'--fs-chroma':0})
  if(reduced||driving)return
  const tl=gsap.timeline().to(element,{'--fs-light':.95,'--fs-chroma':1,duration:.7,ease:'power2.out'})
   .to(element,{'--fs-light':.68,duration:1.2,ease:'sine.inOut'},'+=.35')
   .to(element,{'--fs-light':0,'--fs-chroma':0,duration:1.4,ease:'power2.inOut'},'+=.6')
  return()=>{tl.kill()}
 },[notificationKey,reduced,driving])
 useLayoutEffect(()=>{
  const emergency=plan.cells.emergency.shape
  const dashboard=host.current?.closest<HTMLElement>('.fs-dashboard')
  dashboard?.style.setProperty('--flow-call-reserve',`${frame.mode==='wide'?0:emergency?size.height-emergency.bounds.top:0}px`)
 },[plan,frame.mode,size.height])
 const calm=display.layout==='calm',quiet=reduced||driving,priority=layoutPriority[target]
 return <div className="fs-board-wrap"><div ref={host} className="fs-board" data-testid="flow-board" data-layout={display.layout} data-target={target} data-moving={moving} data-profile={frame.mode} data-stack={false} data-quiet={quiet} style={{'--fs-calm-size':`${Math.min(size.width,size.height)*.77}px`} as CSSProperties}>
  {ids.map(id=>{
   const cell=display.cells[id],r=cell.slot,visible=cell.visible&&!calm
   const style:CSSProperties={left:0,top:0,width:r.width,height:r.height,transform:`translate(${r.left}px, ${r.top}px)`}
   return <CareSurface key={id} data-cell={id} data-cell-visible={visible} data-compact={cell.variant==='summary'} data-priority={id===priority} data-lit={id===priority||id==='emergency'} tone={id==='guide'?'safety':id==='emergency'?'call':'plain'} shape={frame.mode==='document'?undefined:emptyShape} interactiveMaterial className="fs-cell">
    <div className="fs-cell-body" hidden={!visible} data-scroll={cell.scroll} data-slot-x={r.left} data-slot-y={r.top} style={style} aria-hidden={!visible} inert={!visible}>{renderCell(id,cell.variant==='summary')}</div>
   </CareSurface>
  })}
  {calm&&<div className="fs-calm"><div className="fs-breath"/><div className="fs-calm-copy"><ShieldCheck aria-hidden="true"/><span>기록 전송 완료</span><h2>천천히 숨을 내쉬세요</h2><p>필요할 때 기록을 다시 확인할 수 있어요.</p></div></div>}
 </div>{readout&&<div className="fs-layout-readout" aria-live="polite"><span>{calm?'완료':`${ids.filter(id=>display.cells[id].visible).length} cells`}</span><span>{driving?'주행 중 · 움직임 정지':moving?'배치 전환 중':'배치 유지'}</span><span>{ids.filter(id=>display.cells[id].visible).map(id=>`${titles[id]} ${Math.round((display.cells[id].shape?.areaFraction??0)*100)}%`).join(' · ')}</span></div>}</div>
}
