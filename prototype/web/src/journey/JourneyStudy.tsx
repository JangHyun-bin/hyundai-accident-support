import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CarFront, Mic, Smartphone } from 'lucide-react'
import fixtures from '../../../../specs/emergency-experience/journey-fixtures.json'
import { createSession, sceneFor, scenarioFor, type Edge } from '../emergency/session'
import {VehicleShell, type AppWindow} from '@/components/ui/after-care-layout'
import { EmergencySurface } from '../emergency/EmergencySurface'
import { createCase, type Device, type JourneyCase, type RequestStatus, type Stage, type CaseCommand, type Evidence, type Diagram, type ReportParagraph, type Receipt } from './case'
import { useJourneyCase } from './useJourneyCase'
import { JourneyAction, JourneyEditorLayout, JourneyLayout, JourneyStatus } from './JourneyLayout'
import { useJourneyHandoff } from '@/host/native-handoff'
import { useVehicleFacts } from '@/host/vehicle-facts'
import { hostDemo, inPleosApp } from '@/host/pleos-host'
import { HostDemoStrip } from '@/host/HostDemoStrip'
import { publicAsset } from '@/lib/utils'
import { VehicleHandoffPanel } from '@/product/VehicleHandoffPanel'
import { JourneyNavigation, JourneyRequests, JourneyRiskNotice, JourneySummary, VehiclePanel } from './VehiclePanel'
import { VehicleDetailCell } from './VehicleCells'
import { VoiceRecordPanel, type VoiceRecordHandle } from './VoiceRecordPanel'
import { EvidencePanel, type EvidencePanelHandle } from './EvidencePanel'
import { FollowUpPanel } from './FollowUpPanel'
import { followUpDirectories, type FollowUpDirectoryState } from './follow-up-fixtures'
import { JourneyReviewPanel, type JourneyReviewHandle } from './JourneyReviewPanel'
import {JourneyFlow} from './JourneyFlow'
import {hasJourneyRecord} from './journey-flow'
import { JourneyRecovery } from './JourneyRecovery'
import {useCareMotion} from '@/design-system/motion'
import {resolveGuidance} from '@/emergency/guidance'

function replaceQuery(values: Record<string, string>) {
  const url = new URL(location.href)
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value)
  history.replaceState(null, '', url)
}

