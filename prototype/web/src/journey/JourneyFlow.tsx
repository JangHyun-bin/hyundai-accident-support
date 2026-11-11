import { useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, FileText, Phone, Send } from 'lucide-react'
import { CareAction, CareSpectrum, CareStatus } from '@/components/ui/after-care'
import { VehicleShell } from '@/components/ui/after-care-layout'
import { FlowBoard } from '@/design-system/FlowBoard'
import { SurroundingsScene } from '@/design-system/SurroundingsStudy'
import { stageLabels } from '@/design-system/flow-study-model'
import {JourneyRiskNotice} from './VehiclePanel'
import { vehicleContourState } from './vehicle-state'
import { activeRequest, hasJourneyRecord, journeyFlow, safetyChecklist, safetyConfirmed, type ResponseStep } from './journey-flow'
import type { CaseCommand, Device, JourneyCase, Stage } from './case'
import '@/design-system/flow-study.css'
import './journey-flow.css'

export function JourneyFlow({ value, device, active, onCommand, onNavigate, onReview, recordWorkspace, reviewWorkspace }: {
  recordWorkspace:ReactNode;reviewWorkspace:ReactNode;
  value: JourneyCase; device: Device; active:boolean; onCommand: (command: CaseCommand) => void
  onNavigate: (stage: Stage) => Promise<boolean>; onReview: () => void
}) {
  const [responseView, setResponseView] = useState<ResponseStep | null>(null)
  const [showSentReview, setShowSentReview] = useState(false)
  const [pendingEditor, setPendingEditor] = useState<'record' | 'review' | null>(null)
  const flow = useRef<HTMLElement>(null)
  const reduced = !!useReducedMotion()
  const { step, layout, request, sending, call } = journeyFlow(value, responseView)
  const rescue = activeRequest(value, 'rescue')
  const checks = safetyChecklist.filter(item => safetyConfirmed(value, item.id)).length
  const arrived = safetyConfirmed(value, 'safe-arrival')
  const readyToSend = request?.transport === 'approved' || request?.transport === 'failed'
  const receipt = request?.status === 'received'
  const inspectingSent = step === 7 && showSentReview
  const reviewVisible = step === 6 && !sending || inspectingSent
  const callLabel = { idle: '연결 전', connecting: '연결 확인 중', connected: '통화 연결됨', ended: '통화 종료' }[call]
  const titles = ['차량 상태를 확인하고 119에 연결하세요', '119의 안내를 들어주세요', '안전한 곳으로 이동하세요', '안전한 곳에서 기록을 남겨요', '기억나는 내용을 남겨주세요', '보험사에 보낼 내용을 확인하세요', '기록 전송을 완료했어요']
  const action = sending ? '전송 중' : step === 1 ? call === 'connecting' ? '연결 확인 기다리는 중' : call === 'idle' ? '119 연결 요청' : '통화 상태 확인'
    : step === 2 ? '대피 안내 보기' : step === 3 ? '안전한 곳에 도착했어요' : step === 4 ? '기록 시작'
    : step === 5 ? '내용 확인으로' : step === 6 ? request?.transport === 'failed' ? '승인한 내용 다시 보내기' : readyToSend ? '승인한 내용 전송 시작' : '수신처와 보낼 범위 확인' : '후속 처리로'
  const title = step === 2 && call === 'ended' ? '통화가 종료됐어요' : sending ? '승인한 기록을 보내고 있어요' : request?.transport === 'failed' && step === 6 ? '전송되지 않았어요' : titles[step - 1]
  const support = sending ? '전송 결과를 기다리는 동안 기록과 통화는 유지돼요.' : step === 7 ? receipt ? '보험사 접수가 확인됐어요.' : '전송 완료 · 보험사 접수 미확인'
    : step === 3 ? `안전 checklist ${checks}/4 · 도착 확인은 별도예요.` : step === 5 ? '말·사진·직접 입력으로 남긴 기록을 확인할 수 있어요.'
    : step === 6 ? '수신처와 보낼 범위를 직접 확인해요. 실패한 요청은 승인했던 내용 그대로 다시 보내요.' : '확인되지 않은 차량 상태는 미확인으로 유지해요.'

  async function next() {
    if (step === 1) {
      if (call === 'idle') onCommand({ type: 'contact-start', now: new Date().toISOString() })
      else if (call !== 'connecting') setResponseView(2)
    } else if (step === 2) setResponseView(3)
    else if (step === 3) {
      onCommand({ type: 'safety-action', action: { id: 'safe-arrival', label: '안전한 곳 도착', status: 'user-confirmed', source: 'user', confirmedAt: new Date().toISOString() } })
      setResponseView(4)
    } else if (step === 4 || step === 5) {
      const stage = step === 4 ? 'record' : 'review'
      if (await onNavigate(stage)) setPendingEditor(stage)
    } else if (step === 6 && readyToSend) {
      onCommand({ type: 'transport-start', caseId: value.id, submissionId: request.id, retryId: request.transport === 'failed' ? crypto.randomUUID() : undefined, now: new Date().toISOString() })
    } else if (step === 6) { onReview(); setPendingEditor('review') }
    else if (step === 7) await onNavigate('follow-up')
  }
  async function back() {
    setShowSentReview(false)
    setPendingEditor(null)
    if (step > 5) await onNavigate('record')
    else if (step === 5) { if (await onNavigate('response')) setResponseView(4) }
    else if (step > 1) setResponseView((step - 1) as ResponseStep)
  }
  const result = (status: 'sent' | 'failed') => request && onCommand({ type: 'transport-result', caseId: value.id, submissionId: request.id, status, now: new Date().toISOString() })
  function revealEditor() {
    if (!pendingEditor) return
    const editor = flow.current?.querySelector<HTMLElement>(`#journey-${pendingEditor}-editor`)
    if (!editor?.getClientRects().length || editor.closest('[hidden], [inert]')) return
    const bar = flow.current?.querySelector<HTMLElement>('.fs-action-bar')
    editor.style.scrollMarginTop = `${(bar && getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0) + 32}px`
    editor.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
    editor.scrollIntoView({ block: 'start' })
    setPendingEditor(null)
  }

  return <section ref={flow} className="journey-flow" data-testid="journey-flow" data-step={step} data-transfer={request?.transport ?? request?.status ?? 'idle'}>
    <JourneyRiskNotice value={value} onCommand={onCommand}/>
    <ol className="fs-stages" aria-label="사고 대응 진행">{stageLabels.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} data-done={index + 1 < step}><span>{String(index + 1).padStart(2, '0')}</span>{label}</li>)}</ol>
    <div className="fs-action-bar"><div className="fs-step-copy" aria-live="polite"><span className="fs-step-label">{step} / 7 · {stageLabels[step - 1]}</span><h1 tabIndex={-1}>{title}</h1><p>{support}</p></div><div className="journey-flow-actions">
      <CareAction data-testid="journey-primary" disabled={sending || step === 1 && call === 'connecting' || step === 5 && !hasJourneyRecord(value)} onClick={() => void next()}>{action}<ArrowRight aria-hidden="true" /></CareAction>
      <CareAction secondary aria-label="이전 단계" disabled={step === 1 || sending} onClick={() => void back()}><ArrowLeft aria-hidden="true" />{step >= 6 ? '기록으로 돌아가기' : '이전'}</CareAction>
      {step === 7 && <CareAction secondary onClick={() => { setShowSentReview(!showSentReview); if (!showSentReview) { onReview(); setPendingEditor('review') } }}>{inspectingSent ? '완료 화면으로' : '전송 내역과 공유 보기'}</CareAction>}
    </div></div>
    <section className="journey-flow-events" aria-label="대표 흐름 결과 시연"><span>결과 시연 · 실제 전화·전송 없음</span>
      {rescue && call === 'connecting' && <CareAction secondary aria-label="시연 event: 통화 연결 확인" onClick={() => onCommand({ type: 'request-result', caseId: value.id, agency: 'rescue', submissionId: rescue.id, status: 'connected', externalReceipt: null, now: new Date().toISOString() })}>통화 연결 확인</CareAction>}
      {rescue && (call === 'connected' || call === 'connecting') && <CareAction secondary aria-label="시연 event: 통화 종료 확인" onClick={() => onCommand({ type: 'call-end', caseId: value.id, submissionId: rescue.id, now: new Date().toISOString() })}>통화 종료 확인</CareAction>}
      {sending && <><CareAction secondary aria-label="시연 event: 보험사 전송 완료" onClick={() => result('sent')}>보험사 전송 완료</CareAction><CareAction secondary aria-label="시연 event: 보험사 전송 실패" onClick={() => result('failed')}>보험사 전송 실패</CareAction></>}
    </section>
    <VehicleShell device={device}><div className="fs-dashboard journey-flow-dashboard">
      <div className="journey-flow-scene"><SurroundingsScene active={active} vehicle={vehicleContourState(value)} /><p className="journey-supporting">주변 경로·사고 재생은 합성 시연. 저장된 사고 영상과 별개예요.</p></div>
      <FlowBoard layout={inspectingSent ? 'review' : layout} notificationKey={[step, call, request?.transport, receipt, checks, arrived, inspectingSent].join('/')} reduced={reduced||!active} readout={false} persistentCells onSettled={revealEditor} renderCell={(id, compact) => {
        if (id === 'emergency') return <><div className="fs-cell-label"><span>119 긴급 통화</span><Phone aria-hidden="true" /></div>{!compact && <div className="fs-call-number">119</div>}<p>{callLabel}</p>{!compact && <CareSpectrum active={call === 'connected'} />}<CareStatus tone={rescue?.status === 'received' ? 'confirmed' : 'unknown'}>{rescue?.status === 'received' ? '구호 접수 확인' : '구호 접수 미확인'}</CareStatus></>
        if (id === 'guide') return <><div className="fs-cell-label"><span>안전 확보</span><span>{checks} / 4</span></div><h2>{arrived ? '안전한 곳 도착 확인' : step >= 3 ? '안전한 곳으로 이동하세요' : '먼저, 안전을 확인하세요'}</h2>{step === 3 && <div className="fs-checklist" role="group" aria-label="안전 확인 항목">{safetyChecklist.map(item => <label key={item.id}><input type="checkbox" checked={safetyConfirmed(value, item.id)} disabled={value.safetyActions.find(action=>action.id===item.id)?.status==='device-confirmed'} onChange={event => onCommand({ type: 'safety-action', action: { ...item, status: event.target.checked ? 'user-confirmed' : 'unknown', source: 'user', confirmedAt: event.target.checked ? new Date().toISOString() : null } })} /><span>{item.label}</span></label>)}</div>}{!compact && <p className="fs-cell-muted">{arrived ? '사용자가 도착을 확인했어요.' : '119의 안내를 듣고 주변 상황을 살펴주세요.'}</p>}</>
        if (id === 'record') return <><div id="journey-record-editor" className="journey-flow-workspace" data-flow-content hidden={step!==5}>{recordWorkspace}</div><div hidden={step===5}><div className="fs-cell-label"><FileText aria-hidden="true" /><span>사고 기록</span></div><h2>{hasJourneyRecord(value) ? '남긴 기록을 확인해요' : '기억나는 내용부터'}</h2>{!compact && <><p className="fs-cell-muted">{value.statements.filter(item => item.text.trim()).length}개 이야기 · {value.evidence.filter(item => item.availability === 'available').length}개 자료</p><p className="fs-cell-muted">{value.statements.find(item => item.text.trim())?.text || '아직 남긴 기록이 없어요.'}</p></>}</div></>
        return <><div id="journey-review-editor" className="journey-flow-workspace" data-flow-content hidden={!reviewVisible}>{reviewWorkspace}</div><div hidden={reviewVisible}><div className="fs-cell-label"><Send aria-hidden="true" /><span>보험사 전달</span></div><h2>{step === 7 ? '전송을 완료했어요' : request?.transport === 'failed' ? '기록은 그대로 있어요' : sending ? '기록을 보내고 있어요' : '보낼 내용을 확인해요'}</h2><CareStatus tone={receipt ? 'confirmed' : 'unknown'}>{receipt ? '보험사 접수 확인' : '보험사 접수 미확인'}</CareStatus>{!compact && <><p className="fs-cell-muted">{request?.recipient ?? '수신처와 보낼 범위를 직접 선택해주세요.'}</p><p className="fs-cell-muted">{request?.payload?.statements.map(item => item.text).join('\n') ?? ''}</p>{step === 7 && call === 'connected' && <p className="fs-call-held">119 통화는 계속 유지돼요.</p>}</>}</div></>
      }} />
    </div></VehicleShell>
  </section>
}
