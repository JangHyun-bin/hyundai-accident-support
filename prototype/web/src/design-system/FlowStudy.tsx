import {useEffect,useReducer,useRef,useState} from 'react'
import {MotionConfig,useReducedMotion} from 'motion/react'
import {ArrowLeft,ArrowRight,PhoneOff,RotateCcw} from 'lucide-react'
import {CareAction,CareSurface} from '@/components/ui/after-care'
import {VehicleShell} from '@/components/ui/after-care-layout'
import {CareVehicleContour,type VehicleContourState} from '@/components/ui/vehicle-contour'
import {SurfaceThemeProvider,defaultSurfaceTheme} from './SurfaceTheme'
import {FlowBoard} from './FlowBoard'
import {flowReducer,initialFlow,layoutFor,layoutLabels,stageLabels,stepCopy} from './flow-study-model'
import './flow-study.css'

// Preview keeps Figma's semantic roles without changing the user's saved product theme.
const figmaTheme={call:defaultSurfaceTheme.safety,safety:defaultSurfaceTheme.call}
export function FlowStudy(){
 const [state,dispatch]=useReducer(flowReducer,undefined,initialFlow)
 const [fail,setFail]=useState(false),[reducePreview,setReducePreview]=useState(false),[resetKey,setResetKey]=useState(0)
 const prefersReduced=useReducedMotion(),reduced=!!prefersReduced||reducePreview
 const failureAtSend=useRef(false),resultTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const copy=state.step===2&&state.call==='ended'?{...stepCopy[2],title:'통화가 종료됐어요',support:'계속해서 안전 확보 안내를 확인하세요.'}:stepCopy[state.step],sending=state.transfer==='sending'
 useEffect(()=>{document.title='흐름과 공간 · AFTER / CARE'},[])
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
 const vehicle:VehicleContourState={direction:'우측 전방',directionNote:'예시 자료',hazard:{value:state.checks[0]?'켜짐':'미확인',tone:state.checks[0]?'confirmed':'unknown',source:state.checks[0]?'사용자 확인':undefined},trunk:{value:'미확인',tone:'unknown'},mobility:{value:'가능 여부 미확인',tone:'unknown'}}
 const locked=state.driving&&state.step!==1
 return <SurfaceThemeProvider value={figmaTheme}><MotionConfig reducedMotion={reduced||state.driving?'always':'user'}><main className="ac-system fs-study" data-testid="flow-study" data-step={state.step} data-transfer={state.transfer} data-quiet={reduced||state.driving}>
  <header className="fs-heading"><div><a href="/?study=design-system"><ArrowLeft size={15}/>AFTER / CARE</a><h1>흐름에 맞춰, 공간도 함께.</h1></div><p>Stage / Layout preview<span>실제 전화·전송 없는 시연</span></p></header>
  <ol className="fs-stages" aria-label="사고 대응 진행">{stageLabels.map((label,i)=><li key={label} aria-current={state.step===i+1?'step':undefined} data-done={i+1<state.step}><span>{String(i+1).padStart(2,'0')}</span>{label}</li>)}</ol>
  <div className="fs-action-bar"><div className="fs-step-copy" aria-live="polite"><span className="fs-step-label">{String(state.step).padStart(2,'0')} / 07 · {stageLabels[state.step-1]}</span><h2>{state.transfer==='failed'?'전송되지 않았어요':sending?'기록을 보내고 있어요':copy.title}</h2><p data-testid="flow-step-support">{state.driving?'주행 중에는 119 통화만 조작할 수 있어요.':state.transfer==='failed'?'작성한 내용은 유지돼요. 다시 보내주세요.':sending?'전송 결과를 기다리고 있어요.':copy.support}</p></div><CareAction data-testid="flow-primary" disabled={locked||sending||(state.step===5&&!state.note.trim())} onClick={act}>{sending?'전송 중':state.transfer==='failed'?'다시 보내기':copy.action}{!sending&&<ArrowRight aria-hidden="true"/>}</CareAction></div>
  <VehicleShell><div className="fs-dashboard">
   <CareSurface className="fs-vehicle"><CareVehicleContour state={vehicle}/></CareSurface>
   <div className="fs-response"><FlowBoard key={resetKey} state={state} reduced={reduced} dispatch={dispatch}/></div>
  </div></VehicleShell>
  <section className="fs-controls" aria-label="시연 설정"><div className="fs-control-actions"><CareAction secondary aria-label="이전 단계" disabled={state.step===1||sending||state.driving} onClick={()=>dispatch({type:'BACK'})}><ArrowLeft aria-hidden="true"/>이전</CareAction><CareAction secondary onClick={reset} aria-label="처음부터"><RotateCcw aria-hidden="true"/>처음부터</CareAction><CareAction secondary disabled={state.call!=='connected'} onClick={()=>dispatch({type:'END_CALL'})} aria-label="통화 종료 시연"><PhoneOff aria-hidden="true"/>통화 종료</CareAction></div><div className="fs-control-options"><label><input type="checkbox" checked={fail} disabled={sending} onChange={e=>setFail(e.target.checked)}/>전송 실패 시연</label><label><input type="checkbox" checked={state.driving} onChange={e=>dispatch({type:'DRIVING',value:e.target.checked})}/>주행 중 시연</label><label><input type="checkbox" checked={reduced} disabled={!!prefersReduced} onChange={e=>setReducePreview(e.target.checked)}/>움직임 줄이기</label></div><div className="fs-mapping"><span>현재 연결</span><strong>Global {state.step} · {layoutLabels[layoutFor(state)]}</strong><span>Checklist {state.checks.filter(Boolean).length}/4</span></div>
   {state.step===5&&<label className="fs-note">시연할 기록<textarea className="ac-field" aria-label="시연할 기록" rows={3} maxLength={500} value={state.note} disabled={state.driving} onChange={e=>dispatch({type:'EDIT',note:e.target.value})}/><span>{state.note.length} / 500 · 내용 확인 후 다음 단계로 이동</span></label>}
  </section>
 </main></MotionConfig></SurfaceThemeProvider>
}
