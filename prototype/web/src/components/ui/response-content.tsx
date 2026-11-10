import type {ReactNode} from 'react'
import {CarFront,MapPin,MoveUpRight,Phone} from 'lucide-react'
import {CareHeading,CareSpectrum,CareStatus,type CareTone} from './after-care'
import './response-content.css'

export function CareSituation({title,facts,action,children}:{title:string;facts:{id:string;label:string;value:string;tone:CareTone}[];action?:ReactNode;children?:ReactNode}) {
  return <div className="ac-situation"><div className="ac-situation-top"><div><CarFront aria-hidden="true"/><h2>{title}</h2></div>{action}</div>{children}<dl className="ac-facts">{facts.map(f=><div key={f.id} data-fact={f.id}><dt>{f.label}</dt><dd><CareStatus tone={f.tone}>{f.value}</CareStatus></dd></div>)}</dl></div>
}
export function CareRequests({items}:{items:{id:string;label:string;status:string;tone:CareTone}[]}) {
  return <dl className="ac-request-list" aria-label="기관별 요청 상태">{items.map(r=><div key={r.id} data-request={r.id}><dt>{r.label}</dt><dd><CareStatus tone={r.tone}><span>{r.status.split(' · ').map(part=><span key={part} className="ac-request-line">{part}</span>)}</span></CareStatus></dd></div>)}</dl>
}
export function CareUnknownMap({description='아직 안내 지점이 확인되지 않았어요.'}:{description?:string}) {
  return <div className="ac-unknown-map" data-navigation-state="unknown"><MapPin aria-hidden="true"/><h2>위치 확인 중</h2><p>{description}</p></div>
}
export function CareGuidance({condition,now,next,action}:{condition?:string;now:string;next?:string;action?:ReactNode}) {
  return <div className="ac-guidance-content"><MoveUpRight aria-hidden="true"/>{condition&&<p>{condition}</p>}<h2>{now}</h2>{next&&<p>{next}</p>}{action}</div>
}
export function CareConnectedCall({title,active=true}:{title:string;active?:boolean}) {
  return <div className="ac-call-content"><div className="ac-call-label"><span>긴급 통화</span><Phone aria-hidden="true"/></div><div className="ac-call-number" aria-hidden="true">119</div><CareHeading title={title}/><CareSpectrum active={active}/></div>
}
