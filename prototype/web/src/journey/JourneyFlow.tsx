import {useReducedMotionPreference} from '@/design-system/motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, FileText, Phone } from 'lucide-react'
import { CareAction, CareSpectrum, CareStatus } from '@/components/ui/after-care'
import { VehicleShell, type AppWindow } from '@/components/ui/after-care-layout'
import { FlowBoard } from '@/design-system/FlowBoard'
import { stageLabels, type CellId } from '@/design-system/flow-study-model'
import { VehicleDetailCell, VehicleSceneCell } from './VehicleCells'
import { vehicleNeedsAttention } from './vehicle-state'
import { activeRequest, journeyFlow, noUrgentDanger, safetyChecklist, safetyConfirmed, sceneCopy, urgentDanger, type FlowScene, type ResponseStep } from './journey-flow'
import { acknowledgeRisks, type CaseCommand, type Device, type JourneyCase, type SafetyAction, type Stage } from './case'
import type { VehicleHandoff } from '@/product/vehicle-handoff'
import { VehicleHandoffPanel } from '@/product/VehicleHandoffPanel'
import { GuidanceControl, GuidanceMuteToggle } from '@/audio/GuidanceControl'
import flowVoices from '@/audio/journey-flow-guidance.json'
import { dial119, hostDemo, inPleosApp } from '@/host/pleos-host'
import { HostDemoStrip } from '@/host/HostDemoStrip'
import '@/design-system/flow-study.css'
import './journey-flow.css'

const stepVoice: Partial<Record<FlowScene, string>> = flowVoices

const callLabels = { connecting: '연결 중', connected: '통화 중', ended: '통화 종료' }
const guideTasks: Partial<Record<FlowScene, { title: string; note: string }>> = {
  situation: { title: '다친 사람이나 위험한 상황이 있나요?', note: '연기나 불꽃, 기름 냄새가 나거나 다친 사람이 있으면 알려 주세요.' },
  'situation-airbag': { title: '에어백이 펼쳐졌어요', note: '다친 사람이 없는지 먼저 살펴보세요. 도움이 필요하면 119에 연결하세요.' },
  emergency: { title: '119에 연결할 수 있어요', note: '다친 사람은 억지로 움직이지 마세요. 불이나 연기가 보이면 차에서 멀리 떨어지세요.' },
  calling: { title: '119에 연결하고 있어요', note: '연결되면 다친 사람과 지금 위치를 알려 주세요.' },
  call: { title: '통화하며 주변을 살펴보세요', note: '움직일 수 있으면 안전한 곳으로 이동하세요.' },
  'call-ended': { title: '119 통화가 끝났어요', note: '도움이 더 필요하면 다시 연결할 수 있어요.' },
  move: { title: '안전한 곳으로 이동하세요', note: '차가 다니지 않는 곳으로 피하세요.' },
  ready: { title: '안전한 곳에 머물러 주세요', note: '이제 기억나는 내용을 남길 수 있어요.' },
  'risk-check': { title: '주변을 다시 살펴보세요', note: '차 주변이 안전한지 확인해 주세요. 남기던 기록은 그대로 있어요.' },
  'record-empty': { title: '어떻게 부딪혔나요?', note: '말로 하거나 사진을 찍어 두세요. 지금 어려우면 나중에 해도 돼요.' },
  record: { title: '남긴 내용을 확인할 수 있어요', note: '더 남길 내용이 없으면 보험사에 보낼 내용을 골라요.' },
  sending: { title: '기록을 보내고 있어요', note: '보내는 동안에도 기록과 통화는 그대로 유지돼요.' },
  sent: { title: '보험사에 기록을 보냈어요', note: '접수 결과는 보험사 연락으로 확인해요.' },
  received: { title: '보험사에 기록을 보냈어요', note: '보험사 접수가 확인됐어요.' },
}

