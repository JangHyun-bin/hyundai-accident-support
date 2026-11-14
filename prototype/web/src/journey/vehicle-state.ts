import {impactDirections, type VehicleContourState, type VehiclePartState} from '@/components/ui/vehicle-contour'
import type {JourneyCase, Observation, SafetyAction} from './case'

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

function mobilityState(observations:Observation[]):VehiclePartState {
  const known=observations.filter(item=>item.confirmation==='confirmed'||item.confirmation==='attention')
  if(!known.length)return {value:'가능 여부 미확인',tone:'unknown'}
  const values=new Set(known.map(item=>item.value))
  const attention=known.some(item=>item.confirmation==='attention')
  return {value:values.size===1?known.at(-1)!.value:'정보 확인 필요',tone:attention?'failed':values.size===1?'confirmed':'unknown'}
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
    mobility:mobilityState(currentObservations(value,'mobility')),
  }
}
