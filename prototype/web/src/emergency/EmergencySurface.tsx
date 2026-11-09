import { ViewTransition, type CSSProperties, type ReactNode, type Ref } from 'react'
import NumberFlow from '@number-flow/react'
import { Volume2, VolumeX } from 'lucide-react'
import { Glyph, StatusMark, glyphFor } from './glyphs'
import { manifest, scenarioFor, sceneFor, type Session, type Edge } from './session'
import { WorkflowPanel } from './WorkflowPanel'

const requestStatuses = manifest.request_statuses

const RING = 2 * Math.PI * 88

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

type Props = {
  selection: Session; paused: boolean; present: 'off' | 'showing' | 'covered'
  voiceState: 'idle' | 'speaking' | 'error'; storageAvailable: boolean
  countdownKey: string; secondsLeft: number; heading: Ref<HTMLHeadingElement>
  onAction: (edge: Edge) => void; onCancel: () => void; onVoice: () => void
  onEditDraft: (change: { record?: string; scope?: string[] }) => void
}
export function EmergencySurface({ selection, paused, present, voiceState, storageAvailable, countdownKey, secondsLeft, heading, onAction, onCancel, onVoice, onEditDraft }: Props) {
  const scenario = scenarioFor(selection.scenarioId)
  const scene = sceneFor(selection)
  const facts = scenario.facts.map(fact => ({ ...fact, ...selection.facts[fact.id] }))
  const requests = scenario.requests.map(request => ({ ...request, status: selection.requests[request.id] ?? request.status }))
  const callConnected = scene.title === '119 통화 연결됨'
  return <section className="emergency-screen" data-surface-status="flat" data-scenario={scenario.id} data-scene={scene.id} data-request-count={selection.submissions} aria-label="시각 중심 사고 대응" inert={paused}>
          <ViewTransition name="cue"><section className="emergency-slot emergency-detected" data-slot="detected" aria-label="핵심 상황">
            <div className="emergency-cue"><div className="emergency-symbol" aria-hidden="true"><Glyph name={glyphFor.cue(scene.cue.symbol)} size={48} /><span className="emergency-symbol-state"><StatusMark tone={scene.cue.status} size={28} /></span></div>
            <h2 className={`tone-${scene.cue.status}`}>{scenario.presentation.detected} · {scene.cue.label}</h2></div>
            <button onClick={onVoice} className="emergency-voice-button">{voiceState === 'speaking' ? <VolumeX size={24} aria-hidden="true" /> : <Volume2 size={24} aria-hidden="true" />}{voiceState === 'speaking' ? '음성 안내 중지' : '음성 안내 듣기'}</button>
            <div className="emergency-facts">{facts.filter(fact => scenario.presentation.visible_facts.includes(fact.id) || (fact.id === 'risk' && fact.status === 'attention')).map(fact => <div key={fact.id} className={`emergency-fact tone-${fact.status}`} data-fact={fact.id}><span className="emergency-fact-plate"><Glyph name={glyphFor.fact(fact.id)} size={32} /></span><span>{fact.label}</span><strong><StatusMark tone={fact.status} size={24} />{fact.value}</strong></div>)}</div>
          </section></ViewTransition>
          <div className="emergency-response-panel">
          <section className="emergency-slot emergency-car" data-slot="car" aria-label="차량이 할 일">
            {(() => {
              const carActions = scene.actions.filter(action => action.slot !== 'self').map(action => <button className={action.secondary ? "emergency-secondary-action" : "emergency-primary-action"} key={action.id} disabled={(action.effect === "submit" && !selection.scope.length) || (action.effect === "save_record" && !selection.record.trim())} onClick={() => onAction(action)}><Glyph name={glyphFor.action(action.id)} size={36} /><span>{action.label}</span></button>)
              const copy = <ViewTransition name="car-copy"><div className="emergency-car-copy" aria-live="polite">{scene.step && <span className="emergency-step">{scene.step}</span>}<h1 ref={heading} tabIndex={-1}>{!storageAvailable && scene.id === 'record_saved' ? '기기에 저장하지 못했어요' : scene.title}</h1>{scene.auto_contact ? <p>응답이 없으면 자동 연결</p> : callConnected ? <CallSpectrum paused={paused || present === 'covered'} /> : scene.instruction && scene.panel !== 'scope' && <p>{scene.instruction}</p>}</div></ViewTransition>
              if (scene.auto_contact) return <div className="emergency-car-main" data-urgent>
                <ViewTransition name="phase-ring" enter="vt-enter" exit="vt-exit"><PhaseRing key={countdownKey} phase="decide" fraction={secondsLeft / scene.auto_contact.seconds}><b data-countdown={secondsLeft}><NumberFlow value={secondsLeft} /></b></PhaseRing></ViewTransition>
                <div>{copy}<ViewTransition name="car-actions" enter="vt-enter" exit="vt-exit"><div className="emergency-car-actions">{carActions}<button className="emergency-cancel" onClick={() => onCancel()}>취소</button></div></ViewTransition></div>
              </div>
              return <div className={`emergency-car-main${scene.panel ? " has-workflow" : ""}`}>
                {callConnected ? <ViewTransition name="phase-ring" enter="vt-enter" exit="vt-exit"><div className="emergency-call-symbol" aria-hidden="true"><Glyph name="phone" size={112} /></div></ViewTransition> : scene.phase === 'progress' && <ViewTransition name="phase-ring" enter="vt-enter" exit="vt-exit"><PhaseRing phase="progress" fraction={.28}>···</PhaseRing></ViewTransition>}
                <div>{copy}<WorkflowPanel scene={scene} session={selection} persistent={storageAvailable} onChange={onEditDraft} />{carActions.length > 0 && <ViewTransition name="car-actions" enter="vt-enter" exit="vt-exit"><div className="emergency-car-actions">{carActions}</div></ViewTransition>}</div>
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
              {scene.actions.filter(action => action.slot === 'self').map(action => <button className="emergency-primary-action is-self" key={action.id} onClick={() => onAction(action)}><Glyph name={glyphFor.action(action.id)} size={36} /><span>{action.label}</span></button>)}
              {scene.self_action && <p className="emergency-self-action"><strong>{scene.self_action.now}</strong>{scene.self_action.next && <span>→ {scene.self_action.next}</span>}</p>}
            </div>
          </section></ViewTransition>
          </div>
        </section>
}
