export type VoiceCapture = { stop: () => Promise<Blob>; cancel: () => void; finished: Promise<Blob> }

export function startVoiceCapture(stream: MediaStream, onLevel: (level: number) => void): VoiceCapture {
  let context: AudioContext | undefined
  let recorder: MediaRecorder
  let frame = 0
  const release = () => {
    cancelAnimationFrame(frame)
    stream.getTracks().forEach(track => track.stop())
    if (context && context.state !== 'closed') void context.close().catch(() => {})
    onLevel(0)
  }
  try {
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type))
    if (!mime) throw new Error('Supported audio format unavailable')
    recorder = new MediaRecorder(stream, { mimeType: mime })
    context = new AudioContext()
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    context.createMediaStreamSource(stream).connect(analyser)
    const samples = new Uint8Array(analyser.fftSize)
    const meter = () => {
      analyser.getByteTimeDomainData(samples)
      const energy = samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0)
      onLevel(Math.min(1, Math.sqrt(energy / samples.length) * 4))
      frame = requestAnimationFrame(meter)
    }
    void context.resume().catch(() => {})
    frame = requestAnimationFrame(meter)
  } catch (error) { release(); throw error }

  const chunks: Blob[] = []
  let cancelled = false
  let stopped = false
  const result = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    recorder.onstop = () => {
      release()
      const blob = new Blob(chunks, { type: recorder.mimeType })
      if (cancelled) reject(new DOMException('Recording cancelled', 'AbortError'))
      else if (!blob.size) reject(new Error('Empty recording'))
      else resolve(blob)
    }
    recorder.onerror = () => { stopped = true; release(); reject(new Error('Recording failed')) }
  })
  void result.catch(() => {})
  try { recorder.start(250) } catch (error) { release(); throw error }
  const stop = () => {
    if (!stopped) {
      stopped = true
      if (recorder.state !== 'inactive') recorder.stop()
      release()
    }
    return result
  }
  return { stop, cancel: () => { cancelled = true; void stop() }, finished: result }
}
