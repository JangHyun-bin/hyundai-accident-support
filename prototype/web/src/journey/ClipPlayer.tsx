import { useEffect, useId, useRef, useState } from 'react'
import { Film, Pause, Play } from 'lucide-react'
import { JourneyStatus } from './JourneyLayout'
import type { Evidence } from './case'
import './reconstruction.css'

type ClipRange = { start: number; end: number }
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const validRange = (range: ClipRange, duration: number) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.start >= 0 && range.end > range.start && range.start < duration && range.end <= duration

export function ClipPlayer({ evidence, blob, range, active = true }: { evidence: Evidence; blob: Blob | null; range?: ClipRange; active?: boolean }) {
  const titleId = useId()
  const media = useRef<HTMLVideoElement>(null)
  const [url, setUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [frameReady, setFrameReady] = useState(false)
  const [error, setError] = useState('')
  const [selection, setSelection] = useState<ClipRange>({ start: 0, end: 0 })
  const endAt = useRef<number | null>(null)
  const rangeInvalid = duration > 0 && !!range && !validRange(range, duration)
  const status = evidence.availability
  const eventTime = evidence.metadata.eventTime
  const marker = typeof eventTime === 'number' && eventTime >= 0 && eventTime <= duration ? eventTime : null

  useEffect(() => {
    setDuration(0); setCurrent(0); setPlaying(false); setFrameReady(false); setError(''); endAt.current = null
    if (!blob || status !== 'available') { setUrl(''); return }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob, evidence.assetId, status])

  useEffect(() => {
    if (!duration || !range || !validRange(range, duration)) return
    setSelection({ start: range.start, end: range.end })
    try { if (media.current) { media.current.currentTime = range.start; setCurrent(range.start) } }
    catch { setError('영상의 해당 위치로 이동하지 못했어요') }
  }, [duration, range?.start, range?.end])

  useEffect(() => {
    const stop = () => media.current?.pause()
    window.addEventListener('pagehide', stop)
    return () => window.removeEventListener('pagehide', stop)
  }, [])

  useEffect(() => {
    if (!active) { media.current?.pause(); endAt.current = null }
  }, [active])

  async function play(selected = false) {
    const node = media.current
    if (!node || !duration || !active) return
    if (playing && !selected) { node.pause(); endAt.current = null; return }
    if (selected && !validRange(selection, duration)) return
    try {
      if (selected) { node.currentTime = selection.start; endAt.current = selection.end }
      else { endAt.current = null; if (node.currentTime >= duration) node.currentTime = 0 }
      await node.play()
    } catch { setError('영상을 재생할 수 없어요') }
  }

  function seek(seconds: number) {
    if (!media.current || !duration || !Number.isFinite(seconds)) return
    try { media.current.currentTime = Math.max(0, Math.min(duration, seconds)); setCurrent(media.current.currentTime); endAt.current = null }
    catch { setError('영상의 해당 위치로 이동하지 못했어요') }
  }

  const absent = status === 'pending' ? '영상을 보관하고 있어요' : status === 'failed' ? '영상을 확보하지 못했어요'
    : status === 'skipped' ? '이 영상은 생략했어요' : status === 'unavailable' ? '제공된 영상이 없어요' : !blob ? '영상 파일을 열 수 없어요' : null

  return <section className="journey-clip" aria-labelledby={titleId}>
    <div className="journey-clip-heading"><h3 id={titleId}>{evidence.label}</h3><JourneyStatus tone={status === 'available' && blob && !error ? 'confirmed' : status === 'pending' ? 'pending' : status === 'failed' || error ? 'failed' : 'unknown'}>
      {error ? '재생 불가' : status === 'available' && blob ? '확보됨' : status === 'pending' ? '저장 중' : status === 'skipped' ? '생략' : '확보 못함'}
    </JourneyStatus></div>
    {absent ? <div className="journey-clip-empty"><Film aria-hidden="true" /><p>{absent}</p></div> : <>
      <div className="journey-clip-picture"><video ref={media} key={url} src={url || undefined} playsInline preload="auto" aria-label={evidence.label}
        onLoadedMetadata={event => {
          const length = event.currentTarget.duration
          if (!Number.isFinite(length) || length <= 0) { setError('영상 길이를 확인할 수 없어요'); return }
          setDuration(length); setSelection({ start: 0, end: length })
        }}
        onLoadedData={() => setFrameReady(true)}
        onError={() => { setError('영상을 재생할 수 없어요'); setPlaying(false) }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onTimeUpdate={event => {
          const node = event.currentTarget
          setCurrent(node.currentTime)
          if (endAt.current !== null && node.currentTime >= endAt.current) { node.pause(); node.currentTime = endAt.current; endAt.current = null }
        }} />
        {!error && <button type="button" className="journey-clip-play" disabled={!duration || !frameReady} aria-label={evidence.label + (playing ? ' 일시 정지' : ' 재생')} onClick={() => void play()}>
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}</button>}
        {error && <p className="journey-clip-error" role="status">{error}</p>}
      </div>
      {duration > 0 && !error && <>
        <div className="journey-clip-timeline"><input type="range" min="0" max={duration} step=".05" value={current} aria-label={evidence.label + ' 재생 위치'} onChange={event => seek(Number(event.target.value))} />
          {marker !== null && <span className="journey-clip-marker" style={{ left: `${marker / duration * 100}%` }} aria-label={`충돌 시점 ${time(marker)}`} />}
        </div>
        <div className="journey-clip-time"><span>{time(current)}</span><span>{time(duration)}</span></div>
        <div className="journey-clip-event">{marker !== null ? <button type="button" className="journey-text-action" onClick={() => seek(marker)}>충돌 시점<span>{time(marker)}</span></button> : <span>충돌 시점 미확인</span>}</div>
        {rangeInvalid && <p className="journey-reconstruction-note" role="status">이 영상에서 해당 구간을 열 수 없어요</p>}
        <details className="journey-clip-range"><summary>근거 구간 확인</summary><div>
          <label>시작 초<input type="number" min="0" max={duration} step=".1" value={selection.start} onChange={event => setSelection(s => ({ ...s, start: Number(event.target.value) }))} /></label>
          <label>종료 초<input type="number" min="0" max={duration} step=".1" value={selection.end} onChange={event => setSelection(s => ({ ...s, end: Number(event.target.value) }))} /></label>
          <button type="button" disabled={!validRange(selection, duration)} onClick={() => void play(true)}>선택 구간 재생</button>
        </div></details>
      </>}
    </>}
    <div className="journey-clip-source"><span>{evidence.metadata.sourceLabel}</span><span>{evidence.metadata.capturedAt ? new Date(evidence.metadata.capturedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '확보 시각 미확인'}</span></div>
  </section>
}
