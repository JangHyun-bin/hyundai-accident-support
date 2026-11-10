import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { Check, Mic, PencilLine, Square, X } from 'lucide-react'
import { LIMITS, type AssetWrite, type CaseCommand, type CommitResult, type Evidence, type JourneyCase } from './case'
import { readAsset } from './case-store'
import { JourneyAction, JourneyHeading } from './JourneyLayout'
import { startVoiceCapture, type VoiceCapture } from './voice-capture'
import './voice.css'

type Phase = 'ready' | 'requesting-permission' | 'listening' | 'review' | 'saving' | 'saved' | 'error'
type PendingClip = { evidence: Evidence; blob: Blob }
export type VoiceRecordHandle = { finishBeforeLeave: () => Promise<boolean> }
const sample = { id: 'voice-statement-ko-v1', text: '정차 중 오른쪽에서 충격을 느꼈어요. 정확한 사고 경위는 확인 중이에요.', duration: 8.827625 }
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

function VoiceAudio({ caseId, evidence, blob }: { caseId: string; evidence: Evidence; blob?: Blob }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    let created = ''
    setUrl(''); setFailed(false)
    void (blob ? Promise.resolve(blob) : evidence.assetId ? readAsset(caseId, evidence.assetId) : Promise.resolve(null)).then(value => {
      if (cancelled) return
      if (!value) { setFailed(true); return }
      created = URL.createObjectURL(value)
      setUrl(created)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true; if (created) URL.revokeObjectURL(created) }
  }, [caseId, evidence.assetId, blob])
  return <div className="journey-voice-clip"><div><Mic aria-hidden="true" /><span>{evidence.label}</span><span>{clock(evidence.metadata.duration ?? 0)}</span></div>
    {failed ? <p role="status">음성을 재생할 수 없어요. 남긴 내용은 계속 확인할 수 있어요.</p>
      : url ? <audio controls preload="metadata" src={url} aria-label={evidence.label + ' 재생'} onError={() => setFailed(true)} /> : <p>음성을 불러오고 있어요.</p>}
  </div>
}

