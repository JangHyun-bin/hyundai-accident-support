import {useReducedMotionPreference} from '@/design-system/motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, FileText, Phone, Send } from 'lucide-react'
import { CareAction, CareSpectrum, CareStatus } from '@/components/ui/after-care'
import { VehicleShell } from '@/components/ui/after-care-layout'
import { FlowBoard } from '@/design-system/FlowBoard'
import { SurroundingsScene } from '@/design-system/SurroundingsStudy'
import { useFlowFrame } from '@/design-system/flow-contract'
import { stageLabels } from '@/design-system/flow-study-model'
import {JourneyRiskNotice} from './VehiclePanel'
import { vehicleContourState } from './vehicle-state'
import { activeRequest, guideCopy, hasJourneyRecord, journeyFlow, noUrgentDanger, safetyChecklist, safetyConfirmed, sceneCopy, type FlowScene, type ResponseStep } from './journey-flow'
import type { CaseCommand, Device, JourneyCase, Stage } from './case'
import type { VehicleHandoff } from '@/product/vehicle-handoff'
import { VehicleHandoffPanel } from '@/product/VehicleHandoffPanel'
import { GuidanceControl, GuidanceMuteToggle } from '@/audio/GuidanceControl'
import flowVoices from '@/audio/journey-flow-guidance.json'
import '@/design-system/flow-study.css'
import './journey-flow.css'

const stepVoice: Partial<Record<FlowScene, string>> = flowVoices

const callLabels = { connecting: '연결 중', connected: '통화 중', ended: '통화 종료' }

