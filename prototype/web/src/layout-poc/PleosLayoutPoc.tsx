import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,ArrowRight,Expand,FileText,Phone,Send} from 'lucide-react'
import {CareAction,CareSpectrum,CareStatus,CareSurface,type CareTone} from '@/components/ui/after-care'
import {CareVehicleContour,type VehicleContourState,type VehiclePartState} from '@/components/ui/vehicle-contour'
import {FlowBoard} from '@/design-system/FlowBoard'
import {FlowFrameContext} from '@/design-system/flow-contract'
import {layoutPriority,type CellId} from '@/design-system/flow-geometry'
import {stageLabels,type FlowLayout,type FlowStep} from '@/design-system/flow-study-model'
import {useReducedMotionPreference} from '@/design-system/motion'
import {SurroundingsScene} from '@/design-system/SurroundingsStudy'
import {useBoundedFrame} from '@/design-system/use-bounded-frame'
import {guideCopy,safetyChecklist,sceneCopy,type CallState} from '@/journey/journey-flow'
import '@/design-system/flow-study.css'
import '@/journey/journey-flow.css'
import './pleos-layout-poc.css'

const display={width:2560,height:1440}
const appWindow={left:853,top:90,width:1682,height:1210}
const splitWidth=841
const systemAreas=[
  {src:'/layout-poc/status-bar.png',left:0,top:0,width:2560,height:90},
  {src:'/layout-poc/driving-view.png',left:0,top:90,width:853,height:1210,label:'시스템 Driving view'},
  {src:'/layout-poc/edge.png',left:2535,top:90,width:25,height:1210},
  {src:'/layout-poc/gnb.png',left:0,top:1300,width:2560,height:140},
]

const variants=['a','b','c'] as const
type Variant=typeof variants[number]
const sceneOrder=['situation','calling','call','move','ready','record-empty','review'] as const
type DemoScene=typeof sceneOrder[number]
type SceneSpec={step:FlowStep;layout:FlowLayout;guide:keyof typeof guideCopy;call:CallState;secured:boolean;recorded:boolean;back:DemoScene|null;next:DemoScene|null}
const scenes:Record<DemoScene,SceneSpec>={
  situation:{step:1,layout:'detect',guide:'situation',call:'idle',secured:false,recorded:false,back:null,next:null},
  calling:{step:2,layout:'detect',guide:'call',call:'connecting',secured:false,recorded:false,back:'situation',next:'call'},
  call:{step:2,layout:'detect',guide:'call',call:'connected',secured:false,recorded:false,back:'situation',next:'move'},
  move:{step:3,layout:'evacuate',guide:'move',call:'idle',secured:false,recorded:false,back:'situation',next:'ready'},
  ready:{step:4,layout:'safe',guide:'safe',call:'idle',secured:true,recorded:false,back:'move',next:'record-empty'},
  'record-empty':{step:5,layout:'safe',guide:'safe',call:'idle',secured:true,recorded:false,back:'ready',next:null},
  review:{step:6,layout:'review',guide:'safe',call:'idle',secured:true,recorded:true,back:'record-empty',next:null},
}
const callLabels:Record<Exclude<CallState,'idle'>,string>={connecting:'연결 중',connected:'통화 중',ended:'통화 종료'}
const summaryCells=['guide','record','insurer'] as const
const cellTitles:Record<typeof summaryCells[number],string>={guide:'안전 확보',record:'사고 기록',insurer:'보험사 전달'}
const recordMethods=['말로 남기기','사진 남기기','휴대폰으로 남기기'] as const
const unknownPart:VehiclePartState={value:'미확인',tone:'unknown'}

const fitScale=()=>Math.min(innerWidth/display.width,innerHeight/display.height)

export function PleosLayoutPoc() {
  return new URLSearchParams(location.search).has('display')?<PleosDisplay/>:<DisplayPreview/>
}

// The display renders in a 2560 × 1440 iframe so the design tokens resolve to the real display's media profile.
function DisplayPreview() {
  const [scale,setScale]=useState(fitScale)
  useEffect(()=>{
    const resize=()=>setScale(fitScale())
    addEventListener('resize',resize)
    return()=>removeEventListener('resize',resize)
  },[])
  const source=new URL(location.href)
  source.searchParams.set('display','1')
  return <main className="plp-preview"><div style={{width:display.width*scale,height:display.height*scale}}>
    <iframe title="Pleos Connect 2560 × 1440 화면" src={source.pathname+source.search} style={{width:display.width,height:display.height,transform:`scale(${scale})`}}/>
  </div></main>
}

