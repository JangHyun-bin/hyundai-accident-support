import {useEffect,useId,useLayoutEffect,useRef,useState,type CSSProperties} from 'react'
import {createPortal} from 'react-dom'
import {CarFront,Expand,MapPin} from 'lucide-react'
import {CareStatus} from '@/components/ui/after-care'
import {contactWorldPoint} from '@/components/ui/vehicle-contact'
import type {VehicleContourState} from '@/components/ui/vehicle-contour'
import {useFlowFrame} from '@/design-system/flow-contract'
import {SceneCar,SceneRoad,SceneTrails,SurroundingsScene,type SurroundingsView} from '@/design-system/SurroundingsStudy'
import {replayEnd,replayFrame,sceneContact,type Pose} from '@/design-system/surroundings-fixture'
import {manifest} from '@/emergency/session'
import {riskState,type JourneyCase} from './case'
import {JourneyRequests} from './VehiclePanel'
import {agreedValue,currentObservations,roadState,vehicleAttention,vehicleContourState,vehicleRows} from './vehicle-state'
import '@/design-system/flow-study.css'
import './vehicle-cells.css'

const sceneStart=-5,sceneNow=replayEnd
const contactShare=-sceneStart/(sceneNow-sceneStart)
// Measured extents of both cars from five seconds before contact until they stop, plus the own lane line and the road edge.
const sceneWindow={x:200,y:195,width:350,height:285}
const carTransform=(pose:Pose)=>`translate(${pose.x} ${pose.y}) rotate(${pose.heading}) scale(.34) translate(-280 -265)`

function momentLabel(time:number){
  if(time>=sceneNow)return '지금'
  if(Math.abs(time)<=.2)return '충돌'
  return time<0?`충돌 ${(-time).toFixed(1)}초 전`:`충돌 ${time.toFixed(1)}초 후`
}

function sceneTitle(value:JourneyCase){
  const detected=manifest.scenarios.find(item=>item.id===value.emergency.scenarioId)?.presentation.detected??'사고 장면'
  const at=agreedValue(currentObservations(value,'collision-time'))
  return at?`${detected} · ${at}`:detected
}

function ContactMark({own,other,scale}:{own:Pose;other:Pose;scale:number}){
  const point=contactWorldPoint(own,sceneContact.anchor)
  return <g className="ac-vehicle-contact" data-scene-contact aria-hidden="true">
    <g transform={carTransform(other)}><path className="ac-contact-edge" d={sceneContact.otherEdge}/></g>
    <g transform={carTransform(own)}><path className="ac-contact-edge" d={sceneContact.ownEdge}/><path className="ac-contact-core" d={sceneContact.ownEdge}/></g>
    <circle className="ac-contact-dot" cx={point.x} cy={point.y} r={3/scale}/>
  </g>
}

function CellScene({vehicle,time,onOwnCar}:{vehicle:VehicleContourState;time:number;onOwnCar:()=>void}){
  const svg=useRef<SVGSVGElement>(null)
  const [size,setSize]=useState({width:0,height:0})
  useLayoutEffect(()=>{
    const node=svg.current!
    const measure=()=>setSize(previous=>previous.width===node.clientWidth&&previous.height===node.clientHeight?previous:{width:node.clientWidth,height:node.clientHeight})
    const observer=new ResizeObserver(measure)
    observer.observe(node);measure()
    return()=>observer.disconnect()
  },[])
  const frame=replayFrame(time),contextY=390-frame.own.y
  const scale=Math.min(size.width/sceneWindow.width,size.height/sceneWindow.height)
  const x=size.width/2-(sceneWindow.x+sceneWindow.width/2)*scale,y=size.height/2-(sceneWindow.y+sceneWindow.height/2)*scale
  return <svg ref={svg} className="vc-drawing">
    {scale>0&&<g transform={`translate(${x} ${y}) scale(${scale})`}><g transform={`translate(0 ${contextY})`}>
      <SceneRoad/>
      <SceneTrails time={time} own={frame.own} other={frame.other}/>
      <SceneCar pose={frame.other}/>
      <SceneCar pose={frame.own} own hazardOn={vehicle.hazard.tone==='confirmed'&&time>=1.5} onFocus={onOwnCar}/>
      {vehicle.direction==='우측 전방'&&time>=0&&<ContactMark own={frame.own} other={frame.other} scale={scale}/>}
    </g></g>}
  </svg>
}

type Expansion={view:SurroundingsView;time:number;host:HTMLElement|null}

