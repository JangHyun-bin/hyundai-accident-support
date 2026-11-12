import { test, expect, type Page } from '@playwright/test'
import { attachRecorderDiagnostics, attachReviewedRecording, observeVoiceRecorder, waitForRecorderData } from './helpers/voice-recorder'
import type * as CaseStore from '../src/journey/case-store'

declare global {
  interface Window { voiceTestTracks: MediaStreamTrack[]; voiceTestDenied: boolean; voiceTestSpeechCancelled: boolean; voiceTestRestoreSave: () => void; voiceTestPermission: () => void }
}

async function fakeMicrophone(page: Page, denied = false, { holdAudio = false }: { holdAudio?: boolean } = {}) {
  await observeVoiceRecorder(page)
  await page.addInitScript(({ denied, holdAudio }) => {
    window.voiceTestTracks = []
    window.voiceTestDenied = denied
    window.voiceTestSpeechCancelled = false
    const originalCancel = speechSynthesis.cancel.bind(speechSynthesis)
    speechSynthesis.cancel = () => { window.voiceTestSpeechCancelled = true; originalCancel() }
    navigator.mediaDevices.getUserMedia = async () => {
      if (window.voiceTestDenied) throw new DOMException('denied', 'NotAllowedError')
      const context = new AudioContext()
      if (holdAudio) await context.suspend()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      gain.gain.value = .2
      const destination = context.createMediaStreamDestination()
      oscillator.connect(gain).connect(destination)
      oscillator.start()
      const track = destination.stream.getAudioTracks()[0]
      const stop = track.stop.bind(track)
      track.stop = () => { if (track.readyState === 'ended') return; stop(); oscillator.stop(); void context.close() }
      window.voiceRecorderProbe.contexts.push(context)
      if (!holdAudio) await context.resume()
      window.voiceTestTracks.push(track)
      return destination.stream
    }
  }, { denied, holdAudio })
}

async function begin(page: Page) {
  await page.goto('/?study=journey&fixture=partial-evidence&device=mobile')
  await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  await page.getByRole('button', { name: '사고 기록 남기기', exact: true }).click()
  await expect(page.getByRole('button', { name: '말로 기록하기', exact: true })).toBeVisible()
}

