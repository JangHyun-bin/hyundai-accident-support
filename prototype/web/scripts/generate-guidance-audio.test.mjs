import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {collectGuidanceScripts,postSpeech} from './generate-guidance-audio.mjs'
import {verifyGuidanceAssets} from './verify-guidance-audio.mjs'
test('curl sends exact UTF-8 JSON without shell/config interpolation',async()=>{
 const script='통화가 연결됐어요. $(`not a command`) “재규” \\ 뒤';let received
 const server=createServer(async(req,res)=>{const chunks=[];for await(const part of req)chunks.push(part);received=JSON.parse(Buffer.concat(chunks).toString('utf8'));res.end('audio')})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 try {const data=await postSpeech({endpoint:`http://127.0.0.1:${server.address().port}`,key:'local-test',payload:{text:script,model_id:'test'}});assert.equal(received.text,script);assert.equal(data.toString(),'audio')}
 finally{await new Promise(resolve=>server.close(resolve))}
})

test('asset collection includes all scene, journey and runtime scripts with exact source identity',()=>{
 const scenario=JSON.parse(readFileSync(new URL('../../../specs/emergency-experience/scenarios.json',import.meta.url)))
 const journey=JSON.parse(readFileSync(new URL('../src/audio/journey-guidance.json',import.meta.url)))
 const emergency=JSON.parse(readFileSync(new URL('../src/audio/emergency-guidance.json',import.meta.url)))
 const scripts=collectGuidanceScripts(scenario,journey,emergency)
 for(const item of scenario.scenarios)for(const state of item.states)assert.ok(scripts.get(state.voice).includes(`${item.id}/${state.id}`))
 for(const [id,text]of Object.entries(journey))assert.ok(scripts.get(text).includes(`journey/${id}`))
 for(const [id,text]of Object.entries(emergency))assert.ok(scripts.get(text).includes(`emergency/${id}`))
 assert.equal(scripts.size,new Set([...scenario.scenarios.flatMap(item=>item.states.map(state=>state.voice)),...Object.values(journey),...Object.values(emergency)]).size)
 assert.ok(Object.values(emergency).reduce((sum,text)=>sum+[...text].length,0)<=1200)
 assert.ok(Object.keys(emergency).length<=4)
 const deduplicated=collectGuidanceScripts({scenarios:[{id:'SC',states:[{id:'scene',voice:'same'}]}]},{title:'same'},{variant:'same'})
 assert.deepEqual(deduplicated.get('same'),['SC/scene','journey/title','emergency/variant'])
})

test('local verification rejects missing runtime assets and mismatched script hashes without credentials',async()=>{
 const variants=JSON.parse(readFileSync(new URL('../src/audio/emergency-guidance.json',import.meta.url)))
 await assert.rejects(verifyGuidanceAssets(new Map(Object.entries(variants).map(([id,text])=>[text,[`emergency/${id}`]])),[]),/Missing guidance assets/)
 const asset=JSON.parse(readFileSync(new URL('../src/audio/assets.json',import.meta.url)))[0]
 assert.equal(asset.scriptHash,createHash('sha256').update(asset.script).digest('hex'))
 await assert.rejects(verifyGuidanceAssets(new Map([[asset.script,asset.sources]]),[{...asset,scriptHash:'incorrect'}]),/Script hash\/path mismatch/)
})
