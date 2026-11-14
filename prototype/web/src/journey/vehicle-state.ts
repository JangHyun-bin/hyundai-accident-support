import {impactDirections, type VehicleContourState, type VehiclePartState} from '@/components/ui/vehicle-contour'
import {manifest} from '@/emergency/session'
import {agencies, type Agency, type JourneyCase, type Observation, type SafetyAction, type Source} from './case'

export function currentObservations(value:JourneyCase,kind:string):Observation[] {
  const superseded=new Set(value.observations.map(o=>o.supersedes))
  return value.observations.filter(o=>o.kind===kind&&!superseded.has(o.id))
}

export function agreedValue(observations:Observation[]):string|null {
  const confirmed=observations.filter(o=>o.confirmation==='confirmed')
  return new Set(confirmed.map(o=>o.value)).size===1?confirmed.at(-1)!.value:null
}

function partState(action:SafetyAction|undefined,confirmedValue:string):VehiclePartState {
  if(!action||action.status==='unknown')return {value:'미확인',tone:'unknown'}
  if(action.status==='requested')return {value:'확인 중',tone:'pending'}
  if(action.status==='unavailable')return {value:'지금 할 수 없음',tone:'skipped'}
  return {value:confirmedValue,tone:'confirmed',source:action.status==='user-confirmed'?'직접 확인':action.source==='fixture'?'예시 자료':'차량 확인'}
}

const observationSources:Record<Source,string>={fixture:'예시 자료',device:'차량 확인',user:'직접 확인'}

function observedState(observations:Observation[],unknownValue:string):VehiclePartState {
  const known=observations.filter(item=>item.confirmation==='confirmed'||item.confirmation==='attention')
  if(!known.length)return {value:unknownValue,tone:'unknown'}
  const values=new Set(known.map(item=>item.value)),attention=known.some(item=>item.confirmation==='attention'),latest=known.at(-1)!
  if(values.size>1)return {value:'정보 확인 필요',tone:attention?'failed':'unknown'}
  return {value:latest.value,tone:attention?'failed':'confirmed',source:observationSources[latest.source]}
}

export function vehicleContourState(value:JourneyCase):VehicleContourState {
  const observations=currentObservations(value,'impact-direction')
  const directionValue=agreedValue(observations)
  const direction=impactDirections.find(item=>item===directionValue)??null
  const conflicting=new Set(observations.filter(o=>o.confirmation==='confirmed').map(o=>o.value)).size>1
  return {
    direction,directionNote:conflicting||directionValue&&!direction?'정보 확인 필요':'미확인',
    hazard:partState(value.safetyActions.find(a=>a.id==='hazard'),'켜짐'),
    trunk:partState(value.safetyActions.find(a=>a.id==='trunk'),'열림'),
    mobility:observedState(currentObservations(value,'mobility'),'가능 여부 미확인'),
  }
}

export type VehicleRow={id:'mobility'|'impact'|'airbag'|'hazard'|'trunk';label:string;state:VehiclePartState;attention:boolean}

// A known impact direction is expected after any collision, so it never raises attention on its own.
export function vehicleRows(value:JourneyCase):VehicleRow[] {
  const contour=vehicleContourState(value),airbag=observedState(currentObservations(value,'seat-airbag-deployed'),'미확인')
  const impact=contour.direction?currentObservations(value,'impact-direction').filter(item=>item.confirmation==='confirmed').at(-1):undefined
  return [
    {id:'mobility',label:'차량 이동',state:contour.mobility,attention:contour.mobility.tone==='failed'},
    {id:'impact',label:'충격 방향',state:{value:contour.direction??contour.directionNote,tone:contour.direction?'failed':'unknown',source:impact&&observationSources[impact.source]},attention:false},
    {id:'airbag',label:'에어백',state:airbag,attention:airbag.tone==='failed'},
    {id:'hazard',label:'비상등',state:contour.hazard,attention:false},
    {id:'trunk',label:'트렁크',state:contour.trunk,attention:false},
  ]
}

export function roadState(value:JourneyCase):VehiclePartState|null {
  const road=observedState(currentObservations(value,'road'),'')
  return road.tone==='unknown'?null:road
}

export type RiskState={key:string;summary:string;acknowledged:boolean}

export function riskState(value:JourneyCase):RiskState|null {
  const risks=currentObservations(value,'risk').filter(item=>item.confirmation==='attention')
  if(!risks.length)return null
  return {key:risks.map(risk=>risk.id).join('|'),summary:[...new Set(risks.map(risk=>risk.value))].join(' · '),
    acknowledged:risks.every(risk=>value.safetyActions.some(action=>action.id===`ack:${risk.id}`&&action.status==='user-confirmed'))}
}

const agencyLabels:Record<Agency,string>={rescue:'구호',vehicle:'차량 지원',insurance:'보험사'}
export type AttentionReason={label?:string;value:string}

export function vehicleAttention(value:JourneyCase):AttentionReason[] {
  const risk=riskState(value)
  return [
    ...vehicleRows(value).filter(row=>row.attention).map(row=>({label:row.label,value:row.state.value})),
    ...(risk&&!risk.acknowledged?[{value:risk.summary}]:[]),
    ...agencies.flatMap(id=>{const status=manifest.request_statuses[value.emergency.requests[id]];return status?.tone==='attention'?[{label:agencyLabels[id],value:status.label}]:[]}),
  ]
}

export const vehicleNeedsAttention=(value:JourneyCase)=>vehicleAttention(value).length>0
