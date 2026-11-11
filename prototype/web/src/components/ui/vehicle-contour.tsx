import {useReducedMotionPreference} from '@/design-system/motion'
import {useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react'
import {AnimatePresence,motion,useIsPresent} from 'motion/react'
import {ArrowLeft,ArrowUp,ChevronRight,Circle,CircleCheck,Clock3,Minus} from 'lucide-react'
import {CareStatus, type CareTone} from './after-care'
import {ContourCar} from './contour-car'
import './vehicle-contour.css'

export const impactDirections = ['전방', '우측 전방', '우측', '우측 후방', '후방', '좌측 후방', '좌측', '좌측 전방'] as const
export type ImpactDirection = typeof impactDirections[number]
export type VehiclePartState = {value:string; tone:CareTone; source?:string}
export type VehicleContourState = {
  direction:ImpactDirection|null
  directionNote:string
  hazard:VehiclePartState
  trunk:VehiclePartState
  mobility:VehiclePartState
}

type ImpactMark = {path:string; x:number; y:number; side:'left'|'right'; lower?:boolean}
export type VehiclePart='impact'|'hazard'|'trunk'
const parts:{id:VehiclePart;name:string}[]=[{id:'impact',name:'충격 방향'},{id:'hazard',name:'비상등'},{id:'trunk',name:'트렁크'}]
const directionDescriptions:Record<ImpactDirection,string>={
  '전방':'차량 앞쪽에서 확인된 충격이에요.',
  '우측 전방':'차량 앞쪽 오른편에서 확인된 충격이에요.',
  '우측':'차량 오른편에서 확인된 충격이에요.',
  '우측 후방':'차량 뒤쪽 오른편에서 확인된 충격이에요.',
  '후방':'차량 뒤쪽에서 확인된 충격이에요.',
  '좌측 후방':'차량 뒤쪽 왼편에서 확인된 충격이에요.',
  '좌측':'차량 왼편에서 확인된 충격이에요.',
  '좌측 전방':'차량 앞쪽 왼편에서 확인된 충격이에요.',
}

export function detailFor(part:VehiclePart,state:VehicleContourState):{status:VehiclePartState;description:string;note?:string} {
  if(part==='impact')return {
    status:{value:state.direction??state.directionNote,tone:state.direction?'failed':'unknown'},
    description:state.direction?directionDescriptions[state.direction]:state.directionNote==='미확인'?'어느 방향에서 충격이 있었는지 아직 확인되지 않았어요.':'충격 방향을 다시 확인해야 해요.',
    note:state.direction?'손상 범위와 차량 이동 가능 여부는 별도 확인이 필요해요.':undefined,
  }
  const status=state[part],hazard=part==='hazard'
  const description=status.tone==='confirmed'
    ?status.source==='사용자 확인'?(hazard?'비상등을 켰다고 남긴 상태예요.':'트렁크를 열었다고 남긴 상태예요.'):(hazard?'비상등 작동이 확인됐어요.':'트렁크가 열린 상태로 확인됐어요.')
    :status.tone==='pending'?(hazard?'비상등 작동 확인을 기다리고 있어요.':'트렁크 상태 확인을 기다리고 있어요.')
    :status.tone==='skipped'?(hazard?'비상등을 지금 켤 수 없다고 남긴 상태예요.':'트렁크를 지금 열 수 없다고 남긴 상태예요.')
    :(hazard?'비상등이 켜져 있는지 아직 확인되지 않았어요.':'트렁크의 열림 여부가 아직 확인되지 않았어요.')
  return {status,description}
}
const impactMarks:Record<ImpactDirection,ImpactMark> = {
  '전방':{path:'M248 42 Q280 36 312 42',x:280,y:39,side:'right'},
  '우측 전방':{path:'M329 47 Q359 56 366 113',x:360,y:84,side:'right'},
  '우측':{path:'M370 235 L370 315',x:370,y:260,side:'right'},
  '우측 후방':{path:'M366 417 Q361 474 332 487',x:356,y:465,side:'right',lower:true},
  '후방':{path:'M248 491 Q280 499 312 491',x:280,y:495,side:'right',lower:true},
  '좌측 후방':{path:'M194 417 Q199 474 228 487',x:204,y:465,side:'left',lower:true},
  '좌측':{path:'M190 235 L190 315',x:190,y:260,side:'left'},
  '좌측 전방':{path:'M231 47 Q201 56 194 113',x:200,y:84,side:'left'},
}

function DetailPanel({id,reduce,children}:{id:string;reduce:boolean;children:ReactNode}) {
  const present=useIsPresent()
  return <motion.section id={id} className="ac-contour-detail" role="region" aria-label="차량 상태 상세" inert={!present} aria-hidden={!present} initial={{opacity:0,x:reduce?0:12}} animate={{opacity:1,x:0,transition:{duration:reduce?0:.34,delay:reduce?0:.16,ease:[.22,1,.36,1]}}} exit={{opacity:0,x:reduce?0:6,transition:{duration:reduce?0:.16}}}>{children}</motion.section>
}

function PartLabel({name,state,side,lower=false,middle=false,panelId,expanded,onOpen}:{name:string;state:VehiclePartState;side:'left'|'right';lower?:boolean;middle?:boolean;panelId:string;expanded:boolean;onOpen:(button:HTMLButtonElement)=>void}) {
  const Icon = state.tone==='confirmed'?CircleCheck:state.tone==='pending'?Clock3:state.tone==='skipped'?Minus:Circle
  return <button type="button" className={`ac-contour-label ac-contour-label--${side}${lower?' ac-contour-label--lower':''}${middle?' ac-contour-label--middle':''}`} data-vehicle-part={name} data-tone={state.tone} aria-label={`${name} 자세히 보기`} aria-expanded={expanded} aria-controls={panelId} onClick={event=>onOpen(event.currentTarget)}>
    <span>{name}<ChevronRight aria-hidden="true"/></span><strong><Icon aria-hidden="true"/>{state.value}</strong>{state.source&&<small>{state.source}</small>}
  </button>
}

export function CareVehicleContour({state}:{state:VehicleContourState}) {
  const id=useId().replaceAll(':','')
  const [active,setActive]=useState<VehiclePart|null>(null)
  const reduce=useReducedMotionPreference()
  const opener=useRef<HTMLButtonElement|null>(null)
  const detailHeading=useRef<HTMLHeadingElement>(null)
  const focusDetail=useRef(false)
  const detail=active?detailFor(active,state):null
  function open(part:VehiclePart,button:HTMLButtonElement){opener.current=button;focusDetail.current=true;setActive(part)}
  function close(){setActive(null);requestAnimationFrame(()=>opener.current?.focus({preventScroll:true}))}
  useLayoutEffect(()=>{if(active&&focusDetail.current){detailHeading.current?.focus({preventScroll:true});focusDetail.current=false}},[active])
  const mark=state.direction?impactMarks[state.direction]:null
  const trunkSide=mark?.lower&&mark.side==='right'?'left':'right'
  const impactSide=mark?.side??'right'
  const impactEnd=impactSide==='right'?403:157
  const impactY=mark?.lower?422:106
  const hazardSide=mark?.side==='left'&&!mark.lower?'right':'left'
  const impactLeader=state.direction==='전방'?`M280 39V20H390V106H403`:state.direction==='후방'?`M280 495V518H390V422H403`:mark?`M${mark.x} ${mark.y}L${impactSide==='right'?390:170} ${impactY}H${impactEnd}`:''
  const hazardConfirmed=state.hazard.tone==='confirmed'
  return <div className="ac-contour" data-care-component="vehicle-contour" data-impact-direction={state.direction??'unknown'} data-detail-open={!!active} onKeyDown={event=>{if(event.key==='Escape'&&active){event.preventDefault();event.stopPropagation();close()}}}>
    <header className="ac-contour-header"><div><span className="ac-eyebrow">내 차량</span><h2>차량 상태</h2></div><span className="ac-contour-orientation"><ArrowUp aria-hidden="true"/>차량 전방</span></header>
    <div className="ac-contour-diagram">
      <svg viewBox="0 0 560 540" className="ac-contour-drawing" role="img" aria-label={state.direction?state.direction+' 충격 방향':'충격 방향 미확인'}>
        <desc>차량을 위에서 본 모습. {state.direction??state.directionNote}</desc>
        <defs>
          <linearGradient id={`${id}-axis`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--ac-line)" stopOpacity="0"/><stop offset=".18" stopColor="var(--ac-line)"/><stop offset=".82" stopColor="var(--ac-line)"/><stop offset="1" stopColor="var(--ac-line)" stopOpacity="0"/></linearGradient>
        </defs>
        <motion.g className="ac-contour-vehicle-motion" animate={{x:active?-128:0}} initial={false} transition={{duration:reduce?0:.68,ease:[.22,1,.36,1]}}>
        <path d="M280 0V540" stroke={`url(#${id}-axis)`} strokeDasharray="3 7" fill="none"/>
        <ContourCar/>
        <g className="ac-contour-leaders" fill="none">
          <path d={hazardSide==='left'?'M197 205L175 237H157':'M363 205L385 237H403'}/><circle cx={hazardSide==='left'?197:363} cy="205" r="4" className={hazardConfirmed?'ac-contour-confirmed-point':''}/>
          <path d={trunkSide==='right'?'M309 451L376 452H403':'M251 451L184 452H157'}/><circle cx={trunkSide==='right'?309:251} cy="451" r="4" className={state.trunk.tone==='confirmed'?'ac-contour-confirmed-point':''}/>
        </g>
        {hazardConfirmed&&<g className="ac-contour-hazards" data-vehicle-hazards="confirmed"><path d="M209 88L224 80M336 80L351 88M211 461L227 469M333 469L349 461"/></g>}
        {mark&&<g className="ac-contour-impact" data-vehicle-impact="confirmed" fill="none">
          <path className="ac-contour-impact-arc" d={mark.path}/>
          <path className="ac-contour-impact-leader" d={impactLeader}/>
          <circle cx={mark.x} cy={mark.y} r="4"/>
        </g>}
        {active==='trunk'&&<path className="ac-contour-selection" d="M214 429Q280 457 346 429"/>}
        {active==='hazard'&&<path className="ac-contour-selection" d="M209 88L224 80M336 80L351 88M211 461L227 469M333 469L349 461"/>}
        </motion.g>
      </svg>
      <div className="ac-contour-labels" inert={!!active} aria-hidden={!!active}>
        <PartLabel name="충격 방향" state={{value:state.direction??state.directionNote,tone:state.direction?'failed':'unknown'}} side={impactSide} lower={mark?.lower} panelId={`${id}-detail`} expanded={active==='impact'} onOpen={button=>open('impact',button)}/>
        <PartLabel name="비상등" state={state.hazard} side={hazardSide} middle panelId={`${id}-detail`} expanded={active==='hazard'} onOpen={button=>open('hazard',button)}/>
        <PartLabel name="트렁크" state={state.trunk} side={trunkSide} lower panelId={`${id}-detail`} expanded={active==='trunk'} onOpen={button=>open('trunk',button)}/>
      </div>
      <AnimatePresence initial={false}>
        {active&&detail&&<DetailPanel key="detail" id={`${id}-detail`} reduce={!!reduce}>
          <button type="button" className="ac-contour-back" onClick={close}><ArrowLeft aria-hidden="true"/>전체 보기</button>
          <div className="ac-contour-detail-tabs" role="tablist" aria-label="차량 상세 항목" onKeyDown={event=>{
            const index=parts.findIndex(part=>part.id===active)
            const next=event.key==='ArrowRight'?(index+1)%parts.length:event.key==='ArrowLeft'?(index+parts.length-1)%parts.length:event.key==='Home'?0:event.key==='End'?parts.length-1:null
            if(next!==null){event.preventDefault();setActive(parts[next].id);document.getElementById(`${id}-tab-${parts[next].id}`)?.focus()}
          }}>{parts.map(part=><button type="button" role="tab" id={`${id}-tab-${part.id}`} key={part.id} aria-selected={active===part.id} aria-controls={`${id}-description`} tabIndex={active===part.id?0:-1} onClick={()=>setActive(part.id)}>{part.name}</button>)}</div>
          <motion.div key={active} className="ac-contour-description" id={`${id}-description`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} initial={{opacity:reduce?1:0,y:reduce?0:6}} animate={{opacity:1,y:0}} transition={{duration:reduce?0:.3,delay:reduce?0:.08}}>
            <h3 tabIndex={-1} ref={detailHeading}>{parts.find(part=>part.id===active)!.name}</h3>
            <div className="ac-contour-detail-value" data-tone={detail.status.tone}>{detail.status.value}</div>
            <p>{detail.description}</p>
            {detail.status.source&&<dl><div><dt>확인 출처</dt><dd>{detail.status.source}</dd></div></dl>}
            {detail.note&&<p className="ac-contour-detail-note">{detail.note}</p>}
          </motion.div>
        </DetailPanel>}
      </AnimatePresence>
    </div>
    <div className="ac-contour-mobility"><span>차량 이동</span><CareStatus tone={state.mobility.tone}>{state.mobility.value}</CareStatus></div>
  </div>
}
