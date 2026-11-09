import { ViewTransition, startTransition, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import NumberFlow from '@number-flow/react'
import { ArrowRight, CheckCircle2, Circle, CircleHelp, Code2, Eye, Maximize2, Minimize2, Pause, Play, TriangleAlert, Volume2, VolumeX } from 'lucide-react'
import { DISPLAY, PleosDisplay } from './PleosDisplay'
import { Glyph, StatusMark, glyphFor } from './glyphs'
import { manifest, createSession, restoreSession, saveSession, transition, updateDraft, type Edge } from './session'
import { WorkflowPanel } from './WorkflowPanel'
import './motion'
import './emergency.css'

const requestStatuses: Record<string, { label: string; tone: string }> = manifest.request_statuses

function readSelection() {
  const params = new URLSearchParams(location.search)
  const requestedScenario = manifest.scenarios.find(item => item.id === params.get('scenario'))
  const scenario = requestedScenario ?? manifest.scenarios[0]
  const requestedScene = requestedScenario?.states.find(item => item.id === params.get('scene'))
  const scene = requestedScene ?? scenario.states.find(item => item.id === scenario.initial)!
  return restoreSession(scenario.id, params.get('scene') ? scene.id : undefined)
}

// 검토 UI(장면 선택)는 차량 화면 밖이라 Lucide 표식을 유지한다.
function ReviewMark({ status, size = 24 }: { status: string; size?: number }) {
  const Icon = status === 'attention' ? TriangleAlert : status === 'confirmed' ? CheckCircle2 : status === 'unknown' ? CircleHelp : Circle
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
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

function CallSpectrum({ paused }: { paused: boolean }) {
  // shortcut: 시연용 막대 움직임. 실제 통화 audio 연동 시 측정한 주파수별 level 로 교체.
  const heights = [8, 12, 9, 18, 26, 16, 30, 38, 24, 34, 42, 28, 36, 24, 40, 32, 22, 38, 28, 42, 30, 20, 34, 26, 16, 24, 14, 18, 10, 12, 8]
  return <div className="emergency-call-spectrum" data-paused={paused} aria-hidden="true">
    {heights.map((height, index) => <span key={index} style={{ height, '--spectrum-duration': `${1.6 + index % 5 * .17}s`, '--spectrum-delay': `${-index * .23}s` } as CSSProperties} />)}
  </div>
}

export function EmergencyStudy() {
  const [selection, setSelection] = useState(readSelection)
  const [resetKey, setResetKey] = useState(0)
  const countdownKey = `${selection.scenarioId}/${selection.sceneId}/${resetKey}`
  const [storageAvailable, setStorageAvailable] = useState(true)
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
  // 장면 전환은 view transition 으로 다음 frame 에 commit 된다. 그 사이 이전 장면의 countdown 이 끝나 운전자의 선택을 덮지 않게 막는다.
  const leaving = useRef(false)
  const activeSceneButton = useRef<HTMLButtonElement>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const remainingMs = useRef(0)
  // 남은 초에는 어느 장면 진입에서 센 값인지 꼬리표를 단다. 클릭 직전 tick 의 갱신이 React 큐에 남아
  // 재진입 뒤에 적용돼도, 꼬리표가 다르면 버리고 처음 초를 보여 준다.
  const [countdown, setCountdown] = useState<{ for: string | null; seconds: number }>({ for: null, seconds: 0 })
  const scenario = manifest.scenarios.find(item => item.id === selection.scenarioId)!
  const sceneIndex = scenario.states.findIndex(item => item.id === selection.sceneId)
  const scene = scenario.states[sceneIndex]
  const facts = scenario.facts.map(fact => ({ ...fact, ...Object.entries(selection.facts).find(([id]) => id === fact.id)?.[1] }))
  const requests = scenario.requests.map(request => ({ ...request, status: Object.entries(selection.requests).find(([id]) => id === request.id)?.[1] ?? request.status }))
  const callConnected = scene.title === '119 통화 연결됨'
  const secondsLeft = countdown.for === countdownKey ? countdown.seconds : scene.auto_contact?.seconds ?? 0
  useEffect(() => { setStorageAvailable(saveSession(selection)) }, [selection])

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

  // 장면이 바뀐 commit 에서 바로 실행한다. 일반 effect 는 view transition 이 끝날 때까지 밀린다.
  useLayoutEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('scenario', selection.scenarioId)
    url.searchParams.set('scene', selection.sceneId)
    url.searchParams.delete('material')
    history.replaceState(null, '', url)
    leaving.current = false
    cancelSpeech()
    setVoiceState('idle')
    if (focusAfterChange.current === 'action') heading.current?.focus()
    if (focusAfterChange.current === 'event') activeSceneButton.current?.focus()
    focusAfterChange.current = null
    return cancelSpeech
  }, [selection, paused, present === 'covered'])

  // 장면에 들어올 때마다 countdown 을 처음부터 시작하고 경고음·음성을 한 번 낸다.
  useEffect(() => {
    if (!scene.auto_contact) return
    remainingMs.current = scene.auto_contact.seconds * 1000
    beep()
    speak()
  }, [countdownKey])

  // 남은 시간은 마감 시각으로 계산한다. 멈추면 남은 ms 를 저장하고, 장면이 바뀌면 timer 를 버린다.
  useEffect(() => {
    const auto = scene.auto_contact
    if (!auto || paused || present === 'covered') return
    const end = Date.now() + remainingMs.current
    const timer = setInterval(() => {
      if (leaving.current) return
      remainingMs.current = Math.max(0, end - Date.now())
      setCountdown({ for: countdownKey, seconds: Math.ceil(remainingMs.current / 1000) })
      if (remainingMs.current === 0) {
        clearInterval(timer)
        // 사라지는 button 에 focus 가 있었으면 새 장면 제목으로 옮긴다. 검토 control 의 focus 는 건드리지 않는다.
        goToScene(auto.expire, 'action')
      }
    }, 250)
    return () => { clearInterval(timer); remainingMs.current = Math.max(0, end - Date.now()) }
  }, [countdownKey, paused, present === 'covered'])

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
    setResetKey(key => key + 1)
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
    leaving.current = true
    startTransition(() => setSelection(current => {
      if (source) {
        const edge = [...scene.actions, ...scene.events].find(edge => edge.to === id)
        if (edge) return transition(current, edge)
        if (scene.auto_contact && [scene.auto_contact.expire, scene.auto_contact.cancel].includes(id)) {
          const dest = scenario.states.find(s => s.id === id)!
          return { ...current, sceneId: id, requests: { ...current.requests, ...dest.request_overrides }, facts: { ...current.facts, ...dest.fact_overrides } }
        }
      }
      // Review scene navigation explicitly starts a standalone fixture.
      setResetKey(key => key + 1)
      return createSession(scenario.id, id)
    }))
  }

  function act(edge: Edge, source: 'action' | 'event') {
    if (paused || leaving.current) return
    const next = transition(selection, edge)
    if (next === selection) return
    focusAfterChange.current = source
    leaving.current = true
    // Persist the accepted action before an animation or immediate reload can interrupt it.
    setStorageAvailable(saveSession(next))
    const url = new URL(location.href)
    url.searchParams.set('scene', next.sceneId)
    history.replaceState(null, '', url)
    startTransition(() => setSelection(next))
  }

  function editDraft(change: { record?: string; scope?: string[] }) {
    setSelection(current => updateDraft(current, change))
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
    <header className="emergency-review-header"><a href="/?study=emergency" className="emergency-review-brand">AFTER / CARE <span>Emergency storyboard</span></a><div><span className="emergency-demo-label">가상 scenario · 실제 전화·전송 없음{callConnected && ' · spectrum은 가상 음성 반응'}</span><span className="emergency-demo-label">안전 안내 {manifest.safety_guidance.status}</span><a href="/?study=emergency-catalog">Design system</a><a href="/?study=tools">이전 design 비교 <ArrowRight size={14} aria-hidden="true" /></a></div></header>
    <div className="emergency-review-intro"><div><h1>상황을 보고, 다음 행동으로.</h1><p>장면을 바꿔 핵심 상황·행동·미확인이 어떻게 전달되는지 확인해 보세요.</p></div><button className="emergency-review-button" aria-expanded={showSpec} aria-controls="emergency-spec" onClick={() => setShowSpec(!showSpec)}><Code2 size={17} aria-hidden="true" />현재 장면 spec</button></div>
    <nav className="emergency-scenarios" aria-label="상황 선택">{manifest.scenarios.map((item, index) => <button key={item.id} aria-pressed={scenario.id === item.id} aria-label={item.title} onClick={() => { setPaused(false); setResetKey(key => key + 1); startTransition(() => setSelection(createSession(item.id))) }}><span>{item.id}</span><strong>{item.title}</strong>{index === 0 ? <TriangleAlert size={20} aria-hidden="true" /> : <CircleHelp size={20} aria-hidden="true" />}</button>)}</nav>
    <div className="emergency-canvas-toolbar"><p>시작 상황: {scenario.summary}</p><div><button className="emergency-review-button" onClick={showForThreeSeconds}><Eye size={15} aria-hidden="true" />3초 보기</button><button className="emergency-review-button" onClick={() => setPaused(!paused)}>{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{paused ? '시연 재개' : '시연 일시 중단'}</button><button className="emergency-review-button" aria-pressed={actualSize} onClick={() => setActualSize(!actualSize)}>{actualSize ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}{actualSize ? '전체 보기' : '원래 크기'}</button></div></div>
    <div className={`emergency-viewport ${paused ? 'is-paused' : ''}`} ref={viewport}>
      <div className="canvas-space" style={{ width: DISPLAY.width * displayScale, height: DISPLAY.height * displayScale }}>
        <PleosDisplay scale={displayScale}>
        <section className="emergency-screen" data-surface-status="flat" data-scenario={scenario.id} data-scene={scene.id} data-request-count={selection.submissions} aria-label="시각 중심 사고 대응" inert={paused}>
          <ViewTransition name="cue"><section className="emergency-slot emergency-detected" data-slot="detected" aria-label="핵심 상황">
            <div className="emergency-cue"><div className="emergency-symbol" aria-hidden="true"><Glyph name={glyphFor.cue(scene.cue.symbol)} size={48} /><span className="emergency-symbol-state"><StatusMark tone={scene.cue.status} size={28} /></span></div>
            <h2 className={`tone-${scene.cue.status}`}>{scenario.presentation.detected} · {scene.cue.label}</h2></div>
            <button onClick={playVoice} className="emergency-voice-button">{voiceState === 'speaking' ? <VolumeX size={24} aria-hidden="true" /> : <Volume2 size={24} aria-hidden="true" />}{voiceState === 'speaking' ? '음성 안내 중지' : '음성 안내 듣기'}</button>
            <div className="emergency-facts">{facts.filter(fact => scenario.presentation.visible_facts.includes(fact.id) || (fact.id === 'risk' && fact.status === 'attention')).map(fact => <div key={fact.id} className={`emergency-fact tone-${fact.status}`} data-fact={fact.id}><span className="emergency-fact-plate"><Glyph name={glyphFor.fact(fact.id)} size={32} /></span><span>{fact.label}</span><strong><StatusMark tone={fact.status} size={24} />{fact.value}</strong></div>)}</div>
          </section></ViewTransition>
          <div className="emergency-response-panel">
          <section className="emergency-slot emergency-car" data-slot="car" aria-label="차량이 할 일">
            {(() => {
              const carActions = scene.actions.filter(action => action.slot !== 'self').map(action => <button className={action.secondary ? "emergency-secondary-action" : "emergency-primary-action"} key={action.id} disabled={(action.effect === "submit" && !selection.scope.length) || (action.effect === "save_record" && !selection.record.trim())} onClick={() => act(action, 'action')}><Glyph name={glyphFor.action(action.id)} size={36} /><span>{action.label}</span></button>)
              const copy = <ViewTransition name="car-copy"><div className="emergency-car-copy" aria-live="polite">{scene.step && <span className="emergency-step">{scene.step}</span>}<h1 ref={heading} tabIndex={-1}>{!storageAvailable && scene.id === 'record_saved' ? '기기에 저장하지 못했어요' : scene.title}</h1>{scene.auto_contact ? <p>응답이 없으면 자동 연결</p> : callConnected ? <CallSpectrum paused={paused || present === 'covered'} /> : scene.instruction && scene.panel !== 'scope' && <p>{scene.instruction}</p>}</div></ViewTransition>
              if (scene.auto_contact) return <div className="emergency-car-main" data-urgent>
                <ViewTransition name="phase-ring" enter="vt-enter" exit="vt-exit"><PhaseRing key={countdownKey} phase="decide" fraction={secondsLeft / scene.auto_contact.seconds}><b data-countdown={secondsLeft}><NumberFlow value={secondsLeft} /></b></PhaseRing></ViewTransition>
                <div>{copy}<ViewTransition name="car-actions" enter="vt-enter" exit="vt-exit"><div className="emergency-car-actions">{carActions}<button className="emergency-cancel" onClick={() => goToScene(scene.auto_contact!.cancel, 'action')}>취소</button></div></ViewTransition></div>
              </div>
              return <div className={`emergency-car-main${scene.panel ? " has-workflow" : ""}`}>
                {callConnected ? <ViewTransition name="phase-ring" enter="vt-enter" exit="vt-exit"><div className="emergency-call-symbol" aria-hidden="true"><Glyph name="phone" size={112} /></div></ViewTransition> : scene.phase === 'progress' && <ViewTransition name="phase-ring" enter="vt-enter" exit="vt-exit"><PhaseRing phase="progress" fraction={.28}>···</PhaseRing></ViewTransition>}
                <div>{copy}<WorkflowPanel scene={scene} session={selection} persistent={storageAvailable} onChange={editDraft} />{carActions.length > 0 && <ViewTransition name="car-actions" enter="vt-enter" exit="vt-exit"><div className="emergency-car-actions">{carActions}</div></ViewTransition>}</div>
              </div>
            })()}
            <ViewTransition name="requests"><div className="emergency-requests" aria-label="기관별 요청 상태">{requests.map(request => {
              const status = requestStatuses[request.status]
              return <div key={request.id} className={`emergency-request tone-${status.tone}`} data-request={request.id}><StatusMark tone={status.tone} size={30} /><span className="emergency-request-name">{request.label}</span><strong>{status.label.split(' · ').map((part, index) => <span className="emergency-request-line" key={part}>{index > 0 && <span className="sr-only"> · </span>}{part}</span>)}</strong></div>
            })}</div></ViewTransition>
          </section>
          <ViewTransition name="self"><section className="emergency-slot emergency-self" data-slot="self" aria-label="지금 할 일">
            {scene.self_action && <span className="emergency-self-plate" aria-hidden="true"><Glyph name={glyphFor.self(scene.self_action.id)} size={56} /></span>}
            <div className="emergency-self-copy">
              {scene.self_action?.condition && <p className="emergency-self-condition">{scene.self_action.condition}</p>}
              {scene.actions.filter(action => action.slot === 'self').map(action => <button className="emergency-primary-action is-self" key={action.id} onClick={() => act(action, 'action')}><Glyph name={glyphFor.action(action.id)} size={36} /><span>{action.label}</span></button>)}
              {scene.self_action && <p className="emergency-self-action"><strong>{scene.self_action.now}</strong>{scene.self_action.next && <span>→ {scene.self_action.next}</span>}</p>}
            </div>
          </section></ViewTransition>
          </div>
        </section>
        </PleosDisplay>
      </div>
      {present === 'covered' && <div className="emergency-cover" data-cover><button className="emergency-review-button" onClick={showForThreeSeconds}>다시 3초</button><button className="emergency-review-button" onClick={closePresentation}>닫기</button></div>}
    </div>
    {!storageAvailable && <p role="alert" className="emergency-storage-warning">이 browser에서 기록을 보관할 수 없어요. 화면을 닫으면 진행 내용이 사라져요.</p>}
    <div className="emergency-voice-status" role="status">{voiceState === 'error' ? `음성 재생을 사용할 수 없어요. 음성 원고: ${scene.voice}` : voiceState === 'speaking' ? '현재 장면의 음성 안내를 재생하고 있어요.' : ''}</div>
    {paused && <p className="emergency-pause-note">시연 일시 중단 · 현재 장면과 요청 상태를 유지하고 있어요.</p>}
    <div className="emergency-storyboard-controls">
      <nav aria-label="장면 선택" className="emergency-scene-list">{scenario.states.map(state => <button key={state.id} ref={state.id === scene.id ? activeSceneButton : undefined} aria-pressed={state.id === scene.id} disabled={paused} onClick={() => goToScene(state.id)}><ReviewMark status={state.cue.status} size={22} /><span>{state.label}</span>{state.id === scene.id && <span className="emergency-current">현재</span>}</button>)}</nav>
      <div className="emergency-events"><span>외부 결과 시연</span>{scene.events.length ? scene.events.map(event => <button className="emergency-review-button" key={event.id} aria-label={`시연 event: ${event.label}`} disabled={paused} onClick={() => act(event, 'event')}>{event.label}<ArrowRight size={15} aria-hidden="true" /></button>) : <p>다른 장면을 선택해 비교할 수 있어요.</p>}</div>
    </div>
    {showSpec && <section id="emergency-spec" className="emergency-spec" aria-label="현재 장면 spec"><div><h2>{scenario.id} / {scene.label}</h2><p>Source nodes: {scenario.source_nodes.join(' · ')}<br />미결정: {scenario.open_decisions.join(' · ')}<br />뒤로 둔 정보: {scene.deferred.join(' · ')}</p><h3>음성 원고</h3><p>{scene.voice}</p><h3>안전 안내 ({manifest.safety_guidance.status})</h3><p>{manifest.safety_guidance.source}</p><p>Symbol은 정보 종류를 나타내며 실제 위치나 신체 부위를 재현하지 않습니다.</p></div><pre>{JSON.stringify({ simulation_only: true, data_source: manifest.data_source, scenario: scenario.id, scene, facts, requests, presentation: scenario.presentation }, null, 2)}</pre></section>}
    <footer className="emergency-review-footer"><span>Spec v{manifest.version} · {manifest.scenarios.length} scenarios / {manifest.scenarios.reduce((total, item) => total + item.states.length, 0)} scenes</span><span>이해도 평가 전 · 실제 차량 동작 미검증</span></footer>
  </main>
}
