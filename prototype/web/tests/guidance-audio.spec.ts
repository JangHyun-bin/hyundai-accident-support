import {expect,test} from '@playwright/test'
import emergencyGuidance from '../src/audio/emergency-guidance.json'

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
test('every scene, journey and runtime script has an exact static speech asset',async({page})=>{
 await page.goto('/?study=design-system')
 // Resolve through the browser's Vite graph to exercise the runtime lookup rather than a Node copy.
 const result=await page.evaluate(async()=>{
  const sessionPath='/src/emergency/session.ts',audioPath='/src/audio/manifest.ts',journeyPath='/src/audio/journey-guidance.json',variantsPath='/src/audio/emergency-guidance.json'
  const {manifest}=await import(sessionPath);const {guidanceAsset}=await import(audioPath)
  const journey=(await import(journeyPath)).default,variants=(await import(variantsPath)).default
  const scripts=[...manifest.scenarios.flatMap((s:any)=>s.states.map((state:any)=>state.voice)),...Object.values(journey),...Object.values(variants)]
  return scripts.filter(text=>!guidanceAsset(text))
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

for(const [id,text]of Object.entries(emergencyGuidance))test(`actual runtime asset ${id} has exact hashes and plays in the browser`,async({page})=>{
 await page.addInitScript(()=>{
  const AudioClass=window.Audio
  Object.defineProperty(window,'Audio',{value:class extends AudioClass{constructor(src?:string){super(src);Object.assign(window,{actualGuide:this})}}})
 })
 const scene=id==='record_storage_failed'?'record_saved':id==='deferred_storage_failed'?'deferred':'support'
 const scenario=id==='record_storage_failed'?'SC02':'SC04'
 await page.goto(`/?study=emergency&scenario=${scenario}&scene=${scene}`)
 // Seed the real versioned session, then let EmergencyStudy restore it and select the script.
 await page.evaluate(async({id,scene,scenario})=>{
  const path='/src/emergency/session.ts';const {createSession,storageKey}=await import(path)
  const session=createSession(scenario,scene)
  if(id==='insurance_unconfirmed')session.requests.insurance='unknown'
  if(id==='insurance_not_received')session.requests.insurance='not_received'
  localStorage.setItem(storageKey(scenario),JSON.stringify(session))
 },{id,scene,scenario})
 if(id.endsWith('storage_failed'))await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError')}})
 await page.reload()
 await expect(page.locator('.emergency-screen')).toContainText(text)
 // Asset lookup and crypto run in the browser, where exact runtime text is the public lookup contract.
 const asset=await page.evaluate(async text=>{
  const path='/src/audio/manifest.ts';const {guidanceAsset}=await import(path)
  const asset=guidanceAsset(text);if(!asset)return null
  const digest=async(bytes:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(value=>value.toString(16).padStart(2,'0')).join('')
  const response=await fetch(asset.path);if(!response.ok)throw new Error(`Missing asset: ${asset.path}`)
  return {scriptHash:asset.scriptHash,actualScriptHash:await digest(new TextEncoder().encode(text)),audioHash:asset.audioHash,actualAudioHash:await digest(await response.arrayBuffer()),duration:asset.duration}
 },text)
 expect(asset,`Required real JaeGyu asset missing for ${id}`).not.toBeNull()
 expect(asset!.actualScriptHash).toBe(asset!.scriptHash);expect(asset!.actualAudioHash).toBe(asset!.audioHash)
 expect(asset!.duration).toBeGreaterThan(0)
 await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.currentTime)).toBeGreaterThan(.1)
 await page.getByRole('button',{name:'음성 안내 중지',exact:true}).click()
 expect(await page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.paused)).toBe(true)
})
