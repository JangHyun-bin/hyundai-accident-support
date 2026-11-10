import {useState} from 'react'
import {ArrowRight,Volume2} from 'lucide-react'
import {createSession,manifest,scenarioFor,sceneFor} from '@/emergency/session'
import {CareAction,CareHeading,type CareTone} from '@/components/ui/after-care'
import {ResponseLayout,TaskLayout} from '@/components/ui/after-care-layout'
import {CareConnectedCall,CareGuidance,CareRequests,CareSituation,CareUnknownMap} from '@/components/ui/response-content'

// Catalog와 editor는 manifest의 실제 문구를 공용 제품 component에 전달.
export function ResponseLayoutPreview({layout='response',long=false}:{layout?:'response'|'task';long?:boolean}) {
  const [message,setMessage]=useState('')
  const selection=createSession('SC01','connected'),scenario=scenarioFor('SC01'),scene=sceneFor(selection)
  const summary=<CareSituation title={`${scenario.presentation.detected} · ${scene.cue.label}`} action={<CareAction secondary onClick={()=>setMessage('음성 안내는 전체 흐름에서 들을 수 있어요.')}><Volume2 aria-hidden="true"/>음성 안내 듣기</CareAction>} facts={scenario.facts.filter(f=>scenario.presentation.visible_facts.includes(f.id)).map(f=>({...f,...selection.facts[f.id],tone:'unknown' as CareTone}))}/>
  const navigation=<CareUnknownMap description={long?'현재 위치와 이동 경로가 아직 확인되지 않았어요. 확인된 정보가 도착하면 안내를 이어갈게요.':undefined}/>
  const action=<CareAction secondary onClick={()=>setMessage('전체 흐름에서 말로 기록하기를 시작할 수 있어요.')}><ArrowRight aria-hidden="true"/>기억나는 내용 남기기</CareAction>
  return <>
    {layout==='response'?<ResponseLayout summary={summary} primary={<CareConnectedCall title={scene.title}/>} guidance={<CareGuidance condition={scene.self_action?.condition} now={scene.self_action?.now??''} next={long?'주변 상황을 살피며 안전한 곳으로 이동할 수 있는지 먼저 확인하세요.':scene.self_action?.next}/>} requests={<CareRequests items={scenario.requests.map(r=>{const status=manifest.request_statuses[selection.requests[r.id]];return {id:r.id,label:r.label==='보험'?'보험사':r.label,status:status.label,tone:'unknown'}})}/>} navigation={navigation} action={action}/>
    :<TaskLayout summary={summary} navigation={navigation} action={action}><CareHeading title="기억나는 내용을 남겨주세요">확실한 내용만 남겨주세요. 내용을 확인한 뒤 저장해요.</CareHeading><CareAction onClick={()=>setMessage('전체 흐름에서 말로 기록하기를 시작할 수 있어요.')}>말로 기록하기</CareAction><CareAction secondary onClick={()=>setMessage('전체 흐름에서 직접 입력할 수 있어요.')}>직접 입력</CareAction></TaskLayout>}
    {message&&<p role="status" className="ac-preview-notice">{message} <a href="/?study=journey">전체 흐름 열기</a></p>}
  </>
}
