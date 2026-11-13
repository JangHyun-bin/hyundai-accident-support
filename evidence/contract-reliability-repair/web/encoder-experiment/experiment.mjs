import {createRequire} from 'node:module'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {setTimeout as realDelay} from 'node:timers/promises'
const root=process.cwd(),require=createRequire(join(root,'package.json'))
const {chromium}=require('@playwright/test')
const {observeVoiceRecorder,waitForRecorderData}=await import(pathToFileURL(join(root,'tests/helpers/voice-recorder.ts')).href)
const output=resolve(root,'../../evidence/contract-reliability-repair/web',process.argv[2]??'encoder-experiment')
await mkdir(output)
const program=await readFile(fileURLToPath(import.meta.url))
await writeFile(join(output,'experiment.mjs'),program)
const browser=await chromium.launch({channel:'chrome'})
const results=[]
try{
 for(const strategy of ['legacy-350ms','native-readiness']){
  const context=await browser.newContext({viewport:{width:1600,height:1050}})
  const page=await context.newPage()
  await observeVoiceRecorder(page)
  await page.addInitScript(()=>{
   navigator.mediaDevices.getUserMedia=async()=>{
    const context=new AudioContext()
    await context.suspend()
    const oscillator=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination()
    gain.gain.value=.2
    oscillator.connect(gain).connect(destination);oscillator.start()
    const track=destination.stream.getAudioTracks()[0],stop=track.stop.bind(track)
    track.stop=()=>{if(track.readyState==='ended')return;stop();oscillator.stop();void context.close()}
    window.voiceRecorderProbe.contexts.push(context)
    return destination.stream
   }
  })
  await page.goto('http://127.0.0.1:5173/?study=journey&fixture=partial-evidence&device=mobile')
  await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
  await page.getByRole('button',{name:'사고 기록 남기기',exact:true}).click()
  await page.clock.install()
  await page.getByRole('button',{name:'말로 기록하기',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('[data-voice-phase]')?.getAttribute('data-voice-phase')==='listening')
  // A deliberately held native source controls the race. This is the old threshold, not a readiness wait.
  await realDelay(350)
  await page.clock.fastForward(350)
  const before=await page.evaluate(()=>window.voiceRecorderProbe.snapshot())
  if(strategy==='native-readiness'){
   await page.evaluate(()=>window.voiceRecorderProbe.contexts[0].resume())
   await waitForRecorderData(page)
  }
  await page.evaluate(()=>window.voiceRecorderProbe.mark('before-maximum-duration'))
  await page.clock.fastForward(120100)
  await page.waitForFunction(()=>window.voiceRecorderProbe.recordings[0].events.some(event=>event.kind==='stop'))
  await page.waitForFunction(()=>{const phase=document.querySelector('[data-voice-phase]')?.getAttribute('data-voice-phase');return phase&&!['listening','stopping','requesting-permission'].includes(phase)})
  const after=await page.evaluate(()=>window.voiceRecorderProbe.snapshot())
  const save=page.getByRole('button',{name:'기록 저장',exact:true}),saveCount=await save.count()
  const saveVisible=saveCount===1&&await save.isVisible(),saveEnabled=saveVisible&&await save.isEnabled()
  const media=await page.evaluate(async()=>{
   const recording=window.voiceRecorderProbe.recordings[0]
   const blob=new Blob(recording.chunks,{type:recording.recorder.mimeType}),bytes=await blob.arrayBuffer()
   let decoded=null,decodeError=null
   if(bytes.byteLength){
    const context=new AudioContext()
    try{const buffer=await context.decodeAudioData(bytes.slice(0));decoded={frames:buffer.length,duration:buffer.duration,sampleRate:buffer.sampleRate,channels:buffer.numberOfChannels}}
    catch(error){decodeError=String(error)}finally{await context.close()}
   }
   return{bytes:Array.from(new Uint8Array(bytes)),mime:blob.type,decoded,decodeError}
  })
  await writeFile(join(output,strategy+'.webm'),new Uint8Array(media.bytes))
  await page.screenshot({path:join(output,strategy+'.png'),fullPage:true})
  const result={strategy,before,after,saveVisible,saveEnabled,recording:{bytes:media.bytes.length,mime:media.mime,decoded:media.decoded,decodeError:media.decodeError},visibleText:await page.locator('body').innerText()}
  await writeFile(join(output,strategy+'.json'),JSON.stringify(result,null,2)+'\n')
  results.push(result)
  await context.close()
 }
 const [legacy,ready]=results
 const causalMechanismReproduced=!legacy.saveEnabled&&legacy.after.ui.phase!=='review'&&legacy.recording.bytes===0&&ready.saveEnabled&&ready.after.ui.phase==='review'&&ready.recording.decoded?.frames>0
 const report={schemaVersion:1,recordedAt:new Date().toISOString(),node:process.version,browser:await browser.version(),programSha256:createHash('sha256').update(program).digest('hex'),recorderHelperSha256:createHash('sha256').update(await readFile(join(root,'tests/helpers/voice-recorder.ts'))).digest('hex'),method:'Native MediaRecorder and real WebAudio oscillator streams; held source before start, same legacy 350ms threshold, only readiness strategy differs; application clock advances independently.',causalMechanismReproduced,historicalLimit:'Original PR10 trace is absent. A controlled causal reproduction does not uniquely attribute the historical failure.',results}
 await writeFile(join(output,'result.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({causalMechanismReproduced,node:report.node,browser:report.browser,programSha256:report.programSha256,results:results.map(({strategy,after,saveVisible,saveEnabled,recording})=>({strategy,phase:after.ui.phase,message:after.ui.message,saveVisible,saveEnabled,recording}))},null,2))
 process.exitCode=causalMechanismReproduced?0:2
}finally{await browser.close()}
