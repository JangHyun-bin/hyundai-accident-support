import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {verifiedSegments} from './guidance-recording.mjs'
const asset=JSON.parse(readFileSync(new URL('../src/audio/assets.json',import.meta.url)))[0]
test('recorded playback is clipped to both trim and stop without moving its audio content',()=>{
 const [segment]=verifiedSegments([{path:asset.path,start:1000,end:5000}],time=>time/1000-2,10)
 assert.equal(segment.at,0);assert.equal(segment.offset,1);assert.equal(segment.duration,3)
 assert.equal(segment.scriptHash,asset.scriptHash)
})
test('unapproved paths and failed zero-length playback are omitted',()=>{
 assert.deepEqual(verifiedSegments([{path:'/unknown.mp3',start:0,end:100},{path:asset.path,start:1,end:1}],t=>t,10),[])
})
