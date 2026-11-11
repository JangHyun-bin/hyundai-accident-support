import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn,execFileSync} from 'node:child_process'
const root=fileURLToPath(new URL('../',import.meta.url))
const assets=JSON.parse(await readFile(join(root,'src/audio/assets.json'),'utf8'))
const config=await readFile(join(homedir(),'.config/elevenlabs/.env.local'),'utf8')
const key=config.match(/^(?:ELEVENLABS_API_KEY|XI_API_KEY)\s*=\s*["']?([^"'\r\n]+)/m)?.[1]?.trim()
if(!key||/[\r\n"\\]/.test(key))throw new Error('Credential unavailable')
const directory=fileURLToPath(new URL('../../../evidence/design-system/',import.meta.url))
await mkdir(directory,{recursive:true})
const file=join(directory,'audio-verification.json')
let reports=[];try{reports=JSON.parse(await readFile(file,'utf8')).clips}catch{}
const normalize=text=>text.replace(/119/g,'일일구').replace(/10초/g,'십초').replace(/[^가-힣a-z0-9]/gi,'')
function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+(a[i]===b[j]?0:1)));row=next}return row[b.length]}
for(const asset of assets){
 if(reports.some(r=>r.audioHash===asset.audioHash))continue
 const source=join(root,'public',asset.path)
 const response=await new Promise((resolve,reject)=>{
  const child=spawn('/usr/bin/curl',['--fail','--silent','--show-error','--max-time','90','--config','-','-F','file=@'+source,'-F','model_id=scribe_v2','-F','language_code=ko','https://api.elevenlabs.io/v1/speech-to-text'])
  let output='';child.stdout.on('data',data=>{output+=data});child.on('error',reject);child.on('close',code=>code===0?resolve(JSON.parse(output)):reject(new Error(`Transcription failed ${code}`)));child.stdin.end(`header = "xi-api-key: ${key}"\n`)
 })
 if(!response.text)throw new Error('Transcript unavailable')
 const a=normalize(asset.script),b=normalize(response.text),similarity=1-distance(a,b)/Math.max(a.length,b.length)
 const signal=execFileSync('ffmpeg',['-hide_banner','-i',source,'-af','volumedetect','-f','null','-'],{encoding:'utf8',stdio:['ignore','pipe','pipe']})
 // ffmpeg의 signal 분석 성공은 decode 가능함을 확인. 사람의 음색 평가는 별도.
 void signal
 reports.push({file:asset.file,audioHash:asset.audioHash,script:asset.script,transcript:response.text,language:response.language_code,similarity,checkedAt:new Date().toISOString()})
 await writeFile(file,JSON.stringify({method:'ElevenLabs scribe_v2 transcription and ffmpeg decode; no human listening claim',clips:reports},null,2)+'\n')
 console.log(`${reports.length}/${assets.length} ${asset.file}: ${similarity.toFixed(3)}`)
}
