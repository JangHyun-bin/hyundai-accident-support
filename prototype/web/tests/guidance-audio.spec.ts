import {expect,test} from '@playwright/test'

declare global {interface Window { audioCalls:{src:string;paused:boolean;ended:boolean;fail:boolean}[]; audioFails:boolean; finishAudio:()=>void }}
function fakeAudio(){
  window.audioCalls=[];window.audioFails=false
  class Playback extends EventTarget {
    src:string;currentTime=0;preload='';record:{src:string;paused:boolean;ended:boolean;fail:boolean}
    constructor(src=''){super();this.src=src;this.record={src,paused:false,ended:false,fail:window.audioFails};window.audioCalls.push(this.record);window.finishAudio=()=>{this.record.ended=true;this.dispatchEvent(new Event('ended'))}}
    play(){if(this.record.fail)return Promise.reject(new Error('unavailable'));this.dispatchEvent(new Event('playing'));return Promise.resolve()}
    pause(){this.record.paused=true} load(){} removeAttribute(){}
  }
  Object.defineProperty(window,'Audio',{value:Playback})
}
for(const reason of ['scene','pagehide','hidden'] as const)test(`guidance stops on ${reason} and cannot overlap`,async({page})=>{
 await page.addInitScript(fakeAudio);await page.goto('/?study=emergency&scenario=SC01&scene=connected')
 await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>window.audioCalls.length)).toBe(1)
 expect(await page.evaluate(()=>window.audioCalls[0].src)).toMatch(/guidance-audio\/[^/]+\.mp3$/)
 await expect(page.getByRole('button',{name:'음성 안내 중지',exact:true})).toBeVisible()
 if(reason==='scene')await page.getByRole('button',{name:'사고 기록 남기기',exact:true}).click()
 if(reason==='pagehide')await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')))
 if(reason==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
 expect(await page.evaluate(()=>window.audioCalls[0].paused)).toBe(true)
})
test('asset failure keeps script available and retry replaces playback',async({page})=>{
 await page.addInitScript(fakeAudio);await page.goto('/?study=emergency&scenario=SC01&scene=connected')
 await page.evaluate(()=>{window.audioFails=true});await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'음성 재생을 사용할 수 없어요'})).toContainText('구호 접수는 아직 미확인')
 await page.evaluate(()=>{window.audioFails=false});await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
 await expect(page.getByRole('button',{name:'음성 안내 중지',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>window.audioCalls.filter(a=>!a.paused&&!a.ended).length)).toBe(1)
 await page.evaluate(()=>window.finishAudio());await expect(page.getByRole('button',{name:'음성 안내 듣기',exact:true})).toBeVisible()
})
test('journey tasks use JaeGyu and stop when their retained panel becomes hidden',async({page})=>{
 await page.addInitScript(fakeAudio);await page.goto('/?study=journey&fixture=partial-evidence')
 await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click();await page.getByRole('button',{name:'사고 기록 남기기',exact:true}).click()
 await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).filter({visible:true}).click()
 await expect.poll(()=>page.evaluate(()=>window.audioCalls.length)).toBe(1)
 await page.getByRole('button',{name:'내용 확인으로',exact:true}).click()
 expect(await page.evaluate(()=>window.audioCalls[0].paused)).toBe(true)
 await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).filter({visible:true}).click()
 expect(await page.evaluate(()=>window.audioCalls.filter(a=>!a.paused&&!a.ended).length)).toBe(1)
})
test('every manifest scene has a verified static speech asset',async({page})=>{
 await page.goto('/?study=design-system')
 const result=await page.evaluate(async()=>{
  const sessionPath='/src/emergency/session.ts',audioPath='/src/audio/manifest.ts';
  const {manifest}=await import(sessionPath);const {guidanceAsset}=await import(audioPath);
  return manifest.scenarios.flatMap((s:any)=>s.states).filter((s:any)=>!guidanceAsset(s.voice)).map((s:any)=>s.id)
 });expect(result).toEqual([])
})

test('call spectrum pauses while the document is hidden',async({page})=>{
 await page.goto('/?study=emergency&scenario=SC01&scene=connected')
 const spectrum=page.locator('.ac-call-content .ac-spectrum')
 await spectrum.scrollIntoViewIfNeeded();await expect(spectrum).toHaveAttribute('data-active','true')
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
 await expect(spectrum).toHaveAttribute('data-active','false')
})

test('browser decodes the actual JaeGyu asset and stops it on demand',async({page})=>{
 await page.addInitScript(()=>{const AudioClass=window.Audio;Object.defineProperty(window,'Audio',{value:class extends AudioClass{constructor(src?:string){super(src);Object.assign(window,{actualGuide:this})}}})})
 await page.goto('/?study=emergency&scenario=SC01&scene=connected');await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.currentTime)).toBeGreaterThan(.1)
 await page.getByRole('button',{name:'음성 안내 중지',exact:true}).click()
 expect(await page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.paused)).toBe(true)
})
