import {useEffect,useLayoutEffect,useMemo,useRef,useState,type Dispatch,type CSSProperties} from 'react'
import {gsap} from 'gsap'
import {CustomEase} from 'gsap/CustomEase'
import {AnimatePresence,motion} from 'motion/react'
import {Check,FileText,Phone,Send,ShieldCheck} from 'lucide-react'
import {CareAction,CareSpectrum,CareSurface} from '@/components/ui/after-care'
import {flowCells,layoutPriority,layoutWeights,type CellId,type Weights} from './flow-geometry'
import {checklistLabels,layoutFor,type FlowEvent,type FlowLayout,type FlowState} from './flow-study-model'

gsap.registerPlugin(CustomEase)
const breathEase=CustomEase.create('flow-breath','.65,0,.35,1')
const titles:Record<CellId,string>={guide:'안전 확보',record:'사고 기록',insurer:'보험사 전달',emergency:'긴급 통화'}
function CellContent({id,state,compact,dispatch}:{id:CellId;state:FlowState;compact:boolean;dispatch:Dispatch<FlowEvent>}){
 const noteDialog=useRef<HTMLDialogElement>(null)
 if(id==='emergency')return <><div className="fs-cell-label"><span>긴급 통화</span><Phone aria-hidden="true"/></div><div className="fs-call-number">119</div><p>{state.call==='connected'?'통화 연결됨':state.call==='ended'?'통화 종료':'연결 준비'}</p>{!compact&&<><CareSpectrum active={state.call==='connected'&&!state.driving}/><small>구호 접수 미확인</small></>}</>
 if(id==='guide')return <><div className="fs-cell-label"><span>안전 확보</span><span>{state.checks.filter(Boolean).length} / 4</span></div>{!compact&&<div className="fs-check-track" aria-hidden="true">{state.checks.map((done,i)=><i key={i} data-done={done}/>)}</div>}<h2>{state.step>=4?'안전한 곳에 도착했어요':state.step===3?'안전한 곳으로 이동하세요':'먼저, 안전을 확인하세요'}</h2>{state.step===3&&!compact?<div className="fs-checklist" role="group" aria-label="안전 확인 항목">{checklistLabels.map((label,index)=><label key={label}><input type="checkbox" checked={state.checks[index]} disabled={state.driving} onChange={()=>dispatch({type:'CHECK',index})}/><span>{label}</span></label>)}</div>:!compact&&<p className="fs-cell-muted">{state.step>=4?'사용자가 도착을 확인했어요.':'주변 상황을 살피고 119의 안내를 들어주세요.'}</p>}</>
 if(id==='record')return <><div className="fs-cell-label"><FileText aria-hidden="true"/><span>사고 기록</span></div><h2>{state.step>=6?'기록 확인됨':state.step>=5?'기억나는 내용을 남겨요':'확인된 내용부터'}</h2>{!compact&&<><p className="fs-record-excerpt">{state.step>=5?state.note:'영상 · 사진 · 음성\n필요한 기록을 한곳에 모아요.'}</p><div className="fs-record-status"><span><Check aria-hidden="true"/>영상</span><span><Check aria-hidden="true"/>사진</span><span>{state.step>=6?'내용 확인':'확인 전'}</span></div></>}</>
 const sent=state.transfer==='sent',failed=state.transfer==='failed',sending=state.transfer==='sending'
 return <><div className="fs-cell-label"><Send aria-hidden="true"/><span>보험사 전달</span></div><h2>{sent?'전송했어요':failed?'전송되지 않았어요':sending?'기록을 보내고 있어요':'보낼 내용을 확인하세요'}</h2>{!compact&&<><p className="fs-cell-muted">{sent?'보험사 접수 여부는 아직 확인되지 않았어요.':failed?'기록은 그대로 남아 있어요. 다시 보낼 수 있어요.':sending?'확인한 사고 기록을 전달하고 있어요.':'사고 기록과 첨부 자료를 함께 전달해요.'}</p>{state.step===6&&!sending&&<><p className="fs-record-excerpt fs-review-excerpt">{state.note}</p><CareAction secondary disabled={state.driving} onClick={()=>{noteDialog.current?.showModal();noteDialog.current?.querySelector('h2')?.focus()}}>보낼 내용 전체 보기</CareAction><dialog ref={noteDialog} className="fs-note-dialog" aria-label="보험사에 보낼 내용"><h2 tabIndex={-1}>보험사에 보낼 내용</h2><p>{state.note}</p><CareAction secondary onClick={()=>noteDialog.current?.close()}>닫기</CareAction></dialog></>}<div className="fs-send-state" data-state={state.transfer}>{sending?<i className="fs-spinner"/>:<ShieldCheck aria-hidden="true"/>}<span>{sent?'전송 성공':failed?'기록 유지됨':sending?'전송 중':'전송 전'}</span></div>{sent&&state.call==='connected'&&<p className="fs-call-held">119 통화는 계속 유지돼요.</p>}</>}</>
}

