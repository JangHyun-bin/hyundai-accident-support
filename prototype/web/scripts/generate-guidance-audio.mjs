import {readFile,writeFile,mkdtemp,rm,mkdir,rename} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {tmpdir,homedir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {spawn,execFileSync} from 'node:child_process'

const voiceId='gKJdDVRmX8dROO8aA5I8',model='eleven_v4'
const voiceSettings={stability:.65,similarity_boost:.8,style:.05,use_speaker_boost:true}
const hash=text=>createHash('sha256').update(text).digest('hex')
export function collectGuidanceScripts(scenario,journey,emergency) {
 const scripts=new Map()
 const add=(script,source)=>{const sources=scripts.get(script)??[];sources.push(source);scripts.set(script,sources)}
 for(const scene of scenario.scenarios)for(const state of scene.states)add(state.voice,`${scene.id}/${state.id}`)
 for(const [title,script]of Object.entries(journey))add(script,`journey/${title}`)
 for(const [id,script]of Object.entries(emergency))add(script,`emergency/${id}`)
 return scripts
}
export async function postSpeech({endpoint,key,payload}) {
  if(/[\r\n"\\]/.test(key))throw new Error('Invalid credential format')
  const directory=await mkdtemp(join(tmpdir(),'after-care-speech-'))
  const payloadFile=join(directory,'payload.json')
  try{
    await writeFile(payloadFile,JSON.stringify(payload),{encoding:'utf8',mode:0o600})
    return await new Promise((resolve,reject)=>{
      const child=spawn('/usr/bin/curl',['--fail','--silent','--show-error','--max-time','90','--config','-','--data-binary','@'+payloadFile,endpoint],{stdio:['pipe','pipe','pipe']})
      const chunks=[];let failed=''
      child.stdout.on('data',chunk=>chunks.push(chunk));child.stderr.on('data',chunk=>{failed+=chunk})
      child.on('error',reject);child.on('close',code=>code===0?resolve(Buffer.concat(chunks)):reject(new Error(`Speech request failed (${code}): ${failed.trim()}`)))
      child.stdin.end(`header = "xi-api-key: ${key}"\nheader = "Content-Type: application/json"\n`)
    })
  }finally{await rm(directory,{recursive:true,force:true})}
}
async function main(){
 const root=fileURLToPath(new URL('../',import.meta.url)),out=join(root,'public/guidance-audio')
 const scenario=JSON.parse(await readFile(new URL('../../../specs/emergency-experience/scenarios.json',import.meta.url),'utf8'))
 const journey=JSON.parse(await readFile(join(root,'src/audio/journey-guidance.json'),'utf8'))
 const emergency=JSON.parse(await readFile(join(root,'src/audio/emergency-guidance.json'),'utf8'))
 const scripts=collectGuidanceScripts(scenario,journey,emergency)
 const missing=[...scripts].filter(([script])=>!existsSync(join(out,hash(script).slice(0,16)+'.mp3')))
 const characters=missing.reduce((sum,[script])=>sum+[...script].length,0)
 if(process.argv.includes('--list-missing')){
  console.log(JSON.stringify({requests:missing.length,codepoints:characters,scripts:missing.map(([script,sources])=>({script,scriptHash:hash(script),sources}))},null,2));return
 }
 if(missing.length>4||characters>1200)throw new Error(`Generation budget exceeded: ${missing.length} requests / ${characters} codepoints`)
 let key
 if(missing.length){
  const config=await readFile(join(homedir(),'.config/elevenlabs/.env.local'),'utf8')
  key=config.match(/^(?:ELEVENLABS_API_KEY|XI_API_KEY)\s*=\s*["']?([^"'\r\n]+)/m)?.[1]?.trim()
  if(!key)throw new Error('ElevenLabs credential unavailable')
 }
 await mkdir(out,{recursive:true})
 const records=[]
 for(const [script,sources]of scripts){
  const scriptHash=hash(script),id=scriptHash.slice(0,16),file=join(out,id+'.mp3'),meta=join(out,id+'.json')
  const prior=existsSync(meta)?JSON.parse(await readFile(meta,'utf8')):null
  const generated=!existsSync(file)
  if(!generated&&!prior)throw new Error(`Existing audio has no provenance sidecar: ${id}`)
  if(prior&&(prior.script!==script||prior.scriptHash!==scriptHash||prior.voiceId!==voiceId||prior.model!==model||JSON.stringify(prior.voiceSettings)!==JSON.stringify(voiceSettings)))throw new Error(`Existing asset mismatch: ${id}`)
  if(generated){
   const bytes=await postSpeech({endpoint:`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_192`,key,payload:{text:script,model_id:model,language_code:'ko',voice_settings:voiceSettings}})
   await writeFile(file+'.tmp',bytes);await rename(file+'.tmp',file)
  }
  const bytes=await readFile(file)
  if(!generated&&(hash(bytes)!==prior.audioHash||bytes.length!==prior.bytes))throw new Error(`Existing audio hash/bytes mismatch: ${id}`)
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'}).trim())
  if(!Number.isFinite(duration)||duration<=0||duration>60)throw new Error(`Invalid duration: ${id}`)
  const record={voiceId,voiceName:'JaeGyu - Calm & Trustworthy',model,script,scriptHash,file:id+'.mp3',path:'/guidance-audio/'+id+'.mp3',voiceSettings,sources,duration,bytes:bytes.length,audioHash:hash(bytes),payloadEncoding:'UTF-8 JSON file',generatedAt:generated?new Date().toISOString():prior.generatedAt}
  await writeFile(meta,JSON.stringify(record,null,2)+'\n');records.push(record)
  console.log(`Prepared ${records.length}/${scripts.size}: ${id} (${duration}s)`)
 }
 await writeFile(join(root,'src/audio/assets.json'),JSON.stringify(records,null,2)+'\n')
 console.log(`Ready: ${records.length} deduplicated scripts`)
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main()