export function JourneyFlow({ value, device, active, onCommand, onNavigate, onReview, recordWorkspace, reviewWorkspace, previewHeight, controls, handoff }: {
  recordWorkspace:ReactNode;reviewWorkspace:ReactNode;previewHeight?:number;controls?:ReactNode;handoff?:VehicleHandoff
  value: JourneyCase; device: Device; active:boolean; onCommand: (command: CaseCommand) => void
  onNavigate: (stage: Stage) => Promise<boolean>; onReview: () => void
}) {
  const [responseView, setResponseView] = useState<ResponseStep | null>(null)
  const [showSentReview, setShowSentReview] = useState(false)
  const [pendingEditor, setPendingEditor] = useState<'record' | 'review' | 'response' | null>(null)
  const flow = useRef<HTMLElement>(null)
  const composing = useRef(false)
  const deferredAction = useRef<(() => void) | null>(null)
  const revealFromController = useRef(false)
  const [contextVisible,setContextVisible]=useState(false)
  const reduced = !!useReducedMotionPreference()
  const { step: actualStep, scene: caseScene, layout, guide, path, call, arrived, request, sending, next: nextView, back: previousView } = journeyFlow(value, responseView)
  const rescue = activeRequest(value, 'rescue')
  const checks = safetyChecklist.filter(item => safetyConfirmed(value, item.id)).length
  const receipt = request?.status === 'received'
  const inspectingSent = actualStep === 7 && showSentReview
  const step = inspectingSent ? 6 : actualStep
  const scene: FlowScene = inspectingSent ? 'sent-review' : caseScene
  const copy = sceneCopy[scene]
  const phoneProgress = handoff?.state.kind === 'connected' ? handoff.state.progress.record : null
  const phoneRecord = !!phoneProgress && (phoneProgress.photos + phoneProgress.audio + phoneProgress.video > 0 || phoneProgress.statement !== 'empty' || phoneProgress.report !== 'empty')
  const blocked = copy.blocked && !(scene === 'record-empty' && phoneRecord)
  const reviewVisible = step === 6 && !sending || inspectingSent
  useEffect(() => {
    setPendingEditor(active ? value.stage === 'record' ? 'record' : reviewVisible ? 'review' : 'response' : null)
    if (!active || value.stage === 'response') {
      composing.current=false
      deferredAction.current=null
      if(flow.current)flow.current.dataset.composing='false'
    }
  }, [active, value.stage, reviewVisible, step])
  async function next() {
    revealFromController.current=!!flow.current?.querySelector('.journey-flow-actions button:focus')
    const now = new Date().toISOString()
    if (inspectingSent) setShowSentReview(false)
    else if (scene === 'sending') result('sent')
    else if (scene === 'calling') { if (rescue) onCommand({ type: 'request-result', caseId: value.id, agency: 'rescue', submissionId: rescue.id, status: 'connected', externalReceipt: null, now }) }
    else if (nextView === 'record') await onNavigate('record')
    else if (nextView) {
      if (scene === 'move') onCommand({ type: 'safety-action', action: { id: 'safe-arrival', label: '안전한 곳 도착', status: 'user-confirmed', source: 'user', confirmedAt: now } })
      setResponseView(nextView)
    }
    else if (step === 5) await onNavigate('review')
    else if (request && (scene === 'review-ready' || scene === 'review-failed')) onCommand({ type: 'transport-start', caseId: value.id, submissionId: request.id, retryId: request.transport === 'failed' ? crypto.randomUUID() : undefined, now })
    else if (step === 6) { onReview(); setPendingEditor('review') }
    else if (step === 7) await onNavigate('follow-up')
  }
  async function back() {
    revealFromController.current=!!flow.current?.querySelector('.journey-flow-actions button:focus')
    if(actualStep===7&&!inspectingSent){setShowSentReview(true);onReview();setPendingEditor('review');return}
    setShowSentReview(false)
    setPendingEditor(null)
    if (step > 5) await onNavigate('record')
    else if (step === 5) { if (await onNavigate('response')) setResponseView(4) }
    else if (previousView) setResponseView(previousView)
  }
  function startCall() {
    if (value.stage !== 'response') void onNavigate('response')
    onCommand({ type: 'contact-start', now: new Date().toISOString() })
    setResponseView(2)
  }
  function answerNoUrgentDanger() {
    onCommand({ type: 'safety-action', action: { ...noUrgentDanger, status: 'user-confirmed', source: 'user', confirmedAt: new Date().toISOString() } })
    setResponseView(3)
  }
  const result = (status: 'sent' | 'failed') => request && onCommand({ type: 'transport-result', caseId: value.id, submissionId: request.id, status, now: new Date().toISOString() })
  function afterComposition(action:()=>void) {
    if(composing.current)deferredAction.current=action
    else action()
  }
  function revealEditor() {
    if (!pendingEditor || composing.current) return
    const editor = flow.current?.querySelector<HTMLElement>(pendingEditor==='response' ? '.fs-step-copy' : `#journey-${pendingEditor}-editor`)
    if (!editor?.getClientRects().length || editor.closest('[hidden], [inert]')) return
    const heading = [...editor.querySelectorAll<HTMLElement>('h1')].find(node => node.getClientRects().length && !node.closest('[hidden], [inert]'))
    if (!heading) return
    if (!editor.contains(document.activeElement)) heading.focus({ preventScroll: true })
    const bounds=heading.getBoundingClientRect()
    if(revealFromController.current&&pendingEditor!=='response'&&(bounds.top<0||bounds.bottom>innerHeight))heading.scrollIntoView({block:'nearest',inline:'nearest'})
    revealFromController.current=false
    setPendingEditor(null)
  }

  const controller=<div className="journey-flow-header">
    <ol className="fs-stages" aria-label="사고 대응 진행">{stageLabels.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} data-done={index + 1 < step && !(index === 1 && path !== 'call')}><span>{String(index + 1).padStart(2, '0')}</span>{label}</li>)}</ol>
    <div className="fs-action-bar"><div className="fs-step-copy" aria-live="polite"><span className="fs-step-label">{step} / 7 · {stageLabels[step - 1]}</span><h1 tabIndex={-1}>{copy.title}</h1><p>{copy.support}</p>{active && stepVoice[scene] && <GuidanceControl text={stepVoice[scene]} contextKey={`journey-flow/${value.id}/${scene}`} />}</div><section className="journey-flow-actions" aria-label="여정 조작">
      <CareAction secondary aria-label="이전 단계" disabled={step === 1 || scene === 'sending'} onClick={() => afterComposition(()=>void back())}><ArrowLeft aria-hidden="true" />이전</CareAction>
      <CareAction data-testid="journey-primary" aria-label={copy.demo ? `다음 · 시연 event: ${copy.action}` : '다음 단계'} aria-describedby="journey-next-action" disabled={blocked} onClick={() => afterComposition(()=>void next())}>다음<ArrowRight aria-hidden="true" /></CareAction>
      <span id="journey-next-action" className="journey-next-action">{copy.demo ? `시연: ${copy.action}` : copy.action}</span>
      <details className="journey-flow-options" onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus()}}}><summary>시연 설정</summary><div className="journey-flow-options-panel" onClick={event=>{if(event.target instanceof Element&&event.target.closest('button')){const focused=event.currentTarget.contains(document.activeElement),details=event.currentTarget.closest('details')!;details.open=false;if(focused)details.querySelector('summary')?.focus({preventScroll:true})}}}>
        <p className="journey-display-reference">Connect Standard · 2560 × 1440 · 16:9</p>
        <GuidanceMuteToggle />
        {controls}
        <section className="journey-flow-events" aria-label="대표 흐름 결과 시연"><span>결과 시연 · 실제 전화·전송 없음</span><span>주변 경로·사고 재생은 합성 시연. 저장된 사고 영상과 별개예요.</span>
          {rescue && (call === 'connecting' || call === 'connected') && <button aria-label="시연 event: 통화 종료 확인" onClick={() => onCommand({ type: 'call-end', caseId:value.id, submissionId:rescue.id, now: new Date().toISOString() })}>통화 종료 확인</button>}
          {sending && <button aria-label="시연 event: 보험사 전송 실패" onClick={() => result('failed')}>보험사 전송 실패</button>}
          {actualStep === 7 && <button onClick={() => { setShowSentReview(!showSentReview); if (!showSentReview) { onReview(); setPendingEditor('review') } }}>{inspectingSent ? '완료 화면으로' : '전송 내역과 공유 보기'}</button>}
        </section>
      </div></details>
    </section></div>
  </div>

  return <section ref={flow} className="journey-flow" data-testid="journey-flow" data-step={step} data-call={call} data-transfer={request?.transport ?? request?.status ?? 'idle'}
    onCompositionStartCapture={()=>{composing.current=true;if(flow.current)flow.current.dataset.composing='true'}}
    onCompositionEndCapture={()=>{composing.current=false;if(flow.current)flow.current.dataset.composing='false';const action=deferredAction.current;deferredAction.current=null;if(action)queueMicrotask(action)}}>
    <VehicleShell device={device} presentation="bounded" controls={controller} previewHeight={previewHeight}><JourneyDashboard contextVisible={contextVisible} onContext={()=>afterComposition(()=>setContextVisible(!contextVisible))}>
      <div className="journey-flow-risk"><JourneyRiskNotice value={value} onCommand={onCommand}/></div>
      <div className="journey-flow-scene"><SurroundingsScene bounded active={active} vehicle={vehicleContourState(value)} /></div>
      <FlowBoard layout={inspectingSent ? 'review' : layout} notificationKey={[step, call, request?.transport, receipt, checks, arrived, inspectingSent].join('/')} reduced={reduced||!active} readout={false} persistentCells onSettled={revealEditor} renderCell={(id, compact) => {
        if (id === 'emergency') return <><div className="fs-call-core"><div className="fs-cell-label"><span>119 긴급 통화</span><Phone aria-hidden="true" /></div>{call === 'idle' ? <CareAction onClick={() => afterComposition(startCall)}>119에 연결</CareAction> : <><p>{callLabels[call]}</p><CareStatus tone={rescue?.status === 'received' ? 'confirmed' : 'unknown'}>{rescue?.status === 'received' ? '구호 접수 확인' : '구호 접수 미확인'}</CareStatus></>}</div>{!compact && <div className="fs-call-decoration" aria-hidden="true"><div className="fs-call-number">119</div><CareSpectrum active={call === 'connected'} /></div>}</>
        if (id === 'guide') return <><div className="fs-cell-label"><span>안전 확보</span><span>{checks} / 4</span></div>{compact ? <p className="journey-cell-summary">{arrived ? '안전한 곳에 있음' : '이동 전'}</p> : <><h2>{guideCopy[guide].title}</h2><p className="fs-cell-muted">{guideCopy[guide].note}</p></>}{step === 3 && <div className="fs-checklist" role="group" aria-label="안전 확인 항목">{safetyChecklist.map(item => <label key={item.id}><input type="checkbox" checked={safetyConfirmed(value, item.id)} disabled={value.safetyActions.find(action=>action.id===item.id)?.status==='device-confirmed'} onChange={event => onCommand({ type: 'safety-action', action: { ...item, status: event.target.checked ? 'user-confirmed' : 'unknown', source: 'user', confirmedAt: event.target.checked ? new Date().toISOString() : null } })} /><span>{item.label}</span></label>)}</div>}{!compact && step === 1 && <CareAction aria-pressed={path === 'clear'} onClick={() => afterComposition(answerNoUrgentDanger)}>급한 위험은 없어요</CareAction>}{!compact && scene === 'call-ended' && <CareAction onClick={() => afterComposition(startCall)}>119에 다시 연결</CareAction>}</>
        if (id === 'record') return <><div id="journey-record-editor" className="journey-flow-workspace" data-flow-content hidden={step!==5||compact}>{recordWorkspace}</div><div hidden={step===5&&!compact}><div className="fs-cell-label"><FileText aria-hidden="true" /><span>사고 기록</span></div>{compact ? <p className="journey-cell-summary">{hasJourneyRecord(value)||phoneRecord?'기록 있음':'기록 전'}</p> : <h2>{hasJourneyRecord(value)||phoneRecord ? '남긴 기록이 있어요' : '기억나는 것부터 남기면 돼요'}</h2>}{!compact && <><p className="fs-cell-muted">이야기 {value.statements.filter(item => item.text.trim()).length}개 · 자료 {value.evidence.filter(item => item.availability === 'available').length}개</p><p className="fs-cell-muted">{value.statements.find(item => item.text.trim())?.text || '아직 남긴 기록이 없어요.'}</p></>}{handoff && handoff.state.kind !== 'idle' && <VehicleHandoffPanel handoff={handoff} compact />}</div></>
        return <><div id="journey-review-editor" className="journey-flow-workspace" data-flow-content hidden={!reviewVisible||compact}>{reviewWorkspace}</div><div hidden={reviewVisible&&!compact}><div className="fs-cell-label"><Send aria-hidden="true" /><span>보험사 전달</span></div>{compact ? <p className="journey-cell-summary">{step===7?'전송 완료':request?.transport==='failed'?'전송 실패':sending?'전송 중':'전송 전'}</p> : <h2>{step === 7 ? '보험사에 보냈어요' : request?.transport === 'failed' ? '기록은 그대로 있어요' : sending ? '기록을 보내고 있어요' : '보낼 내용을 확인해요'}</h2>}<CareStatus tone={receipt ? 'confirmed' : 'unknown'}>{receipt ? '보험사 접수 확인' : '보험사 접수 미확인'}</CareStatus>{!compact && <><p className="fs-cell-muted">{request?.recipient ?? '받는 곳과 보낼 자료는 직접 고를 수 있어요.'}</p><p className="fs-cell-muted">{request?.payload?.statements.map(item => item.text).join('\n') ?? ''}</p>{step === 7 && call === 'connected' && <p className="fs-call-held">119 통화는 계속 연결돼 있어요.</p>}</>}</div></>
      }} />
    </JourneyDashboard></VehicleShell>

  </section>
}

function JourneyDashboard({contextVisible,onContext,children}:{contextVisible:boolean;onContext:()=>void;children:ReactNode}) {
  const frame=useFlowFrame()
  const single=frame?.mode==='narrow'||frame?.mode==='mobile'
  return <div className="fs-dashboard journey-flow-dashboard" data-context={single&&contextVisible?'scene':'task'}>
    <CareAction secondary className="journey-context-toggle" hidden={!single} aria-pressed={contextVisible} onClick={onContext}>{contextVisible?'현재 작업 보기':'차량 주변 보기'}</CareAction>
    {children}
  </div>
}
