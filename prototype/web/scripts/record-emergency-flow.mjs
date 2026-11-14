import {captureGuidance,collectedGuidance,narrateVisible,verifiedSegments,muxGuidance} from './guidance-recording.mjs'
import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'

// 실제 browser 전환을 녹화한다. Layout override·chapter card는 이 recording context에만 적용.
const output = resolve(process.argv[2] ?? join(homedir(), 'Downloads/emergency-flow-2026-11-09-complete.mp4'))
const appOutput = output
assert.ok(output.endsWith('.mp4'))
assert.ok(!existsSync(output) && !existsSync(appOutput), 'Existing videos must not be overwritten')
const manifest = JSON.parse(readFileSync(new URL('../../../specs/emergency-experience/scenarios.json', import.meta.url)))
const temp = mkdtempSync(join(tmpdir(), 'emergency-flow-'))
const browser = await chromium.launch({ channel: 'chrome', args: ['--mute-audio'] })
const context = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1,
  reducedMotion: 'no-preference', recordVideo: { dir: temp, size: { width: 2560, height: 1440 } } })
const began = performance.now()
const page = await context.newPage()
await captureGuidance(page)
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const wallOrigin=Date.now()-(performance.now()-began)
let lastScript='',voiceClips=[]
const errors = [], timeline = [], actions = [], visited = new Set()
page.on('pageerror', error => errors.push(error.message))
let trim, raw, appBounds
const hold = seconds => page.waitForTimeout(seconds * 1000)
const hiddenClick = name => page.getByRole('button', { name, exact: true, includeHidden: true }).evaluate(button => button.click())
const event = async name => { actions.push({ kind: 'external', name, from: new URL(page.url()).searchParams.get('scene') }); await hiddenClick(`시연 event: ${name}`) }
const touch = async name => {
  actions.push({ kind: 'user', name, from: new URL(page.url()).searchParams.get('scene') })
  const button = page.locator('.emergency-screen').getByRole('button', { name, exact: true })
  await button.hover()
  await page.mouse.down()
  await hold(.16)
  await page.mouse.up()
  await page.mouse.move(2550, 1430)
}
const state = async (scenarioId, sceneId, seconds = 3) => {
  await expect.poll(() => new URL(page.url()).searchParams.get('scene'), { timeout: 15_000 }).toBe(sceneId)
  const scenario = manifest.scenarios.find(s => s.id === scenarioId)
  const scene = scenario.states.find(s => s.id === sceneId)
  await expect(page.locator('.emergency-screen h1')).toHaveText(scene.title)
  visited.add(`${scenarioId}/${sceneId}`)
  timeline.push({ at: (performance.now() - began) / 1000 - trim, scenario: scenarioId, scene: sceneId, title: scene.title })
  console.log(`RECORD ${scenarioId}/${sceneId}`)
  const narration=await narrateVisible(page,lastScript);lastScript=narration.lastScript
  await hold(Math.max(seconds,narration.hold))
}
const card = async (eyebrow, title, detail, seconds = 2) => {
  await page.evaluate(({ eyebrow, title, detail }) => {
    const card = document.querySelector('#record-card')
    card.querySelector('small').textContent = eyebrow
    card.querySelector('h2').textContent = title
    card.querySelector('p').textContent = detail
    card.hidden = false
  }, { eyebrow, title, detail })
  await hold(seconds)
}
const reveal = () => page.locator('#record-card').evaluate(node => { node.hidden = true })
try {
  await page.goto('http://127.0.0.1:5173/?study=emergency&scenario=SC05&scene=initial')
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: `
    html,body{margin:0!important;padding:0!important;width:2560px!important;height:1440px!important;overflow:hidden!important;background:#0b0c0e!important}
    .emergency-study{margin:0!important;padding:0!important;max-width:none!important}
    .emergency-study>:not(.emergency-viewport){display:none!important}
    .emergency-viewport{position:fixed!important;inset:0!important;width:2560px!important;height:1440px!important;overflow:hidden!important;border-radius:0!important}
    .canvas-space{width:2560px!important;height:1440px!important}
    .pleos-display{transform:none!important;border-radius:0!important}
    #record-card{position:fixed;z-index:2147483647;border-radius:32px;background:#1d1e21;color:#edeef2;padding:80px;display:flex;flex-direction:column;justify-content:center;gap:32px;word-break:keep-all}
    #record-card[hidden]{display:none}#record-card small{font-size:24px;letter-spacing:.12em;color:#a4a8ae}
    #record-card h2{font-size:56px;line-height:1.25;letter-spacing:-.035em;margin:0;white-space:pre-line}
    #record-card p{font-size:28px;line-height:1.8;color:#a4a8ae;margin:0;white-space:pre-line}
  ` })
  appBounds = {x:0,y:0,width:2560,height:1440}
  await page.evaluate(({ x, y, width, height }) => {
    const card = document.createElement('aside');card.id = 'record-card';card.hidden = true
    Object.assign(card.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` })
    card.innerHTML = '<small></small><h2></h2><p></p>';document.body.append(card)
  }, appBounds)
  trim = (performance.now() - began) / 1000
  const count = `${manifest.scenarios.length} scenarios · ${manifest.scenarios.reduce((n, s) => n + s.states.length, 0)} scenes`
  await card('차분', '사고 대응\nEnd-to-end flow', count, 3)
  const begin = async (id, title, detail) => {
    await card(`${id} / ${manifest.scenarios.find(s => s.id === id).title}`, title, detail, 2.5)
    await page.locator('.emergency-scenarios').getByRole('button', { name: manifest.scenarios.find(s => s.id === id).title, exact: true, includeHidden: true }).evaluate(button => button.click())
    await reveal()
    await state(id, 'initial', 2.5)
  }
  const action = async (id, label, to, seconds = 2.5) => { await touch(label); await state(id, to, seconds) }
  const result = async (id, label, to, seconds = 2.5) => { await event(label); await state(id, to, seconds) }
  const record = async text => {
    await page.locator('#accident-record').fill(text)
    actions.push({ kind: 'input', field: 'record', value: text })
    await hold(2)
  }
  const scope = async label => {
    const input = page.locator('.emergency-screen').getByLabel(label, { exact: true })
    await input.setChecked(!(await input.isChecked()))
    actions.push({ kind: 'scope', field: label, checked: await input.isChecked() })
    await hold(1.5)
  }

  await begin('SC01', '구호 연결부터 인계까지', '부상 있음 · 운전자와 이동 경로 미확인')
  await action('SC01', '취소', 'cancelled')
  await action('SC01', '다시 연결', 'contact_unknown')
  await result('SC01', '연결 실패', 'call_failed')
  await action('SC01', '다시 연결', 'contact_unknown')
  await result('SC01', '통화 연결 확인', 'connected', 5)
  assert.equal(await page.locator('.ac-call-content .ac-spectrum > i').count(), 28)
  await result('SC01', '연결 끊김', 'contact_unknown')
  await result('SC01', '통화 연결 확인', 'connected')
  await action('SC01', '사고 기록 남기기', 'record')
  await record('고속도로에서 충격을 느꼈어요. 정확한 사고 경위는 확인 중이에요.')
  await action('SC01', '기록 저장', 'record_saved')
  await action('SC01', '지원 상황으로', 'connected')
  await result('SC01', '구호 접수 확인', 'received')
  await result('SC01', '구호 현장 도착', 'arrived')
  await result('SC01', '구호 인계 확인', 'handoff', 3.5)
  await begin('SC01', '응답이 없을 때의 연결', '10초 countdown · 뒤늦은 응답')
  await state('SC01', 'auto_contact', 3)
  await result('SC01', '연결 실패', 'auto_failed')
  await result('SC01', '구호 연결 재시도', 'auto_contact')
  await result('SC01', '통화 연결 확인', 'auto_connected', 4)
  await result('SC01', '구호 접수 확인', 'auto_received')
  await result('SC01', '구호 인계 확인', 'auto_handoff')
  await action('SC01', '응답할 수 있어요', 'handoff')

  await begin('SC02', '차량 지원을 기다리며 기록', '이동 불가 · 요청 승인 · 기록 보관')
  await action('SC02', '차량 지원 요청하기', 'review', 4)
  await action('SC02', '나중에', 'initial')
  await action('SC02', '차량 지원 요청하기', 'review')
  await action('SC02', '동의하고 요청', 'sending')
  await result('SC02', '전송 실패', 'failed')
  await action('SC02', '요청 내용 다시 확인', 'review')
  await action('SC02', '동의하고 요청', 'sending')
  await result('SC02', '전송 완료', 'waiting')
  await action('SC02', '사고 기록 남기기', 'record')
  await record('차량이 움직이지 않아요. 정차 위치와 충돌 경위를 확인 중이에요.')
  await action('SC02', '기록 저장', 'record_saved', 3)
  await action('SC02', '지원 상황으로', 'waiting')
  await action('SC02', '요청 상태 확인', 'checking')
  await result('SC02', '결과 미확인', 'waiting')
  await action('SC02', '요청 상태 확인', 'checking')
  await result('SC02', '차량 지원 접수 확인', 'received')
  await result('SC02', '차량 지원 현장 도착', 'arrived', 3)

  await begin('SC03', '응답을 단정하지 않는 연결', '위험 정보 반영 · 무응답 상태에서 구호 인계')
  await result('SC03', '차량 위험 감지', 'initial', 2)
  await state('SC03', 'unanswered', 3)
  await result('SC03', '연결 실패', 'unanswered_failed')
  await result('SC03', '구호 연결 재시도', 'unanswered')
  await result('SC03', '통화 연결 확인', 'unanswered_connected', 4)
  await result('SC03', '구호 접수 확인', 'unanswered_received')
  await result('SC03', '구호 인계 확인', 'unanswered_handoff')
  await action('SC03', '응답할 수 있어요', 'handoff')
  await begin('SC03', '운전자가 응답한 경우', '취소 · 재연결 · 통화와 접수 확인')
  await action('SC03', '취소', 'responded')
  await action('SC03', '다시 연결', 'contact_unknown')
  await result('SC03', '연결 실패', 'call_failed')
  await action('SC03', '다시 연결', 'contact_unknown')
  await result('SC03', '통화 연결 확인', 'connected', 4)
  await result('SC03', '연결 끊김', 'contact_unknown')
  await result('SC03', '통화 연결 확인', 'connected')
  await result('SC03', '구호 접수 확인', 'received')
  await result('SC03', '구호 인계 확인', 'handoff')

  await begin('SC04', '전송은 확인하고 선택', '기록 정정 · 거절과 보류 · 다시 승인')
  await action('SC04', '기록 고치기', 'record')
  await record('정차 중 뒤쪽에서 충격을 느꼈어요. 상대 차량의 진행 방향은 미확인이에요.')
  await action('SC04', '저장하고 돌아가기', 'initial')
  await action('SC04', '전송 범위 확인', 'review', 4)
  await action('SC04', '보내지 않기', 'declined')
  await action('SC04', '다른 지원 확인', 'support')
  await action('SC04', '나중에 이어하기', 'paused')
  await action('SC04', '남은 지원 확인', 'support')
  await action('SC04', '보험사 전송 다시 검토', 'review')
  await scope('사고 위치')
  await action('SC04', '나중에 보내기', 'deferred')
  await action('SC04', '전송 다시 검토', 'review', 3)
  await action('SC04', '동의하고 전송', 'sending')
  await result('SC04', '전송 실패', 'failed')
  await action('SC04', '전송 범위 다시 확인', 'review')
  await scope('차량 상태')
  await action('SC04', '동의하고 전송', 'sending')
  await result('SC04', '전송 완료', 'sent')
  await action('SC04', '접수 상태 확인', 'checking')
  await result('SC04', '결과 미확인', 'sent')
  await action('SC04', '접수 상태 확인', 'checking')
  await result('SC04', '보험 접수 확인', 'received', 3.5)

  await begin('SC05', '멈췄다가 이어서 확인', '중단 중에도 기존 요청 유지 · 접수 결과 반영')
  await action('SC05', '나중에 이어하기', 'suspended', 3)
  await result('SC05', '구호 인계 확인', 'suspended', 3)
  await result('SC05', '차량 지원 접수 확인', 'suspended', 3)
  await action('SC05', '이어서 확인하기', 'received')
  assert.equal(await page.locator('.emergency-screen').getAttribute('data-request-count'), '1')
  await result('SC05', '차량 지원 현장 도착', 'arrived')
  await result('SC05', '구호 인계 확인', 'handoff')
  await begin('SC05', '결과 확인 후에만 다시 요청', '조회 실패 · 미접수 확인 · 범위 재승인')
  await action('SC05', '요청 상태 확인', 'checking')
  await result('SC05', '조회 실패', 'lookup_failed')
  await action('SC05', '나중에 이어하기', 'suspended')
  await action('SC05', '이어서 확인하기', 'checking')
  await result('SC05', '결과 미확인', 'initial')
  await action('SC05', '요청 상태 확인', 'checking')
  await result('SC05', '차량 지원 미접수 확인', 'not_received')
  await action('SC05', '요청 범위 다시 확인', 'review', 4)
  await scope('사고 위치')
  await action('SC05', '나중에', 'not_received')
  await action('SC05', '요청 범위 다시 확인', 'review')
  await action('SC05', '동의하고 다시 요청', 'sending')
  await result('SC05', '전송 실패', 'send_failed')
  await action('SC05', '요청 범위 다시 확인', 'review')
  await action('SC05', '동의하고 다시 요청', 'sending')
  await result('SC05', '전송 완료', 'initial')
  await action('SC05', '요청 상태 확인', 'checking')
  await result('SC05', '차량 지원 접수 확인', 'received', 4)
  await card('FLOW REVIEW / END', '시연 종료', count, 3)
  const expected = manifest.scenarios.flatMap(s => s.states.map(x => `${s.id}/${x.id}`))
  assert.deepEqual([...visited].sort(), expected.sort(), 'Every authored scene must appear')
  assert.deepEqual(errors, [], 'No browser runtime errors')
  voiceClips=await collectedGuidance(page)
  raw = await page.video().path()
} finally {
  await context.close()
  await browser.close()
}

function encode(args) {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })
    process.on('error', reject);process.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)))
  })
}
const silent=join(temp,'silent.mp4')
console.log('ENCODING responsive full flow')
await encode(['-ss',String(trim),'-i',raw,'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',silent])
const probe = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate', '-of', 'json', file], { encoding: 'utf8' }))
const duration=Number(probe(silent).format.duration)
const audioSegments=verifiedSegments(voiceClips,stamp=>(stamp-wallOrigin)/1000-trim,duration)
await muxGuidance(silent,output,audioSegments,duration)
const result={output,sourceCommit,appBounds,raw,trim,timeline,actions,visited:[...visited],audio:true,audioSegments,full:probe(output)}
writeFileSync(output.replace(/\.mp4$/, '.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
