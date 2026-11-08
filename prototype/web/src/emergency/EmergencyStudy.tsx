import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, CheckCircle2, Circle, CircleHelp, Code2, Eye, Maximize2, Minimize2, Pause, Play, TriangleAlert, Volume2, VolumeX } from 'lucide-react'
import { SatinSurface, type SurfaceStatus } from './SatinSurface'
import { DISPLAY, PleosDisplay } from './PleosDisplay'
import { Glyph, GlyphDefs, StatusMark, glyphFor, metalPlate } from './glyphs'
import manifest from '../../../../specs/emergency-experience/scenarios.json'
import './emergency.css'
import './satin.css'

const requestStatuses: Record<string, { label: string; tone: string }> = manifest.request_statuses

function readSelection() {
  const params = new URLSearchParams(location.search)
  const requestedScenario = manifest.scenarios.find(item => item.id === params.get('scenario'))
  const scenario = requestedScenario ?? manifest.scenarios[0]
  const requestedScene = requestedScenario?.states.find(item => item.id === params.get('scene'))
  const scene = requestedScene ?? scenario.states.find(item => item.id === scenario.initial)!
  return { scenarioId: scenario.id, sceneId: scene.id }
}

// 검토 UI(장면 선택)는 차량 화면 밖이라 Lucide 표식을 유지한다.
function ReviewMark({ status, size = 24 }: { status: string; size?: number }) {
  const Icon = status === 'attention' ? TriangleAlert : status === 'confirmed' ? CheckCircle2 : status === 'unknown' ? CircleHelp : Circle
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
}

type Scene = Omit<(typeof manifest.scenarios)[number]['states'][number], 'actions'> & {
  phase: 'decide' | 'progress' | 'settled'
  instruction?: string
  auto_contact?: { seconds: number; cancel: string; expire: string }
  self_action?: { id: string; condition?: string; now: string; next?: string }
  actions: { id: string; label: string; to: string; slot?: string }[]
}

const RING = 2 * Math.PI * 88

// Countdown 시작 경고음. Browser 가 자동 재생을 막으면(context 가 running 이 아니면) 조용히 넘어간다. 차단 표시는 음성 오류 경로가 맡는다.
function beep() {
  try {
    const context = new AudioContext()
    if (context.state !== 'running') { void context.close(); return }
    for (const at of [0, .25, .5]) {
      const tone = context.createOscillator()
      const gain = context.createGain()
      tone.frequency.value = 880
      gain.gain.value = .15
      tone.connect(gain).connect(context.destination)
      tone.start(context.currentTime + at)
      tone.stop(context.currentTime + at + .15)
    }
    setTimeout(() => void context.close(), 1200)
  } catch { /* 소리 없이 화면 문구로 진행한다. */ }
}

// ② 의 상태 ring. decide 는 남은 비율, progress 는 고정 호.
function PhaseRing({ phase, fraction, children }: { phase: string; fraction: number; children: ReactNode }) {
  return <div className={`emergency-ring is-${phase}`} aria-hidden="true">
    <svg viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="88" className="emergency-ring-track" /><circle cx="100" cy="100" r="88" className="emergency-ring-value" strokeDasharray={RING} strokeDashoffset={RING * (1 - fraction)} transform="rotate(-90 100 100)" /></svg>
    <span>{children}</span>
  </div>
}

