import {type ReactNode,type Ref} from 'react'
import NumberFlow from '@number-flow/react'
import {GuidanceButton} from '@/audio/GuidanceControl'
import type {GuidanceState} from '@/audio/useGuidanceAudio'
import {useCareMotion} from '@/design-system/motion'
import {CareAction,type CareTone} from '@/components/ui/after-care'
import {ResponseLayout} from '@/components/ui/after-care-layout'
import {CareConnectedCall,CareGuidance,CareRequests,CareSituation,CareUnknownMap} from '@/components/ui/response-content'
import {manifest,scenarioFor,sceneFor,type Session,type Edge} from './session'
import {WorkflowPanel} from './WorkflowPanel'
import {resolveGuidance} from './guidance'
import './emergency-system.css'

export function careTone(tone:string):CareTone {
  return tone==='confirmed'?'confirmed':tone==='attention'?'failed':tone==='pending'?'pending':'unknown'
}

type Props={
  notice?:ReactNode;navigation?:ReactNode
  selection:Session;paused:boolean;present:'off'|'showing'|'covered'
  voiceState:GuidanceState;storageAvailable:boolean
  countdownKey:string;secondsLeft:number;heading:Ref<HTMLHeadingElement>
  onAction:(edge:Edge)=>void;onCancel:()=>void;onVoice:()=>void
  onEditDraft:(change:{record?:string;scope?:string[]})=>void
}
export function EmergencySurface({selection,paused,present,voiceState,storageAvailable,countdownKey,secondsLeft,heading,onAction,onCancel,onVoice,onEditDraft,notice,navigation}:Props) {
  const motionKey=selection.scenarioId+'/'+selection.sceneId
  const motionRef=useCareMotion<HTMLElement>(motionKey)
  const scenario=scenarioFor(selection.scenarioId),scene=sceneFor(selection)
  const facts=scenario.facts.map(f=>({...f,...selection.facts[f.id]}))
  const callConnected=scene.title==='119 통화 연결됨'
  const actions=(edges:Edge[])=>edges.map(edge=><CareAction key={edge.id} secondary={edge.secondary} disabled={(edge.effect==='submit'&&!selection.scope.length)||(edge.effect==='save_record'&&!selection.record.trim())} onClick={()=>onAction(edge)}>{edge.label}</CareAction>)
  const carActions=scene.actions.filter(a=>a.slot!=='self')
  const recordActions=carActions.filter(a=>a.to==='record')
  const guidance=resolveGuidance(selection,scene,storageAvailable)
  const callTone=callConnected||!!scene.auto_contact||(['SC01','SC03'].includes(scenario.id)&&scene.phase==='progress')
  return <section ref={motionRef} data-care-motion-key={motionKey} className="emergency-screen ac-emergency ac-system" data-surface-status="flat" data-scenario={scenario.id} data-scene={scene.id} data-request-count={selection.submissions} aria-label="시각 중심 사고 대응" inert={paused||present==='covered'}>
    <ResponseLayout notificationKey={motionKey} primaryTone={callTone?'call':'plain'}
      summary={<div data-slot="detected"><CareSituation title={`${scenario.presentation.detected} · ${scene.cue.label}`} action={<GuidanceButton state={voiceState} onClick={onVoice}/>} facts={facts.filter(f=>scenario.presentation.visible_facts.includes(f.id)||(f.id==='risk'&&f.status==='attention')).map(f=>({...f,tone:careTone(f.status)}))}>{notice}</CareSituation></div>}
      primary={<div className="ac-emergency-primary" data-slot="car" data-urgent={scene.auto_contact?true:undefined} aria-live="polite">
        {scene.auto_contact&&<div className="ac-countdown" key={countdownKey} data-countdown={secondsLeft} aria-hidden="true"><NumberFlow value={secondsLeft}/></div>}
        {callConnected?<CareConnectedCall title={guidance.title} headingRef={heading} active={!paused&&present!=='covered'}/>:<header className="ac-heading">{scene.step&&<span className="ac-eyebrow">{scene.step}</span>}<h1 ref={heading} tabIndex={-1}>{guidance.title}</h1>{scene.auto_contact?<p>응답이 없으면 자동 연결</p>:guidance.instruction&&scene.panel!=='scope'&&<p>{guidance.instruction}</p>}</header>}
        <WorkflowPanel scene={scene} session={selection} persistent={storageAvailable} onChange={onEditDraft}/>
        <div className="ac-emergency-actions">{actions(carActions.filter(a=>a.to!=='record'))}{scene.auto_contact&&<CareAction secondary onClick={onCancel}>취소</CareAction>}</div>
      </div>}
      guidance={<div data-slot="self"><CareGuidance condition={scene.self_action?.condition} now={scene.self_action?.now??'확인된 안내에 따라 진행하세요'} next={scene.self_action?.next} action={<div className="ac-emergency-actions">{actions(scene.actions.filter(a=>a.slot==='self'))}</div>}/></div>}
      requests={<CareRequests items={scenario.requests.map(r=>{const status=manifest.request_statuses[selection.requests[r.id]??r.status];return {id:r.id,label:r.label==='보험'?'보험사':r.label,status:status.label,tone:careTone(status.tone)}})}/>}
      navigation={navigation??<CareUnknownMap/>}
      action={recordActions.length>0?<div className="ac-emergency-actions">{actions(recordActions)}</div>:undefined}/>
  </section>
}
