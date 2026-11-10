import { useState } from 'react'
import { Glyph, StatusMark } from './glyphs'
import { WorkflowPanel } from './WorkflowPanel'
import { createSession, scenarioFor, updateDraft } from './session'
import './emergency.css'

export function EmergencyCatalog() {
  const [session, setSession] = useState(() => createSession('SC04', 'review'))
  const scenario = scenarioFor('SC04')
  return <main className="emergency-screen emergency-catalog">
    <header><p>AFTER / CARE · Component catalog</p><h1>Pleos flat</h1><p>새 화면은 여기 있는 값과 component만 사용. 없는 component는 여기에 먼저 추가.</p><a href="/?study=emergency">Scenario로 돌아가기 →</a></header>
    <a href="/?study=journey-catalog">전체 여정 component 보기 →</a>
    <section><h2>Surface & state</h2><div className="emergency-catalog-swatches">{['foreground', 'pleos-background', 'pleos-line', 'pleos-subtle', 'primary', 'urgent'].map(token => <div key={token}><i style={{ background: `var(--${token})` }} /><span>{token}</span></div>)}</div><p>Box radius 32 · 내부 card 24 · box gap 24 · 내부 여백 24 / 40</p><div className="emergency-catalog-marks">{['neutral', 'unknown', 'attention', 'confirmed'].map(tone => <span key={tone}><StatusMark tone={tone} size={36} />{tone}</span>)}</div></section>
    <section><h2>Typography</h2><div className="emergency-car-copy"><h1>다음 행동을 명확하게</h1><p>Headline 60 / 48 · Action 36 / 32 · Body 28 / 26 · Label 24 / 20</p></div></section>
    <section><h2>Actions</h2><div className="emergency-car-actions"><button className="emergency-primary-action"><Glyph name="arrow-right" size={36} />동의하고 전송</button><button className="emergency-secondary-action">나중에 보내기</button><button className="emergency-secondary-action">보내지 않기</button></div></section>
    <section><h2>Scope & record</h2>{['review', 'record', 'initial'].map(id => <WorkflowPanel key={id} scene={scenario.states.find(s => s.id === id)!} session={session} onChange={change => setSession(current => updateDraft(current, change))} />)}</section>
  </main>
}