export function EmergencyStudy() {
  const [selection, setSelection] = useState(readSelection)
  const [satin, setSatin] = useState(() => new URLSearchParams(location.search).get('material') === 'satin')
  const [surfaceIntensity, setSurfaceIntensity] = useState(70)
  const [surfaceStatus, setSurfaceStatus] = useState<SurfaceStatus>('loading')
  const [paused, setPaused] = useState(false)
  const [showSpec, setShowSpec] = useState(false)
  const [actualSize, setActualSize] = useState(false)
  const [scale, setScale] = useState(1)
  const [voiceState, setVoiceState] = useState<'idle' | 'speaking' | 'error'>('idle')
  // 3초 보기: 검토 UI 를 숨기고 차량 화면만 3초 보여 준 뒤 가린다. 가린 동안 countdown 은 멈춘다.
  const [present, setPresent] = useState<'off' | 'showing' | 'covered'>('off')
  const presentTimer = useRef(0)
  const viewport = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusAfterChange = useRef<'action' | 'event' | null>(null)
  const activeSceneButton = useRef<HTMLButtonElement>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const remainingMs = useRef(0)
  // 남은 초에는 어느 장면 진입에서 센 값인지 꼬리표를 단다. 클릭 직전 tick 의 갱신이 React 큐에 남아
  // 재진입 뒤에 적용돼도, 꼬리표가 다르면 버리고 처음 초를 보여 준다.
  const [countdown, setCountdown] = useState<{ for: object | null; seconds: number }>({ for: null, seconds: 0 })
  const scenario = manifest.scenarios.find(item => item.id === selection.scenarioId)!
  const sceneIndex = scenario.states.findIndex(item => item.id === selection.sceneId)
  const scene = scenario.states[sceneIndex] as Scene
  const facts = scenario.facts.map(fact => ({ ...fact, ...Object.entries(scene.fact_overrides).find(([id]) => id === fact.id)?.[1] }))
  const requests = scenario.requests.map(request => ({ ...request, status: Object.entries(scene.request_overrides).find(([id]) => id === request.id)?.[1] ?? request.status }))
  const secondsLeft = countdown.for === selection ? countdown.seconds : scene.auto_contact?.seconds ?? 0
  // 장면에 (다시) 들어오면 run 을 올려 ring 을 새로 그린다. 같은 ring 을 쓰면 이전 값에서 다시 차오른다.
  const [entry, setEntry] = useState({ selection, run: 0 })
  if (entry.selection !== selection) setEntry({ selection, run: entry.run + 1 })

  function cancelSpeech() {
    utterance.current = null
    window.speechSynthesis?.cancel()
  }

  useEffect(() => {
    const onBack = () => { setSelection(readSelection()); setPaused(false); setSatin(new URLSearchParams(location.search).get('material') === 'satin') }
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
  }, [selection, paused, present === 'covered'])

  useEffect(() => {
    const url = new URL(location.href)
    if (satin) url.searchParams.set('material', 'satin')
    else url.searchParams.delete('material')
    history.replaceState(null, '', url)
  }, [satin])

  // 장면에 들어올 때마다 countdown 을 처음부터 시작하고 경고음·음성을 한 번 낸다.
  useEffect(() => {
    if (!scene.auto_contact) return
    remainingMs.current = scene.auto_contact.seconds * 1000
    beep()
    speak()
  }, [selection])

  // 남은 시간은 마감 시각으로 계산한다. 멈추면 남은 ms 를 저장하고, 장면이 바뀌면 timer 를 버린다.
  useEffect(() => {
    const auto = scene.auto_contact
    if (!auto || paused || present === 'covered') return
    const end = Date.now() + remainingMs.current
    const timer = setInterval(() => {
      remainingMs.current = Math.max(0, end - Date.now())
      setCountdown({ for: selection, seconds: Math.ceil(remainingMs.current / 1000) })
      if (remainingMs.current === 0) {
        clearInterval(timer)
        // 사라지는 button 에 focus 가 있었으면 새 장면 제목으로 옮긴다. 검토 control 의 focus 는 건드리지 않는다.
        goToScene(auto.expire, document.activeElement?.closest('[data-urgent]') ? 'action' : null)
      }
    }, 250)
    return () => { clearInterval(timer); remainingMs.current = Math.max(0, end - Date.now()) }
  }, [selection, paused, present === 'covered'])

  useEffect(() => {
    const element = viewport.current!
    const resize = () => setScale(present !== 'off' ? Math.min(element.clientWidth / DISPLAY.width, innerHeight / DISPLAY.height) : Math.min(1, element.clientWidth / DISPLAY.width, Math.max(280, innerHeight - element.getBoundingClientRect().top - scrollY - 126) / DISPLAY.height))
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    window.addEventListener('resize', resize)
    return () => { observer.disconnect(); window.removeEventListener('resize', resize) }
  }, [present !== 'off'])

  function showForThreeSeconds() {
    clearTimeout(presentTimer.current)
    setPaused(false)
    setSelection({ ...selection })
    setPresent('showing')
    presentTimer.current = window.setTimeout(() => setPresent('covered'), 3000)
  }

  function closePresentation() {
    clearTimeout(presentTimer.current)
    setPresent('off')
  }

  function goToScene(id: string, source: 'action' | 'event' | null = null) {
    if (paused || !scenario.states.some(state => state.id === id)) return
    focusAfterChange.current = source
    setSelection({ ...selection, sceneId: id })
  }

  function playVoice() {
    if (voiceState === 'speaking') { cancelSpeech(); setVoiceState('idle'); return }
    speak()
  }

  function speak() {
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

  const displayScale = actualSize && present === 'off' ? 1 : scale
  return <main className={`emergency-study${present !== 'off' ? ' is-presenting' : ''}`}>
    <header className="emergency-review-header"><a href="/?study=emergency" className="emergency-review-brand">AFTER / CARE <span>Emergency storyboard</span></a><div><span className="emergency-demo-label">가상 scenario · 실제 전화·전송 없음</span><span className="emergency-demo-label">안전 안내 {manifest.safety_guidance.status}</span><a href="/?study=tools">이전 design 비교 <ArrowRight size={14} aria-hidden="true" /></a></div></header>
    <div className="emergency-review-intro"><div><h1>상황을 보고, 다음 행동으로.</h1><p>장면을 바꿔 핵심 상황·행동·미확인이 어떻게 전달되는지 확인해 보세요.</p></div><button className="emergency-review-button" aria-expanded={showSpec} aria-controls="emergency-spec" onClick={() => setShowSpec(!showSpec)}><Code2 size={17} aria-hidden="true" />현재 장면 spec</button></div>
    <section className="emergency-material-review" aria-label="Surface preview"><div><strong>C / SATIN METAL</strong><p>{satin && surfaceStatus === 'unavailable' ? 'C render 불가 · 기본 background로 표시' : 'Surface preview · 장면과 요청 상태는 그대로 유지'}</p></div><div className="emergency-material-controls"><div className="emergency-material-switch" role="group" aria-label="화면 재질"><button aria-pressed={!satin} onClick={() => setSatin(false)}>기존 flat</button><button aria-pressed={satin} onClick={() => setSatin(true)}>C · Satin</button></div><label className="emergency-material-intensity" htmlFor="surface-intensity"><span>표면 강도</span><span>{surfaceIntensity}%</span><input id="surface-intensity" aria-label="표면 강도" type="range" min="0" max="100" value={surfaceIntensity} disabled={!satin} onChange={event => setSurfaceIntensity(Number(event.target.value))} /></label></div></section>
    <nav className="emergency-scenarios" aria-label="상황 선택">{manifest.scenarios.map((item, index) => <button key={item.id} aria-pressed={scenario.id === item.id} aria-label={item.title} onClick={() => { setPaused(false); setSelection({ scenarioId: item.id, sceneId: item.initial }) }}><span>{item.id}</span><strong>{item.title}</strong>{index === 0 ? <TriangleAlert size={20} aria-hidden="true" /> : <CircleHelp size={20} aria-hidden="true" />}</button>)}</nav>
    <div className="emergency-canvas-toolbar"><p>시작 상황: {scenario.summary}</p><div><button className="emergency-review-button" onClick={showForThreeSeconds}><Eye size={15} aria-hidden="true" />3초 보기</button><button className="emergency-review-button" onClick={() => setPaused(!paused)}>{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{paused ? '시연 재개' : '시연 일시 중단'}</button><button className="emergency-review-button" aria-pressed={actualSize} onClick={() => setActualSize(!actualSize)}>{actualSize ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}{actualSize ? '전체 보기' : '원래 크기'}</button></div></div>
    <div className={`emergency-viewport ${paused ? 'is-paused' : ''}`} ref={viewport}>
      <div className="canvas-space" style={{ width: DISPLAY.width * displayScale, height: DISPLAY.height * displayScale }}>
        <PleosDisplay scale={displayScale}>
        <section className={`emergency-screen${satin ? ' is-satin' : ''}`} data-surface-status={satin ? surfaceStatus : 'flat'} aria-label="시각 중심 사고 대응" inert={paused} style={{ '--metal-plate': metalPlate } as CSSProperties}>
          <GlyphDefs />
          {satin && <SatinSurface intensity={surfaceIntensity} onStatus={setSurfaceStatus} />}
          <section className="emergency-slot emergency-detected" data-slot="detected" aria-label="핵심 상황">
            <div className="emergency-symbol metal-plate" aria-hidden="true"><Glyph name={glyphFor.cue(scene.cue.symbol)} depth="deep" size={48} /><span className="emergency-symbol-state"><StatusMark tone={scene.cue.status} size={28} /></span></div>
            <h2 className={`tone-${scene.cue.status}`}>{scenario.presentation.detected} · {scene.cue.label}</h2>
            <button onClick={playVoice} className="emergency-voice-button">{voiceState === 'speaking' ? <VolumeX size={24} aria-hidden="true" /> : <Volume2 size={24} aria-hidden="true" />}{voiceState === 'speaking' ? '음성 안내 중지' : '음성 안내 듣기'}</button>
            <div className="emergency-facts">{facts.filter(fact => scenario.presentation.visible_facts.includes(fact.id)).map(fact => <div key={fact.id} className={`emergency-fact tone-${fact.status}`} data-fact={fact.id}><span className="emergency-fact-plate metal-plate"><Glyph name={glyphFor.fact(fact.id)} depth="shallow" size={32} /></span><span>{fact.label}</span><strong><StatusMark tone={fact.status} size={24} />{fact.value}</strong></div>)}</div>
          </section>
          <section className="emergency-slot emergency-car" data-slot="car" aria-label="차량이 할 일">
            {(() => {
              const carActions = scene.actions.filter(action => action.slot !== 'self').map(action => <button className="emergency-primary-action" key={action.id} onClick={() => goToScene(action.to, 'action')}><Glyph name={glyphFor.action(action.id)} depth="solid" size={36} /><span>{action.label}</span></button>)
              const copy = <div className="emergency-car-copy" aria-live="polite"><h1 ref={heading} tabIndex={-1}>{scene.title}</h1>{scene.auto_contact ? <p>응답이 없으면 자동 연결</p> : scene.instruction && <p>{scene.instruction}</p>}</div>
              if (scene.auto_contact) return <div className="emergency-car-main" data-urgent>
                <PhaseRing key={entry.run} phase="decide" fraction={secondsLeft / scene.auto_contact.seconds}><b data-countdown>{secondsLeft}</b></PhaseRing>
                <div>{copy}<div className="emergency-car-actions">{carActions}<button className="emergency-cancel" onClick={() => goToScene(scene.auto_contact!.cancel, 'action')}>취소</button></div></div>
              </div>
              return <div className="emergency-car-main">
                {scene.phase === 'progress' && <PhaseRing phase="progress" fraction={.28}>···</PhaseRing>}
                <div>{copy}{carActions.length > 0 && <div className="emergency-car-actions">{carActions}</div>}</div>
              </div>
            })()}
            <div className="emergency-requests" aria-label="기관별 요청 상태">{requests.map(request => {
              const status = requestStatuses[request.status]
              return <div key={request.id} className={`emergency-request tone-${status.tone}`} data-request={request.id}><StatusMark tone={status.tone} size={30} /><span className="emergency-request-name">{request.label}</span><strong>{status.label}</strong></div>
            })}</div>
          </section>
          <section className="emergency-slot emergency-self" data-slot="self" aria-label="지금 할 일">
            {scene.self_action && <span className="emergency-self-plate metal-plate" aria-hidden="true"><Glyph name={glyphFor.self(scene.self_action.id)} depth="deep" size={56} /></span>}
            <div className="emergency-self-copy">
              {scene.self_action?.condition && <p className="emergency-self-condition">{scene.self_action.condition}</p>}
              {scene.actions.filter(action => action.slot === 'self').map(action => <button className="emergency-primary-action is-self" key={action.id} onClick={() => goToScene(action.to, 'action')}><Glyph name={glyphFor.action(action.id)} depth="solid" size={36} /><span>{action.label}</span></button>)}
              {scene.self_action && <p className="emergency-self-action"><strong>{scene.self_action.now}</strong>{scene.self_action.next && <span>→ {scene.self_action.next}</span>}</p>}
            </div>
          </section>
        </section>
        </PleosDisplay>
      </div>
      {present === 'covered' && <div className="emergency-cover" data-cover><button className="emergency-review-button" onClick={showForThreeSeconds}>다시 3초</button><button className="emergency-review-button" onClick={closePresentation}>닫기</button></div>}
    </div>
    <div className="emergency-voice-status" role="status">{voiceState === 'error' ? `음성 재생을 사용할 수 없어요. 음성 원고: ${scene.voice}` : voiceState === 'speaking' ? '현재 장면의 음성 안내를 재생하고 있어요.' : ''}</div>
    {paused && <p className="emergency-pause-note">시연 일시 중단 · 현재 장면과 요청 상태를 유지하고 있어요.</p>}
    <div className="emergency-storyboard-controls">
      <nav aria-label="장면 선택" className="emergency-scene-list">{scenario.states.map(state => <button key={state.id} ref={state.id === scene.id ? activeSceneButton : undefined} aria-pressed={state.id === scene.id} disabled={paused} onClick={() => goToScene(state.id)}><ReviewMark status={state.cue.status} size={22} /><span>{state.label}</span>{state.id === scene.id && <span className="emergency-current">현재</span>}</button>)}</nav>
      <div className="emergency-events"><span>외부 결과 시연</span>{scene.events.length ? scene.events.map(event => <button className="emergency-review-button" key={event.id} aria-label={`시연 event: ${event.label}`} disabled={paused} onClick={() => goToScene(event.to, 'event')}>{event.label}<ArrowRight size={15} aria-hidden="true" /></button>) : <p>다른 장면을 선택해 비교할 수 있어요.</p>}</div>
    </div>
    {showSpec && <section id="emergency-spec" className="emergency-spec" aria-label="현재 장면 spec"><div><h2>{scenario.id} / {scene.label}</h2><p>Source nodes: {scenario.source_nodes.join(' · ')}<br />미결정: {scenario.open_decisions.join(' · ')}<br />뒤로 둔 정보: {scene.deferred.join(' · ')}</p><h3>음성 원고</h3><p>{scene.voice}</p><h3>안전 안내 ({manifest.safety_guidance.status})</h3><p>{manifest.safety_guidance.source}</p><p>Symbol은 정보 종류를 나타내며 실제 위치나 신체 부위를 재현하지 않습니다.</p></div><pre>{JSON.stringify({ simulation_only: true, data_source: manifest.data_source, scenario: scenario.id, scene, facts, requests, presentation: scenario.presentation }, null, 2)}</pre></section>}
    <footer className="emergency-review-footer"><span>Spec v{manifest.version} · {manifest.scenarios.length} scenarios / {manifest.scenarios.reduce((total, item) => total + item.states.length, 0)} scenes</span><span>이해도 평가 전 · 실제 차량 동작 미검증</span></footer>
  </main>
}