export function JourneyFlow({ value, device, active, onCommand, onNavigate, onReview, recordWorkspace, reviewWorkspace, previewHeight, controls, handoff, appWindow }: {
  recordWorkspace:ReactNode;reviewWorkspace:ReactNode;previewHeight?:number;controls?:ReactNode;handoff?:VehicleHandoff;appWindow?:AppWindow
  value: JourneyCase; device: Device; active:boolean; onCommand: (command: CaseCommand) => void
  onNavigate: (stage: Stage) => Promise<boolean>; onReview: () => void
}) {
  const [responseView, setResponseView] = useState<ResponseStep | null>(null)
  const [showSentReview, setShowSentReview] = useState(false)
  const [pendingEditor, setPendingEditor] = useState<'record' | 'review' | 'response' | null>(null)
  const [dialFailed, setDialFailed] = useState(false)
  const flow = useRef<HTMLElement>(null)
  const composing = useRef(false)
  const deferredAction = useRef<(() => void) | null>(null)
  const revealFromController = useRef(false)
  const reduced = !!useReducedMotionPreference()
  const { step: actualStep, scene: caseScene, layout, emergency, call, arrived, request, sending, next: nextView, back: previousView } = journeyFlow(value, responseView)
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
    else if (scene === 'review-declined') await onNavigate('follow-up')
    else if (step === 6) { onReview(); setPendingEditor('review') }
    else if (step === 7) await onNavigate('follow-up')
  }
  async function back() {
    revealFromController.current=!!flow.current?.querySelector('.journey-flow-actions button:focus')
    if(actualStep===7&&!inspectingSent){showSent();return}
    setShowSentReview(false)
    setPendingEditor(null)
    if (step > 5) await onNavigate('record')
    else if (step === 5) { if (await onNavigate('response')) setResponseView(4) }
    else if (previousView) setResponseView(previousView)
  }
  function startCall() {
    const dialed = dial119(), failed = dialed === 'unavailable' || dialed === 'rejected'
    setDialFailed(failed)
    if (failed) return
    if (value.stage !== 'response') void onNavigate('response')
    onCommand({ type: 'contact-start', now: new Date().toISOString() })
    setResponseView(2)
  }
  function answerSituation(answer: typeof noUrgentDanger | typeof urgentDanger) {
    const now = new Date().toISOString(), other = answer === urgentDanger ? noUrgentDanger : urgentDanger
    const action = (target: typeof answer, status: SafetyAction['status']): CaseCommand => ({ type: 'safety-action', action: { ...target, status, source: 'user', confirmedAt: status === 'user-confirmed' ? now : null } })
    if (value.stage !== 'response') void onNavigate('response')
    onCommand(action(answer, 'user-confirmed'))
    if (safetyConfirmed(value, other.id)) onCommand(action(other, 'unknown'))
    setResponseView(answer === urgentDanger ? 2 : arrived ? 4 : 3)
  }
  function showSent() {
    setShowSentReview(true)
    onReview()
    setPendingEditor('review')
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

  const act = (label: string, action: () => void, secondary = false, disabled = false) => <CareAction secondary={secondary} disabled={disabled} onClick={() => afterComposition(action)}>{label}</CareAction>
  function guideTask(compact: boolean): ReactNode {
    const airbag = scene === 'situation-airbag'
    const task = guideTasks[scene.startsWith('situation') && !airbag ? 'situation' : scene]
    const evacuate = () => setResponseView(arrived ? 4 : 3)
    const actions: { label: string; run: () => void; secondary?: boolean; disabled?: boolean }[] = scene.startsWith('situation')
      ? [{ label: airbag ? '다친 사람은 없어요' : '급한 위험은 없어요', run: () => answerSituation(noUrgentDanger) }, { label: '다친 사람이 있거나 위험해요', run: () => answerSituation(urgentDanger), secondary: true }]
      : scene === 'emergency' ? [{ label: '안전한 곳으로 이동할게요', run: evacuate, secondary: true }]
      : scene === 'calling' || scene === 'call' || scene === 'call-ended' ? [{ label: '대피 안내 보기', run: evacuate, secondary: true }]
      : scene === 'move' ? [{ label: '안전한 곳에 있어요', run: () => void next() }]
      : scene === 'ready' ? [{ label: '기록 시작', run: () => void next() }]
      : scene === 'risk-check' ? [{ label: '주변을 확인했어요', run: () => acknowledgeRisks(value, new Date().toISOString()).forEach(onCommand) },
        ...emergency ? [] : [{ label: '다친 사람이 있거나 위험해요', run: () => answerSituation(urgentDanger), secondary: true }]]
      : step === 5 ? [...blocked ? [{ label: '나중에 기록할게요', run: () => void onNavigate('follow-up'), secondary: true }] : [], { label: '남긴 내용 확인', run: () => void next(), disabled: blocked }]
      : scene === 'sent' || scene === 'received' ? [{ label: '다음 할 일 보기', run: () => void next() }, { label: '보낸 내용 보기', run: showSent, secondary: true }]
      : []
    const label = <div className="fs-cell-label"><span>{step === 3 || step === 4 ? '안전 확보' : stageLabels[step - 1]}</span>{(step === 3 || step === 4) && <span>{checks} / 4</span>}</div>
    if (compact) return <div className="journey-cell-compact">
      <div>{label}<p className="journey-cell-summary">{task?.title ?? copy.title}</p></div>
      {actions[0] && act(actions[0].label, actions[0].run, actions[0].secondary, actions[0].disabled)}
    </div>
    return <>
      {label}
      {(step === 3 || step === 4) && <div className="fs-check-track" aria-hidden="true">{safetyChecklist.map(item => <i key={item.id} data-done={safetyConfirmed(value, item.id)} />)}</div>}
      {task && <div className="journey-guide-copy" role={scene === 'risk-check' ? 'alert' : undefined}><h2>{task.title}</h2><p className="fs-cell-muted">{task.note}</p></div>}
      {scene === 'move' && <div className="fs-checklist" role="group" aria-label="안전 확인 항목">{safetyChecklist.map(item => <label key={item.id}><input type="checkbox" checked={safetyConfirmed(value, item.id)} disabled={value.safetyActions.find(action=>action.id===item.id)?.status==='device-confirmed'} onChange={event => onCommand({ type: 'safety-action', action: { ...item, status: event.target.checked ? 'user-confirmed' : 'unknown', source: 'user', confirmedAt: event.target.checked ? new Date().toISOString() : null } })} /><span>{item.label}</span></label>)}</div>}
      {scene === 'sending' && <CareStatus tone="pending">보내는 중</CareStatus>}
      {(scene === 'sent' || scene === 'received') && <CareStatus tone={receipt ? 'confirmed' : 'unknown'}>{receipt ? '보험사 접수 확인' : '보험사 접수 미확인'}</CareStatus>}
      {actions.length > 0 && <div className="journey-cell-choices">{actions.map(action => <CareAction key={action.label} secondary={action.secondary} disabled={action.disabled} onClick={() => afterComposition(action.run)}>{action.label}</CareAction>)}</div>}
      {!emergency && scene !== 'risk-check' && (step === 3 || step === 4 || step === 5 || step === 7) && <button type="button" className="journey-text-action journey-escalate" onClick={() => afterComposition(() => answerSituation(urgentDanger))}>다친 사람이 있거나 위험해요</button>}
    </>
  }
  function recordSummary(compact: boolean): ReactNode {
    const available = value.evidence.filter(item => item.availability === 'available')
    const count = (kind: string) => available.filter(item => item.kind === kind).length
    const statements = value.statements.filter(item => item.text.trim())
    const samples = available.some(item => item.origin === 'sample')
    const saved = statements.length + available.length + (value.diagram ? 1 : 0)
    const label = <div className="fs-cell-label"><span>사고 내용 기록 중</span><FileText aria-hidden="true" /></div>
    if (compact) {
      const phone = handoff?.state.kind === 'connected' ? handoff.state.progress.phone.online ? '휴대폰 연결됨' : '휴대폰 응답 없음' : handoff?.state.kind === 'pairing' ? '휴대폰 연결 대기' : null
      return <div className="journey-cell-compact"><div>{label}<p className="journey-cell-summary">{[saved ? `남긴 기록 ${saved}건` : '아직 남긴 기록이 없어요', phone].filter(Boolean).join(' · ')}</p></div></div>
    }
    const rows = [
      { id: 'statements', label: '말로 남긴 이야기', value: statements.length ? `${statements.length}개` : '없음' },
      { id: 'photos', label: '사진', value: count('photo') ? `${count('photo')}장` : '없음' },
      { id: 'audio', label: '음성', value: count('audio') ? `${count('audio')}개` : '없음' },
      ...count('video') ? [{ id: 'video', label: '영상', value: `${count('video')}개${samples ? ' · 시연 자료' : ''}` }] : [],
      ...value.diagram ? [{ id: 'diagram', label: '사고 도식', value: value.diagram.origin === 'fixture' ? '시연 자료' : '있음' }] : [],
    ]
    const own = statements[0]?.text
    return <>
      {label}
      <h2>{saved || phoneRecord ? '남긴 기록이 있어요' : '아직 남긴 기록이 없어요'}</h2>
      <dl className="journey-record-rows" aria-label="저장된 기록">{rows.map(row => <div key={row.id} data-record={row.id}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
      {handoff && <VehicleHandoffPanel handoff={handoff} compact />}
      {own && <div className="journey-record-own"><small>직접 남긴 내용</small><p>{own}</p></div>}
      {step === 6 && !sending && !inspectingSent && act('기록 더 남기기', () => void onNavigate('record'), true)}
    </>
  }
  function renderCell(id: CellId, compact: boolean): ReactNode {
    if (id === 'emergency') return <><div className="fs-call-core"><div className="fs-cell-label"><span>119 긴급 통화</span><Phone aria-hidden="true" /></div>{call === 'idle' ? act('119에 연결', startCall) : <><p>{callLabels[call]}</p><CareStatus tone={rescue?.status === 'received' ? 'confirmed' : 'unknown'}>{rescue?.status === 'received' ? '구호 접수 확인' : '구호 접수 미확인'}</CareStatus>{call === 'ended' && act('119에 다시 연결', startCall, true)}</>}{dialFailed && <div role="alert"><CareStatus tone="failed">차에서 전화를 열 수 없어요. 휴대폰으로 119에 전화해 주세요.</CareStatus></div>}</div>{!compact && <div className="fs-call-decoration" aria-hidden="true"><div className="fs-call-number">119</div><CareSpectrum active={call === 'connected'} /></div>}</>
    if (id === 'guide') return <>
      <div id="journey-review-editor" className="journey-flow-workspace" data-flow-content hidden={!reviewVisible || compact}>{reviewWorkspace}</div>
      {reviewVisible && !compact && scene !== 'review' && <div className="journey-cell-choices">{act(copy.action, () => void next())}</div>}
      <div className="journey-guide-task" hidden={reviewVisible && !compact}>{guideTask(compact)}</div>
    </>
    if (id === 'record') return <>
      <div id="journey-record-editor" className="journey-flow-workspace" data-flow-content hidden={step !== 5 || compact}>{recordWorkspace}</div>
      <div className="journey-record-summary" hidden={step === 5 && !compact}>{recordSummary(compact)}</div>
    </>
    if (id === 'scene') return <VehicleSceneCell value={value} compact={compact} active={active} />
    return <VehicleDetailCell value={value} compact={compact} />
  }

  const guidance = active && stepVoice[scene] && <GuidanceControl text={stepVoice[scene]} contextKey={`journey-flow/${value.id}/${scene}`} />
  const flowEvents = <section className="journey-flow-events" aria-label="대표 흐름 결과 시연"><span>결과 시연 · 실제 전화·전송 없음</span><span>주변 경로·사고 재생은 합성 시연. 저장된 사고 영상과 별개예요.</span>
    {rescue && (call === 'connecting' || call === 'connected') && <button aria-label="시연 event: 통화 종료 확인" onClick={() => onCommand({ type: 'call-end', caseId:value.id, submissionId:rescue.id, now: new Date().toISOString() })}>통화 종료 확인</button>}
    {sending && <button aria-label="시연 event: 보험사 전송 실패" onClick={() => result('failed')}>보험사 전송 실패</button>}
    {actualStep === 7 && <button onClick={() => { if (showSentReview) setShowSentReview(false); else showSent() }}>{inspectingSent ? '완료 화면으로' : '전송 내역과 공유 보기'}</button>}
  </section>
  const controller=<div className="journey-flow-header">
    <ol className="fs-stages" aria-label="사고 대응 진행">{stageLabels.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} data-done={index + 1 < step && !(index === 1 && !emergency && call === 'idle')}><span>{String(index + 1).padStart(2, '0')}</span>{label}</li>)}</ol>
    <div className="fs-action-bar"><div className="fs-step-copy" aria-live="polite"><span className="fs-step-label">{step} / 7 · {stageLabels[step - 1]}</span><h1 tabIndex={-1}>{copy.title}</h1><p>{copy.support}</p>{guidance}</div><section className="journey-flow-actions" aria-label="여정 조작">
      <CareAction secondary aria-label="이전 단계" disabled={step === 1 || scene === 'sending'} onClick={() => afterComposition(()=>void back())}><ArrowLeft aria-hidden="true" />이전</CareAction>
      <CareAction data-testid="journey-primary" aria-label={copy.demo ? `다음 · 시연 event: ${copy.action}` : '다음 단계'} aria-describedby="journey-next-action" disabled={blocked} onClick={() => afterComposition(()=>void next())}>다음<ArrowRight aria-hidden="true" /></CareAction>
      <span id="journey-next-action" className="journey-next-action">{copy.demo ? `시연: ${copy.action}` : copy.action}</span>
      <details className="journey-flow-options" onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus()}}}><summary>시연 설정</summary><div className="journey-flow-options-panel" onClick={event=>{if(event.target instanceof Element&&event.target.closest('button')){const focused=event.currentTarget.contains(document.activeElement),details=event.currentTarget.closest('details')!;details.open=false;if(focused)details.querySelector('summary')?.focus({preventScroll:true})}}}>
        <p className="journey-display-reference">Connect Standard · 2560 × 1440 · 앱 화면 1682 × 1210</p>
        <GuidanceMuteToggle />
        {controls}
        {flowEvents}
      </div></details>
    </section></div>
  </div>

  return <section ref={flow} className="journey-flow" data-testid="journey-flow" data-step={step} data-call={call} data-emergency={emergency} data-transfer={request?.transport ?? request?.status ?? 'idle'}
    onCompositionStartCapture={()=>{composing.current=true;if(flow.current)flow.current.dataset.composing='true'}}
    onCompositionEndCapture={()=>{composing.current=false;if(flow.current)flow.current.dataset.composing='false';const action=deferredAction.current;deferredAction.current=null;if(action)queueMicrotask(action)}}>
    <VehicleShell device={device} presentation="bounded" controls={controller} previewHeight={previewHeight} appWindow={appWindow}><div className="fs-dashboard journey-flow-dashboard">
      <FlowBoard layout={inspectingSent ? 'review' : layout} emergencyActive={emergency} attention={vehicleNeedsAttention(value) ? ['vehicle'] : []} notificationKey={[step, call, emergency, request?.transport, receipt, checks, arrived, inspectingSent, scene === 'risk-check'].join('/')} reduced={reduced||!active} readout={false} onSettled={revealEditor} renderCell={renderCell} />
      {inPleosApp && <div className="host-guidance">{guidance}</div>}
    </div></VehicleShell>
    {inPleosApp && hostDemo && <HostDemoStrip>
      {copy.demo && <button type="button" aria-label={`시연 event: ${copy.action}`} onClick={() => afterComposition(() => void next())}>{copy.action}</button>}
      <GuidanceMuteToggle />
      {controls}
      {flowEvents}
    </HostDemoStrip>}
  </section>
}
