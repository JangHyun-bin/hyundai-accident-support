import {useEffect,useMemo,useRef,useState} from 'react'
import {gsap} from 'gsap'
import {motion,useReducedMotion} from 'motion/react'
import {ArrowLeft,ArrowUpRight,Check,Download,Mic,Pause,Play,RotateCcw,SlidersHorizontal,Upload} from 'lucide-react'
import {CareAction,CareSpectrum} from '@/components/ui/after-care'
import {ResponseLayout} from '@/components/ui/after-care-layout'
import {CareConnectedCall,CareGuidance,CareRequests,CareSituation,CareUnknownMap} from '@/components/ui/response-content'
import {durationMs,envelopePath,initialLayout,initialMotion,layoutRanges,materialTimeline,motionRanges,phaseAt,readStudyPreset,studyStorageKey,type StudyLayout,type StudyLight,type StudyMotion,type StudyPreset} from './interaction-study-model'
import './interaction-study.css'

type Scene='call'|'guidance'|'record'
type Target='primary'|'guidance'
const neutral=():StudyLight=>({light:0,chroma:0,shade:0})
const scenes:{id:Scene;label:string;share:number}[]=[{id:'call',label:'통화',share:.5},{id:'guidance',label:'긴 안내',share:.44},{id:'record',label:'기록',share:.58}]

function Range({label,value,limits,unit='',display,onChange}:{label:string;value:number;limits:[number,number,number];unit?:string;display?:string;onChange:(n:number)=>void}){
  return <label className="is-range"><span>{label}<output>{display??Math.round(value*100)/100}<small>{unit}</small></output></span><input aria-label={label} type="range" min={limits[0]} max={limits[1]} step={limits[2]} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>
}

