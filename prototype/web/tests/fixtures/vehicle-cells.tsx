import {useState,type CSSProperties,type ReactNode} from 'react'
import {createRoot} from 'react-dom/client'
import {CareSurface} from '../../src/components/ui/after-care'
import {createSession} from '../../src/emergency/session'
import {createCase,type JourneyCase,type Observation} from '../../src/journey/case'
import {VehicleDetailCell,VehicleSceneCell} from '../../src/journey/VehicleCells'
import {vehicleNeedsAttention} from '../../src/journey/vehicle-state'
import '../../src/styles.css'

type State='unknown'|'normal'|'attention'
const states:State[]=['unknown','normal','attention']
const now='2026-11-14T12:12:00.000Z'
const observation=(kind:string,label:string,value:string,confirmation:Observation['confirmation']='confirmed',id=`preview-${kind}`):Observation=>({id,kind,label,value,source:'fixture',observedAt:now,confirmation,legacyFactId:null,supersedes:null})
const lit={'--ac-notify-light':.72,'--ac-notify-chroma':1} as CSSProperties

function demoCase(state:State):JourneyCase{
  const value=createCase(createSession('SC01'),`vehicle-cells-${state}`,now)
  if(state==='unknown'){value.observations=value.observations.filter(item=>item.kind!=='mobility'&&item.kind!=='road');return value}
  value.observations.push(observation('impact-direction','충격 방향','우측 전방'),observation('collision-time','감지 시각','오후 9:12'))
  value.safetyActions.push({id:'hazard',label:'비상등',status:'device-confirmed',source:'fixture',confirmedAt:now})
  if(state==='attention'){
    value.observations.push(observation('seat-airbag-deployed','에어백','펼쳐짐','attention'),observation('risk','차량 위험','새로운 위험 감지','attention'))
    value.emergency.requests.rescue='connected'
  }
  return value
}

function Cell({id,state,value,width,height,children}:{id:'scene'|'vehicle';state:State;value:JourneyCase;width:number;height:number;children:ReactNode}){
  const attention=id==='vehicle'&&vehicleNeedsAttention(value)
  return <CareSurface className="vcp-cell" data-cell={id} data-state={state} data-attention={attention} tone={attention?'call':'plain'} style={attention?lit:undefined}><div className="fs-cell-body vcp-body" style={{width,height}}>{children}</div></CareSurface>
}

function Preview(){
  const [cases,setCases]=useState(()=>Object.fromEntries(states.map(state=>[state,demoCase(state)])) as Record<State,JourneyCase>)
  function addRisk(){
    setCases(previous=>{const normal=structuredClone(previous.normal);normal.observations.push(observation('risk','차량 위험','새로운 위험 감지','attention',`preview-risk-${normal.observations.length}`));return {...previous,normal}})
  }
  return <div className="ac-system vcp" data-care-device="vehicle">
    <button type="button" className="vcp-event" onClick={addRisk}>시연: 정상 상태에 위험 추가</button>
    <div className="fs-board-wrap vcp-wrap"><div className="fs-board vcp-board">
      {states.map(state=><div key={state} className="vcp-column" data-variant="full" data-state={state}>
        <span className="vcp-caption">{state}</span>
        <Cell id="scene" state={state} value={cases[state]} width={408} height={594}><VehicleSceneCell value={cases[state]} compact={false} active/></Cell>
        <Cell id="vehicle" state={state} value={cases[state]} width={408} height={422}><VehicleDetailCell value={cases[state]} compact={false}/></Cell>
      </div>)}
      <div className="vcp-column" data-variant="compact">
        <span className="vcp-caption">compact</span>
        {states.map(state=><div key={state} className="vcp-pair" data-state={state}>
          <Cell id="scene" state={state} value={cases[state]} width={340} height={64}><VehicleSceneCell value={cases[state]} compact active/></Cell>
          <Cell id="vehicle" state={state} value={cases[state]} width={340} height={64}><VehicleDetailCell value={cases[state]} compact/></Cell>
        </div>)}
      </div>
    </div></div>
  </div>
}

createRoot(document.getElementById('host')!).render(<Preview/>)
