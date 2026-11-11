import {useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode,type CSSProperties} from 'react'
import {gsap} from 'gsap'
import {CustomEase} from 'gsap/CustomEase'
import {AnimatePresence,motion} from 'motion/react'
import {ShieldCheck} from 'lucide-react'
import {CareSurface} from '@/components/ui/after-care'
import {flowCells,layoutPriority,layoutWeights,type CellId,type Weights} from './flow-geometry'
import {type FlowLayout} from './flow-study-model'

gsap.registerPlugin(CustomEase)
const breathEase=CustomEase.create('flow-breath','.65,0,.35,1')
const titles:Record<CellId,string>={guide:'안전 확보',record:'사고 기록',insurer:'보험사 전달',emergency:'긴급 통화'}

export function FlowBoard({layout:target,notificationKey,reduced,driving=false,renderCell,readout=true}:{layout:FlowLayout;notificationKey:string;reduced:boolean;driving?:boolean;renderCell:(id:CellId,compact:boolean)=>ReactNode;readout?:boolean}){
 const host=useRef<HTMLDivElement>(null)
 const [size,setSize]=useState({width:680,height:650}),[stack,setStack]=useState(false)
 const [shown,setShown]=useState<FlowLayout>(target),[moving,setMoving]=useState(false),[queued,setQueued]=useState(false)
 const weightsRef=useRef<Weights>({...layoutWeights[target]}),[weights,setWeights]=useState<Weights>({...weightsRef.current})
 const lastStart=useRef(-Infinity),shownRef=useRef(target),activeTween=useRef<gsap.core.Tween|null>(null)
 useLayoutEffect(()=>{
  const element=host.current!
  const measure=()=>{const width=element.clientWidth,font=parseFloat(getComputedStyle(document.documentElement).fontSize);setSize({width,height:width*1184/1236});setStack(width<540||font>20)}
  const ro=new ResizeObserver(measure);ro.observe(element);ro.observe(document.documentElement);measure();return()=>ro.disconnect()
 },[])
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  activeTween.current?.kill();activeTween.current=null
  if(driving){setQueued(target!==shownRef.current);return}
  const immediate=reduced||stack
  if(immediate){Object.assign(weightsRef.current,layoutWeights[target]);setWeights({...weightsRef.current});setShown(target);shownRef.current=target;setMoving(false);setQueued(false);return}
  if(target===shownRef.current&&!moving){setQueued(false);return}
  const run=()=>{
   setQueued(false);lastStart.current=performance.now();setMoving(true)
   // An interrupted morph starts from its current weights; only the newest target survives.
   const leavingCalm=shownRef.current==='calm'
   if(leavingCalm){setShown(target);shownRef.current=target}
   activeTween.current=gsap.to(weightsRef.current,{...layoutWeights[target],duration:target==='calm'?1.6:1.2,ease:breathEase,
    onUpdate:()=>setWeights({...weightsRef.current}),onComplete:()=>{setShown(target);shownRef.current=target;setMoving(false);activeTween.current=null}})
  }
  const wait=Math.max(0,4000-(performance.now()-lastStart.current))
  if(wait){setQueued(true);timer=setTimeout(run,wait)}else run()
  return()=>{clearTimeout(timer);activeTween.current?.kill();activeTween.current=null}
  // `moving` describes the same transition and must not restart its effect.
 },[target,driving,reduced,stack])
 useEffect(()=>{
  const element=host.current!;gsap.set(element,{'--fs-light':0,'--fs-chroma':0})
  if(reduced||driving)return
  const tl=gsap.timeline().to(element,{'--fs-light':.95,'--fs-chroma':1,duration:.7,ease:'power2.out'})
   .to(element,{'--fs-light':.68,duration:1.2,ease:'sine.inOut'},'+=.35')
   .to(element,{'--fs-light':0,'--fs-chroma':0,duration:1.4,ease:'power2.inOut'},'+=.6')
  return()=>{tl.kill()}
 },[notificationKey,reduced,driving])
 useLayoutEffect(()=>{
  if(stack||moving)return
  const frame=requestAnimationFrame(()=>{
   const bodies=host.current?.querySelectorAll<HTMLElement>('.fs-cell-body')
   if(bodies&&[...bodies].some(body=>body.scrollHeight>body.clientHeight+1||body.scrollWidth>body.clientWidth+1))setStack(true)
  })
  return()=>cancelAnimationFrame(frame)
 },[target,notificationKey,moving,size,stack])
 const cells=useMemo(()=>flowCells(shown,size.width,size.height,weights),[shown,size,weights])
 const calm=shown==='calm',quiet=reduced||driving
 const priority=layoutPriority[target]
 return <div className="fs-board-wrap"><div ref={host} className="fs-board" data-testid="flow-board" data-layout={shown} data-target={target} data-moving={moving} data-stack={stack} data-quiet={quiet} style={{'--fs-board-height':`${size.height}px`} as CSSProperties}>
  <AnimatePresence initial={false} mode="sync">{calm?<motion.div key="calm" className="fs-calm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:quiet?0:.36}}><motion.div className="fs-breath" initial={{borderRadius:'20%',scale:.92}} animate={{borderRadius:'50%',scale:quiet?1:[1,1.045,1]}} transition={{borderRadius:{duration:quiet?0:1.6},scale:{duration:quiet?0:4,repeat:quiet?0:Infinity,ease:[.65,0,.35,1]}}}/><div className="fs-calm-copy"><ShieldCheck aria-hidden="true"/><span>기록 전송 완료</span><h2>천천히 숨을 내쉬세요</h2><p>필요할 때 기록을 다시 확인할 수 있어요.</p></div></motion.div>:cells.map(cell=>{
   const b=cell.bounds,r=cell.content,compact=r.width<155||r.height<(cell.id==='emergency'?260:205)||(cell.id!==priority&&cell.id!=='emergency')
   const visible=stack||(r.width>90&&r.height>70)
   const style:CSSProperties=stack?{}:{left:b.left,top:b.top,width:b.width,height:b.height}
   const shape=stack?undefined:{left:0,top:0,width:b.width,height:b.height,path:cell.path}
   const bodyStyle:CSSProperties=stack?{}:{left:r.left-b.left,top:r.top-b.top,width:r.width,height:r.height,'--fs-number-size':`${Math.max(36,Math.min(110,r.height*.42,r.width*.6))}px`} as CSSProperties
   return <CareSurface key={cell.id} data-cell={cell.id} data-compact={compact&&!stack} data-priority={cell.id===priority} data-lit={cell.id===priority||cell.id==='emergency'} tone={cell.id==='guide'?'safety':cell.id==='emergency'?'call':'plain'} shape={shape} interactiveMaterial className="fs-cell" style={style}>
    <motion.div className="fs-cell-body" style={bodyStyle} initial={false} animate={{opacity:visible?(moving&&!quiet ? .12 : 1):0}} transition={{duration:quiet?0:.36}} aria-hidden={!visible} inert={!visible}>{renderCell(cell.id,compact&&!stack)}</motion.div>
   </CareSurface>
  })}</AnimatePresence>
 </div>{readout&&<div className="fs-layout-readout" aria-live="polite"><span>{calm?'완료':`${cells.length} cells`}</span><span>{driving?'주행 중 · 움직임 정지':queued?'다음 배치 대기':moving?'배치 전환 중':'배치 유지'}</span><span>{cells.map(c=>`${titles[c.id]} ${Math.round(c.areaFraction*100)}%`).join(' · ')}</span></div>}</div>
}
