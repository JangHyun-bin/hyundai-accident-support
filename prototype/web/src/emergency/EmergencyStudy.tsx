import { startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Circle, CircleHelp, Code2, Eye, Pause, Play, TriangleAlert } from 'lucide-react'
import {VehicleShell} from '@/components/ui/after-care-layout'
import { EmergencySurface } from './EmergencySurface'
import { manifest, createSession, restoreSession, saveSession, transition, updateDraft, type Edge } from './session'
import {useGuidanceAudio} from '@/audio/useGuidanceAudio'
import {resolveGuidance} from './guidance'
import './emergency.css'

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

export function EmergencyStudy() {
  const [selection, setSelection] = useState(readSelection)
  const [resetKey, setResetKey] = useState(0)
  const countdownKey = `${selection.scenarioId}/${selection.sceneId}/${resetKey}`
  const [persistence, setPersistence] = useState<{ selection: typeof selection; available: boolean } | null>(null)
  const storageAvailable = persistence?.selection === selection && persistence.available
  const [paused, setPaused] = useState(false)
  const [showSpec, setShowSpec] = useState(false)
  // 3초 보기: 검토 UI 를 숨기고 차량 화면만 3초 보여 준 뒤 가린다. 가린 동안 countdown 은 멈춘다.
  const [present, setPresent] = useState<'off' | 'showing' | 'covered'>('off')
  const presentTimer = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusAfterChange = useRef<'action' | 'event' | null>(null)
  // React transition commit 전에 이전 countdown이 운전자의 선택을 덮지 않도록 차단.
  const leaving = useRef(false)
  const activeSceneButton = useRef<HTMLButtonElement>(null)
  const remainingMs = useRef(0)
  // 남은 초에는 어느 장면 진입에서 센 값인지 꼬리표를 단다. 클릭 직전 tick 의 갱신이 React 큐에 남아
  // 재진입 뒤에 적용돼도, 꼬리표가 다르면 버리고 처음 초를 보여 준다.
  const [countdown, setCountdown] = useState<{ for: string | null; seconds: number }>({ for: null, seconds: 0 })
  const scenario = manifest.scenarios.find(item => item.id === selection.scenarioId)!
  const sceneIndex = scenario.states.findIndex(item => item.id === selection.sceneId)
  const scene = scenario.states[sceneIndex]
  const guidance=resolveGuidance(selection,scene,storageAvailable)
  const audio=useGuidanceAudio({text:guidance.text,key:guidance.contextKey+'/'+resetKey+'/'+paused+'/'+(present==='covered')})
  const voiceState=audio.state
  const facts = scenario.facts.map(fact => ({ ...fact, ...Object.entries(selection.facts).find(([id]) => id === fact.id)?.[1] }))
  const requests = scenario.requests.map(request => ({ ...request, status: Object.entries(selection.requests).find(([id]) => id === request.id)?.[1] ?? request.status }))
  const callConnected = scene.title === '119 통화 연결됨'
  const secondsLeft = countdown.for === countdownKey ? countdown.seconds : scene.auto_contact?.seconds ?? 0
  useLayoutEffect(() => { setPersistence({ selection, available: saveSession(selection) }) }, [selection])


  useEffect(() => {
    const onBack = () => { setSelection(readSelection()); setPaused(false) }
    window.addEventListener('popstate', onBack)
    return () => { window.removeEventListener('popstate', onBack) }
  }, [])

  // 장면 commit 직후 URL과 focus를 함께 갱신.
  useLayoutEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('scenario', selection.scenarioId)
    url.searchParams.set('scene', selection.sceneId)
    url.searchParams.delete('material')
    history.replaceState(null, '', url)
    leaving.current = false
    if (focusAfterChange.current === 'action') heading.current?.focus()
    if (focusAfterChange.current === 'event') activeSceneButton.current?.focus()
    focusAfterChange.current = null
  }, [selection, paused, present === 'covered'])

  // 장면에 들어올 때마다 countdown 을 처음부터 시작하고 경고음·음성을 한 번 낸다.
  useEffect(() => {
    if (!scene.auto_contact) return
    remainingMs.current = scene.auto_contact.seconds * 1000
    beep()
    void audio.play()
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
    audio.stop()
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
    audio.stop()
    focusAfterChange.current = source
    leaving.current = true
    // Persist the accepted action before an animation or immediate reload can interrupt it.
    setPersistence({ selection: next, available: saveSession(next) })
    const url = new URL(location.href)
    url.searchParams.set('scene', next.sceneId)
    history.replaceState(null, '', url)
    startTransition(() => setSelection(next))
  }

  function editDraft(change: { record?: string; scope?: string[] }) {
    setSelection(current => updateDraft(current, change))
  }


  return <main className={`emergency-study ac-system ac-emergency-review${present !== 'off' ? ' is-presenting' : ''}`}>
    <header className="emergency-review-header"><a href="/?study=emergency" className="emergency-review-brand">AFTER / CARE <span>Emergency storyboard</span></a><div><span className="emergency-demo-label">가상 scenario · 실제 전화·전송 없음{callConnected && ' · spectrum은 가상 음성 반응'}</span><span className="emergency-demo-label">안전 안내 {manifest.safety_guidance.status}</span><a href="/?study=design-system">Design system</a><a href="/?study=tools">이전 design 비교 <ArrowRight size={14} aria-hidden="true" /></a></div></header>
    <div className="emergency-review-intro"><div><h1>상황을 보고, 다음 행동으로.</h1><p>장면을 바꿔 핵심 상황·행동·미확인이 어떻게 전달되는지 확인해 보세요.</p></div><button className="emergency-review-button" aria-expanded={showSpec} aria-controls="emergency-spec" onClick={() => setShowSpec(!showSpec)}><Code2 size={17} aria-hidden="true" />현재 장면 spec</button></div>
    <nav className="emergency-scenarios" aria-label="상황 선택">{manifest.scenarios.map((item, index) => <button key={item.id} aria-pressed={scenario.id === item.id} aria-label={item.title} onClick={() => { audio.stop(); setPaused(false); setResetKey(key => key + 1); startTransition(() => setSelection(createSession(item.id))) }}><span>{item.id}</span><strong>{item.title}</strong>{index === 0 ? <TriangleAlert size={20} aria-hidden="true" /> : <CircleHelp size={20} aria-hidden="true" />}</button>)}</nav>
    <div className="emergency-canvas-toolbar"><p>시작 상황: {scenario.summary}</p><div><button className="emergency-review-button" onClick={showForThreeSeconds}><Eye size={15} aria-hidden="true" />3초 보기</button><button className="emergency-review-button" onClick={() => setPaused(!paused)}>{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{paused ? '시연 재개' : '시연 일시 중단'}</button></div></div>
    <div className={`emergency-viewport ${paused ? 'is-paused' : ''}`}>
      <VehicleShell>
        <EmergencySurface selection={selection} paused={paused} present={present} voiceState={voiceState} storageAvailable={storageAvailable}
          countdownKey={countdownKey} secondsLeft={secondsLeft} heading={heading}
          onAction={edge => act(edge, 'action')} onCancel={() => goToScene(scene.auto_contact!.cancel, 'action')} onVoice={audio.toggle} onEditDraft={editDraft} />
      </VehicleShell>
      {present === 'covered' && <div className="emergency-cover" data-cover><button className="emergency-review-button" onClick={showForThreeSeconds}>다시 3초</button><button className="emergency-review-button" onClick={closePresentation}>닫기</button></div>}
    </div>
    {!storageAvailable && <p role="alert" className="emergency-storage-warning">이번 진행 내용을 이 browser에 보관할 수 없어요. 저장되지 않은 입력은 화면을 닫으면 사라져요.</p>}
    <div className="emergency-voice-status" role="status">{voiceState === 'error' ? `음성 재생을 사용할 수 없어요. 음성 원고: ${guidance.text}` : voiceState === 'speaking' ? '현재 장면의 음성 안내를 재생하고 있어요.' : ''}</div>
    {paused && <p className="emergency-pause-note">시연 일시 중단 · 현재 장면과 요청 상태를 유지하고 있어요.</p>}
    <div className="emergency-storyboard-controls">
      <nav aria-label="장면 선택" className="emergency-scene-list">{scenario.states.map(state => <button key={state.id} ref={state.id === scene.id ? activeSceneButton : undefined} aria-pressed={state.id === scene.id} disabled={paused} onClick={() => goToScene(state.id)}><ReviewMark status={state.cue.status} size={22} /><span>{state.label}</span>{state.id === scene.id && <span className="emergency-current">현재</span>}</button>)}</nav>
      <div className="emergency-events"><span>외부 결과 시연</span>{scene.events.length ? scene.events.map(event => <button className="emergency-review-button" key={event.id} aria-label={`시연 event: ${event.label}`} disabled={paused} onClick={() => act(event, 'event')}>{event.label}<ArrowRight size={15} aria-hidden="true" /></button>) : <p>다른 장면을 선택해 비교할 수 있어요.</p>}</div>
    </div>
    {showSpec && <section id="emergency-spec" className="emergency-spec" aria-label="현재 장면 spec"><div><h2>{scenario.id} / {scene.label}</h2><p>Source nodes: {scenario.source_nodes.join(' · ')}<br />미결정: {scenario.open_decisions.join(' · ')}<br />뒤로 둔 정보: {scene.deferred.join(' · ')}</p><h3>음성 원고</h3><p>{guidance.text}</p><h3>안전 안내 ({manifest.safety_guidance.status})</h3><p>{manifest.safety_guidance.source}</p><p>Symbol은 정보 종류를 나타내며 실제 위치나 신체 부위를 재현하지 않습니다.</p></div><pre>{JSON.stringify({ simulation_only: true, data_source: manifest.data_source, scenario: scenario.id, scene, guidance, facts, requests, presentation: scenario.presentation }, null, 2)}</pre></section>}
    <footer className="emergency-review-footer"><span>Spec v{manifest.version} · {manifest.scenarios.length} scenarios / {manifest.scenarios.reduce((total, item) => total + item.states.length, 0)} scenes</span><span>이해도 평가 전 · 실제 차량 동작 미검증</span></footer>
  </main>
}
