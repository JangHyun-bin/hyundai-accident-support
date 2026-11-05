import { ContextFacts, Guidance, MovementNote, PriorityLabel, RequestStrip, type ViewProps } from '../ScreenParts'
import './antislop.css'

export function AntiSlopView(props: ViewProps) {
  return <div className="antislop-view">
    <div className="antislop-main">
      <section className="antislop-action" aria-label="우선 안내">
        <PriorityLabel />
        <h1>{props.caseData.title}</h1>
        <Guidance {...props} />
      </section>
      <section className="antislop-context" aria-label="확인된 상황">
        <div className="section-heading"><h2>확인된 상황</h2><span>확인되지 않은 정보는 그대로 남겨둬요.</span></div>
        <ContextFacts caseData={props.caseData} />
        <MovementNote />
      </section>
    </div>
    <RequestStrip caseData={props.caseData} />
  </div>
}