function PleosDisplay() {
  const params=new URLSearchParams(location.search)
  const variant=variants.find(item=>item===params.get('variant'))??'a'
  const scene=sceneOrder.find(item=>item===params.get('scene'))??'situation'
  return <div className="plp-display">
    {systemAreas.map(({src,label,...rect})=><div key={src} className="plp-system" style={rect}><img src={src} alt="" width={rect.width} height={rect.height}/>{label&&<span>{label}</span>}</div>)}
    <div className="plp-window" style={appWindow}>
      <div className="plp-window-app" style={{width:variant==='c'?splitWidth:appWindow.width}}><PocApp variant={variant} initialScene={scene}/></div>
      {variant==='c'&&<div className="plp-other-app"><span>다른 앱</span><small>1:1 분할 · 우리 앱 {splitWidth} × {appWindow.height} 추정</small></div>}
    </div>
  </div>
}

function PocApp({variant,initialScene}:{variant:Variant;initialScene:DemoScene}) {
  const host=useRef<HTMLDivElement>(null)
  const frame=useBoundedFrame(host,'vehicle',appWindow.height)
  const reduced=!!useReducedMotionPreference()
  const [scene,setScene]=useState(initialScene)
  const [checks,setChecks]=useState(()=>safetyChecklist.map(()=>scenes[initialScene].secured))
  const [method,setMethod]=useState<typeof recordMethods[number]>(recordMethods[0])
  const [surroundings,setSurroundings]=useState(false)
  const [call,setCall]=useState(scenes[initialScene].call)
  const spec=scenes[scene],callActive=scene==='situation'&&call!=='idle'
  const copy=sceneCopy[callActive?'situation-call':scene],next=callActive?call==='connected'?'call':'calling':spec.next
  const done=checks.filter(Boolean).length,arrived=spec.step>=4
  const vehicle:VehicleContourState={direction:'우측 전방',directionNote:'',
    hazard:checks[0]?{value:'켜짐',tone:'confirmed',source:'직접 확인'}:unknownPart,
    trunk:checks[1]?{value:'열림',tone:'confirmed',source:'직접 확인'}:unknownPart,
    mobility:{value:'가능 여부 미확인',tone:'unknown'}}
  const facts:{label:string;value:string;tone:CareTone}[]=[
    {label:'충격 방향',value:vehicle.direction??vehicle.directionNote,tone:vehicle.direction?'failed':'unknown'},
    {label:'비상등',...vehicle.hazard},{label:'트렁크',...vehicle.trunk},{label:'차량 이동',...vehicle.mobility},
  ]
  const factList=<ul className="plp-facts" aria-label="차량 상태">{facts.map(fact=><li key={fact.label}><span>{fact.label}</span><CareStatus tone={fact.tone}>{fact.value}</CareStatus></li>)}</ul>
  const summaries:Record<typeof summaryCells[number],string>={guide:arrived?'안전한 곳에 있음':'이동 전',record:spec.recorded?'기록 있음':'기록 전',insurer:'전송 전'}
  function go(target:DemoScene) {
    setScene(target)
    setChecks(safetyChecklist.map(()=>scenes[target].secured))
    if(scenes[target].call!=='idle')setCall(scenes[target].call)
    const url=new URL(location.href)
    url.searchParams.set('scene',target)
    history.replaceState(history.state,'',url)
  }
  function renderCell(id:CellId,compact:boolean) {
    if(id==='emergency')return <><div className="fs-call-core"><div className="fs-cell-label"><span>119 긴급 통화</span><Phone aria-hidden="true"/></div>{call==='idle'?<CareAction onClick={()=>go('calling')}>119에 연결</CareAction>:<><p>{callLabels[call]}</p><CareStatus tone="unknown">구호 접수 미확인</CareStatus></>}</div>{!compact&&<div className="fs-call-decoration" aria-hidden="true"><div className="fs-call-number">119</div><CareSpectrum active={call==='connected'}/></div>}</>
    if(id==='guide')return <><div className="fs-cell-label"><span>안전 확보</span><span>{done} / 4</span></div>{compact?<p className="journey-cell-summary">{summaries.guide}</p>:<><h2>{guideCopy[spec.guide].title}</h2><p className="fs-cell-muted">{guideCopy[spec.guide].note}</p></>}
      {spec.step===3&&<div className="fs-checklist" role="group" aria-label="안전 확인 항목">{safetyChecklist.map((item,index)=><label key={item.id}><input type="checkbox" checked={checks[index]} onChange={()=>setChecks(checks.map((value,at)=>at===index?!value:value))}/><span>{item.label}</span></label>)}</div>}
      {!compact&&spec.step===1&&<CareAction onClick={()=>go('move')}>급한 위험은 없어요</CareAction>}</>
    if(id==='record')return <><div className="fs-cell-label"><FileText aria-hidden="true"/><span>사고 기록</span></div>{compact?<p className="journey-cell-summary">{summaries.record}</p>:<><h2>{spec.recorded?'남긴 기록이 있어요':'기억나는 것부터 남기면 돼요'}</h2>
      {spec.step===5&&<div className="plp-record-methods" role="group" aria-label="기록 방법">{recordMethods.map(item=><CareAction key={item} secondary aria-pressed={method===item} onClick={()=>setMethod(item)}>{item}</CareAction>)}</div>}
      <p className="fs-cell-muted">이야기 0개 · 자료 0개</p><p className="fs-cell-muted">아직 남긴 기록이 없어요.</p></>}</>
    return <><div className="fs-cell-label"><Send aria-hidden="true"/><span>보험사 전달</span></div>{compact?<p className="journey-cell-summary">{summaries.insurer}</p>:<h2>보낼 내용을 확인해요</h2>}<CareStatus tone="unknown">보험사 접수 미확인</CareStatus>{!compact&&<p className="fs-cell-muted">받는 곳과 보낼 자료는 직접 고를 수 있어요.</p>}</>
  }
  const contextToggle=<CareAction secondary className="plp-context" aria-pressed={surroundings} onClick={()=>setSurroundings(!surroundings)}><Expand aria-hidden="true"/>{surroundings?'현재 작업 보기':'주변 상황 보기'}</CareAction>
  return <FlowFrameContext.Provider value={frame}><div ref={host} className="plp-app ac-system" data-variant={variant} data-scene={scene}>
    <header className="plp-header">
      <div className="plp-header-row">
        {variant==='c'
          ?<span className="fs-step-label">{spec.step} / 7 · {stageLabels[spec.step-1]}</span>
          :<ol className="plp-stepper" aria-label="사고 대응 진행">{stageLabels.map((label,index)=><li key={label} aria-current={spec.step===index+1?'step':undefined} data-done={index+1<spec.step&&!(index===1&&call==='idle')}><span>{String(index+1).padStart(2,'0')}</span><em>{label}</em></li>)}</ol>}
        {variant==='a'&&factList}
        {variant==='c'&&contextToggle}
      </div>
      <div className="plp-header-row"><div className="plp-copy" aria-live="polite"><h1>{copy.title}</h1><p>{copy.support}</p></div>{variant!=='c'&&contextToggle}</div>
      {variant==='c'&&factList}
    </header>
    <div className="fs-dashboard plp-body">
      {variant==='b'&&<CareSurface className="plp-car"><CareVehicleContour state={vehicle}/></CareSurface>}
      {variant==='c'&&<ul className="plp-summary" aria-label="다른 작업">{summaryCells.filter(id=>id!==layoutPriority[spec.layout]).map(id=><li key={id}><span>{cellTitles[id]}</span><span>{summaries[id]}</span></li>)}</ul>}
      <div className="journey-flow plp-board"><FlowBoard layout={spec.layout} notificationKey={`${scene}/${done}`} reduced={reduced} readout={false} renderCell={renderCell}/></div>
      {surroundings&&<div className="plp-overlay"><SurroundingsScene bounded initialView="current" vehicle={vehicle}/></div>}
    </div>
    <footer className="plp-actions">
      <CareAction secondary disabled={!spec.back} onClick={()=>{if(spec.back)go(spec.back)}}><ArrowLeft aria-hidden="true"/>이전</CareAction>
      <span className="plp-next-hint">{copy.demo?`시연: ${copy.action}`:copy.action}</span>
      <CareAction disabled={copy.blocked||!next} onClick={()=>{if(next)go(next)}}>다음<ArrowRight aria-hidden="true"/></CareAction>
    </footer>
  </div></FlowFrameContext.Provider>
}