test('denied microphone offers direct input and preserves a 5000-character statement', async ({ page }) => {
  await fakeMicrophone(page, true)
  await begin(page)
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect(page.getByText('마이크를 사용할 수 없어요. 직접 입력으로 기록을 남길 수 있어요.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '직접 입력', exact: true }).click()
  const input = page.getByRole('textbox', { name: '사고 기록', exact: true })
  await input.fill('가'.repeat(5000))
  await input.press('End')
  await input.pressSequentially('나')
  await expect(input).toHaveValue('가'.repeat(5000))
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toHaveValue('가'.repeat(5000))
})

test('real recording cancels speech, meters audio, stops tracks and never invents a transcript', async ({ page }) => {
  await fakeMicrophone(page)
  await begin(page)
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect(page.getByRole('button', { name: '말하기 마치기', exact: true })).toBeVisible()
  await expect.poll(() => page.locator('[data-voice-level]').getAttribute('data-voice-level').then(Number)).toBeGreaterThan(0)
  await waitForRecorderData(page)
  await page.getByRole('button', { name: '말하기 마치기', exact: true }).click()
  await expect(page.getByText('음성은 남겼어요. 내용을 직접 입력할 수 있어요.', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toHaveValue('')
  expect(await page.evaluate(() => window.voiceTestSpeechCancelled)).toBe(true)
  expect(await page.evaluate(() => window.voiceTestTracks.every(t => t.readyState === 'ended'))).toBe(true)
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('.journey-voice audio')).toHaveCount(1)
})

test('actual MediaRecorder WebM can be reviewed and approved without trusting its infinite native duration', async ({ page }) => {
  await fakeMicrophone(page)
  await begin(page)
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect(page.getByRole('button', { name: '말하기 마치기', exact: true })).toBeVisible()
  await waitForRecorderData(page, 0, 2)
  await page.getByRole('button', { name: '말하기 마치기', exact: true }).click()
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  expect(await page.locator('.journey-voice audio').evaluate((node: HTMLAudioElement) => String(node.duration))).toBe('Infinity')
  const opened = await page.evaluate(async () => {
    const storePath = '/src/journey/case-store.ts', mediaPath = '/src/journey/evidence-media.ts'
    const { loadCase } = await import(/* @vite-ignore */ storePath) as typeof import('../src/journey/case-store')
    const { openEvidence } = await import(/* @vite-ignore */ mediaPath) as typeof import('../src/journey/evidence-media')
    const value = (await loadCase(new URL(location.href).searchParams.get('case')!))!
    const evidence = value.evidence.find(item => item.kind === 'audio')!
    try {
      await openEvidence(value.id, evidence)
      await openEvidence(value.id, evidence, { evidenceId: evidence.id, evidenceRevision: evidence.revision, start: 0, end: .2 })
      try {
        await openEvidence(value.id, evidence, { evidenceId: evidence.id, evidenceRevision: evidence.revision, start: 0, end: 1000 })
        return 'accepted invalid range'
      } catch { return 'valid audio and bounded range' }
    } catch (error) { return String(error) }
  })
  expect(opened).toBe('valid audio and bounded range')
  await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
  await page.getByRole('button', { name: '보낼 내용 확인', exact: true }).click()
  await page.getByLabel('수신처', { exact: true }).fill('선택한 보험사')
  await page.getByRole('checkbox', { name: '직접 남긴 음성', exact: true }).check()
  await page.getByRole('button', { name: '선택한 내용 미리보기', exact: true }).click()
  await page.getByRole('button', { name: '이 내용으로 요청', exact: true }).click()
  await expect(page.getByText('승인한 내용이 보관됐어요', { exact: true })).toBeVisible()
})

test('extra recording permission failure preserves the previous statement', async ({ page }) => {
  await fakeMicrophone(page)
  await begin(page)
  await page.getByRole('button', { name: '직접 입력', exact: true }).click()
  await page.getByRole('textbox', { name: '사고 기록', exact: true }).fill('오른쪽에서 충격을 느꼈어요.')
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  await page.evaluate(() => { window.voiceTestDenied = true })
  await page.getByRole('button', { name: '추가로 말하기', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toHaveValue('오른쪽에서 충격을 느꼈어요.')
  await expect(page.getByText('마이크를 사용할 수 없어요. 직접 입력으로 기록을 남길 수 있어요.', { exact: true })).toBeVisible()
})

test('urgent interruption stops recording without blocking response or discarding the audio draft', async ({ page }) => {
  await fakeMicrophone(page)
  await begin(page)
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect(page.getByRole('button', { name: '말하기 마치기', exact: true })).toBeVisible()
  await expect.poll(() => page.locator('[data-voice-level]').getAttribute('data-voice-level').then(Number)).toBeGreaterThan(0)
  await waitForRecorderData(page)
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response', { timeout: 400 })
  await expect.poll(() => page.evaluate(() => window.voiceTestTracks.every(t => t.readyState === 'ended'))).toBe(true)
  await page.getByRole('button', { name: '기록으로 돌아가기', exact: true }).click()
  await expect(page.locator('.journey-voice audio')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '기록 저장', exact: true })).toBeEnabled()
})

test('maximum duration stops at review and pagehide releases microphone tracks', async ({ page }, testInfo) => {
  await fakeMicrophone(page)
  await begin(page)
  try {
    await page.clock.install()
    await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
    await expect(page.locator('[data-voice-phase]')).toHaveAttribute('data-voice-phase', 'listening')
    // Advancing application timers cannot produce native AudioContext/MediaRecorder frames.
    await waitForRecorderData(page)
    await page.evaluate(() => window.voiceRecorderProbe.mark('before-maximum-duration'))
    await page.clock.fastForward(120100)
    await expect(page.locator('[data-voice-phase]')).toHaveAttribute('data-voice-phase', 'review')
    await expect(page.getByRole('button', { name: '기록 저장', exact: true })).toBeEnabled()
    await expect(page.getByText('기록을 저장했어요.', { exact: true })).toHaveCount(0)
    await expect(page.locator('.journey-voice audio')).toHaveCount(1)
    expect(await page.evaluate(() => window.voiceTestTracks.every(track => track.readyState === 'ended'))).toBe(true)
    const reviewed = await attachReviewedRecording(page, testInfo)
    expect(reviewed.bytes).toBeGreaterThan(0)
    expect(reviewed.decoded.frames).toBeGreaterThan(0)
    expect(reviewed.decoded.duration).toBeGreaterThan(0)
    const completed = await page.evaluate(() => {
      const recording = window.voiceRecorderProbe.recordings[0]
      return { stopCalls: recording.stopCalls, events: recording.events.map(event => ({ kind: event.kind, bytes: event.bytes })) }
    })
    expect(completed.stopCalls, 'timer stop and finished callback must share one native stop').toBe(1)
    const firstAudio = completed.events.findIndex(event => event.kind === 'dataavailable' && (event.bytes ?? 0) > 0)
    const stop = completed.events.findIndex(event => event.kind === 'stop-call')
    expect(firstAudio).toBeGreaterThanOrEqual(0)
    expect(stop).toBeGreaterThan(firstAudio)
    expect(completed.events.at(-1)?.kind).toBe('stop')
    const durableAudio = await page.evaluate(async () => {
      // Import in the browser to inspect this page's IndexedDB rather than the runner's environment.
      const path = '/src/journey/case-store.ts'
      const { loadCase } = await import(/* @vite-ignore */ path) as typeof CaseStore
      const value = (await loadCase(new URL(location.href).searchParams.get('case')!))!
      return value.evidence.filter(evidence => evidence.kind === 'audio').length
    })
    expect(durableAudio, 'maximum duration must retain a draft, not automatically save it').toBe(0)
    await page.getByRole('button', { name: '추가로 말하기', exact: true }).click()
    await expect(page.locator('[data-voice-phase]')).toHaveAttribute('data-voice-phase', 'listening')
    await waitForRecorderData(page, 1)
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    await expect(page.locator('[data-voice-phase]')).toHaveAttribute('data-voice-phase', 'review')
    await expect.poll(() => page.evaluate(() => window.voiceTestTracks.every(track => track.readyState === 'ended'))).toBe(true)
    await expect(page.locator('.journey-voice audio')).toHaveCount(2)
    await expect(page.getByText('기록을 저장했어요.', { exact: true })).toHaveCount(0)
  } finally {
    await attachRecorderDiagnostics(page, testInfo)
  }
})

test('maximum duration waits for native audio when the source is held beyond the former 350ms assumption', async ({ page }, testInfo) => {
  await fakeMicrophone(page, false, { holdAudio: true })
  await begin(page)
  try {
    await page.clock.install()
    await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
    await expect(page.locator('[data-voice-phase]')).toHaveAttribute('data-voice-phase', 'listening')
    const sourceTime = await page.evaluate(() => window.voiceRecorderProbe.contexts[0].currentTime)
    // Reproduce only the former assumption's threshold while a real source is deliberately suspended.
    // This is not a readiness wait: only resuming the source and observing encoded data permits the stop below.
    await page.waitForTimeout(350)
    await page.clock.fastForward(350)
    const held = await page.evaluate(initialTime => ({
      sourceSuspended: window.voiceRecorderProbe.contexts[0].state === 'suspended',
      sourceDidNotAdvance: window.voiceRecorderProbe.contexts[0].currentTime === initialTime,
      recording: window.voiceRecorderProbe.recordings[0].recorder.state,
      tracksLive: window.voiceTestTracks.every(track => track.readyState === 'live'),
    }), sourceTime)
    expect(held).toEqual({ sourceSuspended: true, sourceDidNotAdvance: true, recording: 'recording', tracksLive: true })
    await attachRecorderDiagnostics(page, testInfo, 'held-source-after-legacy-threshold')
    await page.evaluate(() => window.voiceRecorderProbe.contexts[0].resume())
    await waitForRecorderData(page)
    await page.evaluate(() => window.voiceRecorderProbe.mark('before-maximum-duration'))
    await page.clock.fastForward(120100)
    await expect(page.locator('[data-voice-phase]')).toHaveAttribute('data-voice-phase', 'review')
    await expect(page.getByRole('button', { name: '기록 저장', exact: true })).toBeEnabled()
    const reviewed = await attachReviewedRecording(page, testInfo)
    expect(reviewed.bytes).toBeGreaterThan(0)
    expect(reviewed.decoded.frames).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.voiceTestTracks.every(track => track.readyState === 'ended'))).toBe(true)
    await expect(page.getByText('기록을 저장했어요.', { exact: true })).toHaveCount(0)
  } finally {
    await attachRecorderDiagnostics(page, testInfo)
  }
})

test('capture stop is repeatable and unsupported MIME releases tracks', async ({ page }) => {
  await fakeMicrophone(page)
  await page.goto('/?study=journey-catalog')
  const result = await page.evaluate(async () => {
    const path = '/src/journey/voice-capture.ts'
    const { startVoiceCapture } = await import(/* @vite-ignore */ path) as typeof import('../src/journey/voice-capture')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const originalStart = MediaRecorder.prototype.start
    let encoded!: () => void
    const firstChunk = new Promise<void>(resolve => { encoded = resolve })
    MediaRecorder.prototype.start = function (timeslice?: number) {
      this.addEventListener('dataavailable', event => { if (event.data.size) encoded() })
      originalStart.call(this, timeslice)
    }
    let maximum = 0
    const capture = startVoiceCapture(stream, level => { maximum = Math.max(level, maximum) })
    MediaRecorder.prototype.start = originalStart
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([firstChunk, new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Audio encoder produced no data within 5 seconds')), 5000)
      })])
    } finally { clearTimeout(timeout) }
    const first = await capture.stop()
    const second = await capture.stop()
    const unsupported = await navigator.mediaDevices.getUserMedia({ audio: true })
    MediaRecorder.isTypeSupported = () => false
    let rejected = false
    try { startVoiceCapture(unsupported, () => {}) } catch { rejected = true }
    return { same: first === second, bytes: first.size, mime: first.type, maximum, rejected, ended: window.voiceTestTracks.every(track => track.readyState === 'ended') }
  })
  expect(result.same).toBe(true)
  expect(result.bytes).toBeGreaterThan(0)
  expect(result.mime).toContain('audio/')
  expect(result.maximum).toBeGreaterThan(0)
  expect(result.rejected).toBe(true)
  expect(result.ended).toBe(true)
})

