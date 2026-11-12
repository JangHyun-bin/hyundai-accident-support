import { expect, type Page, type TestInfo } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

type RecorderEvent = {
  kind: string
  realMilliseconds: number
  applicationMilliseconds: number
  phase: string | null
  visibility: DocumentVisibilityState
  bytes?: number
  state?: RecordingState
}
type RecorderProbe = {
  contexts: AudioContext[]
  recordings: { recorder: MediaRecorder; chunks: Blob[]; events: RecorderEvent[]; stopCalls: number }[]
  events: RecorderEvent[]
  mark: (kind: string) => void
  snapshot: () => unknown
}

declare global {
  interface Window { voiceRecorderProbe: RecorderProbe }
}

// Observe native encoding without substituting its constructor, stream, events or bytes.
export async function observeVoiceRecorder(page: Page) {
  await page.addInitScript(() => {
    const realNow = performance.now.bind(performance)
    const event = (kind: string, detail: Partial<RecorderEvent> = {}): RecorderEvent => ({
      kind, realMilliseconds: realNow(), applicationMilliseconds: Date.now(),
      phase: document.querySelector('[data-voice-phase]')?.getAttribute('data-voice-phase') ?? null,
      visibility: document.visibilityState, ...detail,
    })
    const probe: RecorderProbe = {
      contexts: [], recordings: [], events: [],
      mark: kind => { probe.events.push(event(kind)) },
      snapshot: () => ({
        ui: {
          phase: document.querySelector('[data-voice-phase]')?.getAttribute('data-voice-phase') ?? null,
          message: document.querySelector('.journey-voice-message')?.textContent ?? null,
          clips: document.querySelectorAll('.journey-voice audio').length,
        },
        events: probe.events,
        sources: probe.contexts.map(context => ({ state: context.state, seconds: context.currentTime })),
        recordings: probe.recordings.map(recording => ({
          mime: recording.recorder.mimeType, state: recording.recorder.state, stopCalls: recording.stopCalls,
          chunks: recording.chunks.map(chunk => ({ bytes: chunk.size, mime: chunk.type })),
          tracks: recording.recorder.stream.getTracks().map(track => ({ kind: track.kind, readyState: track.readyState, muted: track.muted })),
          events: recording.events,
        })),
      }),
    }
    window.voiceRecorderProbe = probe
    const start = MediaRecorder.prototype.start
    const stop = MediaRecorder.prototype.stop
    MediaRecorder.prototype.start = function (timeslice?: number) {
      const recording = { recorder: this, chunks: [] as Blob[], events: [event('start-call', { state: this.state })], stopCalls: 0 }
      probe.recordings.push(recording)
      this.addEventListener('start', () => recording.events.push(event('start', { state: this.state })))
      this.addEventListener('dataavailable', data => {
        if (data.data.size) recording.chunks.push(data.data)
        recording.events.push(event('dataavailable', { bytes: data.data.size, state: this.state }))
      })
      this.addEventListener('stop', () => recording.events.push(event('stop', { state: this.state })))
      this.addEventListener('error', () => recording.events.push(event('error', { state: this.state })))
      return start.call(this, timeslice)
    }
    MediaRecorder.prototype.stop = function () {
      const recording = probe.recordings.find(item => item.recorder === this)
      if (recording) {
        recording.stopCalls += 1
        recording.events.push(event('stop-call', { state: this.state }))
      }
      return stop.call(this)
    }
    document.addEventListener('visibilitychange', () => probe.mark('visibilitychange'))
    window.addEventListener('pagehide', () => probe.mark('pagehide'))
    new MutationObserver(mutations => {
      if (mutations.some(mutation => mutation.type === 'attributes')) probe.mark('phase-change')
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-voice-phase'] })
  })
}

// Playwright's polling uses the runner clock; real encoder callbacks continue even with page.clock installed.
export async function waitForRecorderData(page: Page, recording = 0, chunks = 1) {
  await expect.poll(() => page.evaluate(({ recording, chunks }) => {
    const current = window.voiceRecorderProbe.recordings[recording]
    return !!current && current.recorder.state === 'recording' && current.chunks.length >= chunks
      && current.recorder.stream.getAudioTracks().some(track => track.readyState === 'live' && !track.muted)
      && window.voiceRecorderProbe.contexts.some(context => context.state === 'running' && context.currentTime > 0)
  }, { recording, chunks }), 'native recorder must encode non-empty audio before a controlled stop').toBe(true)
  await page.evaluate(() => window.voiceRecorderProbe.mark('encoded-audio-ready'))
}

export async function attachRecorderDiagnostics(page: Page, testInfo: TestInfo) {
  if (page.isClosed()) return
  const snapshot = await page.evaluate(() => window.voiceRecorderProbe.snapshot())
  const path = testInfo.outputPath('recorder-timeline.json')
  await writeFile(path, JSON.stringify(snapshot, null, 2))
  await testInfo.attach('recorder-timeline', { path, contentType: 'application/json' })
}

export async function attachReviewedRecording(page: Page, testInfo: TestInfo) {
  const reviewed = await page.locator('.journey-voice audio').evaluate(async (audio: HTMLAudioElement) => {
    const blob = await (await fetch(audio.src)).blob()
    const bytes = await blob.arrayBuffer()
    const context = new AudioContext()
    let decoded: { duration: number; frames: number; channels: number; sampleRate: number } | null = null
    let decodeError: string | null = null
    try {
      const buffer = await context.decodeAudioData(bytes.slice(0))
      decoded = { duration: buffer.duration, frames: buffer.length, channels: buffer.numberOfChannels, sampleRate: buffer.sampleRate }
    } catch (error) { decodeError = String(error) }
    finally { await context.close() }
    return { bytes: Array.from(new Uint8Array(bytes)), mime: blob.type, nativeDuration: String(audio.duration), decoded, decodeError }
  })
  const path = testInfo.outputPath('maximum-duration-recording.webm')
  await writeFile(path, new Uint8Array(reviewed.bytes))
  await testInfo.attach('maximum-duration-recording', { path, contentType: reviewed.mime })
  const { bytes, ...metadata } = reviewed
  await testInfo.attach('reviewed-recording', { body: JSON.stringify({ ...metadata, bytes: bytes.length }, null, 2), contentType: 'application/json' })
  if (!reviewed.decoded) throw new Error(`Native recording could not be decoded: ${reviewed.decodeError}`)
  return { mime: reviewed.mime, nativeDuration: reviewed.nativeDuration, bytes: bytes.length, decoded: reviewed.decoded }
}