export function FlowBoard({state,reduced,dispatch}:{state:FlowState;reduced:boolean;dispatch:Dispatch<FlowEvent>}){
 const target=layoutFor(state),host=useRef<HTMLDivElement>(null)
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
  if(state.driving){setQueued(target!==shownRef.current);return}
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
 },[target,state.driving,reduced,stack])
 useEffect(()=>{
  const element=host.current!;gsap.set(element,{'--fs-light':0,'--fs-chroma':0})
  if(reduced||state.driving)return
  const tl=gsap.timeline().to(element,{'--fs-light':.95,'--fs-chroma':1,duration:.7,ease:'power2.out'})
   .to(element,{'--fs-light':.68,duration:1.2,ease:'sine.inOut'},'+=.35')
   .to(element,{'--fs-light':0,'--fs-chroma':0,duration:1.4,ease:'power2.inOut'},'+=.6')
  return()=>{tl.kill()}
 },[state.step,state.call,state.transfer,reduced,state.driving])
 const cells=useMemo(()=>flowCells(shown,size.width,size.height,weights),[shown,size,weights])
 const calm=shown==='calm',quiet=reduced||state.driving
 const priority=layoutPriority[target]
 return <div className="fs-board-wrap"><div ref={host} className="fs-board" data-testid="flow-board" data-layout={shown} data-target={target} data-moving={moving} data-stack={stack} data-quiet={quiet} style={{'--fs-board-height':`${size.height}px`} as CSSProperties}>
  <AnimatePresence initial={false} mode="sync">{calm?<motion.div key="calm" className="fs-calm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:quiet?0:.36}}><motion.div className="fs-breath" initial={{borderRadius:'20%',scale:.92}} animate={{borderRadius:'50%',scale:quiet?1:[1,1.045,1]}} transition={{borderRadius:{duration:quiet?0:1.6},scale:{duration:quiet?0:4,repeat:quiet?0:Infinity,ease:[.65,0,.35,1]}}}/><div className="fs-calm-copy"><ShieldCheck aria-hidden="true"/><span>기록 전송 완료</span><h2>천천히 숨을 내쉬세요</h2><p>필요할 때 기록을 다시 확인할 수 있어요.</p></div></motion.div>:cells.map(cell=>{
   const b=cell.bounds,r=cell.content,compact=r.width<155||r.height<(cell.id==='emergency'?260:205)||(cell.id!==priority&&cell.id!=='emergency')
   const visible=stack||(r.width>90&&r.height>70)
   const style:CSSProperties=stack?{}:{left:b.left,top:b.top,width:b.width,height:b.height}
   const shape=stack?undefined:{left:0,top:0,width:b.width,height:b.height,path:cell.path}
   const bodyStyle:CSSProperties=stack?{}:{left:r.left-b.left,top:r.top-b.top,width:r.width,height:r.height,'--fs-number-size':`${Math.max(36,Math.min(110,r.height*.42,r.width*.6))}px`} as CSSProperties
   return <CareSurface key={cell.id} data-cell={cell.id} data-compact={compact&&!stack} data-priority={cell.id===priority} data-lit={cell.id===priority||cell.id==='emergency'} tone={cell.id==='guide'?'safety':cell.id==='emergency'?'call':'plain'} shape={shape} interactiveMaterial className="fs-cell" style={style}>
    <motion.div className="fs-cell-body" style={bodyStyle} initial={false} animate={{opacity:visible?(moving&&!quiet ? .12 : 1):0}} transition={{duration:quiet?0:.36}} aria-hidden={!visible} inert={!visible}><CellContent id={cell.id} state={state} compact={compact&&!stack} dispatch={dispatch}/></motion.div>
   </CareSurface>
  })}</AnimatePresence>
 </div><div className="fs-layout-readout" aria-live="polite"><span>{calm?'완료':`${cells.length} cells`}</span><span>{state.driving?'주행 중 · 움직임 정지':queued?'다음 배치 대기':moving?'배치 전환 중':'배치 유지'}</span><span>{cells.map(c=>`${titles[c.id]} ${Math.round(c.areaFraction*100)}%`).join(' · ')}</span></div></div>
}
