import { MapPin, ShieldCheck, TriangleAlert } from 'lucide-react'
import {CareSituation,CareRequests,CareUnknownMap} from '@/components/ui/response-content'
import {careTone} from '@/emergency/EmergencySurface'
import { manifest, scenarioFor } from '../emergency/session'
import { JourneyHeading, JourneyStatus } from './JourneyLayout'
import type { CaseCommand, JourneyCase, Observation } from './case'

function currentObservations(value: JourneyCase, kind: string) {
  const superseded = new Set(value.observations.map(o => o.supersedes))
  return value.observations.filter(o => o.kind === kind && !superseded.has(o.id))
}

function agreedValue(observations: Observation[]) {
  const confirmed = observations.filter(o => o.confirmation === 'confirmed')
  const values = new Set(confirmed.map(o => o.value))
  return values.size === 1 ? confirmed.at(-1)!.value : null
}

export function JourneySummary({ value }: { value: JourneyCase }) {
  const scenario = scenarioFor(value.emergency.scenarioId)
  return <CareSituation title="충돌 감지" facts={[{id:'driver',label:'운전자 조작'},{id:'mobility',label:'차량 이동'},{id:'route',label:'이동 경로'}].map(({id,label})=>{const fact={...scenario.facts.find(f=>f.id===id),...value.emergency.facts[id]};return {id,label,value:fact.value??'미확인',tone:careTone(fact.status??'unknown')}})}><JourneyRiskNotice value={value}/></CareSituation>
}

export function JourneyRiskNotice({ value }: { value: JourneyCase }) {
  const risks = currentObservations(value, 'risk').filter(item => item.confirmation === 'attention')
  if (!risks.length) return null
  return <div className="journey-risk" role="alert"><TriangleAlert aria-hidden="true" /><span>{[...new Set(risks.map(item => item.value))].join(' · ')}</span></div>
}

export function JourneyRequests({ value }: { value: JourneyCase }) {
  return <CareRequests items={(['rescue','vehicle','insurance'] as const).map(id=>{const status=manifest.request_statuses[value.emergency.requests[id]];return {id,label:{rescue:'구호',vehicle:'차량 지원',insurance:'보험사'}[id],status:status.label,tone:careTone(status.tone)}})}/>
}

export function JourneyNavigation({ value, destinationLabel = '안내 지점' }: { value: JourneyCase; destinationLabel?: string }) {
  const data = value.navigation
  if (!data) return <CareUnknownMap/>
  return <div className="journey-map" data-navigation-state="fixture">
    <svg viewBox="0 0 1000 1000" role="img" aria-label="현재 위치와 안내 지점">
      <path className="journey-map-road" d="M400 0V1000M0 700H1000" />
      <path className="journey-map-line" d="M400 0V1000M0 700H1000" />
      <path className="journey-map-route" d={`M${data.vehicle.x * 1000} ${data.vehicle.y * 1000}L${data.destination.x * 1000} ${data.destination.y * 1000}`} />
      <circle data-vehicle-position cx={data.vehicle.x * 1000} cy={data.vehicle.y * 1000} r="18" />
      <circle className="journey-map-destination" cx={data.destination.x * 1000} cy={data.destination.y * 1000} r="14" />
    </svg>
    <div className="journey-map-caption"><MapPin aria-hidden="true" /><div><strong>{destinationLabel}</strong><span>현재 위치에서 {data.distanceMeters} m</span></div></div>
  </div>
}

export function VehiclePanel({ value, onCommand }: { value: JourneyCase; onCommand: (command: CaseCommand) => void }) {
  const fields = [{ id: 'impact-direction', label: '충격 방향' }, { id: 'impact-strength', label: '충격 세기' }, { id: 'collision-time', label: '감지 시각' }]
  const direction = agreedValue(currentObservations(value, 'impact-direction'))
  const directions: Record<string, number> = { '전방': 0, '우측 전방': 45, '우측': 90, '우측 후방': 135, '후방': 180, '좌측 후방': 225, '좌측': 270, '좌측 전방': 315 }
  const angle = direction ? directions[direction] : undefined
  return <>
    <JourneyHeading title="차량에서 확인한 내용">확인된 정보와 아직 모르는 내용을 구분해요.</JourneyHeading>
    <div className="journey-vehicle-detail">
    <div className="journey-car-outline">
      <svg viewBox="-50 -10 340 340" role="img" aria-label={angle === undefined ? '충격 방향 미확인' : direction + ' 충격 방향'}>
        <path d="M78 38Q120 22 162 38L180 100V257Q180 280 158 284H82Q60 280 60 257V100Z" />
        <path d="M79 103L86 66H154L161 103ZM79 229H161L153 257H87Z" />
        <path d="M75 120V208M165 120V208" />
        {angle !== undefined && <path className="journey-impact" d="M120 4V27M110 17L120 27L130 17" transform={`rotate(${angle} 120 160)`} />}
      </svg><span>{direction ?? '충격 방향 미확인'}</span>
    </div>
    <dl className="journey-detail-list">{fields.map(field => {
      const observations = currentObservations(value, field.id)
      const agreed = agreedValue(observations)
      const conflicting = new Set(observations.filter(o => o.confirmation === 'confirmed').map(o => o.value)).size > 1
      const shown = conflicting ? observations : observations.slice(-1)
      return <div key={field.id} data-observation={field.id}><dt>{field.label}</dt><dd>{conflicting ? '정보 확인 필요' : agreed ?? '확인되지 않았어요'}
        {shown.map(observation => <span key={observation.id}>{conflicting && observation.value + ' · '}{observation.source === 'user' ? '사용자 확인' : '차량 자료'}{observation.observedAt && ' · 수신 ' + new Date(observation.observedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>)}
      </dd></div>
    })}</dl>
    </div>
    <div className="journey-inline-note"><ShieldCheck aria-hidden="true" /><p>충격 정보만으로 차량 손상이나<br />이동 가능 여부를 판단하지 않아요.</p></div>
    <section className="journey-safety-list" aria-label="안전 행동 확인">{[
      { id: 'hazard', label: '비상등', action: '비상등을 켰어요' },
      { id: 'trunk', label: '트렁크', action: '트렁크를 열었어요' },
      { id: 'evacuation', label: '대피', action: '대피했어요' },
    ].map(item => {
      const entry = value.safetyActions.find(a => a.id === item.id)
      const label = entry?.status === 'device-confirmed' ? '차량 확인' : entry?.status === 'user-confirmed' ? '사용자 확인' : entry?.status === 'unavailable' ? '지금 할 수 없음' : '미확인'
      return <div key={item.id} data-safety-action={item.id}><div><strong>{item.label}</strong><JourneyStatus tone={label.endsWith('확인') && label !== '미확인' ? 'confirmed' : 'unknown'}>{label}</JourneyStatus></div>
        <div><button onClick={() => onCommand({ type: 'safety-action', action: { id: item.id, label: item.label, status: 'user-confirmed', source: 'user', confirmedAt: new Date().toISOString() } })}>{item.action}</button>
          <button aria-label={item.label + ' 지금 할 수 없어요'} onClick={() => onCommand({ type: 'safety-action', action: { id: item.id, label: item.label, status: 'unavailable', source: 'user', confirmedAt: null } })}>지금 할 수 없어요</button></div>
      </div>
    })}</section>
  </>
}
