import {gsap} from 'gsap'

// Study용 값. 제품 preset으로 적용하기 전 실제 속도의 시각 검토 필요.
export type StudyMotion = {enterMs:number;chromaDelayMs:number;settleMs:number;riseMs:number;fallMs:number;exitMs:number;peak:number;shadePx:number}
export type StudyLayout = {share:number;gap:number;radius:number;tilt:number;bias:number}
export type StudyLight = {light:number;chroma:number;shade:number}
export type StudyPreset = {version:1;name:string;motion:StudyMotion;layout:StudyLayout}
export const initialMotion:StudyMotion={enterMs:700,chromaDelayMs:120,settleMs:180,riseMs:540,fallMs:1260,exitMs:1200,peak:1,shadePx:2}
export const initialLayout:StudyLayout={share:.5,gap:16,radius:28,tilt:4,bias:0}
export const studyStorageKey='after-care-interaction-study-v1'
export const motionRanges:Record<keyof StudyMotion,[number,number,number]>={enterMs:[300,1200,10],chromaDelayMs:[0,250,10],settleMs:[0,400,10],riseMs:[300,900,10],fallMs:[700,2000,10],exitMs:[600,1800,10],peak:[.4,1,.01],shadePx:[0,2,.1]}
export const layoutRanges:Record<keyof StudyLayout,[number,number,number]>={share:[.42,.58,.005],gap:[12,24,1],radius:[20,40,1],tilt:[0,8,.25],bias:[-.08,.08,.005]}
export const durationMs=(p:StudyMotion,pulses=1)=>p.enterMs+p.settleMs+(p.riseMs+p.fallMs)*pulses+p.exitMs
export function phaseAt(ms:number,p:StudyMotion,pulses=1){
  if(ms<=0||ms>=durationMs(p,pulses)-1)return 'Static'
  if(ms<p.enterMs)return 'Enter'
  if(ms<p.enterMs+p.settleMs)return 'Hold'
  if(ms<durationMs(p,pulses)-p.exitMs)return 'Pulse'
  return 'Afterglow'
}
export function materialTimeline(value:StudyLight,p:StudyMotion,pulses=1,update=()=>{},complete=()=>{}){
  const timeline=gsap.timeline({paused:true,onUpdate:update,onComplete:complete})
  const enter=p.enterMs/1000,hold=p.settleMs/1000
  timeline.to(value,{light:p.peak*.55,duration:enter,ease:'power2.inOut'},0)
    .to(value,{chroma:1,duration:(p.enterMs-p.chromaDelayMs)/1000,ease:'sine.inOut'},p.chromaDelayMs/1000)
    .to(value,{shade:p.shadePx,duration:enter,ease:'sine.inOut'},0)
  let at=enter+hold
  for(let i=0;i<pulses;i++){
    timeline.to(value,{light:p.peak,shade:-p.shadePx,duration:p.riseMs/1000,ease:'sine.inOut'},at)
    at+=p.riseMs/1000
    timeline.to(value,{light:p.peak*.55,shade:p.shadePx,duration:p.fallMs/1000,ease:'power2.out'},at)
    at+=p.fallMs/1000
  }
  timeline.to(value,{chroma:0,duration:p.exitMs/2000,ease:'sine.inOut'},at)
    .to(value,{light:0,shade:0,duration:p.exitMs/1000,ease:'power2.inOut'},at)
  return timeline
}
export function envelopePath(p:StudyMotion,pulses=1){
  const value={light:0,chroma:0,shade:0},timeline=materialTimeline(value,p,pulses)
  const points=Array.from({length:101},(_,i)=>{
    timeline.progress(i/100,true)
    return `${i?'L':'M'}${i*10},${76-value.light*60}`
  })
  timeline.kill()
  return points.join(' ')
}
export function readStudyPreset(raw:unknown):StudyPreset{
  if(!raw||typeof raw!=='object')throw new Error('Preset 형식을 확인해주세요.')
  const p=raw as StudyPreset
  if(p.version!==1||typeof p.name!=='string'||!p.name.trim()||p.name.length>40)throw new Error('Preset 이름이나 version을 확인해주세요.')
  for(const [source,ranges] of [[p.motion,motionRanges],[p.layout,layoutRanges]] as const){
    if(!source||typeof source!=='object')throw new Error('설정값이 없어요.')
    for(const [key,[min,max]] of Object.entries(ranges)){
      const value=(source as Record<string,number>)[key]
      if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`${key} 범위를 확인해주세요.`)
    }
  }
  if(p.motion.chromaDelayMs>=p.motion.enterMs)throw new Error('채도 진입은 Enter보다 빨라야 해요.')
  return {version:1,name:p.name.trim(),motion:{...p.motion},layout:{...p.layout}}
}
