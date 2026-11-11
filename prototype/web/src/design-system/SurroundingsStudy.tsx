import {useEffect,useId,useLayoutEffect,useRef,useState,type CSSProperties} from 'react'
import {motion,useReducedMotion} from 'motion/react'
import {ArrowLeft,ArrowUpRight,ChevronRight,Expand,Pause,Play,RotateCcw,WifiOff,X} from 'lucide-react'
import {CareSurface,CareStatus} from '@/components/ui/after-care'
import {VehicleShell} from '@/components/ui/after-care-layout'
import {ContourCar,contourBodyPath} from '@/components/ui/contour-car'
import {CareVehicleContact,contactWorldPoint} from '@/components/ui/vehicle-contact'
import {detailFor,type VehiclePart,type VehicleContourState} from '@/components/ui/vehicle-contour'
import {VehicleResponseContext} from './VehicleContourStudy'
import {FrontScene} from './FrontScene'
import {currentFrame,replayFrame,relativeTime,trailSegments,replayStart,replayEnd,estimatedInterval,sceneContact,type Pose} from './surroundings-fixture'
import './surroundings-study.css'

export type SurroundingsView='vehicle'|'front'|'current'|'replay'
const pageTitles:Record<SurroundingsView,string>={vehicle:'차량 상태와 주변 상황',front:'전방 상황',current:'현재 주변 상황',replay:'사고 재생'}
const pageDescriptions:Record<SurroundingsView,string>={vehicle:'내 차 상태를 먼저, 주변 상황은 필요할 때.',front:'내 차량에서 바라본 도로와 주변 차량.',current:'내 차량을 기준으로 살펴보는 주변 상황.',replay:'충격 전후의 차량 위치와 이동 흐름.'}
const scenePages:{view:Exclude<SurroundingsView,'vehicle'>;label:string}[]=[{view:'front',label:'전방 시점'},{view:'current',label:'현재 주변'},{view:'replay',label:'사고 재생'}]
function viewUrl(view:SurroundingsView){const url=new URL(location.href);url.searchParams.set('study','surroundings');url.searchParams.set('view',view);return url.pathname+url.search}
const partNames:Record<VehiclePart,string>={impact:'충격 방향',hazard:'비상등',trunk:'트렁크'}
const vehicleState:VehicleContourState={direction:'우측 전방',directionNote:'',hazard:{value:'켜짐',tone:'confirmed',source:'예시 자료'},trunk:{value:'미확인',tone:'unknown'},mobility:{value:'가능 여부 미확인',tone:'unknown'}}

function SceneCar({pose,own=false,hazardOn=false,estimated=false,onFocus}:{pose:Pose;own?:boolean;hazardOn?:boolean;estimated?:boolean;onFocus?:()=>void}){
  const interactive=own&&!!onFocus
  return <g className={`ss-car ${own?'ss-car-own':'ss-car-other'}${estimated?' ss-car-estimated':''}`} transform={`translate(${pose.x} ${pose.y}) rotate(${pose.heading})`} data-scene-car={own?'own':'other'} role={interactive?'button':undefined} tabIndex={interactive?0:undefined} aria-label={interactive?'내 차량 상태 보기':undefined} onClick={interactive?onFocus:undefined} onKeyDown={event=>{if(interactive&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onFocus?.()}}}>
    {own&&<rect className="ss-car-hit" x="-45" y="-90" width="90" height="180" rx="20"/>}
    <g transform="scale(.34) translate(-280 -265)"><ContourCar/>{hazardOn&&<path className="ac-contour-hazards" d="M209 88L224 80M336 80L351 88M211 461L227 469M333 469L349 461"/>}</g>
  </g>
}