test('cancelling a recording releases tracks and leaves no new audio', async ({ page }) => {
  await fakeMicrophone(page)
  await begin(page)
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect(page.getByRole('button', { name: '말하기 마치기', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '녹음 취소', exact: true }).click()
  await expect(page.getByRole('button', { name: '말로 기록하기', exact: true })).toBeVisible()
  await expect(page.locator('.journey-voice audio')).toHaveCount(0)
  expect(await page.evaluate(() => window.voiceTestTracks.every(track => track.readyState === 'ended'))).toBe(true)
})

test('failed save keeps audio and text through urgent response and can retry once', async ({ page }) => {
  await fakeMicrophone(page)
  await begin(page)
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect.poll(() => page.locator('[data-voice-level]').getAttribute('data-voice-level').then(Number)).toBeGreaterThan(0)
  await waitForRecorderData(page)
  await page.getByRole('button', { name: '말하기 마치기', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: '사고 기록', exact: true }).fill('충격을 느꼈지만 정확한 방향은 몰라요.')
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'cases') throw new DOMException('test storage limit', 'QuotaExceededError')
      return put.apply(this, args)
    }
    window.voiceTestRestoreSave = () => { IDBObjectStore.prototype.put = put }
  })
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('저장하지 못했어요. 음성과 입력 내용은 이 화면에 남아 있어요.', { exact: true })).toBeVisible()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  await page.getByRole('button', { name: '기록으로 돌아가기', exact: true }).click()
  await expect(page.locator('.journey-voice audio')).toHaveCount(1)
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toHaveValue('충격을 느꼈지만 정확한 방향은 몰라요.')
  await page.evaluate(() => window.voiceTestRestoreSave())
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('.journey-voice audio')).toHaveCount(1)
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toHaveValue('충격을 느꼈지만 정확한 방향은 몰라요.')
})