export function VoiceRecordPanel({ value, mode, onSave, ref }: {
  value: JourneyCase; mode: 'sample' | 'device'; onSave: (command: CaseCommand, assets: AssetWrite[]) => Promise<CommitResult>; ref?: Ref<VoiceRecordHandle>
}) {
  const initial = value.statements[0]
  const [text, setText] = useState(initial?.text ?? '')
  const [phase, setPhase] = useState<Phase>(initial ? 'review' : 'ready')
  const [editing, setEditing] = useState(!!initial)
  const [pending, setPending] = useState<PendingClip[]>([])
  const [message, setMessage] = useState('')
  const [level, setLevel] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const capture = useRef<VoiceCapture | null>(null)
  const startedAt = useRef(0)
  const request = useRef(0)
  const dirty = useRef(false)
  const stopPromise = useRef<Promise<void> | null>(null)
  const savePromise = useRef<Promise<boolean> | null>(null)
  const section = useRef<HTMLElement>(null)
  const mounted = useRef(true)
  const persistedAudio = value.evidence.filter(e => e.kind === 'audio' && !pending.some(p => p.evidence.id === e.id))
  const busy = phase === 'saving' || phase === 'requesting-permission' || finishing

  function addClip(blob: Blob, duration: number, origin: 'user' | 'sample') {
    const id = crypto.randomUUID()
    const evidence: Evidence = { id, label: origin === 'sample' ? '음성 기록 예시' : '직접 남긴 음성', kind: 'audio', revision: 1, origin,
      assetId: crypto.randomUUID(), availability: 'available', captureTarget: null,
      metadata: { mime: blob.type, bytes: blob.size, duration, capturedAt: new Date().toISOString(), sourceLabel: origin === 'sample' ? sample.id : '직접 녹음' } }
    setPending(clips => [...clips, { evidence, blob }]); dirty.current = true
  }

  function finishRecording() {
    if (stopPromise.current) return stopPromise.current
    const active = capture.current
    if (!active) return Promise.resolve()
    capture.current = null
    const duration = Math.min(LIMITS.voiceSeconds, Math.max(0, (Date.now() - startedAt.current) / 1000))
    setFinishing(true)
    const job = active.stop().then(blob => {
      if (!mounted.current) return
      addClip(blob, duration, 'user')
      setEditing(true); setPhase('review')
      setMessage('음성은 남겼어요. 내용을 직접 입력할 수 있어요.')
    }).catch(() => {
      if (mounted.current) { setPhase('error'); setMessage('이번 음성을 남기지 못했어요. 이전 기록은 그대로 있어요.') }
    }).finally(() => { stopPromise.current = null; if (mounted.current) setFinishing(false) })
    stopPromise.current = job
    return job
  }

  function cancelRecording() {
    request.current += 1
    capture.current?.cancel(); capture.current = null
    setLevel(0); setMessage(''); setPhase(editing || pending.length ? 'review' : 'ready')
  }

  function discardDraft() {
    if (busy) return
    section.current?.querySelectorAll('audio').forEach(audio => audio.pause())
    setText(value.statements[0]?.text ?? '')
    setPending([]); dirty.current = false
    setEditing(!!value.statements[0]); setMessage('')
    setPhase(value.statements[0] ? 'review' : 'ready')
  }

  async function start() {
    if (busy || capture.current) return
    window.speechSynthesis?.cancel()
    section.current?.querySelectorAll('audio').forEach(audio => audio.pause())
    const generation = ++request.current
    setMessage(''); setPhase('requesting-permission'); setElapsed(0)
    try {
      if (mode === 'sample') {
        if (!value.fixtureId) throw new Error('Sample case required')
        const response = await fetch(`/journey-samples/${sample.id}.wav`)
        if (!response.ok) throw new Error('Sample unavailable')
        const blob = await response.blob()
        if (generation !== request.current || !mounted.current) return
        const combined = [text.trim(), sample.text].filter(Boolean).join('\n\n')
        if (combined.length > LIMITS.statementLength) { setPhase('error'); setMessage('기록은 5,000자까지 남길 수 있어요. 기존 내용을 확인해주세요.'); return }
        addClip(blob, sample.duration, 'sample'); setText(combined); setEditing(true); setPhase('review')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone unavailable')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (generation !== request.current || !mounted.current) { stream.getTracks().forEach(track => track.stop()); return }
      const active = startVoiceCapture(stream, setLevel)
      capture.current = active
      startedAt.current = Date.now()
      setPhase('listening')
      const ended = () => { if (capture.current === active && mounted.current) void finishRecording() }
      void active.finished.then(ended, ended)
    } catch {
      if (generation !== request.current || !mounted.current) return
      setPhase('error'); setMessage(mode === 'sample' ? '준비된 음성을 불러오지 못했어요. 직접 입력으로 기록을 남길 수 있어요.' : '마이크를 사용할 수 없어요. 직접 입력으로 기록을 남길 수 있어요.')
    }
  }

  async function save() {
    if (savePromise.current) return savePromise.current
    if (busy || capture.current || (!dirty.current && phase === 'saved')) return false
    if (!text.trim() && !pending.length && !initial) return false
    const clips = [...pending]
    const audioEvidenceIds = [...new Set([...(value.statements[0]?.audioEvidenceIds ?? []), ...persistedAudio.map(e => e.id), ...clips.map(c => c.evidence.id)])]
    const statement = text.trim() || initial ? { id: initial?.id ?? 'primary-statement', text, audioEvidenceIds } : null
    setPhase('saving'); setMessage('')
    const job = onSave({ type: 'voice-save', evidence: clips.map(c => c.evidence), statement }, clips.map(c => ({ id: c.evidence.assetId!, caseId: value.id, blob: c.blob }))).then(result => {
      if (!result.ok) { setPhase('error'); setMessage('저장하지 못했어요. 음성과 입력 내용은 이 화면에 남아 있어요.'); return false }
      dirty.current = false; setPending([]); setPhase('saved'); setMessage('기록을 저장했어요.')
      return true
    }).catch(() => { setPhase('error'); setMessage('저장하지 못했어요. 음성과 입력 내용은 이 화면에 남아 있어요.'); return false })
      .finally(() => { savePromise.current = null })
    savePromise.current = job
    return job
  }

  useImperativeHandle(ref, () => ({ finishBeforeLeave: async () => {
    section.current?.querySelectorAll('audio').forEach(audio => audio.pause())
    if (capture.current || stopPromise.current) { await finishRecording(); return false }
    if (phase === 'requesting-permission') { cancelRecording(); return false }
    if (savePromise.current) return savePromise.current
    if (dirty.current) { setMessage('화면을 옮기기 전에 남긴 내용을 확인하고 저장해주세요.'); return false }
    return true
  } }))

  useEffect(() => {
    if (phase !== 'listening') return
    const timer = setInterval(() => {
      const seconds = Math.min(LIMITS.voiceSeconds, (Date.now() - startedAt.current) / 1000)
      setElapsed(seconds)
      if (seconds >= LIMITS.voiceSeconds) void finishRecording()
    }, 100)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (value.stage === 'record') return
    section.current?.querySelectorAll('audio').forEach(audio => audio.pause())
    request.current += 1
    if (capture.current) void finishRecording()
    else if (phase === 'requesting-permission') setPhase(editing ? 'review' : 'ready')
  }, [value.stage])

  useEffect(() => {
    mounted.current = true
    const pagehide = () => { request.current += 1; if (capture.current) void finishRecording() }
    const beforeunload = (event: BeforeUnloadEvent) => {
      if (dirty.current || capture.current || stopPromise.current) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('pagehide', pagehide)
    window.addEventListener('beforeunload', beforeunload)
    return () => {
      mounted.current = false; request.current += 1; capture.current?.cancel(); capture.current = null
      window.removeEventListener('pagehide', pagehide); window.removeEventListener('beforeunload', beforeunload)
    }
  }, [])

  return <section ref={section} className="journey-voice" data-voice-phase={phase} aria-label="음성 사고 기록">
    <JourneyHeading step="사고 기록" title={phase === 'listening' ? '천천히 말씀해주세요' : editing || pending.length ? '이렇게 기록할까요?' : '기억나는 내용을 남겨주세요'}>
      {phase === 'listening' ? '확실한 내용만 말해도 돼요.' : '기억과 다른 내용은 저장 전에 고칠 수 있어요.'}
    </JourneyHeading>
    {phase === 'listening' ? <div className="journey-voice-listening">
      <div className="journey-voice-meter" data-voice-level={level.toFixed(3)} role="img" aria-label="현재 microphone 음량">
        {Array.from({ length: 31 }, (_, index) => <span key={index} style={{ height: `${4 + level * 64 * Math.sin((index + 1) / 32 * Math.PI)}px` }} />)}
      </div><p className="journey-voice-clock">{clock(elapsed)}<span> / 2:00</span></p>
      <JourneyAction onClick={() => void finishRecording()} disabled={finishing}><Square aria-hidden="true" />말하기 마치기</JourneyAction>
      <button className="journey-text-action" disabled={finishing} onClick={cancelRecording}><X aria-hidden="true" />녹음 취소</button>
    </div> : <>
      {!editing && !pending.length && <div className="journey-voice-start"><Mic aria-hidden="true" /><JourneyAction disabled={busy} onClick={() => void start()}><Mic aria-hidden="true" />{phase === 'requesting-permission' ? '음성 기록 준비 중' : '말로 기록하기'}</JourneyAction></div>}
      {persistedAudio.map(e => <VoiceAudio key={e.id} caseId={value.id} evidence={e} />)}
      {pending.map(c => <VoiceAudio key={c.evidence.id} caseId={value.id} evidence={c.evidence} blob={c.blob} />)}
      {editing && <div className="journey-voice-edit"><div className="journey-input-label"><label htmlFor="voice-statement">사고 기록</label><span id="voice-statement-count">{text.length.toLocaleString('ko-KR')} / 5,000</span></div>
        <textarea id="voice-statement" className="journey-textarea" aria-describedby="voice-statement-count" maxLength={LIMITS.statementLength} value={text} disabled={phase === 'saving'}
          placeholder="기억나는 내용을 적어주세요" onChange={event => { setText(event.target.value); dirty.current = true; if (phase === 'saved') { setPhase('review'); setMessage('') } }} />
        <p className="journey-supporting">확인하지 못한 내용은 추측하지 않아도 돼요.</p></div>}
      {(editing || pending.length > 0) && <div className="journey-voice-actions"><JourneyAction disabled={busy || (!text.trim() && !pending.length && !initial) || phase === 'saved'} onClick={() => void save()}><Check aria-hidden="true" />{phase === 'saving' ? '기록 저장 중' : '기록 저장'}</JourneyAction>
        <JourneyAction secondary disabled={busy} onClick={() => void start()}><Mic aria-hidden="true" />추가로 말하기</JourneyAction></div>}
      {(editing || pending.length > 0) && phase !== 'saved' && <button className="journey-text-action" disabled={busy} onClick={discardDraft}><X aria-hidden="true" />입력 취소</button>}
      {!editing && <button className="journey-text-action" disabled={busy} onClick={() => { setEditing(true); setPhase('review') }}><PencilLine aria-hidden="true" />직접 입력</button>}
      {phase === 'requesting-permission' && <button className="journey-text-action" onClick={cancelRecording}>취소</button>}
    </>}
    {finishing && <p role="status" className="journey-supporting">녹음을 정리하고 있어요.</p>}
    {message && <p role="status" className="journey-voice-message">{message}</p>}
  </section>
}
