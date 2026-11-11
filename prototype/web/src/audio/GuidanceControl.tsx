import {useRef} from 'react'
import {Volume2,VolumeX} from 'lucide-react'
import {CareAction} from '@/components/ui/after-care'
import {useGuidanceAudio,type GuidanceState} from './useGuidanceAudio'
export function GuidanceButton({state,onClick}:{state:GuidanceState;onClick:()=>void}){
 const active=state==='speaking'||state==='loading'
 return <CareAction secondary onClick={onClick} aria-busy={state==='loading'}>{active?<VolumeX aria-hidden="true"/>:<Volume2 aria-hidden="true"/>}{active?'음성 안내 중지':'음성 안내 듣기'}</CareAction>
}
export function GuidanceControl({text,contextKey}:{text:string;contextKey:string}){
 const host=useRef<HTMLDivElement>(null)
 const audio=useGuidanceAudio({text,key:contextKey,host})
 return <div ref={host} className="ac-guidance-control" data-guidance-state={audio.state}>
  <GuidanceButton state={audio.state} onClick={audio.toggle}/>
  {audio.state==='error'&&<p role="status">음성 재생을 사용할 수 없어요. 음성 원고: {text}</p>}
 </div>
}
