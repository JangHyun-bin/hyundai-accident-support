import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, CarFront, HeartPulse, LocateFixed, Phone, ShieldPlus } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { HaloBadge } from './components/ui/halo-badge'
import { TransitionPanel } from './components/ui/transition-panel'
import { requestLabels, type DesignCase } from './cases'

export interface ViewProps {
  caseData: DesignCase
  expanded: boolean
  setExpanded: (expanded: boolean) => void
}

export function ScreenHeader() {
  return <header className="screen-header">
    <div className="wordmark"><span className="brand-symbol" aria-hidden="true"><span /><span /></span>사고 대응 지원</div>
    <span className="screen-section">현장 대응</span>
    <span className="header-status"><span className="status-dot" />상황 확인 중</span>
  </header>
}

export function PriorityLabel() {
  return <span className="priority-label"><span className="status-dot" />안전·구호 우선</span>
}

export function SafetyGraphic({ compact = false }: { compact?: boolean }) {
  return <div className={`safety-graphic ${compact ? 'compact' : ''}`} aria-hidden="true">
    <div className="orbit orbit-outer" /><div className="orbit orbit-inner" />
    <div className="safety-core"><ShieldPlus strokeWidth={1.1} /></div>
    {!compact && <><span className="orbit-dot" /><span className="graphic-caption">사람의 안전부터, 하나씩.</span></>}
  </div>
}

export function VehicleGraphic() {
  return <svg className="vehicle-graphic" viewBox="0 0 320 186" fill="none" role="img" aria-label="차량 상태 참고 그림">
    <defs>
      <linearGradient id="body-paint" x1="70" y1="40" x2="250" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="var(--vehicle-light)" /><stop offset=".45" stopColor="var(--vehicle-mid)" /><stop offset="1" stopColor="var(--vehicle-dark)" /></linearGradient>
      <linearGradient id="car-glass" x1="115" y1="60" x2="210" y2="120"><stop stopColor="var(--vehicle-glass)" /><stop offset="1" stopColor="var(--surface)" /></linearGradient>
    </defs>
    <ellipse cx="160" cy="143" rx="122" ry="12" fill="var(--shadow-color)" opacity=".5" />
    <path d="M31 132H289" stroke="var(--line)" strokeDasharray="3 7" />
    <path d="M52 117L59 87Q61 77 75 75L112 69L142 45Q149 40 161 40H206Q218 40 228 51L251 77L272 86Q280 90 280 102V119L266 126H65Q53 126 52 117Z" fill="url(#body-paint)" stroke="var(--vehicle-light)" strokeWidth="1.4" />
    <path d="M124 69L148 50H201Q213 50 221 59L235 78L124 72Z" fill="url(#car-glass)" stroke="var(--vehicle-glass)" />
    <path d="M177 49V76M117 75L109 111M186 80V116M242 85L249 110" stroke="var(--vehicle-dark)" />
    <path d="M65 92L114 85M242 89L271 95" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
    <path d="M139 85H150M204 88H215" stroke="var(--vehicle-glass)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="97" cy="123" r="21" fill="var(--surface)" stroke="var(--vehicle-dark)" strokeWidth="4" /><circle cx="97" cy="123" r="11" fill="var(--vehicle-mid)" stroke="var(--vehicle-light)" />
    <circle cx="237" cy="123" r="21" fill="var(--surface)" stroke="var(--vehicle-dark)" strokeWidth="4" /><circle cx="237" cy="123" r="11" fill="var(--vehicle-mid)" stroke="var(--vehicle-light)" />
    <path d="M120 116H214" stroke="var(--vehicle-light)" opacity=".5" />
  </svg>
}

const contextIcons = [HeartPulse, LocateFixed, CarFront, ShieldPlus]
export function ContextFacts({ caseData }: { caseData: DesignCase }) {
  return <dl className="context-facts">
    {caseData.context.map((item, i) => {
      const Icon = contextIcons[i]
      return <div className={`fact fact-${i}`} key={item.label}><Icon aria-hidden="true" strokeWidth={1.5} /><div><dt>{item.label}</dt><dd>{item.value}</dd></div></div>
    })}
  </dl>
}

export function RequestStrip({ caseData }: { caseData: DesignCase }) {
  return <div className="requests" aria-label="기관별 요청 상태">
    <span className="requests-label">지원 현황</span>
    {caseData.requests.map(request => <div className="request" key={request.id}><span>{request.label}</span><HaloBadge animated={false} interactive={false} translucent={false} variant="secondary" className="request-badge">{requestLabels[request.status]}</HaloBadge></div>)}
  </div>
}

export function Guidance({ caseData, expanded, setExpanded }: ViewProps) {
  const reduceMotion = useReducedMotion()
  const trigger = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const wasExpanded = useRef(expanded)
  useEffect(() => {
    if (!wasExpanded.current && expanded) heading.current?.focus()
    if (wasExpanded.current && !expanded) trigger.current?.focus()
    wasExpanded.current = expanded
  }, [expanded])
  return <div className="guidance">
    <TransitionPanel activeIndex={expanded ? 1 : 0} transition={{ duration: reduceMotion ? 0 : .2, ease: [.2, 0, 0, 1] }} variants={{ enter: { opacity: 0, y: reduceMotion ? 0 : 8 }, center: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduceMotion ? 0 : -8 } }}>
      <div key="summary" className="guidance-summary" inert={expanded}>
        <p>{caseData.guidance}</p>
        <button ref={trigger} className="primary-action" onClick={() => setExpanded(true)} aria-expanded={expanded} aria-controls="help-guidance">{caseData.primaryActionLabel}<ArrowUpRight aria-hidden="true" size={25} /></button>
        <span className="action-note">요청 상태는 기관별로 따로 확인해요.</span>
      </div>
      <div key="details" className="help-guidance" id="help-guidance" inert={!expanded}>
        <div className="help-title"><span className="phone-icon"><Phone aria-hidden="true" size={25} /></span><div><h2 ref={heading} tabIndex={-1}>긴급 도움 요청</h2><p>현재 위치와 부상 상황을 함께 확인해요.</p></div><span className="help-number">119</span></div>
        <p className="help-note">전화 연결과 기관 접수는 각각 확인이 필요해요.</p>
        <button className="text-action" onClick={() => setExpanded(false)}>안내 접기<ArrowRight aria-hidden="true" size={19} /></button>
      </div>
    </TransitionPanel>
  </div>
}

export function MovementNote() {
  return <div className="movement-note"><ArrowDown aria-hidden="true" size={18} /><p>차량 이동은 운전자와 이동 경로를 확인한 뒤 판단해요.</p></div>
}
