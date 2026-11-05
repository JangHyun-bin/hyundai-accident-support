import { HaloCard } from './components/ui/halo-card'
import { ContextFacts, Guidance, MovementNote, PriorityLabel, RequestStrip, SafetyGraphic, type ViewProps } from './ScreenParts'

export function FocusView(props: ViewProps) {
  return <div className="focus-view">
    <HaloCard animated={false} interactive={false} padding="none" aria-label="우선 안내" className="guidance-card focus-card">
      <div className="focus-hero">
        <div className="hero-copy"><PriorityLabel /><h1>{props.caseData.title}</h1><Guidance {...props} /></div>
        <SafetyGraphic />
      </div>
    </HaloCard>
    <section className="focus-context" aria-label="확인된 상황"><div className="section-heading"><h2>확인된 상황</h2><span>확인되지 않은 정보는 그대로 남겨둬요.</span></div><ContextFacts caseData={props.caseData} /><MovementNote /></section>
    <RequestStrip caseData={props.caseData} />
  </div>
}