// 격리된 interaction study. 실제 통화·녹음·제품 theme 변경 없음.
export function InteractionStudy(){
  const [settings,setSettings]=useState<StudyMotion>({...initialMotion})
  const [layout,setLayout]=useState<StudyLayout>({...initialLayout})
  const [scene,setScene]=useState<Scene>('call'),[target,setTarget]=useState<Target>('primary')
  const [tab,setTab]=useState<'light'|'space'>('light'),[speed,setSpeed]=useState(1),[pulses,setPulses]=useState(1)
  const [playing,setPlaying]=useState(false),[hasTimeline,setHasTimeline]=useState(false)
  const [adaptive,setAdaptive]=useState(true),[reducePreview,setReducePreview]=useState(false),[full,setFull]=useState(false)
  const [recording,setRecording]=useState(false),[recordReview,setRecordReview]=useState(false)
  const [copy,setCopy]=useState('주변 차량을 살핀 뒤 가드레일 밖으로 이동하세요')
  const [note,setNote]=useState(''),[name,setName]=useState('My light 01'),[presets,setPresets]=useState<StudyPreset[]>([])
  const host=useRef<HTMLDivElement>(null),seek=useRef<HTMLInputElement>(null),elapsed=useRef<HTMLOutputElement>(null),phase=useRef<HTMLSpanElement>(null)
  const total=useRef(durationMs(settings,pulses)),settingsRef=useRef(settings),layoutRef=useRef(layout),targetRef=useRef(target),pulsesRef=useRef(pulses),speedRef=useRef(speed)
  const light=useRef<Record<Target,StudyLight>>({primary:neutral(),guidance:neutral()})
  const timeline=useRef<gsap.core.Timeline|null>(null),layoutTween=useRef<gsap.core.Tween|null>(null),fades=useRef<gsap.core.Tween[]>([])
  const actualLayout=useRef({...initialLayout}),pendingLayout=useRef<StudyLayout|null>(null),inputLocked=useRef(false),reduceTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const prefersReduced=useReducedMotion(),reduced=!!prefersReduced||reducePreview,reducedRef=useRef(reduced)
  const importFile=useRef<HTMLInputElement>(null)
  const curve=useMemo(()=>envelopePath(settings,pulses),[settings,pulses])
  settingsRef.current=settings;layoutRef.current=layout;targetRef.current=target;pulsesRef.current=pulses;speedRef.current=speed;reducedRef.current=reduced
  total.current=durationMs(settings,pulses)

  const material=(id:Target)=>host.current?.querySelector<HTMLElement>(`[data-care-slot="${id}"]`)
  function paint(id:Target){
    const node=material(id),value=light.current[id]
    node?.style.setProperty('--ac-notify-light',String(value.light))
    node?.style.setProperty('--ac-notify-chroma',String(value.chroma))
    node?.style.setProperty('--ac-notify-shade',`${value.shade}px`)
  }
  function position(ms:number){
    if(seek.current)seek.current.value=String(ms)
    if(elapsed.current)elapsed.current.textContent=`${(ms/1000).toFixed(2)} s`
    if(phase.current)phase.current.textContent=phaseAt(ms,settingsRef.current,pulsesRef.current)
    host.current?.style.setProperty('--is-progress',String(ms/total.current*100)+'%')
  }
  function stopClocks(){
    timeline.current?.kill();timeline.current=null
    fades.current.forEach(t=>t.kill());fades.current=[]
    if(reduceTimer.current)clearTimeout(reduceTimer.current)
    reduceTimer.current=null
  }
  function rest(instant=false){
    stopClocks();setPlaying(false);setHasTimeline(false);position(0)
    for(const id of ['primary','guidance'] as const){
      if(instant||reducedRef.current){Object.assign(light.current[id],neutral());paint(id)}
      else fades.current.push(gsap.to(light.current[id],{...neutral(),duration:.7,ease:'power2.inOut',onUpdate:()=>paint(id)}))
    }
  }
  function build(p:StudyMotion,fromCurrent=false){
    const id=targetRef.current
    if(!fromCurrent)Object.assign(light.current[id],neutral())
    const tl=materialTimeline(light.current[id],p,pulsesRef.current,()=>{
      paint(id);position(tl.time()*1000)
    },()=>{setPlaying(false);paint(id)})
    timeline.current=tl;tl.timeScale(speedRef.current);setHasTimeline(true)
    return tl
  }
  function notify(){
    stopClocks()
    const id=targetRef.current,other=id==='primary'?'guidance':'primary'
    Object.assign(light.current[other],neutral());paint(other)
    if(reducedRef.current){
      Object.assign(light.current[id],{light:settingsRef.current.peak*.55,chroma:1,shade:0});paint(id)
      setHasTimeline(false);setPlaying(false)
      if(phase.current)phase.current.textContent='Still'
      reduceTimer.current=setTimeout(()=>rest(true),1600)
      return
    }
    const tl=build(settingsRef.current,true)
    setPlaying(true);tl.play(0)
  }
  function scrub(ms:number){
    if(reducedRef.current)return
    if(!timeline.current)build(settingsRef.current)
    timeline.current!.pause().time(ms/1000,true)
    paint(targetRef.current);position(ms);setPlaying(false)
  }
  function updateMotion<K extends keyof StudyMotion>(key:K,value:StudyMotion[K]){
    const next={...settingsRef.current,[key]:value},old=timeline.current,progress=old?.progress()??0,wasPlaying=old?!old.paused()&&progress<1:false
    setSettings(next);settingsRef.current=next;total.current=durationMs(next,pulsesRef.current)
    if(old){old.kill();const tl=build(next);tl.progress(progress,true);paint(targetRef.current);position(tl.time()*1000);if(wasPlaying)tl.play()}
  }
  function writeLayout(){
    const grid=host.current?.querySelector<HTMLElement>('[data-care-layout="response"]'),v=actualLayout.current
    if(!grid)return
    grid.style.setProperty('--ac-main-share',String(v.share));grid.style.setProperty('--ac-layout-gap',`${v.gap}px`)
    grid.style.setProperty('--ac-split-radius',String(v.radius));grid.style.setProperty('--ac-split-tilt',String(v.tilt));grid.style.setProperty('--ac-split-bias',String(v.bias))
    grid.dispatchEvent(new Event('care-layout-change'))
  }
  function moveLayout(next:StudyLayout,animate=true){
    if(inputLocked.current){pendingLayout.current=next;setNote('입력을 마치면 새 배치가 반영돼요.');return}
    pendingLayout.current=null;layoutTween.current?.kill()
    if(!animate||reducedRef.current){Object.assign(actualLayout.current,next);writeLayout();return}
    layoutTween.current=gsap.to(actualLayout.current,{...next,duration:.56,ease:'power2.inOut',onUpdate:writeLayout,onComplete:writeLayout})
  }
  function updateLayout<K extends keyof StudyLayout>(key:K,value:StudyLayout[K]){
    const next={...layoutRef.current,[key]:value};setLayout(next);layoutRef.current=next;moveLayout(next)
  }
  function chooseScene(next:Scene){
    setScene(next);setRecording(false);setRecordReview(false);rest()
    if(adaptive){const nextLayout={...layoutRef.current,share:scenes.find(s=>s.id===next)!.share};setLayout(nextLayout);layoutRef.current=nextLayout;moveLayout(nextLayout)}
    const nextTarget=next==='guidance'?'guidance':'primary';setTarget(nextTarget);targetRef.current=nextTarget
  }
  function applyPreset(p:StudyPreset){
    rest(true);setSettings(p.motion);settingsRef.current=p.motion;setLayout(p.layout);layoutRef.current=p.layout;moveLayout(p.layout);setName(p.name);setNote(`${p.name} 불러옴. Study에만 적용돼요.`)
  }
  function save(){
    const p=readStudyPreset({version:1,name:name.trim()||'My light',motion:settings,layout})
    const list=[...presets.filter(x=>x.name!==p.name),p]
    try{localStorage.setItem(studyStorageKey,JSON.stringify(list));setPresets(list);setNote(`${p.name} 저장됨. 기존 C·C_02는 그대로 유지돼요.`)}catch{setNote('저장 공간을 사용할 수 없어요. JSON으로 내보내주세요.')}
  }
  function download(){
    const blob=new Blob([JSON.stringify({version:1,name:name.trim()||'My light',motion:settings,layout},null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='after-care-interaction-preset.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  useEffect(()=>{
    try{const stored=localStorage.getItem(studyStorageKey);if(stored)setPresets((JSON.parse(stored) as unknown[]).map(readStudyPreset))}catch{setNote('저장된 study preset을 읽지 못했어요. 원본은 유지돼요.')}
    const visibility=()=>{if(document.hidden)rest(true)}
    document.addEventListener('visibilitychange',visibility)
    writeLayout()
    return()=>{stopClocks();layoutTween.current?.kill();document.removeEventListener('visibilitychange',visibility)}
  },[])
  useEffect(()=>{if(reduced){rest(true);layoutTween.current?.kill();Object.assign(actualLayout.current,layoutRef.current);writeLayout()}},[reduced])

  return <main className={`ac-system interaction-study${full?' is-full':''}`}>
    <header className="is-header"><a href="/?study=design-system"><ArrowLeft size={16}/>AFTER / CARE</a><span>INTERACTION STUDY <i>01</i></span><button onClick={()=>setFull(!full)}><SlidersHorizontal size={16}/>{full?'조절 도구 열기':'화면에 집중'}</button></header>
    <div className="is-intro"><div><p className="ac-eyebrow">Light, space & a little restraint.</p><h1>빛이 머무는 방식.</h1></div><p>평소에는 조용하게.<br/>필요한 순간에만 빛과 공간이 반응하도록.</p></div>
    <div className="is-workbench">
      <section className="is-stage" aria-label="Interaction preview" ref={host}>
        <div className="is-stage-bar"><div className="is-segment" aria-label="미리볼 상황">{scenes.map(s=><button key={s.id} aria-pressed={scene===s.id} onClick={()=>chooseScene(s.id)}>{s.label}</button>)}</div><div className="is-stage-actions"><span className="is-live-state"><i/><span ref={phase}>Static</span></span><button className="is-notify" onClick={notify}><Play size={16} fill="currentColor"/>Notify 재생</button></div></div>
        <div className="is-product" onFocusCapture={e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)inputLocked.current=true}} onBlurCapture={()=>{requestAnimationFrame(()=>{
          const active=document.activeElement;inputLocked.current=!!active&&!!host.current?.contains(active)&&(active instanceof HTMLInputElement||active instanceof HTMLTextAreaElement)
          if(!inputLocked.current&&pendingLayout.current){moveLayout(pendingLayout.current);setNote('새 배치가 반영됐어요.')}
        })}}>
          <ResponseLayout interactive
            summary={<CareSituation title="충돌 감지 · 부상 있음" facts={[{id:'driver',label:'운전자 조작',value:'미확인',tone:'unknown'},{id:'path',label:'이동 경로',value:'미확인',tone:'unknown'}]}/>}
            primary={<motion.div key={scene==='record'?'record':'call'} initial={reduced?false:{opacity:.5}} animate={{opacity:1}} transition={{duration:.24}}>
              {scene==='record'?<div className="is-record"><Mic size={32}/><h2>{recordReview?'이렇게 기록할까요?':recording?'기억나는 내용을 말씀해주세요':'기억나는 내용을 남겨주세요'}</h2>
                {recordReview?<><textarea className="ac-field" aria-label="기록 내용" rows={3} defaultValue="오른쪽 앞부분에 충격이 있었어요."/><CareAction secondary onClick={()=>{setRecordReview(false);notify()}}><Check/>내용 확인</CareAction></>:recording?<><CareSpectrum active/><CareAction secondary onClick={()=>{setRecording(false);setRecordReview(true)}}>말하기 마침</CareAction></>:<><p>확실한 내용만 남겨주세요.</p><CareAction onClick={()=>setRecording(true)}><Mic/>말로 기록하기</CareAction></>}
              </div>:<CareConnectedCall title="119 통화 연결됨" active={playing&&target==='primary'}/>}
            </motion.div>}
            navigation={<CareUnknownMap/>}
            guidance={<CareGuidance condition="움직일 수 있으면" now={scene==='guidance'?copy:'가드레일 밖으로 대피하세요'} next={scene==='guidance'?'안전한 곳에서 안내를 기다리세요.':undefined}/>}
            requests={<CareRequests items={[{id:'rescue',label:'구호',status:'통화 연결 · 접수 미확인',tone:'unknown'},{id:'vehicle',label:'차량 지원',status:'요청 전',tone:'unknown'},{id:'insurance',label:'보험사',status:'요청 전',tone:'unknown'}]}/>}
            action={<CareAction secondary onClick={()=>chooseScene(scene==='record'?'call':'record')}><ArrowUpRight/>{scene==='record'?'통화 화면으로':'기억나는 내용 남기기'}</CareAction>}
          />
        </div>
        <div className="is-transport">
          <div className="is-play-row"><div className="is-segment is-target" aria-label="빛을 켤 영역">{([{id:'primary',label:'통화 영역'},{id:'guidance',label:'안내 영역'}] as const).map(t=><button key={t.id} aria-pressed={target===t.id} onClick={()=>{rest(true);setTarget(t.id);targetRef.current=t.id}}>{t.label}</button>)}</div>
            <div className="is-play-actions"><button className="is-notify" onClick={notify}><Play size={16} fill="currentColor"/>다시 재생</button><button className="is-icon-button" aria-label={playing?'일시 정지':'이어서 재생'} disabled={!hasTimeline||reduced} onClick={()=>{const tl=timeline.current;if(!tl)return;if(playing){tl.pause();setPlaying(false)}else if(tl.progress()>=1)notify();else{tl.play();setPlaying(true)}}}>{playing?<Pause size={17}/>:<Play size={17}/>}</button><button className="is-icon-button" aria-label="회색으로 복귀" onClick={()=>rest()}><RotateCcw size={17}/></button></div>
          </div>
          <div className="is-envelope"><svg viewBox="0 0 1000 90" preserveAspectRatio="none" aria-hidden="true"><path className="is-envelope-fill" d={`${curve} L1000,88 L0,88 Z`}/><path d={curve} className="is-envelope-line"/></svg><div className="is-playhead"/><input ref={seek} type="range" min={0} max={durationMs(settings,pulses)} step={1} defaultValue={0} disabled={reduced} aria-label="Motion timeline" onChange={e=>scrub(Number(e.target.value))}/></div>
          <div className="is-time-row"><span>ENTER <i>/</i> PULSE <i>/</i> AFTERGLOW</span><output ref={elapsed} aria-live="off">0.00 s</output><span>/ {(durationMs(settings,pulses)/1000).toFixed(2)} s</span><select aria-label="재생 속도" value={speed} onChange={e=>{const n=Number(e.target.value);setSpeed(n);speedRef.current=n;timeline.current?.timeScale(n)}}><option value={1}>1×</option><option value={.5}>0.5×</option><option value={.25}>0.25×</option></select></div>
        </div>
        <footer className="is-preview-note"><span>실제 B / Three cells · 조절용 preview</span><span>통화·microphone·기관 전송 없음</span></footer>
      </section>
      <aside className="is-controls" aria-label="Interaction controls">
        <div className="is-controls-top"><div><span className="ac-eyebrow">TUNING ROOM</span><h2>나만의 리듬.</h2></div><button className="is-icon-button" aria-label="기본값으로 되돌리기" onClick={()=>applyPreset({version:1,name:'My light 01',motion:{...initialMotion},layout:{...initialLayout}})}><RotateCcw size={16}/></button></div>
        <div className="is-tabs" role="tablist" aria-label="조정 종류" onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'light':e.key==='End'?'space':tab==='light'?'space':'light';setTab(next);document.getElementById(`is-${next}-tab`)?.focus()}}}><button id="is-light-tab" role="tab" aria-selected={tab==='light'} aria-controls="is-light-panel" onClick={()=>setTab('light')}>빛의 움직임</button><button id="is-space-tab" role="tab" aria-selected={tab==='space'} aria-controls="is-space-panel" onClick={()=>setTab('space')}>공간의 움직임</button></div>
        {tab==='light'?<div id="is-light-panel" role="tabpanel" aria-labelledby="is-light-tab"><p className="is-help">밝기가 먼저, 채도는 조금 뒤에.<br/>긴 여운을 남기며 회색으로.</p>
          <Range label="빛의 강도" value={settings.peak} limits={motionRanges.peak} display={`${Math.round(settings.peak*100)}`} unit="%" onChange={n=>updateMotion('peak',n)}/>
          <Range label="색 진입" value={settings.enterMs} limits={motionRanges.enterMs} unit="ms" onChange={n=>updateMotion('enterMs',n)}/>
          <Range label="Pulse · 차오름" value={settings.riseMs} limits={motionRanges.riseMs} unit="ms" onChange={n=>updateMotion('riseMs',n)}/>
          <Range label="Pulse · 잦아듦" value={settings.fallMs} limits={motionRanges.fallMs} unit="ms" onChange={n=>updateMotion('fallMs',n)}/>
          <Range label="잔광" value={settings.exitMs} limits={motionRanges.exitMs} unit="ms" onChange={n=>updateMotion('exitMs',n)}/>
          <label className="is-select-row">Pulse 횟수<select aria-label="Pulse 횟수" value={pulses} onChange={e=>{rest(true);setPulses(Number(e.target.value));pulsesRef.current=Number(e.target.value)}}><option value={1}>한 번</option><option value={2}>두 번</option></select></label>
          <details><summary>미세 조정</summary><Range label="채도 지연" value={settings.chromaDelayMs} limits={motionRanges.chromaDelayMs} unit="ms" onChange={n=>updateMotion('chromaDelayMs',n)}/><Range label="머무는 시간" value={settings.settleMs} limits={motionRanges.settleMs} unit="ms" onChange={n=>updateMotion('settleMs',n)}/><Range label="Shade 이동" value={settings.shadePx} limits={motionRanges.shadePx} unit="px" onChange={n=>updateMotion('shadePx',n)}/></details>
          <label className="is-check"><input type="checkbox" checked={reduced} disabled={!!prefersReduced} onChange={e=>setReducePreview(e.target.checked)}/>움직임 줄이기{prefersReduced&&<small>OS 설정</small>}</label>
        </div>:<div id="is-space-panel" role="tabpanel" aria-labelledby="is-space-tab"><p className="is-help">공유 경계를 함께 조정.<br/>글자와 control은 원래 크기 그대로.</p><label className="is-check"><input type="checkbox" checked={adaptive} onChange={e=>setAdaptive(e.target.checked)}/>작업에 맞춰 비율 조정</label>
          <Range label="왼쪽 영역" value={layout.share} limits={layoutRanges.share} display={`${Math.round(layout.share*100)} : ${Math.round((1-layout.share)*100)}`} onChange={n=>updateLayout('share',n)}/>
          <Range label="공유 접점" value={layout.bias} limits={layoutRanges.bias} display={String(Math.round(layout.bias*100))} unit="%" onChange={n=>updateLayout('bias',n)}/>
          <Range label="경계 기울기" value={layout.tilt} limits={layoutRanges.tilt} unit="°" onChange={n=>updateLayout('tilt',n)}/>
          <Range label="Cell 간격" value={layout.gap} limits={layoutRanges.gap} unit="px" onChange={n=>updateLayout('gap',n)}/>
          <Range label="모서리" value={layout.radius} limits={layoutRanges.radius} unit="px" onChange={n=>updateLayout('radius',n)}/>
          <label className="is-copy">긴 안내 문구<textarea aria-label="긴 안내 문구" value={copy} maxLength={300} rows={3} onChange={e=>setCopy(e.target.value)}/></label><p className="is-help is-small">긴 문구와 좁은 화면은 읽기 공간을 우선해 조정돼요.</p>
        </div>}
        <div className="is-preset"><span className="ac-eyebrow">KEEP THIS FEELING</span><label className="is-name"><input aria-label="Preset 이름" value={name} maxLength={40} onChange={e=>setName(e.target.value)}/><button onClick={save}>저장</button></label>
          {presets.length>0&&<select aria-label="저장한 preset" value="" onChange={e=>{const p=presets.find(p=>p.name===e.target.value);if(p)applyPreset(p)}}><option value="">저장한 preset 불러오기</option>{presets.map(p=><option key={p.name}>{p.name}</option>)}</select>}
          <div className="is-file-actions"><button onClick={download}><Download size={14}/>JSON 내보내기</button><button onClick={()=>importFile.current?.click()}><Upload size={14}/>가져오기</button></div>
          <input ref={importFile} type="file" accept="application/json,.json" className="is-file-input" aria-label="Preset 파일" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{applyPreset(readStudyPreset(JSON.parse(await file.text())))}catch(error){setNote(error instanceof Error?error.message:'Preset을 읽지 못했어요.')}}}/>
          <p role="status" className="is-note">{note||'이 화면의 설정만 저장. 제품 theme는 그대로.'}</p>
        </div>
      </aside>
    </div>
  </main>
}
