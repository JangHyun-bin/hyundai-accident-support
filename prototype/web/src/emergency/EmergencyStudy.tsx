import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CarFront, Check, CheckCircle2, Circle, CircleHelp, Code2, Handshake, HeartPulse, Maximize2, Minimize2, Pause, Phone, Play, Route, TriangleAlert, UserRound, Volume2, VolumeX } from 'lucide-react'
import { useIsPresent, useReducedMotion } from 'motion/react'
import { TransitionPanel } from '../components/ui/transition-panel'
import manifest from '../../../../specs/emergency-experience/scenarios.json'
import './emergency.css'

const symbols = { person: UserRound, phone: Phone, vehicle: CarFront }
const factSymbols = { driver: UserRound, route: Route, injury: HeartPulse, consciousness: UserRound, arrival: CarFront, handoff: Handshake }
const requestStatuses: Record<string, { label: string; tone: string }> = manifest.request_statuses

function readSelection() {
  const params = new URLSearchParams(location.search)
  const requestedScenario = manifest.scenarios.find(item => item.id === params.get('scenario'))
  const scenario = requestedScenario ?? manifest.scenarios[0]
  const requestedScene = requestedScenario?.states.find(item => item.id === params.get('scene'))
  const scene = requestedScene ?? scenario.states.find(item => item.id === scenario.initial)!
  return { scenarioId: scenario.id, sceneId: scene.id }
}

function StatusMark({ status, size = 24 }: { status: string; size?: number }) {
  const Icon = status === 'attention' ? TriangleAlert : status === 'confirmed' ? CheckCircle2 : status === 'unknown' ? CircleHelp : Circle
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
}

function FactsPanel({ facts }: { facts: { id: string; label: string; value: string; status: string }[] }) {
  const isPresent = useIsPresent()
  // 이전 장면의 사실을 exit animation 동안 중복 노출하지 않는다.
  if (!isPresent) return null
  return <div className="emergency-facts">{facts.map(fact => {
    const Icon = factSymbols[fact.id as keyof typeof factSymbols] ?? CircleHelp
    return <div key={fact.id} className={`emergency-fact tone-${fact.status}`} data-fact={fact.id}><Icon size={32} strokeWidth={1.5} aria-hidden="true" /><span>{fact.label}</span><strong><StatusMark status={fact.status} size={23} />{fact.value}</strong></div>
  })}</div>
}

