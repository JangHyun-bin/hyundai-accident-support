import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'

const output = process.argv[2]
assert.ok(output && isAbsolute(output) && output.endsWith('.mp4'), 'Pass a new absolute MP4 path')
const metadataPath = output.replace(/\.mp4$/, '.json')
assert.ok(existsSync(dirname(output)), 'Output directory must exist')
assert.ok(!existsSync(output) && !existsSync(metadataPath), 'Existing artifacts must not be overwritten')
const fixtures = JSON.parse(readFileSync(new URL('../../../specs/emergency-experience/journey-fixtures.json', import.meta.url)))
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const temp = mkdtempSync(join(tmpdir(), 'journey-flow-'))
const profile = join(temp, 'browser-profile')
const launch = viewport => chromium.launchPersistentContext(profile, { channel: 'chrome', args: ['--mute-audio'], viewport, deviceScaleFactor: 1,
  recordVideo: { dir: temp, size: viewport } })
let context = await launch({ width: 2560, height: 1440 })
const began = performance.now()
let page = await context.newPage()
const errors = [], actions = [], timeline = []
page.on('pageerror', error => errors.push(error.message))
const elapsed = () => (performance.now() - began) / 1000
const hold = seconds => page.waitForTimeout(seconds * 1000)
const button = name => page.getByRole('button', { name, exact: true })
let trim, vehicleEnd, mobileBegan, mobileStart, finished, raw, mobileRaw, device = 'vehicle'
const recordingStyle = `
  html,body{margin:0!important;padding:0!important;background:#0b0c0e!important}
  .journey-study{margin:0!important;padding:0!important;max-width:none!important}
  .journey-study>:not([data-case-id]){display:none!important}
  .journey-mobile-viewport{border-radius:0!important}
  .journey-vehicle-viewport .pleos-display{border-radius:0!important}
`

async function click(name) {
  actions.push({ atRaw: elapsed(), kind: 'user', name, device })
  await button(name).click({ delay: 120 })
  await hold(.3)
}
async function reviewControl(name, kind = 'external') {
  actions.push({ atRaw: elapsed(), kind, name, device, hiddenByRecordingLayout: true })
  await page.getByRole('button', { name, exact: true, includeHidden: true }).evaluate(node => node.click())
  await hold(.3)
}
const event = name => reviewControl('시연 event: ' + name)
const navigate = name => reviewControl(name, 'user-navigation')
async function saved() {
  await expect(page.locator('.journey-save-status')).toContainText('이 기기에 보관됨')
  return page.evaluate(async () => {
    const path = '/src/journey/case-store.ts'
    const { loadCase } = await import(path)
    const value = await loadCase(new URL(location.href).searchParams.get('case'))
    if (!value) throw new Error('The recorded case is not durably saved')
    return value
  })
}
async function mark(id, coverage, seconds = 2.5) {
  const value = await saved()
  timeline.push({ id, atRaw: elapsed(), device, fixture: value.fixtureId, caseId: value.id,
    stage: value.stage, sceneId: value.emergency.sceneId, suspended: value.suspended, coverage,
    headings: await page.locator('[data-case-id] h1:visible').allTextContents(),
    requests: value.emergency.requests, submissions: value.submissions.length, shares: value.shares.length })
  console.log('RECORD', id)
  await hold(seconds)
}
async function beginFixture(id) {
  await page.getByRole('combobox', { name: '시연 상황', exact: true, includeHidden: true }).selectOption(id, { force: true })
  await reviewControl('새 시연 시작', 'fixture')
  await saved()
  await page.evaluate(() => scrollTo(0, 0))
}
async function select(name) {
  await page.getByRole('checkbox', { name, exact: true }).check()
  actions.push({ atRaw: elapsed(), kind: 'selection', name, device })
  await hold(.2)
}
async function request(recipient, labels) {
  await page.getByLabel('수신처', { exact: true }).fill(recipient)
  for (const label of labels) await select(label)
  await click('선택한 내용 미리보기')
  await expect(page.getByRole('region', { name: '보낼 내용 미리보기', exact: true })).toContainText(recipient)
  await mark('payload-preview-' + timeline.length, ['S1'], 3)
  await click('이 내용으로 요청')
  await expect(page.getByText('승인한 내용이 보관됐어요', { exact: true })).toBeVisible()
}

