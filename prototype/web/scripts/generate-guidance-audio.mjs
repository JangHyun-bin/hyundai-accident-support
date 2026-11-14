import {readFile,writeFile,mkdtemp,rm,mkdir,rename,readdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {tmpdir,homedir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {spawn,execFileSync} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'

export const voiceId='gJSDQIpSQ56NBGhorBfg',voiceName='David - Calm, Steady and Clear',model='eleven_v4'
export const voiceSettings={stability:.65,similarity_boost:.8,style:.05,use_speaker_boost:true}
const concurrency=3,rateLimitRetries=5
const hash=text=>createHash('sha256').update(text).digest('hex')
export function collectGuidanceScripts(scenario,journey,emergency,flow={}) {
 const scripts=new Map()
 const add=(script,source)=>{const sources=scripts.get(script)??[];sources.push(source);scripts.set(script,sources)}
 for(const scene of scenario.scenarios)for(const state of scene.states)add(state.voice,`${scene.id}/${state.id}`)
 for(const [title,script]of Object.entries(journey))add(script,`journey/${title}`)
 for(const [id,script]of Object.entries(emergency))add(script,`emergency/${id}`)
 for(const [scene,script]of Object.entries(flow))add(script,`journey-flow/${scene}`)
 return scripts
}
class SpeechError extends Error {constructor(status,message){super(message);this.status=status}}
export async function postSpeech({endpoint,key,payload}) {
  if(/[\r\n"\\]/.test(key))throw new Error('Invalid credential format')
  const directory=await mkdtemp(join(tmpdir(),'after-care-speech-'))
  const payloadFile=join(directory,'payload.json'),bodyFile=join(directory,'body')
  try{
    await writeFile(payloadFile,JSON.stringify(payload),{encoding:'utf8',mode:0o600})
    const status=await new Promise((resolve,reject)=>{
      const child=spawn('/usr/bin/curl',['--silent','--show-error','--max-time','90','--config','-','--data-binary','@'+payloadFile,'--output',bodyFile,'--write-out','%{http_code}',endpoint],{stdio:['pipe','pipe','pipe']})
      let output='',failed=''
      child.stdout.on('data',chunk=>{output+=chunk});child.stderr.on('data',chunk=>{failed+=chunk})
      child.on('error',reject);child.on('close',code=>code===0?resolve(Number(output)):reject(new Error(`Speech request failed (curl ${code}): ${failed.trim()}`)))
      child.stdin.end(`header = "xi-api-key: ${key}"\nheader = "Content-Type: application/json"\n`)
    })
    const body=existsSync(bodyFile)?await readFile(bodyFile):Buffer.alloc(0)
    if(status<200||status>=300)throw new SpeechError(status,`Speech request failed (HTTP ${status}): ${body.toString('utf8').slice(0,300)}`)
    return body
  }finally{await rm(directory,{recursive:true,force:true})}
}
async function speak(script,key){
 for(let attempt=0;;attempt++){
  try{return await postSpeech({endpoint:`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_192`,key,payload:{text:script,model_id:model,language_code:'ko',voice_settings:voiceSettings}})}
  catch(error){
   if(!(error instanceof SpeechError)||error.status!==429||attempt>=rateLimitRetries)throw error
   await sleep(2000*2**attempt)
  }
 }
}
function limit(name,fallback){
 const flag=process.argv.find(arg=>arg.startsWith(`--${name}=`))
 const value=flag?Number(flag.slice(name.length+3)):fallback
 if(!Number.isInteger(value)||value<0)throw new Error(`--${name} must be a non-negative integer`)
 return value
}
async function currentAsset(out,script){
 const id=hash(script).slice(0,16),file=join(out,id+'.mp3'),meta=join(out,id+'.json')
 if(!existsSync(file)||!existsSync(meta))return null
 const prior=JSON.parse(await readFile(meta,'utf8'))
 if(prior.script!==script||prior.scriptHash!==hash(script)||prior.voiceId!==voiceId||prior.voiceName!==voiceName||prior.model!==model||JSON.stringify(prior.voiceSettings)!==JSON.stringify(voiceSettings))return null
 const bytes=await readFile(file)
 return hash(bytes)===prior.audioHash&&bytes.length===prior.bytes?prior:null
}
async function describe(out,script,sources,generatedAt){
 const scriptHash=hash(script),id=scriptHash.slice(0,16),file=join(out,id+'.mp3'),bytes=await readFile(file)
 const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'}).trim())
 if(!Number.isFinite(duration)||duration<=0||duration>60)throw new Error(`Invalid duration: ${id}`)
 return {voiceId,voiceName,model,script,scriptHash,file:id+'.mp3',path:'/guidance-audio/'+id+'.mp3',voiceSettings,sources,duration,bytes:bytes.length,audioHash:hash(bytes),payloadEncoding:'UTF-8 JSON file',generatedAt}
}
async function main(){
 const root=fileURLToPath(new URL('../',import.meta.url)),out=join(root,'public/guidance-audio')
 const scenario=JSON.parse(await readFile(new URL('../../../specs/emergency-experience/scenarios.json',import.meta.url),'utf8'))
 const journey=JSON.parse(await readFile(join(root,'src/audio/journey-guidance.json'),'utf8'))
 const emergency=JSON.parse(await readFile(join(root,'src/audio/emergency-guidance.json'),'utf8'))
 const flow=JSON.parse(await readFile(join(root,'src/audio/journey-flow-guidance.json'),'utf8'))
 const scripts=collectGuidanceScripts(scenario,journey,emergency,flow)
 const current=new Map()
 for(const [script]of scripts){const asset=await currentAsset(out,script);if(asset)current.set(script,asset)}
 const missing=[...scripts].filter(([script])=>!current.has(script))
 const characters=missing.reduce((sum,[script])=>sum+[...script].length,0)
 const referenced=new Set([...scripts.keys()].flatMap(script=>{const id=hash(script).slice(0,16);return [id+'.mp3',id+'.json']}))
 const orphans=existsSync(out)?(await readdir(out)).filter(name=>/^[0-9a-f]{16}\.(mp3|json)(\.tmp)?$/.test(name)&&!referenced.has(name)):[]
 const maxRequests=limit('max-requests',4),maxCharacters=limit('max-characters',1200)
 if(process.argv.includes('--list-missing')){
  console.log(JSON.stringify({voiceId,voiceName,requests:missing.length,codepoints:characters,limits:{maxRequests,maxCharacters},scripts:missing.map(([script,sources])=>({script,scriptHash:hash(script),sources})),orphans},null,2));return
 }
 if(missing.length>maxRequests||characters>maxCharacters)throw new Error(`Generation budget exceeded: ${missing.length} requests / ${characters} codepoints, limit ${maxRequests} / ${maxCharacters}. Approve with --max-requests=${missing.length} --max-characters=${characters}`)
 await mkdir(out,{recursive:true})
 if(missing.length){
  const config=await readFile(join(homedir(),'.config/elevenlabs/.env.local'),'utf8')
  const key=config.match(/^(?:ELEVENLABS_API_KEY|XI_API_KEY)\s*=\s*["']?([^"'\r\n]+)/m)?.[1]?.trim()
  if(!key)throw new Error('ElevenLabs credential unavailable')
  const failures=[];let next=0
  await Promise.all(Array.from({length:Math.min(concurrency,missing.length)},async()=>{
   while(next<missing.length){
    const [script,sources]=missing[next++],id=hash(script).slice(0,16),file=join(out,id+'.mp3')
    try{
     const bytes=await speak(script,key)
     if(!bytes.length)throw new Error('Empty audio response')
     await writeFile(file+'.tmp',bytes);await rename(file+'.tmp',file)
     const record=await describe(out,script,sources,new Date().toISOString())
     await writeFile(join(out,id+'.json'),JSON.stringify(record,null,2)+'\n');current.set(script,record)
     console.log(`Generated ${current.size}/${scripts.size}: ${id} (${record.duration}s)`)
    }catch(error){failures.push({id,script,error:error.message})}
   }
  }))
  if(failures.length)throw new Error(`${failures.length} of ${missing.length} generations failed; rerun to retry only those: ${JSON.stringify(failures,null,2)}`)
 }
 const records=[]
 for(const [script,sources]of scripts){
  const prior=current.get(script),record=await describe(out,script,sources,prior.generatedAt)
  if(record.audioHash!==prior.audioHash)throw new Error(`Audio changed during generation: ${record.file}`)
  await writeFile(join(out,record.file.replace(/\.mp3$/,'.json')),JSON.stringify(record,null,2)+'\n');records.push(record)
 }
 for(const name of orphans)await rm(join(out,name))
 await writeFile(join(root,'src/audio/assets.json'),JSON.stringify(records,null,2)+'\n')
 console.log(`Ready: ${records.length} scripts, ${missing.length} generated (${characters} codepoints), ${orphans.length} orphan files removed`)
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main()