// 검토용 scene. State는 memory에만 유지하며 실제 차량·journey 기록과 연결하지 않음.
export function SurroundingsStudy({initialView='vehicle'}:{initialView?:SurroundingsView}){
  const id=useId().replaceAll(':',''),reduce=useReducedMotion()
  const [view,setView]=useState<SurroundingsView>(initialView),[part,setPart]=useState<VehiclePart|null>(null)
  const focused=view==='vehicle',mode=view==='replay'?'replay':'current',front=view==='front'
  const [liveTime,setLiveTime]=useState(2.5),[replayTime,setReplayTime]=useState(replayStart)
  const [livePlaying,setLivePlaying]=useState(true),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[signal,setSignal]=useState(true)
  const [contactSelected,setContactSelected]=useState(false)
  const raf=useRef(0),liveClock=useRef(2.5),replayClock=useRef(replayStart)
  const viewTitle=useRef<HTMLHeadingElement>(null),currentView=useRef<HTMLButtonElement>(null)
  const stage=useRef<HTMLDivElement>(null),scene=useRef<SVGSVGElement>(null),detailTitle=useRef<HTMLHeadingElement>(null)
  const [viewport,setViewport]=useState({width:0,height:0,stacked:false})
  const running=!focused&&(mode==='current'?livePlaying&&signal:playing)
  useEffect(()=>{
    document.title=`${pageTitles[view]} · B / Contour`
    if(view==='vehicle'&&!new URLSearchParams(location.search).has('view'))return
    history.replaceState(history.state,'',viewUrl(view))
  },[view])
  useLayoutEffect(()=>{
    const svg=scene.current!,container=stage.current!
    const measure=()=>{
      const next={width:svg.clientWidth,height:svg.clientHeight,stacked:getComputedStyle(container).getPropertyValue('--ss-stacked').trim()==='1'}
      if(!next.width||!next.height)return
      setViewport(previous=>previous.width===next.width&&previous.height===next.height&&previous.stacked===next.stacked?previous:next)
    }
    const observer=new ResizeObserver(measure)
    observer.observe(svg);observer.observe(container);measure()
    return()=>observer.disconnect()
  },[])
  useEffect(()=>{if(reduce){setLivePlaying(false);setPlaying(false)}},[reduce])
  useEffect(()=>{
    if(!running)return
    let last=performance.now()
    const frame=(now:number)=>{
      const delta=Math.min(.1,(now-last)/1000);last=now
      if(mode==='current'){liveClock.current+=delta;setLiveTime(liveClock.current)}
      else{replayClock.current=Math.min(replayEnd,replayClock.current+delta*speed);setReplayTime(replayClock.current);if(replayClock.current>=replayEnd){setPlaying(false);return}}
      raf.current=requestAnimationFrame(frame)
    }
    raf.current=requestAnimationFrame(frame)
    return()=>cancelAnimationFrame(raf.current)
  },[running,mode,speed,view])
  useEffect(()=>{
    const hide=()=>{if(document.hidden){cancelAnimationFrame(raf.current);setLivePlaying(false);setPlaying(false)}}
    document.addEventListener('visibilitychange',hide)
    return()=>{document.removeEventListener('visibilitychange',hide);cancelAnimationFrame(raf.current)}
  },[])
  useEffect(()=>{if(part)detailTitle.current?.focus({preventScroll:true})},[part])
  const live=currentFrame(liveTime),past=replayFrame(replayTime),shown=mode==='current'?live:past
  const contextY=390-shown.own.y
  // 현재 view는 차체 길이 48%, 상세는 78%를 목표로 framing. Replay는 진입 차량까지 포함.
  const {stacked}=viewport,width=viewport.width||600,height=viewport.height||600
  const leftExtent=182,rightExtent=mode==='current'?96:218
  const overviewScale=Math.min(height*.48/153,(width-48)/(leftExtent+rightExtent))
  const overviewX=Math.max(24+leftExtent*overviewScale,Math.min(width*.48,width-24-rightExtent*overviewScale))
  const scale=focused?Math.min(height*.78/153,width*.42/70):overviewScale
  const anchorX=focused?(part&&!stacked?width*.24:width*.5):overviewX
  const anchorY=height*(focused?.5:.61)
  const camera={x:anchorX-278*scale,y:anchorY-390*scale,scale}
  const contactVisible=!focused&&!front&&(mode==='current'||replayTime>=0)
  const point=contactWorldPoint(shown.own,sceneContact.anchor)
  const contactPoint={x:camera.x+point.x*scale,y:camera.y+(point.y+contextY)*scale}
  const focusPoint=(local:{x:number;y:number})=>{const world=contactWorldPoint(shown.own,local);return {x:camera.x+world.x*scale,y:camera.y+(world.y+contextY)*scale}}
  const hazardPoint=focusPoint({x:195,y:186}),trunkPoint=focusPoint({x:280,y:460})
  const labelOnRight=contactPoint.x+24+168<=width-8
  const labelX=labelOnRight?contactPoint.x+24:contactPoint.x-24-168
  const contactLabelId=`${id}-contact-label`
  const detail=part?detailFor(part,vehicleState):null
  function switchMode(next:Exclude<SurroundingsView,'vehicle'>){if(next===view)return;cancelAnimationFrame(raf.current);setView(next);setPart(null);setPlaying(false);setContactSelected(false)}
  function seek(time:number){cancelAnimationFrame(raf.current);setPlaying(false);const next=Math.max(replayStart,Math.min(replayEnd,time));if(next<0)setContactSelected(false);replayClock.current=next;setReplayTime(next)}
  function toggleReplay(){if(playing){cancelAnimationFrame(raf.current);setPlaying(false)}else{if(replayClock.current>=replayEnd){replayClock.current=replayStart;setReplayTime(replayStart);setContactSelected(false)}setPlaying(true)}}
  function focusCar(){if(focused)return;cancelAnimationFrame(raf.current);setPlaying(false);setView('vehicle');setPart(null);setContactSelected(false);requestAnimationFrame(()=>viewTitle.current?.focus({preventScroll:true}))}
  function toggleContact(){if(!contactSelected&&mode==='replay'){cancelAnimationFrame(raf.current);setPlaying(false)}setContactSelected(value=>!value)}
  function closeContact(){setContactSelected(false);requestAnimationFrame(()=>stage.current?.querySelector<SVGGElement>('[data-contact-trigger]')?.focus({preventScroll:true}))}
  function showSurroundings(){switchMode('current');requestAnimationFrame(()=>currentView.current?.focus({preventScroll:true}))}
  function closePart(){const previous=part;setPart(null);requestAnimationFrame(()=>stage.current?.querySelector<HTMLButtonElement>('[data-part="'+previous+'"]')?.focus())}
  const stateLabel=focused?'내 차 상태':front?'전방 상황':mode==='replay'?'사고 당시':'현재 주변'
  const stageLabel=mode==='current'?(!signal?'업데이트 중단':!livePlaying?'주변 움직임 일시정지':front?'내 차량에서 바라본 전방':live.phase):past.contact?'접촉 시점':replayTime<0?'충돌 전 상황':'충돌 후 상황'
  return <main className="ac-system vcs-study ss-study">
    <header className="vcs-heading"><div><a href="/?study=vehicle"><ArrowLeft size={16}/>B / CONTOUR</a><h1>{pageTitles[view]}</h1><p>{pageDescriptions[view]}</p></div><a className="vcs-product-link" href="/?study=design-system">Design system<ArrowUpRight size={16}/></a></header>
    <nav className="ss-page-links" aria-label="상황 page">{scenePages.map(item=><a key={item.view} href={viewUrl(item.view)} aria-current={view===item.view?'page':undefined}>{item.label}<ArrowUpRight size={14}/></a>)}</nav>
    <div className="ss-study-tools"><span>INTERACTIVE STUDY</span><button type="button" aria-pressed={!signal} onClick={()=>setSignal(value=>!value)}><WifiOff size={15}/>{signal?'신호 끊김 시연':'신호 복원'}</button></div>
    <VehicleShell><div className="vcs-dashboard">
      <CareSurface className="ss-surface" data-scene-view={view} data-scene-mode={mode} data-scene-focus={focused?'vehicle':'surroundings'}>
        <header className="ss-header"><div><span className="ac-eyebrow">{focused?'내 차량':front?'차량 전방':'차량과 주변'}</span><h2 ref={viewTitle} tabIndex={-1}>{stateLabel}</h2></div><div className="ss-header-actions"><span className={`ss-source ${!focused&&mode==='replay'?'ss-source-past':!signal?'ss-source-stale':''}`}><i/>{focused?(signal?'현재 상태 · 시연':'마지막 상태 · 시연'):mode==='replay'?'기록 재생 · 시연':!signal?'신호 없음 · 시연':front?'전방 시점 · 시연':'현재 · 시연'}</span>{focused&&<button type="button" className="ss-surroundings-entry" onClick={showSurroundings}><Expand size={17}/>주변 상황 보기</button>}</div></header>
        {!focused&&<nav className="ss-surroundings-nav" aria-label="주변 상황 탐색"><button type="button" className="ss-back-to-vehicle" onClick={focusCar}><ArrowLeft size={16}/>내 차 상태로</button><div className="ss-modes" role="group" aria-label="주변 view 선택">{scenePages.map(item=><button key={item.view} ref={item.view==='current'?currentView:undefined} type="button" aria-pressed={view===item.view} onClick={()=>switchMode(item.view)}>{item.label}</button>)}</div></nav>}
        <div className="ss-visual" ref={stage} data-front={front} data-focused={focused} data-detail={!!part} data-contact-selected={contactVisible&&contactSelected} onPointerDown={event=>{if(contactSelected&&event.target instanceof Element&&!event.target.closest('[data-contact-marker],.ss-contact-detail'))setContactSelected(false)}} onKeyDown={event=>{if(event.key==='Escape'&&(part||contactSelected)){event.preventDefault();event.stopPropagation();if(contactSelected)closeContact();else closePart()}}}>
          <svg ref={scene} className="ss-scene" viewBox={`0 0 ${width} ${height}`} aria-label={focused?'내 차량 상태 시연':front?'내 차량에서 바라본 전방 시연':mode==='replay'?'사고 당시 차량 위치 시연':'현재 주변 차량 위치 시연'}>
            {front?<FrontScene width={width} height={height} frame={live}/>:<>
            <defs><linearGradient id={`${id}-road-fade`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="white" stopOpacity="0"/><stop offset=".06" stopColor="white"/><stop offset=".94" stopColor="white"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient><mask id={`${id}-road-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}><rect width={width} height={height} fill={`url(#${id}-road-fade)`}/></mask></defs>
            <defs><mask id={`${id}-trail-mask`} maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="3000" height="4000"><rect x="-1000" y="-1000" width="3000" height="4000" fill="white"/>{[shown.own,shown.other].map((pose,i)=><path key={i} d={contourBodyPath} fill="black" transform={`translate(${pose.x} ${pose.y}) rotate(${pose.heading}) scale(.34) translate(-280 -265)`}/>)}</mask><linearGradient id={`${id}-passing-fade`} gradientUnits="userSpaceOnUse" x1="130" x2="130" y1={live.passing.y+82} y2={live.passing.y+210}><stop stopColor="var(--ac-muted)" stopOpacity=".4"/><stop offset="1" stopColor="var(--ac-muted)" stopOpacity="0"/></linearGradient></defs>
            <g mask={focused?undefined:`url(#${id}-road-mask)`}>
              {viewport.width>0&&<motion.g className="ss-camera" initial={false} animate={{transform:`translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`}} style={{originX:0,originY:0,transformBox:'view-box'}} transition={{duration:reduce?0:.8,ease:[.22,1,.36,1]}}>
                <g transform={`translate(0 ${contextY})`}>
                  <motion.g initial={false} animate={{opacity:focused?0:1}} transition={{duration:reduce?0:.3}} className="ss-environment">
                    <path d="M58 -1000H542V1600H58Z" className="ss-road-bed"/>
                    <path d="M58 -1000V1600M542 -1000V1600" className="ss-road-edge"/>
                    <path d="M220 -1000V1600M380 -1000V1600" className="ss-lanes"/>
                    <path d="M558 -1000V1600" className="ss-barrier"/>
                    <path d="M565 -1000V1600" className="ss-barrier-ticks"/>
                    {mode==='replay'&&<g fill="none" className="ss-trails" mask={`url(#${id}-trail-mask)`}>{(['own','other'] as const).map(actor=><g key={actor} className={`ss-trail-${actor}`}>{trailSegments(actor,replayTime).map((segment,i)=><path key={i} d={segment.path} opacity={segment.opacity} strokeDashoffset={segment.estimated?-segment.offset*scale:undefined} className={segment.estimated?'ss-estimated-trail':undefined}/>)}</g>)}</g>}
                    <SceneCar pose={shown.other} estimated={mode==='replay'&&past.estimated}/>
                    {mode==='current'&&<g className="ss-passing"><SceneCar pose={live.passing}/><path d={`M130 ${live.passing.y+82}v128`} className="ss-passing-trail" stroke={`url(#${id}-passing-fade)`}/></g>}
                  </motion.g>
                  <SceneCar pose={shown.own} own hazardOn={focused||mode==='current'||replayTime>=1.5} onFocus={focused?undefined:focusCar}/>
                  {focused&&<g transform={`translate(${shown.own.x} ${shown.own.y}) rotate(${shown.own.heading}) scale(.34) translate(-280 -265)`} aria-hidden="true"><path className="ac-contact-edge" d={sceneContact.ownEdge}/></g>}
                  {contactVisible&&<CareVehicleContact own={shown.own} other={shown.other} geometry={sceneContact} scale={scale} selected={contactSelected} labelId={contactLabelId} onToggle={toggleContact}/>}
                  {focused&&part==='trunk'&&<path transform={`translate(${shown.own.x} ${shown.own.y}) scale(.34) translate(-280 -265)`} className="ac-contour-selection" d="M214 429Q280 457 346 429"/>}
                </g>
              </motion.g>}
            </g>
            {focused&&!part&&!stacked&&<motion.g className="ss-focus-leaders" aria-hidden="true" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:reduce?0:.24,delay:reduce?0:.55}}><path className="ss-focus-impact-leader" d={`M${contactPoint.x} ${contactPoint.y}L${width*.68} ${height*.26}H${width*.71}`}/><circle className="ss-focus-impact-point" cx={contactPoint.x} cy={contactPoint.y} r="2.5"/><path d={`M${hazardPoint.x} ${hazardPoint.y}L${width*.3} ${height*.49}H${width*.28}`}/><circle cx={hazardPoint.x} cy={hazardPoint.y} r="2.5"/><path d={`M${trunkPoint.x} ${trunkPoint.y}H${width*.71}`}/><circle cx={trunkPoint.x} cy={trunkPoint.y} r="2.5"/></motion.g>}
            {contactVisible&&contactSelected&&!stacked&&<motion.path className="ss-contact-leader" initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}} transition={{duration:reduce?0:.24}} d={`M${contactPoint.x} ${contactPoint.y}L${contactPoint.x+(labelOnRight?18:-18)} ${contactPoint.y-38}H${labelOnRight?labelX:labelX+168}`} aria-hidden="true"/>}
            </>}
          </svg>
          {contactVisible&&contactSelected&&<motion.section id={contactLabelId} className="ss-contact-detail" role="region" aria-label="접촉 부위 설명" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:reduce?0:.2}} style={stacked?undefined:{left:labelX,top:contactPoint.y-82}}>
            <div><span>접촉 기록</span><strong>우측 전방</strong></div><button type="button" aria-label="접촉 설명 닫기" onClick={closeContact}><X size={16}/></button>
          </motion.section>}
          {!focused&&<>
            <div className="ss-scene-caption"><span>{stageLabel}</span>{mode==='replay'?<strong>{relativeTime(replayTime)}</strong>:!front&&<span className="ss-scene-hint">내 차를 눌러 상태 확인<ChevronRight size={14}/></span>}</div>
            <div className="ss-scene-key">{front?<><span className="ss-front-orientation"><i/>차량 진행 방향 · 전방</span><span><i/>주변 차량</span></>:<><span><i/>내 차량</span><span><i/>주변 차량</span></>}{contactVisible&&<span className="ss-contact-key"><i/>접촉 기록</span>}{mode==='replay'&&<span className="ss-estimated-key"><i/>점선 · 추정 구간</span>}</div>
          </>}
          {focused&&!part&&<motion.div className="ss-focus-labels" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:reduce?0:.24,delay:reduce?0:.4}}>{(['impact','hazard','trunk'] as const).map(key=><button type="button" key={key} data-part={key} className={`ss-part ss-part-${key}`} onClick={()=>setPart(key)} aria-label={`${partNames[key]} 자세히 보기`}><span>{partNames[key]}<ChevronRight size={14}/></span><strong>{key==='impact'?vehicleState.direction:vehicleState[key].value}</strong></button>)}</motion.div>}
          {focused&&part&&detail&&<motion.section className="ss-part-detail" role="region" aria-label="차량 부위 상세" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{duration:reduce?0:.3,delay:reduce?0:.18}}>
            <button type="button" className="ac-contour-back" onClick={closePart}><ArrowLeft/>전체 항목</button>
            <div className="ss-detail-switch" role="group" aria-label="차량 부위 선택">{(['impact','hazard','trunk'] as const).map(key=><button type="button" aria-pressed={part===key} key={key} onClick={()=>setPart(key)}>{partNames[key]}</button>)}</div>
            <h3 ref={detailTitle} tabIndex={-1}>{partNames[part]}</h3><strong className="ss-detail-value">{detail.status.value}</strong><p>{detail.description}</p>{detail.status.source&&<span className="ss-detail-source">{detail.status.source}</span>}{detail.note&&<p className="ss-detail-note">{detail.note}</p>}
          </motion.section>}
        </div>
        {focused?<div className="ss-focus-footer"><span>차량 이동</span><CareStatus tone="unknown">가능 여부 미확인</CareStatus></div>:mode==='replay'?<div className="ss-playback" aria-label="사고 playback">
          <div className="ss-transport"><button type="button" className="ss-play" onClick={toggleReplay} aria-label={playing?'사고 재생 일시정지':'사고 재생 시작'}>{playing?<Pause/>:<Play/>}</button><button type="button" className="ss-icon-button" aria-label="처음으로" onClick={()=>seek(replayStart)}><RotateCcw size={18}/></button><span>{past.estimated?'위치 추정 구간':past.contact?'접촉 시점':replayTime<0?'충돌 전':'충돌 후'}</span><button type="button" onClick={()=>seek(0)} className="ss-contact-jump">충격 시점</button><select aria-label="사고 재생 속도" value={speed} onChange={event=>setSpeed(Number(event.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></div>
          <div className="ss-timeline" style={{'--ss-playhead':`${(replayTime-replayStart)/(replayEnd-replayStart)*100}%`} as CSSProperties}><div className="ss-timeline-rail"/><div className="ss-timeline-fill"/><div className="ss-timeline-estimated" style={{left:`${(estimatedInterval[0]-replayStart)/14*100}%`,width:`${(estimatedInterval[1]-estimatedInterval[0])/14*100}%`}}/><i className="ss-event-tick"/><input type="range" min={replayStart} max={replayEnd} step={.05} value={replayTime} aria-label="사고 시점 이동" aria-valuetext={relativeTime(replayTime)} onChange={event=>seek(Number(event.target.value))}/></div>
          <div className="ss-time-labels"><span>−08초</span><span>충격 00초</span><span>+06초</span></div><div className="ss-return"><span>오른쪽 안내는 현재 대응 상태</span><button type="button" onClick={()=>switchMode('current')}>현재로 돌아가기<ArrowUpRight size={15}/></button></div>
        </div>:<div className="ss-current-footer"><div><span>{!signal?'새 위치 정보 없음':livePlaying?'주변 움직임 시연 중':'시연 일시정지'}</span><p>{!signal?'마지막 위치를 유지하고 있어요.':front?'정차한 내 차량에서 전방을 바라봐요.':'정차한 내 차량을 기준으로 주변을 표시해요.'}</p></div><button type="button" className="ss-icon-button" disabled={!signal} aria-label={livePlaying?'주변 움직임 일시정지':'주변 움직임 재생'} onClick={()=>setLivePlaying(value=>!value)}>{livePlaying?<Pause size={18}/>:<Play size={18}/>}</button></div>}
      </CareSurface>
      <VehicleResponseContext hazardConfirmed/>
    </div></VehicleShell>
    <footer className="vcs-footer"><span>B / Contour · 주변 상황 + 사고 playback</span><span>시연용 경로 · 실제 sensor 연결 없음</span></footer>
  </main>
}
