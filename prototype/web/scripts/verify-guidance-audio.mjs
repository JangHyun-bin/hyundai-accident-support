import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn,execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {collectGuidanceScripts,voiceId,voiceName,model,voiceSettings} from './generate-guidance-audio.mjs'
const root=fileURLToPath(new URL('../',import.meta.url))
const hash=value=>createHash('sha256').update(value).digest('hex')

export async function verifyGuidanceAssets(scripts,assets,publicDirectory=join(root,'public')) {
 const byText=new Map(assets.map(asset=>[asset.script,asset]))
 if(byText.size!==assets.length)throw new Error('Duplicate guidance script')
 const missing=[...scripts.keys()].filter(script=>!byText.has(script))
 if(missing.length)throw new Error(`Missing guidance assets: ${JSON.stringify(missing)}`)
 const extra=assets.filter(asset=>!scripts.has(asset.script)).map(asset=>asset.file)
 if(extra.length)throw new Error(`Unreferenced guidance assets: ${JSON.stringify(extra)}`)
 const reports=[]
 for(const [script,sources]of scripts){
  const asset=byText.get(script),scriptHash=hash(script)
  if(asset.scriptHash!==scriptHash||asset.file!==scriptHash.slice(0,16)+'.mp3'||asset.path!=='/guidance-audio/'+asset.file)throw new Error(`Script hash/path mismatch: ${asset.file}`)
  if(JSON.stringify(asset.voiceSettings)!==JSON.stringify(voiceSettings))throw new Error(`Voice settings mismatch: ${asset.file}`)
  if(asset.voiceId!==voiceId||asset.voiceName!==voiceName||asset.model!==model)throw new Error(`Voice/model mismatch: ${asset.file}`)
  if(sources.some(source=>!asset.sources.includes(source)))throw new Error(`Missing guidance source: ${asset.file}`)
  const source=join(publicDirectory,asset.path),bytes=await readFile(source)
  if(hash(bytes)!==asset.audioHash||bytes.length!==asset.bytes)throw new Error(`Audio hash/bytes mismatch: ${asset.file}`)
  const sidecar=JSON.parse(await readFile(source.replace(/\.mp3$/,'.json'),'utf8'))
  if(JSON.stringify(sidecar)!==JSON.stringify(asset))throw new Error(`Sidecar mismatch: ${asset.file}`)
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',source],{encoding:'utf8'}).trim())
  if(!Number.isFinite(duration)||duration<=0||duration>60||Math.abs(duration-asset.duration)>.01)throw new Error(`Invalid duration: ${asset.file}`)
  execFileSync('ffmpeg',['-v','error','-i',source,'-f','null','-'],{stdio:['ignore','pipe','pipe']})
  reports.push({file:asset.file,scriptHash,audioHash:asset.audioHash,duration,sources})
 }
 const files=new Set(assets.flatMap(asset=>[asset.file,asset.file.replace(/\.mp3$/,'.json')]))
 const orphans=(await readdir(join(publicDirectory,'guidance-audio'))).filter(name=>!files.has(name))
 if(orphans.length)throw new Error(`Orphan guidance audio files: ${JSON.stringify(orphans)}`)
 return reports
}

async function main(){
 const scenario=JSON.parse(await readFile(new URL('../../../specs/emergency-experience/scenarios.json',import.meta.url),'utf8'))
 const journey=JSON.parse(await readFile(join(root,'src/audio/journey-guidance.json'),'utf8'))
 const emergency=JSON.parse(await readFile(join(root,'src/audio/emergency-guidance.json'),'utf8'))
 const flow=JSON.parse(await readFile(join(root,'src/audio/journey-flow-guidance.json'),'utf8'))
 const assets=JSON.parse(await readFile(join(root,'src/audio/assets.json'),'utf8'))
 const clips=await verifyGuidanceAssets(collectGuidanceScripts(scenario,journey,emergency,flow),assets)
 console.log(JSON.stringify({method:'Local exact-script/hash/sidecar/source verification and ffmpeg decode; no human listening claim',clips},null,2))
 // Remote transcription is opt-in; the default validation never reads credentials or sends requests.
 if(!process.argv.includes('--transcribe'))return
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
  reports.push({file:asset.file,audioHash:asset.audioHash,script:asset.script,transcript:response.text,language:response.language_code,similarity,checkedAt:new Date().toISOString()})
  await writeFile(file,JSON.stringify({method:'ElevenLabs scribe_v2 transcription and local ffmpeg decode; no human listening claim',clips:reports},null,2)+'\n')
  console.log(`${reports.length}/${assets.length} ${asset.file}: ${similarity.toFixed(3)}`)
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main()
