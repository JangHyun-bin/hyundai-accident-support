import { HaloCard } from './components/ui/halo-card'
import { ContextFacts, Guidance, MovementNote, PriorityLabel, RequestStrip, SafetyGraphic, VehicleGraphic, type ViewProps } from './ScreenParts'

export function ContextView(props: ViewProps) {
  return <div className="context-view">
    <aside className="situation-panel" aria-label="확인된 상황"><div className="section-heading"><h2>확인된 상황</h2><span className="small-index">01—04</span></div><ContextFacts caseData={props.caseData} /><div className="vehicle-state"><VehicleGraphic /><span>차량 이동 판단은 확인이 더 필요해요.</span></div></aside>
    <div className="context-main"><HaloCard animated={false} interactive={false} padding="none" aria-label="우선 안내" className="guidance-card context-card"><div className="context-hero"><div className="context-priority"><PriorityLabel /><SafetyGraphic compact /></div><h1>{props.caseData.title}</h1><Guidance {...props} /><MovementNote /></div></HaloCard><RequestStrip caseData={props.caseData} /></div>
  </div>
}