test('a text-only save failure keeps the draft and never shows saved', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: '직접 입력', exact: true }).click()
  await page.getByRole('textbox', { name: '사고 기록', exact: true }).fill('정차 중 충격을 느꼈어요.')
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'cases') throw new DOMException('test storage limit', 'QuotaExceededError')
      return put.apply(this, args)
    }
    window.voiceTestRestoreSave = () => { IDBObjectStore.prototype.put = put }
  })
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('저장하지 못했어요. 음성과 입력 내용은 이 화면에 남아 있어요.', { exact: true })).toBeVisible()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toHaveValue('정차 중 충격을 느꼈어요.')
  await page.evaluate(() => window.voiceTestRestoreSave())
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
})

test('sample mode pairs its authored audio with the matching transcript', async ({ page }) => {
  await begin(page)
  await page.getByRole('combobox', { name: '음성 입력', exact: true }).selectOption('sample')
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toHaveValue('정차 중 오른쪽에서 충격을 느꼈어요. 정확한 사고 경위는 확인 중이에요.')
  await expect(page.locator('.journey-voice audio')).toHaveCount(1)
  await expect.poll(() => page.locator('.journey-voice audio').evaluate((audio: HTMLAudioElement) => audio.duration)).toBeGreaterThan(8)
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
})

