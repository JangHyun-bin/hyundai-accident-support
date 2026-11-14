import {useReducedMotionPreference} from '@/design-system/motion'
import {useEffect,useReducer,useRef,useState,type Dispatch} from 'react'
import {MotionConfig} from 'motion/react'
import {ArrowLeft,ArrowRight,PhoneOff,RotateCcw,Check,FileText,Phone,Send,ShieldCheck} from 'lucide-react'
import {CareAction,CareSurface,CareSpectrum} from '@/components/ui/after-care'
import {VehicleShell} from '@/components/ui/after-care-layout'
import {CareVehicleContour,type VehicleContourState} from '@/components/ui/vehicle-contour'
import {FlowBoard} from './FlowBoard'
import {flowReducer,initialFlow,layoutFor,layoutLabels,stageLabels,stepCopy,checklistLabels,type FlowState,type FlowEvent} from './flow-study-model'
import type {FlowPlan} from './flow-contract'
import type {CellId} from './flow-geometry'
import './flow-study.css'

function StudyCellContent({id,state,compact,dispatch}:{id:CellId;state:FlowState;compact:boolean;dispatch:Dispatch<FlowEvent>}){
 const noteDialog=useRef<HTMLDialogElement>(null)
 if(id==='emergency')return <><div className="fs-call-core"><div className="fs-cell-label"><span>119 긴급 통화</span><Phone aria-hidden="true"/></div><p>{state.call==='connected'?'통화 연결됨':state.call==='ended'?'통화 종료':'연결 준비'}</p><small>구호 접수 미확인</small></div>{!compact&&<div className="fs-call-decoration" aria-hidden="true"><div className="fs-call-number">119</div><CareSpectrum active={state.call==='connected'&&!state.driving}/></div>}</>
 if(compact&&id==='guide')return <><div className="fs-cell-label">안전 확보</div><p className="fs-summary-status">{state.step>=4?'도착 확인':'안내 확인'}</p></>
 if(compact&&id==='record')return <><div className="fs-cell-label">사고 기록</div><p className="fs-summary-status">{state.step>=6?'기록 확인됨':'기록 준비'}</p></>
 if(compact&&id==='insurer')return <><div className="fs-cell-label">보험사 전달</div><p className="fs-summary-status">보험사 접수 미확인</p></>
 if(id==='guide')return <><div className="fs-cell-label"><span>안전 확보</span><span>{state.checks.filter(Boolean).length} / 4</span></div>{!compact&&<div className="fs-check-track" aria-hidden="true">{state.checks.map((done,i)=><i key={i} data-done={done}/>)}</div>}<h2>{state.step>=4?'안전한 곳에 도착했어요':state.step===3?'안전한 곳으로 이동하세요':'먼저, 안전을 확인하세요'}</h2>{state.step===3&&!compact?<div className="fs-checklist" role="group" aria-label="안전 확인 항목">{checklistLabels.map((label,index)=><label key={label}><input type="checkbox" checked={state.checks[index]} disabled={state.driving} onChange={()=>dispatch({type:'CHECK',index})}/><span>{label}</span></label>)}</div>:!compact&&<p className="fs-cell-muted">{state.step>=4?'사용자가 도착을 확인했어요.':'주변 상황을 살피고 119의 안내를 들어주세요.'}</p>}</>
 if(id==='record')return <><div className="fs-cell-label"><FileText aria-hidden="true"/><span>사고 기록</span></div><h2>{state.step>=6?'기록 확인됨':state.step>=5?'기억나는 내용을 남겨요':'확인된 내용부터'}</h2>{!compact&&<><p className="fs-record-excerpt">{state.step>=5?state.note:'영상 · 사진 · 음성\n필요한 기록을 한곳에 모아요.'}</p><div className="fs-record-status"><span><Check aria-hidden="true"/>영상</span><span><Check aria-hidden="true"/>사진</span><span>{state.step>=6?'내용 확인':'확인 전'}</span></div></>}</>
 const sent=state.transfer==='sent',failed=state.transfer==='failed',sending=state.transfer==='sending'
 return <><div className="fs-cell-label"><Send aria-hidden="true"/><span>보험사 전달</span></div><h2>{sent?'전송했어요':failed?'전송되지 않았어요':sending?'기록을 보내고 있어요':'보낼 내용을 확인하세요'}</h2>{!compact&&<><p className="fs-cell-muted">{sent?'보험사 접수 여부는 아직 확인되지 않았어요.':failed?'기록은 그대로 남아 있어요. 다시 보낼 수 있어요.':sending?'확인한 사고 기록을 전달하고 있어요.':'사고 기록과 첨부 자료를 함께 전달해요.'}</p>{state.step===6&&!sending&&<><p className="fs-record-excerpt fs-review-excerpt">{state.note}</p><CareAction secondary disabled={state.driving} onClick={()=>{noteDialog.current?.showModal();noteDialog.current?.querySelector('h2')?.focus()}}>보낼 내용 전체 보기</CareAction><dialog ref={noteDialog} className="fs-note-dialog" aria-label="보험사에 보낼 내용"><h2 tabIndex={-1}>보험사에 보낼 내용</h2><p>{state.note}</p><CareAction secondary onClick={()=>noteDialog.current?.close()}>닫기</CareAction></dialog></>}<div className="fs-send-state" data-state={state.transfer}>{sending?<i className="fs-spinner"/>:<ShieldCheck aria-hidden="true"/>}<span>{sent?'전송 성공':failed?'기록 유지됨':sending?'전송 중':'전송 전'}</span></div>{sent&&state.call==='connected'&&<p className="fs-call-held">119 통화는 계속 유지돼요.</p>}</>}</>
}