export function EmergencyStudy() {
  const [selection, setSelection] = useState(readSelection)
  const [paused, setPaused] = useState(false)
  const [showSpec, setShowSpec] = useState(false)
  const [actualSize, setActualSize] = useState(false)
  const [scale, setScale] = useState(1)
  const [voiceState, setVoiceState] = useState<'idle' | 'speaking' | 'error'>('idle')
  const viewport = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusAfterChange = useRef<'action' | 'event' | null>(null)
  const activeSceneButton = useRef<HTMLButtonElement>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const reducedMotion = useReducedMotion()
  const scenario = manifest.scenarios.find(item => item.id === selection.scenarioId)!
  const sceneIndex = scenario.states.findIndex(item => item.id === selection.sceneId)
  const scene = scenario.states[sceneIndex]
  const CueIcon = symbols[scene.cue.symbol as keyof typeof symbols]
  const facts = scenario.facts.map(fact => ({ ...fact, ...Object.entries(scene.fact_overrides).find(([id]) => id === fact.id)?.[1] }))
  const requests = scenario.requests.map(request => ({ ...request, status: Object.entries(scene.request_overrides).find(([id]) => id === request.id)?.[1] ?? request.status }))

  function cancelSpeech() {
    utterance.current = null
    window.speechSynthesis?.cancel()
  }

  useEffect(() => {
    const onBack = () => { setSelection(readSelection()); setPaused(false) }
    window.addEventListener('popstate', onBack)
    window.addEventListener('pagehide', cancelSpeech)
    return () => { window.removeEventListener('popstate', onBack); window.removeEventListener('pagehide', cancelSpeech) }
  }, [])

  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('scenario', selection.scenarioId)
    url.searchParams.set('scene', selection.sceneId)
    history.replaceState(null, '', url)
    cancelSpeech()
    setVoiceState('idle')
    if (focusAfterChange.current === 'action') heading.current?.focus()
    if (focusAfterChange.current === 'event') activeSceneButton.current?.focus()
    focusAfterChange.current = null
    return cancelSpeech
  }, [selection, paused])

  useEffect(() => {
    const element = viewport.current!
    const resize = () => setScale(Math.min(1, element.clientWidth / 1440, Math.max(280, innerHeight - 410) / 810))
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    window.addEventListener('resize', resize)
    return () => { observer.disconnect(); window.removeEventListener('resize', resize) }
  }, [])

  function goToScene(id: string, source: 'action' | 'event' | null = null) {
    if (paused || !scenario.states.some(state => state.id === id)) return
    focusAfterChange.current = source
    setSelection({ ...selection, sceneId: id })
  }

  function playVoice() {
    if (voiceState === 'speaking') { cancelSpeech(); setVoiceState('idle'); return }
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) throw new Error('Speech unavailable')
      cancelSpeech()
      const next = new SpeechSynthesisUtterance(scene.voice)
      next.lang = 'ko-KR'
      next.rate = 1
      next.onend = () => { if (utterance.current === next) { utterance.current = null; setVoiceState('idle') } }
      next.onerror = () => { if (utterance.current === next) { utterance.current = null; setVoiceState('error') } }
      utterance.current = next
      setVoiceState('speaking')
      window.speechSynthesis.speak(next)
    } catch { utterance.current = null; setVoiceState('error') }
  }

  const displayScale = actualSize ? 1 : scale
  return <main className="emergency-study">
    <header className="emergency-review-header"><a href="/?study=emergency" className="emergency-review-brand">AFTER / CARE <span>Emergency storyboard</span></a><div><span className="emergency-demo-label">가상 scenario · 실제 전화·전송 없음</span><a href="/?study=tools">이전 design 비교 <ArrowRight size={14} aria-hidden="true" /></a></div></header>
    <div className="emergency-review-intro"><div><h1>상황을 보고, 다음 행동으로.</h1><p>장면을 바꿔 핵심 상황·행동·미확인이 어떻게 전달되는지 확인해 보세요.</p></div><button className="emergency-review-button" aria-expanded={showSpec} aria-controls="emergency-spec" onClick={() => setShowSpec(!showSpec)}><Code2 size={17} aria-hidden="true" />현재 장면 spec</button></div>
    <nav className="emergency-scenarios" aria-label="상황 선택">{manifest.scenarios.map((item, index) => <button key={item.id} aria-pressed={scenario.id === item.id} aria-label={item.title} onClick={() => { setPaused(false); setSelection({ scenarioId: item.id, sceneId: item.initial }) }}><span>{item.id}</span><strong>{item.title}</strong>{index === 0 ? <TriangleAlert size={20} aria-hidden="true" /> : <CircleHelp size={20} aria-hidden="true" />}</button>)}</nav>
    <div className="emergency-canvas-toolbar"><p>시작 상황: {scenario.summary}</p><div><button className="emergency-review-button" onClick={() => setPaused(!paused)}>{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{paused ? '시연 재개' : '시연 일시 중단'}</button><button className="emergency-review-button" aria-pressed={actualSize} onClick={() => setActualSize(!actualSize)}>{actualSize ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}{actualSize ? '전체 보기' : '원래 크기'}</button></div></div>
    <div className={`emergency-viewport ${paused ? 'is-paused' : ''}`} ref={viewport}>
      <div className="canvas-space" style={{ width: 1440 * displayScale, height: 810 * displayScale }}>
        <section className="emergency-screen" aria-label="시각 중심 사고 대응" inert={paused} style={{ transform: `scale(${displayScale})` }}>
          <header className="emergency-app-header"><span className="emergency-app-name"><span aria-hidden="true" />사고 대응</span><span className="emergency-context-label">{scenario.presentation.context_label}</span><button onClick={playVoice} className="emergency-voice-button">{voiceState === 'speaking' ? <VolumeX size={24} aria-hidden="true" /> : <Volume2 size={24} aria-hidden="true" />}{voiceState === 'speaking' ? '음성 안내 중지' : '음성 안내 듣기'}</button></header>
          <div className="emergency-main">
            <section className={`emergency-cue tone-${scene.cue.status}`} aria-label="핵심 상황">
              <div className="emergency-symbol" aria-hidden="true"><CueIcon strokeWidth={1.3} /><span className="emergency-symbol-state"><StatusMark status={scene.cue.status} size={68} /></span></div>
              <h2>{scene.cue.label}</h2><p>{scene.cue.detail}</p>
            </section>
            <div className="emergency-action-area">
              <div className="emergency-action-heading"><h1 ref={heading} tabIndex={-1}>{scene.title}</h1><p>{scene.instruction}</p></div>
              <div className="emergency-action-slot">{scene.actions.map(action => <button className="emergency-primary-action" key={action.id} onClick={() => goToScene(action.to, 'action')}>{action.id === 'request_help' ? <Phone size={30} aria-hidden="true" /> : action.id === 'respond' ? <Check size={30} aria-hidden="true" /> : <Route size={30} aria-hidden="true" />}<span>{action.label}</span><ArrowRight size={28} aria-hidden="true" /></button>)}</div>
              <section className="emergency-support" aria-label="추가 확인 항목"><div className="emergency-support-heading"><h2>{scenario.presentation.support_title}</h2><span>{scenario.presentation.support_note}</span></div>
                <TransitionPanel activeIndex={sceneIndex} transition={{ duration: reducedMotion ? 0 : .16 }} variants={{ enter: { opacity: .8 }, center: { opacity: 1 }, exit: { opacity: 0 } }}>
                  {scenario.states.map(state => <FactsPanel key={state.id} facts={facts.filter(fact => scenario.presentation.visible_facts.includes(fact.id))} />)}
                </TransitionPanel>
              </section>
            </div>
          </div>
          <section className="emergency-requests" aria-label="기관별 요청 상태"><h2>지원 현황</h2>{requests.filter(request => scenario.presentation.visible_requests.includes(request.id)).map(request => {
            const status = requestStatuses[request.status]
            return <div key={request.id} className={`emergency-request tone-${status.tone}`} data-request={request.id}><span className="emergency-request-icon"><StatusMark status={status.tone} size={30} /></span><span className="emergency-request-name">{request.label}</span><strong>{status.label}</strong></div>
          })}<span className="emergency-status-boundary">연결 · 접수 · 도착은 별도 확인</span></section>
        </section>
      </div>
    </div>
    <div className="emergency-voice-status" role="status">{voiceState === 'error' ? `음성 재생을 사용할 수 없어요. 음성 원고: ${scene.voice}` : voiceState === 'speaking' ? '현재 장면의 음성 안내를 재생하고 있어요.' : ''}</div>
    {paused && <p className="emergency-pause-note">시연 일시 중단 · 현재 장면과 요청 상태를 유지하고 있어요.</p>}
    <div className="emergency-storyboard-controls">
      <nav aria-label="장면 선택" className="emergency-scene-list">{scenario.states.map(state => <button key={state.id} ref={state.id === scene.id ? activeSceneButton : undefined} aria-pressed={state.id === scene.id} disabled={paused} onClick={() => goToScene(state.id)}><StatusMark status={state.cue.status} size={22} /><span>{state.label}</span>{state.id === scene.id && <span className="emergency-current">현재</span>}</button>)}</nav>
      <div className="emergency-events"><span>외부 결과 시연</span>{scene.events.length ? scene.events.map(event => <button className="emergency-review-button" key={event.id} aria-label={`시연 event: ${event.label}`} disabled={paused} onClick={() => goToScene(event.to, 'event')}>{event.label}<ArrowRight size={15} aria-hidden="true" /></button>) : <p>다른 장면을 선택해 비교할 수 있어요.</p>}</div>
    </div>
    {showSpec && <section id="emergency-spec" className="emergency-spec" aria-label="현재 장면 spec"><div><h2>{scenario.id} / {scene.label}</h2><p>Source nodes: {scenario.source_nodes.join(' · ')}<br />미결정: {scenario.open_decisions.join(' · ')}<br />뒤로 둔 정보: {scene.deferred.join(' · ')}</p><h3>음성 원고</h3><p>{scene.voice}</p><p>Symbol은 정보 종류를 나타내며 실제 위치나 신체 부위를 재현하지 않습니다.</p></div><pre>{JSON.stringify({ simulation_only: true, data_source: manifest.data_source, scenario: scenario.id, scene, facts, requests, presentation: scenario.presentation }, null, 2)}</pre></section>}
    <footer className="emergency-review-footer"><span>Spec v{manifest.version} · 3 scenarios / 9 scenes</span><span>이해도 평가 전 · 실제 차량 동작 미검증</span></footer>
  </main>
}
