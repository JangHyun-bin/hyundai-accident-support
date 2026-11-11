import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {postSpeech} from './generate-guidance-audio.mjs'
test('curl sends exact UTF-8 JSON without shell/config interpolation',async()=>{
 const script='통화가 연결됐어요. $(`not a command`) “재규” \\ 뒤';let received
 const server=createServer(async(req,res)=>{const chunks=[];for await(const part of req)chunks.push(part);received=JSON.parse(Buffer.concat(chunks).toString('utf8'));res.end('audio')})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 try {const data=await postSpeech({endpoint:`http://127.0.0.1:${server.address().port}`,key:'local-test',payload:{text:script,model_id:'test'}});assert.equal(received.text,script);assert.equal(data.toString(),'audio')}
 finally{await new Promise(resolve=>server.close(resolve))}
})