export function VehicleSceneCell({value,compact,active}:{value:JourneyCase;compact:boolean;active:boolean}){
  const titleId=useId(),frame=useFlowFrame()
  const root=useRef<HTMLElement>(null),expandButton=useRef<HTMLButtonElement>(null),overlay=useRef<HTMLDivElement>(null),opener=useRef<HTMLElement|SVGElement|null>(null)
  const [time,setTime]=useState(sceneNow),[expansion,setExpansion]=useState<Expansion|null>(null)
  const vehicle=vehicleContourState(value),risk=riskState(value),alert=risk&&!risk.acknowledged?risk:null
  const past=time<sceneNow
  // A new risk or leaving the journey must surface the board again.
  useEffect(()=>{if(!active||alert)setExpansion(null)},[active,alert?.key])
  useLayoutEffect(()=>{
    if(!expansion){
      const target=opener.current
      opener.current=null
      if(target)(target.isConnected?target:expandButton.current)?.focus({preventScroll:true})
      return
    }
    const board=expansion.host?root.current?.closest<HTMLElement>('.fs-board'):null
    if(board)board.inert=true
    overlay.current?.focus({preventScroll:true})
    return()=>{if(board)board.inert=false}
  },[expansion])
  function expand(view:SurroundingsView){
    const node=root.current!,focused=document.activeElement
    opener.current=(focused instanceof HTMLElement||focused instanceof SVGElement)&&node.contains(focused)?focused:expandButton.current
    setExpansion({view,time,host:frame?.mode==='document'?null:node.closest<HTMLElement>('.fs-board-wrap')??node.closest<HTMLElement>('.ac-vehicle-content')})
  }
  const mobility=<span className="vc-pair"><span>차량 이동</span><CareStatus tone={vehicle.mobility.tone}>{vehicle.mobility.value}</CareStatus></span>
  const expanded=expansion&&<div ref={overlay} className="vc-expanded" data-inline={!expansion.host||undefined} role="dialog" aria-modal={!!expansion.host||undefined} aria-label="주변 상황" tabIndex={-1} onKeyDown={event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();setExpansion(null)}}}>
    <SurroundingsScene bounded active={active} vehicle={vehicle} initialView={expansion.view} initialTime={expansion.time} onClose={()=>setExpansion(null)}/>
  </div>
  if(expansion&&!expansion.host)return <section ref={root} className="vc-cell vc-scene" data-flow={frame?.mode}>{expanded}</section>
  return <section ref={root} className="vc-cell vc-scene" data-compact={compact} data-flow={frame?.mode} aria-labelledby={titleId}>
    <header className="fs-cell-label vc-head">
      <span className="vc-title" id={titleId}><span>{sceneTitle(value)}</span></span>
      {compact?alert&&<span className="vc-line"><CareStatus tone="failed">{alert.summary}</CareStatus></span>
        :<span className={`ss-source${past?' ss-source-past':''}`}><i/>{past?'사고 재생 · 시연':'현재 · 시연'}</span>}
      <button ref={expandButton} type="button" className="vc-expand" aria-label="주변 상황 크게 보기" aria-haspopup="dialog" onClick={()=>expand(past?'replay':'current')}><Expand aria-hidden="true"/></button>
    </header>
    {!compact&&<>
      <div className="vc-stage"><CellScene vehicle={vehicle} time={time} onOwnCar={()=>expand('vehicle')}/></div>
      <div className="vc-timeline" style={{'--ss-playhead':`${(time-sceneStart)/(sceneNow-sceneStart)*100}%`,'--vc-contact':`${contactShare*100}%`} as CSSProperties}>
        <div className="ss-timeline"><div className="ss-timeline-rail"/><div className="ss-timeline-fill"/><i className="ss-event-tick"/><input type="range" min={sceneStart} max={sceneNow} step={.1} value={time} aria-label="사고 장면 시점" aria-valuetext={momentLabel(time)} onChange={event=>setTime(Number(event.target.value))}/></div>
        <div className="ss-time-labels" aria-hidden="true"><span>충돌 5초 전</span><span>충돌</span><span>지금</span></div>
      </div>
      <ul className="vc-chips" aria-label="내 차와 주변">
        <li>{mobility}</li>
        {alert&&<li><CareStatus tone="failed">{alert.summary}</CareStatus></li>}
      </ul>
    </>}
    {expansion?.host&&createPortal(expanded,expansion.host)}
  </section>
}

export function VehicleDetailCell({value,compact}:{value:JourneyCase;compact:boolean}){
  const titleId=useId()
  const rows=vehicleRows(value),reasons=vehicleAttention(value),road=roadState(value),risk=riskState(value)
  const mobility=rows.find(row=>row.id==='mobility')!
  const reason=reasons.find(item=>item.label!==mobility.label)
  if(compact)return <section className="vc-cell vc-detail" data-compact="true" data-attention={reasons.length>0} aria-labelledby={titleId}>
    <header className="fs-cell-label vc-head">
      <span className="vc-title" id={titleId}><span>내 차</span></span>
      <span className="vc-line">
        {reason&&<span className="vc-pair">{reason.label&&<span>{reason.label}</span>}<CareStatus tone="failed">{reason.value}</CareStatus></span>}
        <span className="vc-pair"><span>{mobility.label}</span><CareStatus tone={mobility.state.tone}>{mobility.state.value}</CareStatus></span>
      </span>
    </header>
  </section>
  return <section className="vc-cell vc-detail" data-attention={reasons.length>0} aria-labelledby={titleId}>
    <header className="fs-cell-label vc-head"><span className="vc-title" id={titleId}><span>내 차</span></span>{road?<span className="vc-place" data-vehicle-note="road"><MapPin aria-hidden="true"/>{road.value}{road.source&&<small>{road.source}</small>}</span>:<CarFront aria-hidden="true"/>}</header>
    <div className="vc-body">
      <div className="vc-state">
        <dl className="vc-rows">{rows.map(row=><div key={row.id} data-vehicle-row={row.id}><dt>{row.label}</dt><dd><CareStatus tone={row.state.tone}>{row.state.value}</CareStatus>{row.state.source&&<small>{row.state.source}</small>}</dd></div>)}</dl>
        {risk&&<p data-vehicle-note="risk"><CareStatus tone={risk.acknowledged?'confirmed':'failed'}>{risk.acknowledged?`${risk.summary} · 주변 확인함`:risk.summary}</CareStatus></p>}
      </div>
      <div className="vc-requests"><JourneyRequests value={value}/></div>
    </div>
  </section>
}
