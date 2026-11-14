import {useEffect,useRef,useState} from 'react'
import {ArrowRight} from 'lucide-react'
import {createSession,scenarioFor,sceneFor,updateDraft} from '@/emergency/session'
import {CareAction,CareHeading,type CareTone} from '@/components/ui/after-care'
import {EmergencySurface} from '@/emergency/EmergencySurface'
import {resolveGuidance} from '@/emergency/guidance'
import {TaskLayout} from '@/components/ui/after-care-layout'
import {CareSituation,CareUnknownMap} from '@/components/ui/response-content'

// Catalog와 editor는 manifest의 실제 문구를 공용 제품 component에 전달.
export function ResponseLayoutPreview({layout='response',long=false,scenarioId='SC01',sceneId='connected'}:{layout?:'response'|'task';long?:boolean;scenarioId?:string;sceneId?:string}) {
  const [message,setMessage]=useState('')
  const heading=useRef<HTMLHeadingElement>(null)
  const [selection,setSelection]=useState(()=>createSession(scenarioId,sceneId))
  useEffect(()=>setSelection(createSession(scenarioId,sceneId)),[scenarioId,sceneId])
  const scenario=scenarioFor(scenarioId),scene=sceneFor(selection)
  const guidance=resolveGuidance(selection,scene,true)
  const summary=<CareSituation title={`${scenario.presentation.detected} · ${guidance.cueLabel}`} facts={scenario.facts.filter(f=>scenario.presentation.visible_facts.includes(f.id)).map(f=>({...f,...selection.facts[f.id],tone:'unknown' as CareTone}))}/>
  const navigation=<CareUnknownMap description={long?'현재 위치와 이동 경로가 아직 확인되지 않았어요. 확인된 정보가 도착하면 안내를 이어갈게요.':undefined}/>
  const action=<CareAction secondary onClick={()=>setMessage('전체 흐름에서 말로 기록하기를 시작할 수 있어요.')}><ArrowRight aria-hidden="true"/>기억나는 내용 남기기</CareAction>
  return <>
    {layout==='response'?<EmergencySurface selection={selection} paused={false} present="off" storageAvailable={true} countdownKey={scenarioId+'/'+sceneId} secondsLeft={scene.auto_contact?.seconds??0} heading={heading} navigation={navigation} onAction={()=>setMessage('전체 흐름에서 이 행동을 이어갈 수 있어요.')} onCancel={()=>setMessage('전체 흐름에서 연결을 취소할 수 있어요.')} onEditDraft={change=>setSelection(current=>updateDraft(current,change))}/>
    :<TaskLayout summary={summary} navigation={navigation} action={action}><CareHeading title="기억나는 내용을 남겨주세요">확실한 내용만 남겨주세요. 내용을 확인한 뒤 저장해요.</CareHeading><CareAction onClick={()=>setMessage('전체 흐름에서 말로 기록하기를 시작할 수 있어요.')}>말로 기록하기</CareAction><CareAction secondary onClick={()=>setMessage('전체 흐름에서 직접 입력할 수 있어요.')}>직접 입력</CareAction></TaskLayout>}
    {message&&<p role="status" className="ac-preview-notice">{message} <a href="/?study=journey">전체 흐름 열기</a></p>}
  </>
}
