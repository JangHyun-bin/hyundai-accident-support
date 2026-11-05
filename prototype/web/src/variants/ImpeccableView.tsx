import { ContextFacts, Guidance, MovementNote, PriorityLabel, RequestStrip, type ViewProps } from '../ScreenParts'
import './impeccable.css'

export function ImpeccableView(props: ViewProps) {
  return <div className="impeccable-view">
    <section className="impeccable-action" aria-label="우선 안내">
      <h1>{props.caseData.title}</h1>
      <div className="impeccable-instruction"><Guidance {...props} /></div>
    </section>
    <section className="impeccable-situation" aria-label="확인된 상황">
      <div className="impeccable-section-title"><h2>확인된 상황</h2><PriorityLabel /></div>
      <ContextFacts caseData={props.caseData} />
      <div className="impeccable-caution"><MovementNote /><span>확인되지 않은 정보는 그대로 남겨둬요.</span></div>
    </section>
    <RequestStrip caseData={props.caseData} />
  </div>
}
