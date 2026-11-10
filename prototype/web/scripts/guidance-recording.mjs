import {readFileSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const assets=JSON.parse(readFileSync(new URL('../src/audio/assets.json',import.meta.url)))
export async function captureGuidance(page){
 await page.addInitScript(()=>{
  window.guidanceRecording=[]
  const Original=window.Audio
  window.Audio=class extends Original {
   constructor(src){super(src);this.guidanceSource=src}
   async play(){
    if(this.guidanceSource?.startsWith('/guidance-audio/')){
     this.clip={path:this.guidanceSource,start:Date.now(),end:null};window.guidanceRecording.push(this.clip)
     this.addEventListener('ended',()=>{if(this.clip&&!this.clip.end)this.clip.end=Date.now()},{once:true})
    }
    try{return await super.play()}catch(error){if(this.clip)this.clip.end=this.clip.start;throw error}
   }
   pause(){if(this.clip&&!this.clip.end)this.clip.end=Date.now();return super.pause()}
  }
 })
}
export async function collectedGuidance(page){return page.evaluate(()=>window.guidanceRecording??[])}
export function verifiedSegments(recordings,mapTime,maxDuration){
 return recordings.flatMap(clip=>{
  const asset=assets.find(a=>a.path===clip.path);if(!asset)return[]
  const at=Math.max(0,mapTime(clip.start)),offset=Math.max(0,-mapTime(clip.start))
  const end=clip.end?mapTime(clip.end):at+asset.duration
  const duration=Math.min(asset.duration-offset,end-at,maxDuration-at)
  return duration>.06?[{path:asset.path,scriptHash:asset.scriptHash,voiceId:asset.voiceId,model:asset.model,at,offset,duration}]:[]
 })
}
export async function narrateVisible(page,lastScript){
 const control=page.getByRole('button',{name:'음성 안내 듣기',exact:true}).filter({visible:true}).first()
 const active=page.getByRole('button',{name:'음성 안내 중지',exact:true}).filter({visible:true}).first()
 if(await active.count())return {lastScript,hold:0}
 if(!await control.count())return {lastScript,hold:0}
 const emergency=page.locator('.emergency-screen:visible')
 const scene=await emergency.count()?(await emergency.getAttribute('data-scenario'))+'/'+(await emergency.getAttribute('data-scene')):null
 // Countdown은 진입 즉시 시작한 실제 playback을 사용. 조작을 지연하지 않음.
 if(await page.locator('[data-countdown]:visible').count())return {lastScript,hold:0}
 const headings=await page.locator('[data-case-id] h1:visible,.emergency-screen h1:visible').allTextContents()
 const signature=scene??headings.join('|')
 if(signature===lastScript)return {lastScript,hold:0}
 const before=await page.evaluate(()=>window.guidanceRecording.length)
 await control.click();await page.waitForTimeout(100)
 const clip=await page.evaluate(index=>window.guidanceRecording[index],before)
 if(!clip)throw new Error('Guidance playback did not start')
 const asset=assets.find(a=>a.path===clip.path)
 if(!asset)throw new Error('Unrecognized guidance asset')
 return {lastScript:signature,hold:asset.duration+.4}
}
export async function muxGuidance(silent,output,segments,duration){
 const args=['-hide_banner','-loglevel','error','-n','-i',silent]
 for(const clip of segments)args.push('-ss',String(clip.offset),'-t',String(clip.duration),'-i',fileURLToPath(new URL('../public'+clip.path,import.meta.url)))
 const filters=segments.map((clip,i)=>`[${i+1}:a]asetpts=PTS-STARTPTS,adelay=${Math.round(clip.at*1000)}:all=1[a${i}]`)
 filters.push(segments.map((_,i)=>`[a${i}]`).join('')+`amix=inputs=${segments.length}:normalize=0,alimiter=limit=0.95,apad[a]`)
 args.push('-filter_complex',filters.join(';'),'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',output)
 await new Promise((resolve,reject)=>{const process=spawn('ffmpeg',args,{stdio:['ignore','inherit','inherit']});process.on('error',reject);process.on('close',code=>code===0?resolve():reject(new Error('Audio mux failed '+code)))})
}
