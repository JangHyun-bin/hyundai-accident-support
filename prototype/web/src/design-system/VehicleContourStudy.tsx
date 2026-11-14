import {useLayoutEffect,useMemo,useRef,useState} from 'react'
import {ArrowLeft,ArrowUpRight,Check,FileText} from 'lucide-react'
import {CareAction,CareSurface} from '@/components/ui/after-care'
import {VehicleShell} from '@/components/ui/after-care-layout'
import {CareConnectedCall,CareGuidance} from '@/components/ui/response-content'
import {CareVehicleContour,impactDirections,type ImpactDirection} from '@/components/ui/vehicle-contour'
import {createCase,type SafetyAction} from '@/journey/case'
import {createSession} from '@/emergency/session'
import {vehicleContourState} from '@/journey/vehicle-state'
import {responseShapes,type ResponseShapes,type SlotRect} from './split-geometry'
import './vehicle-contour-study.css'

type Scene='impact'|'unknown'|'conflict'
const scenes:{id:Scene;label:string}[]=[{id:'impact',label:'충격 감지'},{id:'unknown',label:'전체 미확인'},{id:'conflict',label:'정보 충돌'}]
const actionStates:{value:SafetyAction['status'];label:string}[]=[{value:'unknown',label:'미확인'},{value:'requested',label:'확인 중'},{value:'device-confirmed',label:'차량 확인'},{value:'user-confirmed',label:'사용자 확인'},{value:'unavailable',label:'지금 할 수 없음'}]

export function VehicleResponseContext({hazardConfirmed}:{hazardConfirmed:boolean}) {
  const ref=useRef<HTMLDivElement>(null)
  const [shapes,setShapes]=useState<ResponseShapes>({})
  useLayoutEffect(()=>{
    const node=ref.current!
    const measure=()=>{
      const box=node.getBoundingClientRect()
      const slot=(id:string):SlotRect=>{const r=node.querySelector(`[data-context="${id}"]`)!.getBoundingClientRect();return {left:r.left-box.left,top:r.top-box.top,width:r.width,height:r.height}}
      const next=responseShapes(box.width,{primary:slot('safety'),navigation:slot('record'),guidance:slot('call')})
      setShapes(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next)
    }
    const observer=new ResizeObserver(measure)
    observer.observe(node);node.querySelectorAll('[data-context]').forEach(child=>observer.observe(child));measure()
    return()=>observer.disconnect()
  },[])
  return <div className="vcs-response" ref={ref}>
    <CareSurface className="vcs-safety" tone="safety" shape={shapes.primary} data-context="safety">
      <div className="vcs-progress"><span>안전 확보</span><span>{hazardConfirmed?2:1} / 4</span></div><div className="vcs-progress-track" aria-hidden="true">{[0,1,2,3].map(i=><i key={i} data-complete={i<(hazardConfirmed?2:1)}/>)}</div>
      <CareGuidance now="가드레일 밖으로 대피하세요" next="주변 차량을 먼저 살펴주세요."/>
      <ul className="vcs-checklist"><li>{hazardConfirmed?<Check aria-hidden="true"/>:<span/>}비상등 켜기</li><li><Check aria-hidden="true"/>119 통화 연결</li><li><span/>안전한 곳으로 대피</li><li><span/>스마트폰에서 이어가기</li></ul>
    </CareSurface>
    <CareSurface className="vcs-record" shape={shapes.navigation} data-context="record"><FileText aria-hidden="true"/><h2>사고 기록</h2><p>확인된 내용부터<br/>차분하게 남겨주세요.</p><div><span>충격 방향</span><strong>차량 상태에서 확인</strong></div><div><span>영상 · 음성</span><strong>기록 전</strong></div></CareSurface>
    <CareSurface className="vcs-call" tone="call" shape={shapes.guidance} data-context="call"><CareConnectedCall title="119 통화 연결됨"/><p>구호 접수 미확인</p></CareSurface>
  </div>
}

export function VehicleContourStudy() {
  const [scene,setScene]=useState<Scene>('impact')
  const [direction,setDirection]=useState<ImpactDirection>('우측 전방')
  const [hazard,setHazard]=useState<SafetyAction['status']>('device-confirmed')
  const [trunk,setTrunk]=useState<SafetyAction['status']>('unknown')
  const state=useMemo(()=>{
    const now='2026-11-11T12:12:00.000Z'
    const value=createCase(createSession('SC01','connected'),'vehicle-contour-preview',now)
    value.observations=value.observations.map(item=>item.kind==='mobility'?{...item,value:'미확인',confirmation:'unknown'}:item)
    if(scene!=='unknown')value.observations.push({id:'preview-impact',kind:'impact-direction',label:'충격 방향',value:direction,source:'fixture',observedAt:now,confirmation:'confirmed',legacyFactId:null,supersedes:null})
    if(scene==='conflict')value.observations.push({id:'preview-conflict',kind:'impact-direction',label:'충격 방향',value:direction==='후방'?'전방':'후방',source:'user',observedAt:now,confirmation:'confirmed',legacyFactId:null,supersedes:null})
    value.safetyActions=[{id:'hazard',label:'비상등',status:scene==='unknown'?'unknown':hazard,source:'fixture',confirmedAt:now},{id:'trunk',label:'트렁크',status:scene==='unknown'?'unknown':trunk,source:'fixture',confirmedAt:now}]
    return vehicleContourState(value)
  },[scene,direction,hazard,trunk])
  return <main className="ac-system vcs-study">
    <header className="vcs-heading"><div><a href="/?study=design-system"><ArrowLeft size={16}/>차분</a><h1>B / Contour</h1><p>차량의 상태를, 필요한 만큼만.</p></div><a className="vcs-product-link" href="/?study=journey">전체 여정<ArrowUpRight size={16}/></a></header>
    <section className="vcs-toolbar" aria-label="차량 상태 시안 설정"><div className="vcs-scenes" role="group" aria-label="예시 상태">{scenes.map(item=><CareAction key={item.id} secondary={scene!==item.id} aria-pressed={scene===item.id} onClick={()=>setScene(item.id)}>{item.label}</CareAction>)}</div>
      <label>충격 방향<select aria-label="예시 충격 방향" value={direction} disabled={scene==='unknown'} onChange={event=>setDirection(impactDirections.find(value=>value===event.target.value)??'우측 전방')}>{impactDirections.map(item=><option key={item}>{item}</option>)}</select></label>
      <label>비상등<select aria-label="예시 비상등 상태" value={hazard} disabled={scene==='unknown'} onChange={event=>setHazard(actionStates.find(item=>item.value===event.target.value)!.value)}>{actionStates.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>트렁크<select aria-label="예시 트렁크 상태" value={trunk} disabled={scene==='unknown'} onChange={event=>setTrunk(actionStates.find(item=>item.value===event.target.value)!.value)}>{actionStates.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    </section>
    <VehicleShell><div className="vcs-dashboard"><CareSurface className="vcs-vehicle"><CareVehicleContour state={state}/></CareSurface><VehicleResponseContext hazardConfirmed={state.hazard.tone==='confirmed'}/></div></VehicleShell>
    <footer className="vcs-footer"><span>B / Contour · 실제 SVG component</span><span>예시 상태 · 실제 차량 연결 없음</span></footer>
  </main>
}
