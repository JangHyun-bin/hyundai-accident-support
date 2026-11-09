import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CarFront, Mic, Phone, Smartphone, Volume2 } from 'lucide-react'
import fixtures from '../../../../specs/emergency-experience/journey-fixtures.json'
import { createSession, sceneFor, scenarioFor, type Edge } from '../emergency/session'
import { EmergencySurface } from '../emergency/EmergencySurface'
import { createCase, type Device, type JourneyCase, type RequestStatus } from './case'
import { useJourneyCase } from './useJourneyCase'
import { JourneyAction, JourneyHeading, JourneyLayout, JourneyVehicleFrame } from './JourneyLayout'
import { JourneyNavigation, JourneyRequests, JourneySummary, VehiclePanel } from './VehiclePanel'
import '../emergency/motion'

function replaceQuery(values: Record<string, string>) {
  const url = new URL(location.href)
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value)
  history.replaceState(null, '', url)
}

export function JourneyStudy() {
  const [initial] = useState(() => new URLSearchParams(location.search))
  const journey = useJourneyCase(initial.get('case'))
  const { value, dispatch } = journey
  const [fixture, setFixture] = useState(initial.get('fixture') ?? fixtures.cases[0].id)
  const [device, setDevice] = useState<Device>(initial.get('device') === 'mobile' ? 'mobile' : 'vehicle')
  const [details, setDetails] = useState(false)
  const [voiceState, setVoiceState] = useState<'idle' | 'speaking' | 'error'>('idle')
  const [countdown, setCountdown] = useState({ key: '', seconds: 0 })
  const heading = useRef<HTMLHeadingElement>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const scene = value ? sceneFor(value.emergency) : null
  const countdownKey = value && scene ? value.id + '/' + scene.id : ''
  const secondsLeft = countdown.key === countdownKey ? countdown.seconds : scene?.auto_contact?.seconds ?? 0
  const record = value?.statements[0]

  useEffect(() => {
    if (!scene?.auto_contact || !value || value.suspended) return
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
  }, [countdownKey, value?.suspended, dispatch])

  useEffect(() => {
    utterance.current = null
    window.speechSynthesis?.cancel()
    setVoiceState('idle')
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-case-id] h1')?.focus())
    return () => { cancelAnimationFrame(frame); utterance.current = null; window.speechSynthesis?.cancel() }
  }, [value?.id, value?.stage, scene?.id, details])

  function speak() {
    if (voiceState === 'speaking') { utterance.current = null; window.speechSynthesis?.cancel(); setVoiceState('idle'); return }
    if (!scene) return
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) throw new Error('Speech unavailable')
      const next = new SpeechSynthesisUtterance(scene.voice)
      next.lang = 'ko-KR'
      next.onend = () => { if (utterance.current === next) { utterance.current = null; setVoiceState('idle') } }
      next.onerror = () => { if (utterance.current === next) setVoiceState('error') }
      utterance.current = next; setVoiceState('speaking'); speechSynthesis.speak(next)
    } catch { setVoiceState('error') }
  }

  async function begin() {
    const definition = fixtures.cases.find(f => f.id === fixture) ?? fixtures.cases[0]
    const created = createCase(createSession(definition.scenarioId, definition.sceneId), crypto.randomUUID(), new Date().toISOString())
    created.fixtureId = definition.id
    const saved = await journey.start(created)
    if (saved.ok) replaceQuery({ case: saved.value.id, device })
    setDetails(false)
  }

  async function switchDevice() {
    const saved = await journey.flush()
    if (!saved.ok) return
    const next = device === 'vehicle' ? 'mobile' : 'vehicle'
    setDevice(next); replaceQuery({ device: next, case: saved.value.id })
  }

  function act(edge: Edge) {
    setDetails(false)
    dispatch({ type: 'emergency-edge', edgeId: edge.id, now: new Date().toISOString() })
  }

  function result(agency: 'rescue' | 'vehicle' | 'insurance', status: RequestStatus) {
    const id = value?.activeSubmissionIds[agency]
    if (id && value) dispatch({ type: 'request-result', caseId: value.id, agency, submissionId: id, status, externalReceipt: null, now: new Date().toISOString() })
  }

  function risk() {
    if (!value) return
    const fact = scenarioFor(value.emergency.scenarioId).facts.find(f => f.id === 'risk')
    dispatch({ type: 'observation', observation: { id: 'risk-' + crypto.randomUUID(), kind: 'risk', label: '차량 위험', value: '위험 정보 확인 필요',
      source: 'fixture', observedAt: new Date().toISOString(), confirmation: 'attention', legacyFactId: fact ? 'risk' : null, supersedes: null } })
    setDetails(false)
  }

  function vehicleData() {
    for (const [kind, label, text] of [['impact-direction', '충격 방향', '우측 전방'], ['impact-strength', '충격 세기', '0.4 G'], ['collision-time', '감지 시각', '오후 9:12']]) {
      dispatch({ type: 'observation', observation: { id: kind + '-' + crypto.randomUUID(), kind, label, value: text,
        source: 'fixture', observedAt: new Date().toISOString(), confirmation: 'confirmed', legacyFactId: null, supersedes: null } })
    }
  }

  function mobileResponse(record: JourneyCase) {
    if (!scene) return null
    return <JourneyLayout device="mobile" summary={<JourneySummary value={record} />} action={<>
      {scene.actions.map(edge => <JourneyAction key={edge.id} secondary={edge.secondary} onClick={() => act(edge)}>{edge.label}</JourneyAction>)}
      {scene.auto_contact && <JourneyAction secondary onClick={() => dispatch({ type: 'countdown', target: scene.auto_contact!.cancel, now: new Date().toISOString() })}>취소</JourneyAction>}
    </>}>
      {scene.auto_contact && <span className="journey-countdown" data-countdown={secondsLeft}>{secondsLeft}</span>}
      {record.emergency.requests.rescue === 'connected' && <Phone className="journey-phone" aria-hidden="true" />}
      <JourneyHeading title={scene.title}>{scene.instruction}</JourneyHeading>
      <button className="journey-text-action" onClick={speak}><Volume2 aria-hidden="true" />{voiceState === 'speaking' ? '음성 안내 중지' : '음성 안내 듣기'}</button>
      <JourneyRequests value={record} />
      {scene.self_action && <div className="journey-inline-note"><p>{scene.self_action.condition && <span>{scene.self_action.condition}<br /></span>}{scene.self_action.now}</p></div>}
    </JourneyLayout>
  }

  function content() {
    if (!value || !scene) return null
    const navigation = <JourneyNavigation value={value} />
    if (details) return <JourneyLayout device={device} navigation={navigation} summary={<JourneySummary value={value} />}
      action={<JourneyAction onClick={() => setDetails(false)}><ArrowLeft aria-hidden="true" />대응 화면으로</JourneyAction>}>
      <VehiclePanel value={value} onCommand={dispatch} />
    </JourneyLayout>
    if (value.stage === 'response') {
      if (device === 'mobile') return mobileResponse(value)
      return <JourneyVehicleFrame navigation={navigation}><EmergencySurface selection={value.emergency} paused={value.suspended} present="off"
        voiceState={voiceState} storageAvailable={journey.saveState === 'saved'} countdownKey={countdownKey} secondsLeft={secondsLeft} heading={heading}
        onAction={act} onCancel={() => scene.auto_contact && dispatch({ type: 'countdown', target: scene.auto_contact.cancel, now: new Date().toISOString() })}
        onVoice={speak} onEditDraft={() => dispatch({ type: 'navigate', stage: 'record' })} /></JourneyVehicleFrame>
    }
    if (value.stage === 'record') return <JourneyLayout device={device} navigation={navigation} summary={<JourneySummary value={value} />}
      action={<><JourneyAction disabled={!record?.text.trim()} onClick={() => record && dispatch({ type: 'statement-confirm', id: record.id })}>기록 확인</JourneyAction>
        <JourneyAction secondary onClick={() => dispatch({ type: 'navigate', stage: 'review' })}>내용 확인으로<ArrowRight aria-hidden="true" /></JourneyAction></>}>
      <JourneyHeading step="사고 기록" title="기억나는 내용을 남겨주세요">확실한 내용만 남겨도 돼요.</JourneyHeading>
      <div className="journey-input-label"><label htmlFor="journey-record">사고 기록</label><span id="journey-record-count">{record?.text.length ?? 0} / 5,000</span></div>
      <textarea id="journey-record" className="journey-textarea" maxLength={5000} value={record?.text ?? ''}
        aria-describedby="journey-record-count"
        placeholder="기억나는 내용을 적어주세요"
        onChange={event => dispatch({ type: 'statement-edit', id: record?.id ?? 'primary-statement', text: event.target.value, audioEvidenceIds: record?.audioEvidenceIds ?? [] })} />
      <JourneyRequests value={value} />
    </JourneyLayout>
    return <JourneyLayout device={device} navigation={navigation} summary={<JourneySummary value={value} />}
      action={<JourneyAction onClick={() => dispatch({ type: 'navigate', stage: 'record' })}>기록으로 돌아가기</JourneyAction>}>
      <JourneyHeading title="남긴 기록">{record?.text || '아직 남긴 기록이 없어요.'}</JourneyHeading>
      <JourneyRequests value={value} />
    </JourneyLayout>
  }

  return <main className="journey-study journey-theme">
    <header className="journey-review-heading"><div><p>AFTER / CARE</p><h1>사고 대응 · 전체 여정</h1><span>가상 자료와 명시적 결과로 검토 · 실제 전화·전송·기기 간 동기화 없음</span></div><a href="/?study=journey-catalog">표현 기준<ArrowRight size={16} /></a></header>
    <section className="journey-review-controls" aria-label="시연 설정">
      <label>시연 상황<select value={fixture} onChange={e => setFixture(e.target.value)}>{fixtures.cases.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}</select></label>
      <button onClick={() => void begin()} disabled={journey.loading}>{value ? '새 시연 시작' : '이 상황으로 시작'}</button>
      {value && <button onClick={() => void switchDevice()}>{device === 'vehicle' ? <Smartphone size={16} /> : <CarFront size={16} />}{device === 'vehicle' ? 'Mobile 보기' : '차량 보기'}</button>}
    </section>
    {journey.loading && <p role="status">기록을 불러오고 있어요.</p>}
    {journey.missing && !value && <section className="journey-empty"><h2>이 기기에서 기록을 찾지 못했어요</h2><p>다른 기기의 기록은 자동으로 이어지지 않아요.</p></section>}
    {value && <>
      <div className="journey-product-tools">
        <button onClick={() => { setDetails(false); dispatch({ type: 'navigate', stage: 'response' }) }}>긴급 대응 보기</button>
        <button onClick={() => setDetails(true)}>차량 상태 보기</button>
        {value.stage === 'response' && value.returnStage === 'record' && <button onClick={() => dispatch({ type: 'navigate', stage: 'record' })}>기록으로 돌아가기</button>}
        {value.suspended && <button onClick={() => dispatch({ type: 'resume' })}>이어서 확인하기</button>}
      </div>
      <section data-case-id={value.id} data-journey-stage={value.stage}>{content()}</section>
      <div className="journey-save-status" role="status">{journey.saveState === 'saved' ? '이 기기에 보관됨' : journey.saveState === 'saving' ? '저장 중' :
        journey.saveState === 'conflict' ? '다른 화면에서 기록이 바뀌었어요. 내 입력은 이 화면에 남아 있어요.' : '이 기기에 저장하지 못했어요. 입력 내용은 이 화면에 남아 있어요.'}
        {['unavailable', 'quota', 'invalid'].includes(journey.saveState) && <button onClick={() => void journey.flush()}>저장 다시 시도</button>}
        {journey.saveState === 'conflict' && <button onClick={() => void journey.reload()}>최신 기록 불러오기</button>}
      </div>
      {journey.recovery && <details className="journey-recovery"><summary>내 임시 기록 확인</summary><pre>{journey.recovery.value.statements.map(s => s.text).join('\n\n')}</pre><p>미저장 자료 {journey.recovery.assets.length}개도 이 화면에 보존 중.</p></details>}
      {voiceState === 'error' && <p role="status">음성 재생을 사용할 수 없어요. {scene?.voice}</p>}
      <section className="journey-review-events" aria-label="외부 결과 시연">
        <span>외부 결과 시연</span>
        <button aria-label="시연 event: 차량 감지 자료" onClick={vehicleData}>차량 감지 자료</button>
        <button aria-label="시연 event: 비상등 작동 확인" onClick={() => dispatch({ type: 'safety-action', action: { id: 'hazard', label: '비상등', status: 'device-confirmed', source: 'fixture', confirmedAt: new Date().toISOString() } })}>비상등 작동 확인</button>
        <button aria-label="시연 event: 안내 지점 자료" onClick={() => dispatch({ type: 'navigation-data', value: { source: 'fixture', vehicle: { x: .4, y: .7 }, destination: { x: .7, y: .7 }, distanceMeters: 15, updatedAt: new Date().toISOString() } })}>안내 지점 자료</button>
        <button aria-label="시연 event: 위험 정보" onClick={risk}>위험 정보</button>
        {value.activeSubmissionIds.rescue && <><button aria-label="시연 event: 통화 연결 확인" onClick={() => result('rescue', 'connected')}>통화 연결 확인</button><button aria-label="시연 event: 구호 접수 확인" onClick={() => result('rescue', 'received')}>구호 접수 확인</button></>}
      </section>
    </>}
    {!value && !journey.loading && !journey.missing && <div className="journey-empty"><Mic aria-hidden="true" /><h2>상황을 선택해 여정을 시작하세요</h2><p>기록은 이 browser에만 보관돼요.</p></div>}
  </main>
}