export function FlowStudy(){
 const [state,dispatch]=useReducer(flowReducer,undefined,initialFlow)
 const [plan,setPlan]=useState<FlowPlan|null>(null)
 const [vehicleOpen,setVehicleOpen]=useState(false)
 const [fail,setFail]=useState(false),[reducePreview,setReducePreview]=useState(false),[resetKey,setResetKey]=useState(0)
 const prefersReduced=useReducedMotionPreference(),reduced=!!prefersReduced||reducePreview
 const failureAtSend=useRef(false),resultTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const copy=state.step===2&&state.call==='ended'?{...stepCopy[2],title:'통화가 종료됐어요',support:'계속해서 안전 확보 안내를 확인하세요.'}:stepCopy[state.step],sending=state.transfer==='sending'
 useEffect(()=>{
  document.title='흐름과 공간 · AFTER / CARE'
  let alive=true,frame=0
  document.fonts.ready.then(()=>{if(alive)frame=requestAnimationFrame(()=>document.querySelector('.fs-study .ac-vehicle')?.scrollIntoView({block:'start'}))})
  return()=>{alive=false;cancelAnimationFrame(frame)}
 },[])
 useEffect(()=>{
  if(!sending)return
  resultTimer.current=setTimeout(()=>dispatch({type:'RESULT',ok:!failureAtSend.current}),2400)
  return()=>{if(resultTimer.current)clearTimeout(resultTimer.current);resultTimer.current=null}
 },[sending,resetKey])
 function reset(){if(resultTimer.current)clearTimeout(resultTimer.current);dispatch({type:'RESET'});setResetKey(n=>n+1)}
 function act(){
  if(state.step===7){reset();return}
  if(state.step===3){dispatch({type:'CONFIRM_SAFE'});return}
  if(state.step===6){failureAtSend.current=fail;dispatch({type:'SEND'});return}
  dispatch({type:'NEXT'})
 }
 const vehicle:VehicleContourState={direction:'우측 전방',directionNote:'예시 자료',hazard:{value:state.checks[0]?'켜짐':'미확인',tone:state.checks[0]?'confirmed':'unknown',source:state.checks[0]?'직접 확인':undefined},trunk:{value:'미확인',tone:'unknown'},mobility:{value:'가능 여부 미확인',tone:'unknown'}}
 const locked=state.driving&&state.step!==1
 return <MotionConfig reducedMotion={reduced||state.driving?'always':'user'}><main className="ac-system fs-study" data-testid="flow-study" data-step={state.step} data-transfer={state.transfer} data-quiet={reduced||state.driving}>
  <header className="fs-heading"><div><a href="/?study=design-system"><ArrowLeft size={15}/>AFTER / CARE</a><h1>흐름에 맞춰, 공간도 함께.</h1></div><p>Stage / Layout preview<span>실제 전화·전송 없는 시연</span></p></header>
  <VehicleShell presentation="bounded" controls={<div className="fs-flow-header">  <ol className="fs-stages" aria-label="사고 대응 진행">{stageLabels.map((label,i)=><li key={label} aria-current={state.step===i+1?'step':undefined} data-done={i+1<state.step}><span>{String(i+1).padStart(2,'0')}</span>{label}</li>)}</ol>
  <div className="fs-action-bar"><div className="fs-step-copy" aria-live="polite"><span className="fs-step-label">{String(state.step).padStart(2,'0')} / 07 · {stageLabels[state.step-1]}</span><h2>{state.transfer==='failed'?'전송되지 않았어요':sending?'기록을 보내고 있어요':copy.title}</h2><p data-testid="flow-step-support">{state.driving?'주행 중에는 119 통화만 조작할 수 있어요.':state.transfer==='failed'?'작성한 내용은 유지돼요. 다시 보내주세요.':sending?'전송 결과를 기다리고 있어요.':copy.support}</p></div><CareAction data-testid="flow-primary" disabled={locked||sending||(state.step===5&&!state.note.trim())} onClick={act}>{sending?'전송 중':state.transfer==='failed'?'다시 보내기':copy.action}{!sending&&<ArrowRight aria-hidden="true"/>}</CareAction></div>
</div>}>
<div className="fs-dashboard" data-context={vehicleOpen?'scene':'workspace'}>
   <CareAction secondary className="fs-context-toggle" aria-pressed={vehicleOpen} onClick={()=>setVehicleOpen(open=>!open)}>{vehicleOpen?'작업으로 돌아가기':'차량 상태 보기'}</CareAction>
   <CareSurface className="fs-vehicle"><CareVehicleContour state={vehicle}/></CareSurface>
   <div className="fs-response"><FlowBoard readout={false} onPlan={setPlan} key={resetKey} layout={layoutFor(state)} notificationKey={[state.step,state.call,state.transfer].join('/')} driving={state.driving} reduced={reduced} renderCell={(id,compact)=><StudyCellContent id={id} compact={compact} state={state} dispatch={dispatch}/>}/></div>
  </div></VehicleShell>
  <section className="fs-controls" aria-label="시연 설정"><div className="fs-control-actions"><CareAction secondary aria-label="이전 단계" disabled={state.step===1||sending||state.driving} onClick={()=>dispatch({type:'BACK'})}><ArrowLeft aria-hidden="true"/>이전</CareAction><CareAction secondary onClick={reset} aria-label="처음부터"><RotateCcw aria-hidden="true"/>처음부터</CareAction><CareAction secondary disabled={state.call!=='connected'} onClick={()=>dispatch({type:'END_CALL'})} aria-label="통화 종료 시연"><PhoneOff aria-hidden="true"/>통화 종료</CareAction></div><div className="fs-control-options"><label><input type="checkbox" checked={fail} disabled={sending} onChange={e=>setFail(e.target.checked)}/>전송 실패 시연</label><label><input type="checkbox" checked={state.driving} onChange={e=>dispatch({type:'DRIVING',value:e.target.checked})}/>주행 중 시연</label><label><input type="checkbox" checked={reduced} disabled={!!prefersReduced} onChange={e=>setReducePreview(e.target.checked)}/>움직임 줄이기</label></div><div className="fs-mapping"><span>현재 연결</span><strong>Global {state.step} · {layoutLabels[layoutFor(state)]}</strong><span>Checklist {state.checks.filter(Boolean).length}/4</span>{plan&&<span>{Object.values(plan.cells).filter(cell=>cell.visible).map(cell=>`${cell.id} ${Math.round((cell.shape?.areaFraction??0)*100)}%`).join(' · ')}</span>}</div>
   {state.step===5&&<label className="fs-note">시연할 기록<textarea className="ac-field" aria-label="시연할 기록" rows={3} maxLength={500} value={state.note} disabled={state.driving} onChange={e=>dispatch({type:'EDIT',note:e.target.value})}/><span>{state.note.length} / 500 · 내용 확인 후 다음 단계로 이동</span></label>}
  </section>
 </main></MotionConfig>
}