test('microphone ending unexpectedly exits listening and retains captured audio', async ({ page }) => {
  await fakeMicrophone(page)
  await begin(page)
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect.poll(() => page.locator('[data-voice-level]').getAttribute('data-voice-level').then(Number)).toBeGreaterThan(0)
  await waitForRecorderData(page)
  await page.evaluate(() => window.voiceTestTracks.forEach(track => track.stop()))
  await expect(page.getByRole('button', { name: '말하기 마치기', exact: true })).toHaveCount(0)
  await expect(page.locator('.journey-voice audio')).toHaveCount(1)
})

test('late microphone permission after an urgent event cannot start a hidden recording', async ({ page }) => {
  await fakeMicrophone(page)
  await begin(page)
  await page.evaluate(() => {
    const get = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async constraints => {
      await new Promise<void>(resolve => { window.voiceTestPermission = resolve })
      return get(constraints)
    }
  })
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect(page.getByRole('button', { name: '음성 기록 준비 중', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await page.evaluate(() => window.voiceTestPermission())
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  await expect.poll(() => page.evaluate(() => window.voiceTestTracks.length === 1 && window.voiceTestTracks[0].readyState === 'ended')).toBe(true)
  await page.getByRole('button', { name: '기록으로 돌아가기', exact: true }).click()
  await expect(page.getByRole('button', { name: '말로 기록하기', exact: true })).toBeVisible()
  await expect(page.locator('.journey-voice audio')).toHaveCount(0)
})

test('pending audio save does not delay urgent response or restore the earlier stage', async ({ page }) => {
  await fakeMicrophone(page)
  await begin(page)
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  await expect.poll(() => page.locator('[data-voice-level]').getAttribute('data-voice-level').then(Number)).toBeGreaterThan(0)
  await waitForRecorderData(page)
  await page.getByRole('button', { name: '말하기 마치기', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: '사고 기록', exact: true }).fill('정차한 상태였어요.')
  await page.evaluate(() => {
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { configurable: true, get: descriptor.get,
      set(handler) { descriptor.set!.call(this, function (this: IDBTransaction, event: Event) { setTimeout(() => handler.call(this, event), 800) }) } })
  })
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response', { timeout: 400 })
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  await page.getByRole('button', { name: '기록으로 돌아가기', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toHaveValue('정차한 상태였어요.')
  await expect(page.locator('.journey-voice audio')).toHaveCount(1)
})

test('voice playback pauses when urgent response hides the record', async ({ page }) => {
  await begin(page)
  await page.getByRole('combobox', { name: '음성 입력', exact: true }).selectOption('sample')
  await page.getByRole('button', { name: '말로 기록하기', exact: true }).click()
  const audio = page.locator('.journey-voice audio')
  await audio.evaluate((node: HTMLAudioElement) => node.play())
  expect(await audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(false)
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(true)
})

test('an emptied new draft can be cancelled so the user can leave without saving', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: '직접 입력', exact: true }).click()
  await page.getByRole('textbox', { name: '사고 기록', exact: true }).fill('지울 내용')
  await page.getByRole('textbox', { name: '사고 기록', exact: true }).fill('')
  await page.getByRole('button', { name: '입력 취소', exact: true }).click()
  await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'review')
})

test('discarding extra audio and edits preserves the saved statement', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: '직접 입력', exact: true }).click()
  await page.getByRole('textbox', { name: '사고 기록', exact: true }).fill('이전에 확인한 기록')
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: '음성 입력', exact: true }).selectOption('sample')
  await page.getByRole('button', { name: '추가로 말하기', exact: true }).click()
  await expect(page.locator('.journey-voice audio')).toHaveCount(1)
  await page.getByRole('button', { name: '입력 취소', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '사고 기록', exact: true })).toHaveValue('이전에 확인한 기록')
  await expect(page.locator('.journey-voice audio')).toHaveCount(0)
  await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'review')
})