try {
  await page.goto('http://127.0.0.1:5173/?study=journey&fixture=complete-journey')
  await page.evaluate(() => document.fonts.ready)
  await button('이 상황으로 시작').click()
  await saved()
  await page.addStyleTag({ content: recordingStyle })
  trim = elapsed()
  await mark('vehicle-response', ['V1'], 2)
  await click('지금 연결')
  await event('통화 연결 확인')
  await expect(page.getByText('119 통화 연결됨', { exact: true })).toBeVisible()
  await mark('rescue-connected', ['V1', 'V2'], 4)
  await navigate('차량 상태 보기')
  await mark('vehicle-unknown-observations', ['V1'])
  await event('차량 감지 자료')
  await mark('vehicle-observations', ['V1'])
  await click('비상등을 켰어요')
  await mark('hazard-user-confirmed', ['V2'])
  await event('비상등 작동 확인')
  await mark('hazard-device-result', ['V2'])
  await click('대응 화면으로')
  await event('안내 지점 자료')
  await mark('evacuation-location', ['V2'])
  vehicleEnd = elapsed()
  await reviewControl('Mobile 보기', 'device-preview')
  const mobileUrl = page.url()
  raw = await page.video().path()
  await context.close()
  context = await launch({ width: 393, height: 852 })
  mobileBegan = elapsed()
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(mobileUrl)
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: recordingStyle })
  await saved()
  device = 'mobile'; mobileStart = elapsed()
  await mark('mobile-same-case', ['H1'])
  await click('사고 기록 남기기')
  await mark('voice-entry', ['R2'])
  await click('사진 남기기')
  await mark('photo-targets', ['R1'])
  await click('현장 전체 사진')
  await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles(new URL('../public/journey-samples/scene.png', import.meta.url).pathname)
  await expect(button('이 사진 사용')).toBeEnabled()
  await mark('photo-before-approval', ['R1'])
  await click('이 사진 사용')
  await expect(page.getByText('사진을 저장했어요.', { exact: true })).toBeVisible()
  await mark('photo-saved', ['R1'])
  await click('말로 남기기')
  await page.getByRole('combobox', { name: '음성 입력', exact: true, includeHidden: true }).selectOption('sample', { force: true })
  await click('말로 기록하기')
  await expect(page.getByLabel('사고 기록', { exact: true })).toContainText('정차 중 오른쪽')
  await mark('voice-review', ['R2'], 4)
  await click('기록 저장')
  await mark('voice-saved', ['R2'])
  await event('사고 자료 확보')
  await expect(page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true, includeHidden: true })).toBeEnabled()
  await click('내용 확인으로')
  await click('전방 영상 재생')
  await mark('front-clip-playing', ['R3'], 4)
  await click('사고 도식')
  await mark('diagram-original', ['C1'])
  await click('오른쪽으로 이동')
  await click('도식 정정 저장')
  await click('도식 내용 확인')
  await mark('diagram-corrected', ['C1'])
  await event('경위서 초안')
  await click('경위서')
  await mark('report-review', ['C2'], 4)
  const first = page.getByRole('article', { name: '문장 1', exact: true })
  await first.getByRole('button', { name: '근거 보기', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '문장의 근거', exact: true })).toBeVisible()
  await mark('report-evidence', ['C2', 'R3'], 4)
  await page.keyboard.press('Escape')
  for (const paragraph of await page.getByRole('article', { name: /^문장 \d+$/ }).all()) {
    await paragraph.getByRole('button', { name: '문장 확인', exact: true }).click()
    await expect(paragraph.getByText('내용 확인함', { exact: true })).toBeVisible()
    await hold(1)
  }
  await mark('report-confirmed', ['C2'])
  await click('보낼 내용 확인')
  await mark('empty-insurance-selection', ['S1'])
  const value = await saved()
  await request('검토한 보험사', ['전방 영상', value.evidence.find(item => item.kind === 'audio').label, '사고 도식', '경위서'])
  await mark('approval-waits-for-receipt', ['S1', 'S2'])
  await event('보험사 접수번호 확인')
  await expect(page.getByText('AC-20261110-001', { exact: true })).toBeVisible()
  await mark('insurance-receipt', ['S2'], 4)
  await click('상대방 공유')
  await page.getByLabel('수신처', { exact: true }).fill('상대 운전자')
  await select('전방 영상')
  await click('선택한 내용 미리보기')
  await mark('independent-share-preview', ['S2'])
  await click('이 내용으로 공유 요청')
  await event('상대방 공유 확인')
  await mark('independent-share-result', ['S2'])
  await navigate('후속 처리 보기')
  await mark('repair-shops', ['F1'])
  await click('가온 정비센터 선택')
  await select('앞 범퍼 외관')
  await click('선택한 항목 검토')
  await mark('repair-item-review', ['F1'])
  await click('검토 내용 저장')
  await click('경로 미리보기')
  await mark('repair-route-preview', ['F1'])
  await click('안내 시작')
  await click('대차 가능 여부 확인')
  await mark('rental-pending', ['F1'])
  await event('대차 가능 확인')
  await mark('rental-result', ['F1'], 4)

  await beginFixture('no-evidence')
  await click('사고 기록 남기기')
  await click('사진 남기기')
  await click('사진 없이 내용 확인')
  await click('경위서')
  await mark('no-evidence-no-fabricated-report', ['R1', 'R3', 'C2'], 3)
  await beginFixture('partial-evidence')
  await event('사고 자료 확보')
  await expect(page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true, includeHidden: true })).toBeEnabled()
  await click('사고 기록 남기기')
  await click('내용 확인으로')
  await expect(page.getByText('제공된 영상이 없어요', { exact: true })).toBeVisible()
  await mark('partial-rear-clip-unavailable', ['R3'], 3)
  await beginFixture('immobile')
  await mark('immobile-vehicle-support', ['V1', 'V2', 'S1'], 3)
  await navigate('후속 처리 보기')
  await page.getByRole('combobox', { name: '정비소 정보', exact: true, includeHidden: true }).selectOption('failed', { force: true })
  await mark('shop-lookup-failed', ['F1'], 3)
  await click('대차 가능 여부 확인')
  await event('대차 결과 미확인')
  await mark('rental-unknown', ['F1'], 3)
  await beginFixture('insurance-declined')
  await mark('insurance-declined', ['S1', 'S2'], 3)
  await beginFixture('suspended-receipt')
  await mark('suspended-with-existing-requests', ['H1', 'S2'], 3)
  await event('차량 지원 접수 확인')
  await mark('result-during-suspension', ['S2'], 3)
  const suspendedRequests = (await saved()).submissions
  await click('이어서 확인하기')
  await expect(page.getByRole('heading', { name: '차량 지원 접수 확인', exact: true })).toBeVisible()
  assert.equal((await saved()).suspended, false)
  assert.deepEqual((await saved()).submissions, suspendedRequests)
  await mark('resumed-without-resending', ['H1', 'S2'], 3)
  await beginFixture('late-result')
  await mark('unknown-existing-request', ['S1', 'S2'], 3)
  await event('차량 지원 미접수 확인')
  await mark('explicit-nonreceipt', ['S1', 'S2'], 3)
  await click('요청 범위 다시 확인')
  await click('보낼 내용 확인')
  await click('차량 지원')
  await page.getByLabel('수신처', { exact: true }).fill('선택한 차량 지원 기관')
  await page.locator('.journey-submission input[type=checkbox]:visible').first().check()
  await click('선택한 내용 미리보기')
  await mark('fresh-approval-after-nonreceipt', ['S1'])
  await click('이 내용으로 요청')
  await mark('new-request-is-not-a-receipt', ['S2'])
  await beginFixture('unanswered')
  await mark('unanswered-countdown', ['V1', 'V2'], 1)
  await expect(page.getByRole('button', { name: '시연 event: 통화 연결 확인', exact: true, includeHidden: true })).toHaveCount(1, { timeout: 15000 })
  await mark('unanswered-contact-attempt', ['V2'], 3)
  await event('통화 연결 확인')
  await mark('late-call-result-not-receipt', ['V2', 'S2'], 4)
  finished = elapsed()
  mobileRaw = await page.video().path()
  assert.deepEqual(errors, [], 'No browser runtime errors')
  assert.deepEqual([...new Set(timeline.map(item => item.fixture))].sort(), fixtures.cases.map(item => item.id).sort())
  assert.deepEqual([...new Set(timeline.flatMap(item => item.coverage))].sort(), fixtures.cases[0].coverage.toSorted())
} finally {
  await context.close()
}