export function JourneyStudy({embedded=false,previewHeight}:{embedded?:boolean;previewHeight?:number}) {
  const [initial] = useState(() => new URLSearchParams(location.search))
  const journey = useJourneyCase(initial.get('case'))
  const { value, dispatch } = journey
  const handoff = useJourneyHandoff(value?.id ?? '')
  useVehicleFacts(value, dispatch)
  const representative = value?.fixtureId === 'complete-journey'
  const insurance = value?.submissions.find(item=>item.id===value.activeSubmissionIds.insurance)
  const insuranceResultReady = insurance?.transport === undefined || insurance.transport === 'sent'
  const sending = value?.submissions.some(item => item.transport === 'sending') ?? false
  const [fixture, setFixture] = useState(initial.get('fixture') ?? fixtures.cases[0].id)
  const [device, setDevice] = useState<Device>(initial.get('device') === 'mobile' ? 'mobile' : 'vehicle')
  const [appWindow, setAppWindow] = useState<AppWindow>(initial.get('window') === 'split' ? 'split' : 'full')
  const framed = representative && device === 'vehicle'
  const [details, setDetails] = useState(false)
  const [followUpDirty, setFollowUpDirty] = useState(false)
  const [directoryState, setDirectoryState] = useState<FollowUpDirectoryState>(() => (['ready', 'stale', 'empty', 'failed'] as const).find(item => item === initial.get('directory')) ?? 'ready')
  const [recordTab, setRecordTab] = useState<'voice' | 'photos' | 'phone'>('voice')
  const [voiceMode, setVoiceMode] = useState<'device' | 'sample'>('device')
  const [loadingSamples, setLoadingSamples] = useState(false)
  const [sampleError, setSampleError] = useState('')
  const [navigationNotice, setNavigationNotice] = useState('')
  const [reloading, setReloading] = useState(false)
  const currentCase = useRef(value)
  currentCase.current = value
  const voicePanel = useRef<VoiceRecordHandle>(null)
  const photoPanel = useRef<EvidencePanelHandle>(null)
  const reviewPanel = useRef<JourneyReviewHandle>(null)
  const [countdown, setCountdown] = useState({ key: '', seconds: 0 })
  const heading = useRef<HTMLHeadingElement>(null)
  const scene = value ? sceneFor(value.emergency) : null
  const countdownKey = value && scene ? value.id + '/' + scene.id : ''
  const guidance = value && scene ? resolveGuidance(value.emergency, scene, journey.saveState === 'saved') : null
  const contextKey=[value?.id,value?.stage,scene?.id,guidance?.contextKey,details,recordTab,device].join('/')
  const motionRef=useCareMotion<HTMLElement>([value?.id,value?.stage,details,recordTab,device].join('/'))
  const secondsLeft = countdown.key === countdownKey ? countdown.seconds : scene?.auto_contact?.seconds ?? 0
  useEffect(() => {
    if (value && value.revision > 0) replaceQuery({ case: value.id })
  }, [value?.id, value?.revision])

  // The Pleos app has no review controls to start a journey, so it opens one as soon as no stored case can be shown.
  useEffect(() => {
    if (inPleosApp && !value && !journey.loading && (!initial.get('case') || journey.missing || journey.saveState !== 'saved')) void begin()
  }, [value, journey.loading, journey.missing, journey.saveState])

  useEffect(() => {
    if (!scene?.auto_contact || !value || value.suspended || representative) return
    const auto = scene.auto_contact
    const deadline = Date.now() + auto.seconds * 1000
    const key = value.id + '/' + scene.id
    setCountdown({ key, seconds: auto.seconds })
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setCountdown({ key, seconds: remaining })
      if (remaining === 0) {
        clearInterval(timer)
        dispatch({ type: 'countdown', target: auto.expire, now: new Date().toISOString() })
      }
    }, 100)
    return () => clearInterval(timer)
  }, [countdownKey, value?.suspended, representative, dispatch])

  useEffect(() => {
    if (representative && !details && value?.stage !== 'follow-up') return
    const frame = requestAnimationFrame(() => [...document.querySelectorAll<HTMLElement>('[data-case-id] h1')].find(node => node.getClientRects().length)?.focus({preventScroll:true}))
    return () => cancelAnimationFrame(frame)
  }, [value?.id, value?.stage, scene?.id, details, recordTab, representative])

  async function begin() {
    if (value && !await prepareToLeave(true)) return
    const definition = fixtures.cases.find(f => f.id === fixture) ?? fixtures.cases[0]
    const created = createCase(createSession(definition.scenarioId, definition.sceneId), crypto.randomUUID(), new Date().toISOString())
    created.fixtureId = definition.id
    await journey.start(created)
    setDetails(false)
  }

  async function switchDevice() {
    if (!await prepareToLeave(true)) return
    const saved = await journey.flush()
    if (!saved.ok) return
    const next = device === 'vehicle' ? 'mobile' : 'vehicle'
    setDevice(next); replaceQuery({ device: next })
  }

  async function prepareToLeave(force = false) {
    const recordReady = !force && value?.stage !== 'record' || (await voicePanel.current?.finishBeforeLeave() ?? true) && (await photoPanel.current?.finishBeforeLeave() ?? true)
    const reviewReady = !force && value?.stage !== 'review' || (await reviewPanel.current?.finishBeforeLeave() ?? true)
    const followUpReady = !force && value?.stage !== 'follow-up' || !followUpDirty
    const ready = recordReady && reviewReady && followUpReady
    setNavigationNotice(ready ? '' : '남기던 기록을 확인하고 저장하거나 취소해주세요.')
    return ready
  }

  async function reloadLatest() {
    if (reloading) return
    setReloading(true)
    try {
      const record = await voicePanel.current?.recoveryDraft()
      const report = reviewPanel.current?.recoveryCommand()
      await journey.reload({ commands: [...(record?.commands ?? []), ...(report ? [report] : [])], assets: record?.assets ?? [] })
    } finally { setReloading(false) }
  }

  async function navigate(stage: Stage) {
    if(stage==='response'){voicePanel.current?.preserveDraft();reviewPanel.current?.preserveDraft()}
    if (sending || stage !== 'response' && !await prepareToLeave()) return false
    if (stage !== 'response' && !(await journey.flush()).ok) return false
    setDetails(false)
    dispatch({ type: 'navigate', stage })
    return true
  }

  function photoCommand(command: CaseCommand) {
    if (command.type === 'navigate') void navigate(command.stage)
    else dispatch(command)
  }

  function act(edge: Edge) {
    setDetails(false)
    dispatch({ type: 'emergency-edge', edgeId: edge.id, now: new Date().toISOString() })
  }

  function result(agency: 'rescue' | 'vehicle' | 'insurance', status: RequestStatus, externalReceipt: Receipt | null = null) {
    const id = value?.activeSubmissionIds[agency]
    if (id && value) dispatch({ type: 'request-result', caseId: value.id, agency, submissionId: id, status, externalReceipt, now: new Date().toISOString() })
  }

  function risk() {
    if (!value) return
    voicePanel.current?.preserveDraft()
    reviewPanel.current?.preserveDraft()
    const fact = scenarioFor(value.emergency.scenarioId).facts.find(f => f.id === 'risk')
    dispatch({ type: 'observation', observation: { id: 'risk-' + crypto.randomUUID(), kind: 'risk', label: '차량 위험', value: '새로운 위험 감지',
      source: 'fixture', observedAt: new Date().toISOString(), confirmation: 'attention', legacyFactId: fact ? 'risk' : null, supersedes: null } })
    setDetails(false)
  }

  function airbag() {
    dispatch({ type: 'observation', observation: { id: 'airbag-' + crypto.randomUUID(), kind: 'seat-airbag-deployed', label: '에어백', value: '펼쳐짐',
      source: 'fixture', observedAt: new Date().toISOString(), confirmation: 'attention', legacyFactId: null, supersedes: null } })
  }

  function sampleReport() {
    if (!value?.fixtureId) return
    const clip = value.evidence.find(item => item.id === 'sample-front' && item.origin === 'sample' && item.availability === 'available')
    const paragraphs: ReportParagraph[] = []
    if (clip) paragraphs.push({ id: crypto.randomUUID(), text: fixtures.report.observation, kind: 'observation', revision: 1, confirmedRevision: null,
      references: [{ evidenceId: clip.id, evidenceRevision: clip.revision, start: 8, end: 16 }] })
    for (const statement of value.statements.filter(item => item.text.trim())) paragraphs.push({ id: crypto.randomUUID(), text: statement.text,
      kind: 'statement', revision: 1, confirmedRevision: null, references: statement.audioEvidenceIds.flatMap(id => {
        const item = value.evidence.find(e => e.id === id && e.availability === 'available')
        return item ? [{ evidenceId: item.id, evidenceRevision: item.revision, start: null, end: null }] : []
      }) })
    if (!paragraphs.length) return
    if (clip) paragraphs.push({ id: crypto.randomUUID(), text: fixtures.report.inference, kind: 'inference', revision: 1, confirmedRevision: null, references: [] })
    dispatch({ type: 'report-result', report: { revision: 1, basedOnRevision: value.contentRevision, paragraphs } })
  }

  function vehicleData() {
    for (const [kind, label, text] of [['impact-direction', '충격 방향', '우측 전방'], ['impact-strength', '충격 세기', '0.4 G'], ['collision-time', '감지 시각', '오후 9:12']]) {
      dispatch({ type: 'observation', observation: { id: kind + '-' + crypto.randomUUID(), kind, label, value: text,
        source: 'fixture', observedAt: new Date().toISOString(), confirmation: 'confirmed', legacyFactId: null, supersedes: null } })
    }
  }

  async function sampleEvidence() {
    if (!value?.fixtureId || loadingSamples) return
    const caseId = value.id
    const definition = fixtures.cases.find(item => item.id === value.fixtureId)
    setLoadingSamples(true); setSampleError('')
    try {
      for (const camera of ['front', 'rear'] as const) {
        const available = definition?.condition !== 'empty' && (camera === 'front' || definition?.condition !== 'partial')
        const label = camera === 'front' ? '전방 영상' : '후방 영상'
        let blob: Blob | null = null
        if (available) {
          const response = await fetch(publicAsset(`/journey-samples/${camera}-20s.mp4`))
          if (!response.ok) throw new Error('Sample unavailable')
          blob = await response.blob()
        }
        if (currentCase.current?.id !== caseId) return
        const id = 'sample-' + camera
        const previous = currentCase.current.evidence.find(item => item.id === id)
        const evidence: Evidence = { id, label, kind: 'video', revision: (previous?.revision ?? 0) + 1, origin: 'sample',
          assetId: blob ? crypto.randomUUID() : null, availability: blob ? 'available' : 'unavailable', captureTarget: null,
          metadata: { mime: blob?.type ?? '', bytes: blob?.size ?? 0, duration: blob ? 20 : null, eventTime: blob ? 11 : null,
            capturedAt: fixtures.createdAt, sourceLabel: '합성 ' + label } }
        const saved = await journey.save({ type: 'evidence-put', evidence }, blob ? [{ id: evidence.assetId!, caseId, blob }] : [])
        if (!saved.ok) throw new Error('Sample save failed')
      }
      if (currentCase.current?.id !== caseId || definition?.condition === 'empty' || currentCase.current.diagram) return
      const diagram: Diagram = { revision: 1, origin: 'fixture', road: 'straight', confirmedRevision: null,
        vehicles: [{ id: 'own', position: { x: .42, y: .62 }, heading: 0 }, { id: 'other', position: { x: .62, y: .43 }, heading: 340 }], contact: { x: .53, y: .52 } }
      dispatch({ type: 'diagram-edit', diagram })
    } catch { setSampleError('자료를 불러오지 못했어요. 기존 기록은 그대로 있어요.') }
    finally { setLoadingSamples(false) }
  }

  function renderNavigation(record: JourneyCase) {
    if (record.stage !== 'follow-up') return <JourneyNavigation value={record} />
    const directory = record.fixtureId ? followUpDirectories[directoryState] : null
    const shop = directory?.shops.find(item => item.id === record.followUp.shopId)
    const navigation = directory?.origin && shop?.position && shop.distanceMeters && ['preview', 'guiding'].includes(record.followUp.route)
      ? { source: 'fixture' as const, vehicle: directory.origin, destination: shop.position, distanceMeters: shop.distanceMeters, updatedAt: directory.updatedAt! } : null
    return <JourneyNavigation value={{ ...record, navigation }} destinationLabel={shop?.name} />
  }

  function followUpResult(kind: 'route' | 'rental', status: 'guiding' | 'unavailable' | 'eligible' | 'ineligible' | 'unknown') {
    if (!value) return
    const request = kind === 'route' ? value.followUp.routeRequest : value.followUp.rentalRequest
    if (!request) return
    const identity = { caseId: value.id, requestId: request.id, shopId: request.shopId, source: 'fixture' as const, updatedAt: new Date().toISOString() }
    if (kind === 'route' && (status === 'guiding' || status === 'unavailable')) dispatch({ type: 'follow-up-result', ...identity, kind, status })
    if (kind === 'rental' && (status === 'eligible' || status === 'ineligible' || status === 'unknown')) dispatch({ type: 'follow-up-result', ...identity, kind, status })
  }

  async function selectRecordTab(tab:'voice'|'photos'|'phone') {
    if (!await prepareToLeave()) return
    setRecordTab(tab)
    requestAnimationFrame(()=>{
      const selected=[...document.querySelectorAll<HTMLButtonElement>('#journey-record-editor .journey-record-tabs button[aria-pressed=true]')].find(node=>node.getClientRects().length&&!node.closest('[hidden],[inert]'))
      selected?.focus({preventScroll:true})
    })
  }

  function recordWorkspace() {
    if (!value) return null
    const tabs=<nav className="journey-record-tabs" aria-label="기록 방법">
      <button aria-pressed={recordTab === 'voice'} onClick={() => void selectRecordTab('voice')}>말로 남기기</button>
      <button aria-pressed={recordTab === 'photos'} onClick={() => void selectRecordTab('photos')}>사진 남기기</button>
      <button aria-pressed={recordTab === 'phone'} onClick={() => void selectRecordTab('phone')}>휴대폰으로 남기기</button>
    </nav>
    const footer=framed ? null : <JourneyRequests value={value}/>
    return <>
      <div hidden={recordTab !== 'voice'} inert={reloading} aria-busy={reloading} className="journey-editor-holder"><VoiceRecordPanel ref={voicePanel} value={value} mode={voiceMode} onSave={journey.save} durable={journey.saveState === 'saved'} reloadVersion={journey.reloadVersion} navigation={tabs} footer={footer}/></div>
      <div hidden={recordTab !== 'photos'} inert={reloading} aria-busy={reloading} className="journey-editor-holder"><EvidencePanel ref={photoPanel} value={value} onSave={journey.save} onCommand={photoCommand} navigation={tabs} footer={footer}/></div>
      <div hidden={recordTab !== 'phone'} className="journey-editor-holder"><JourneyEditorLayout step="사고 기록" title="휴대폰으로 이어서 남겨요" description="사진과 진술은 휴대폰에서 남기고, 차량 화면에서 진행 상황을 볼 수 있어요." guidanceKey="journey-phone-handoff">{tabs}<VehicleHandoffPanel handoff={handoff}/>{footer}</JourneyEditorLayout></div>
    </>
  }

  function reviewWorkspace() {
    if (!value) return null
    return <JourneyReviewPanel ref={reviewPanel} explicitTransport={representative} value={value} saving={journey.saveState === 'saving'} reloading={reloading} onCommand={journey.save} reloadVersion={journey.reloadVersion} onApprove={journey.approve} footer={framed ? null : <JourneyRequests value={value}/>}/>
  }

  function content() {
    if (!value || !scene) return null
    const navigation = renderNavigation(value)
    if (details) return <JourneyLayout device={device} appWindow={framed ? appWindow : undefined} navigation={navigation} summary={framed ? <VehicleDetailCell value={value} compact={false} /> : <JourneySummary value={value} />}
      action={<JourneyAction onClick={() => setDetails(false)}><ArrowLeft aria-hidden="true" />대응 화면으로</JourneyAction>}>
      <VehiclePanel value={value} onCommand={dispatch} />
    </JourneyLayout>
    if (value.stage === 'response' && !representative) {
      const response=<EmergencySurface navigation={navigation} selection={value.emergency} paused={false} present="off"
        notice={<JourneyRiskNotice value={value} />}
        storageAvailable={journey.saveState === 'saved'} countdownKey={countdownKey} secondsLeft={secondsLeft} heading={heading}
        onAction={act} onCancel={() => scene.auto_contact && dispatch({ type: 'countdown', target: scene.auto_contact.cancel, now: new Date().toISOString() })}
        onEditDraft={() => dispatch({ type: 'navigate', stage: 'record' })} />
      return device==='vehicle'?<VehicleShell>{response}</VehicleShell>:<div className="journey-mobile-viewport" data-journey-device="mobile">{response}</div>
    }
    return null
  }

  const flowActive=representative&&!details&&value.stage!=='follow-up'
  const controls=<>
    <section className="journey-review-controls" aria-label="시연 설정">
      {!inPleosApp && <label>시연 상황<select value={fixture} onChange={e => setFixture(e.target.value)}>{fixtures.cases.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}</select></label>}
      <button onClick={() => void begin()} disabled={journey.loading}>{value ? '새 시연 시작' : '이 상황으로 시작'}</button>
      {value && !inPleosApp && <button onClick={() => void switchDevice()}>{device === 'vehicle' ? <Smartphone size={16} /> : <CarFront size={16} />}{device === 'vehicle' ? 'Mobile 보기' : '차량 보기'}</button>}
      {representative && device === 'vehicle' && !inPleosApp && <label>앱 화면<select value={appWindow} onChange={event => { const next = event.target.value === 'split' ? 'split' : 'full'; setAppWindow(next); replaceQuery({ window: next }) }}><option value="full">전체 화면 1682 × 1210</option><option value="split">화면 분할 841 × 1210</option></select></label>}
      <label>음성 입력<select value={voiceMode} onChange={async event => { const mode = event.target.value as 'device' | 'sample'; if (await prepareToLeave(true)) setVoiceMode(mode) }}><option value="device">이 기기 microphone</option><option value="sample">준비된 음성 sample</option></select></label>
    </section>
    {value&&<>
      <div className="journey-product-tools">
        <button onClick={() => void navigate('response')}>긴급 대응 보기</button>
        {value.stage !== 'follow-up' && <button onClick={() => void navigate('follow-up')}>후속 처리 보기</button>}
        <button onClick={async () => { if (await prepareToLeave()) setDetails(true) }}>차량 상태 보기</button>
        {value.stage === 'response' && value.returnStage === 'record' && <button onClick={() => dispatch({ type: 'navigate', stage: 'record' })}>기록으로 돌아가기</button>}
        {value.stage === 'response' && value.returnStage === 'review' && <button onClick={() => dispatch({ type: 'navigate', stage: 'review' })}>내용 확인으로 돌아가기</button>}
        {value.stage === 'response' && value.returnStage === 'follow-up' && <button onClick={() => dispatch({ type: 'navigate', stage: 'follow-up' })}>후속 처리로 돌아가기</button>}
        {value.suspended && <button onClick={() => dispatch({ type: 'resume' })}>이어서 확인하기</button>}
      </div>
      <section className="journey-review-events" aria-label="외부 결과 시연">
        <span>외부 결과 시연</span>
        <label htmlFor="journey-directory">정비소 정보</label><select id="journey-directory" value={directoryState} onChange={event => { const state = event.target.value as FollowUpDirectoryState; setDirectoryState(state); replaceQuery({ directory: state }) }}>
          <option value="ready">안내 있음</option><option value="stale">오래된 안내</option><option value="empty">제공된 목록 없음</option><option value="failed">조회 실패</option>
        </select>
        {value.followUp.rentalRequest && <><button aria-label="시연 event: 대차 가능 확인" onClick={() => followUpResult('rental', 'eligible')}>대차 가능 확인</button><button aria-label="시연 event: 대차 불가 확인" onClick={() => followUpResult('rental', 'ineligible')}>대차 불가 확인</button><button aria-label="시연 event: 대차 결과 미확인" onClick={() => followUpResult('rental', 'unknown')}>대차 결과 미확인</button></>}
        {value.followUp.routeRequest && <button aria-label="시연 event: 경로 확인 실패" onClick={() => followUpResult('route', 'unavailable')}>경로 확인 실패</button>}
        <button aria-label="시연 event: 차량 감지 자료" onClick={vehicleData}>차량 감지 자료</button>
        <button aria-label="시연 event: 사고 자료 확보" disabled={loadingSamples} onClick={() => void sampleEvidence()}>{loadingSamples ? '자료 보관 중' : '사고 자료 확보'}</button>
        <button aria-label="시연 event: 경위서 초안" onClick={sampleReport}>경위서 초안</button>
        <button aria-label="시연 event: 비상등 작동 확인" onClick={() => dispatch({ type: 'safety-action', action: { id: 'hazard', label: '비상등', status: 'device-confirmed', source: 'fixture', confirmedAt: new Date().toISOString() } })}>비상등 작동 확인</button>
        <button aria-label="시연 event: 안내 지점 자료" onClick={() => dispatch({ type: 'navigation-data', value: { source: 'fixture', vehicle: { x: .4, y: .7 }, destination: { x: .7, y: .7 }, distanceMeters: 15, updatedAt: new Date().toISOString() } })}>안내 지점 자료</button>
        <button aria-label="시연 event: 위험 정보" onClick={risk}>위험 정보</button>
        <button aria-label="시연 event: 에어백 전개 신호" onClick={airbag}>에어백 전개 신호</button>
        {value.activeSubmissionIds.rescue && <>{!representative&&<button aria-label="시연 event: 통화 연결 확인" onClick={() => result('rescue', 'connected')}>통화 연결 확인</button>}<button aria-label="시연 event: 구호 접수 확인" onClick={() => result('rescue', 'received')}>구호 접수 확인</button></>}
        {value.activeSubmissionIds.insurance && <><button disabled={!insuranceResultReady} aria-label="시연 event: 보험사 접수 확인" onClick={() => result('insurance', 'received')}>보험사 접수 확인</button><button disabled={!insuranceResultReady} aria-label="시연 event: 보험사 접수번호 확인" onClick={() => result('insurance', 'received', { number: 'AC-20261110-001', receivedAt: new Date().toISOString(), agencyName: value.submissions.find(item => item.id === value.activeSubmissionIds.insurance)?.recipient ?? '보험사', next: '담당자의 안내를 기다려주세요.' })}>보험사 접수번호 확인</button><button disabled={!insuranceResultReady} aria-label="시연 event: 보험사 결과 미확인" onClick={() => result('insurance', 'unknown')}>보험사 결과 미확인</button>{!representative&&<button aria-label="시연 event: 보험사 전송 실패" onClick={() => result('insurance', 'failed')}>보험사 전송 실패</button>}</>}
        {value.activeSubmissionIds.vehicle && <><button aria-label="시연 event: 차량 지원 접수 확인" onClick={() => result('vehicle', 'received')}>차량 지원 접수 확인</button><button aria-label="시연 event: 차량 지원 미접수 확인" onClick={() => result('vehicle', 'not_received')}>차량 지원 미접수 확인</button></>}
        {value.shares.length > 0 && <><button aria-label="시연 event: 상대방 공유 확인" onClick={() => dispatch({ type: 'share-result', caseId: value.id, shareId: value.shares.at(-1)!.id, status: 'confirmed' })}>상대방 공유 확인</button><button aria-label="시연 event: 상대방 공유 실패" onClick={() => dispatch({ type: 'share-result', caseId: value.id, shareId: value.shares.at(-1)!.id, status: 'failed' })}>상대방 공유 실패</button></>}
      </section>
    </>}
  </>

  return <div data-care-device={device} data-flow-active={representative} className={`journey-study journey-theme ac-system${embedded?' journey-embedded':''}`}>
    {!embedded&&!representative&&!inPleosApp&&<header className="journey-review-heading"><div><p>AFTER / CARE</p><h1>사고 대응 · 전체 여정</h1><span>가상 자료와 명시적 결과로 검토 · 실제 전화·전송·기기 간 동기화 없음</span></div><a href="/?study=design-system">Design system<ArrowRight size={16} /></a></header>}

    {!representative&&!inPleosApp&&<div className="journey-controls-standalone">{controls}</div>}
    {journey.loading && <p role="status">기록을 불러오고 있어요.</p>}
    {journey.missing && !value && !inPleosApp && <section className="journey-empty"><h2>이 기기에서 기록을 찾지 못했어요</h2><p>다른 기기의 기록은 자동으로 이어지지 않아요.</p></section>}
    {value && <>
      <section ref={representative?undefined:motionRef} data-care-motion-key={contextKey} data-case-id={value.id} data-journey-stage={value.stage}>
        {representative&&<div hidden={details||value.stage==='follow-up'}><JourneyFlow controls={flowActive?controls:null} previewHeight={previewHeight} appWindow={appWindow} key={value.id} value={value} device={device} active={!details&&value.stage!=='follow-up'} onCommand={dispatch} onNavigate={navigate} recordWorkspace={recordWorkspace()} reviewWorkspace={reviewWorkspace()} onReview={()=>reviewPanel.current?.openSubmission()} handoff={handoff}/></div>}
        {content()}
        {!representative&&<div id="journey-record-editor" key={value.id} hidden={value.stage !== 'record' || details}>
          <JourneyLayout device={device} navigation={renderNavigation(value)} summary={<JourneySummary value={value} />}
            action={<JourneyAction secondary disabled={representative&&!hasJourneyRecord(value)} onClick={() => void navigate('review')}>{representative?'기록 내용 확인':'내용 확인으로'}<ArrowRight aria-hidden="true" /></JourneyAction>}>
            {recordWorkspace()}
          </JourneyLayout>
        </div>}
        {!representative&&<div id="journey-review-editor" key={value.id + '-review'} hidden={value.stage !== 'review' || details}>
          <JourneyLayout device={device} navigation={renderNavigation(value)} summary={<JourneySummary value={value} />}
            action={<JourneyAction secondary disabled={sending} onClick={() => void navigate('record')}>기록으로 돌아가기</JourneyAction>}>
            {reviewWorkspace()}
          </JourneyLayout>
        </div>}
        <div key={value.id + '-follow-up'} hidden={value.stage !== 'follow-up' || details}>
          <JourneyLayout device={device} appWindow={framed ? appWindow : undefined} navigation={renderNavigation(value)} summary={framed ? <VehicleDetailCell value={value} compact={false} /> : <JourneySummary value={value} />}
            action={<>
              {representative && !hasJourneyRecord(value)
                ? <JourneyAction secondary onClick={() => void navigate('record')}>기록 이어서 남기기</JourneyAction>
                : <JourneyAction secondary onClick={() => void navigate('review')}>사고 내용으로 돌아가기</JourneyAction>}
              {representative && <JourneyAction secondary onClick={() => void navigate('response')}>도움이 필요해요</JourneyAction>}
            </>}>
            {representative && !hasJourneyRecord(value) && <p className="journey-supporting"><JourneyStatus tone="unknown">사고 기록 · 아직 남기지 않았어요</JourneyStatus> 준비되면 이어서 남길 수 있어요.</p>}
            <FollowUpPanel value={value} onCommand={dispatch} directory={value.fixtureId ? followUpDirectories[directoryState] : undefined} onDirtyChange={setFollowUpDirty}
              navigation={device === 'mobile' ? renderNavigation(value) : undefined} />
            {!framed && <JourneyRequests value={value} />}
          </JourneyLayout>
        </div>
      </section>
      {representative && !flowActive && (inPleosApp ? hostDemo && <HostDemoStrip>{controls}</HostDemoStrip> : <div className="journey-controls-standalone">{controls}</div>)}

      <div className="journey-save-status" role="status">{journey.saveState === 'saved' ? '이 기기에 보관됨' : journey.saveState === 'saving' ? '저장 중' :
        journey.saveState === 'conflict' ? '다른 화면에서 기록이 바뀌었어요. 내 입력은 이 화면에 남아 있어요.' : '이 기기에 저장하지 못했어요. 입력 내용은 이 화면에 남아 있어요.'}
        {['unavailable', 'quota', 'invalid'].includes(journey.saveState) && <button onClick={() => void journey.flush()}>저장 다시 시도</button>}
        {journey.saveState === 'conflict' && <button disabled={reloading} onClick={() => void reloadLatest()}>{reloading ? '최신 기록 불러오는 중' : '최신 기록 불러오기'}</button>}
      </div>
      <JourneyRecovery entries={journey.recoveries} current={value} onRestore={dispatch} />
      {sampleError && <p role="status">{sampleError}</p>}
      {navigationNotice && <p role="status">{navigationNotice}</p>}

    </>}
    {!value && !journey.loading && !journey.missing && !inPleosApp && <div className="journey-empty"><Mic aria-hidden="true" /><h2>상황을 선택해 여정을 시작하세요</h2><p>기록은 이 browser에만 보관돼요.</p></div>}
  </div>
}