function encode(args) {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })
    process.on('error', reject); process.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)))
  })
}
const vehicleFile = join(temp, 'vehicle.mp4'), mobileFile = join(temp, 'mobile.mp4')
const codec = ['-an', '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p']
console.log('ENCODING vehicle and mobile views')
await encode(['-ss', String(trim), '-i', raw, '-t', String(vehicleEnd - trim), '-vf', 'setsar=1', ...codec, vehicleFile])
await encode(['-ss', String(mobileStart - mobileBegan), '-i', mobileRaw, '-t', String(finished - mobileStart), '-vf', 'scale=-2:1440,pad=2560:1440:(ow-iw)/2:0:color=0x0B0C0E,setsar=1', ...codec, mobileFile])
const list = join(temp, 'concat.txt')
writeFileSync(list, `file '${vehicleFile}'\nfile '${mobileFile}'\n`)
await encode(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output])
const probe = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate', '-of', 'json', file], { encoding: 'utf8' }))
const result = probe(output), vehicleDuration = Number(probe(vehicleFile).format.duration)
assert.equal(result.streams.length, 1)
assert.equal(result.streams[0].width, 2560)
assert.equal(result.streams[0].height, 1440)
assert.ok(Number(result.format.duration) > 90)
const time = item => item.device === 'vehicle' ? item.atRaw - trim : vehicleDuration + item.atRaw - mobileStart
writeFileSync(metadataPath, JSON.stringify({ output, sourceCommit, simulationOnly: true, audio: false, raw, mobileRaw, trim, vehicleEnd, mobileBegan, mobileStart, finished,
  composition: 'Actual browser footage. Vehicle then mobile. Same persistent browser profile reopened at each native viewport; setup omitted. Portrait footage scaled and centered.',
  limitations: ['Same-browser device preview, not device synchronization', 'Authored media and explicit external result events, no agency requests', 'Voice sample, not live STT or JaeGyu TTS', 'Late historical callbacks, denied permissions and quota errors are covered by tests, not all shown in this video'],
  timeline: timeline.map(item => ({ ...item, at: time(item) })), actions: actions.map(item => ({ ...item, at: time(item) })),
  fixtureCoverage: fixtures.cases.map(item => ({ id: item.id, scenes: timeline.filter(scene => scene.fixture === item.id).map(scene => scene.id) })),
  features: [...new Set(timeline.flatMap(item => item.coverage))], probe: result, errors,
}, null, 2))
console.log(JSON.stringify({ output, metadataPath, duration: result.format.duration, scenes: timeline.length, fixtures: fixtures.cases.length }))
