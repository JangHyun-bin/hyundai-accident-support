import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, RefreshCw, Trash2, X } from 'lucide-react'
import { captureTargets, LIMITS, type AssetWrite, type CaptureTarget, type CaseCommand, type CommitResult, type Evidence, type JourneyCase } from './case'
import { loadCase, readAsset } from './case-store'
import { JourneyAction, JourneyHeading, JourneyStatus } from './JourneyLayout'
import { capturePhoto, validatePhoto } from './capture'
import './evidence.css'

export type EvidencePanelHandle = { finishBeforeLeave: () => Promise<boolean> }
type Draft = { evidence: Evidence; blob: Blob; url: string }
type Phase = 'choose' | 'requesting' | 'camera' | 'capturing' | 'decoding' | 'review' | 'saving'
type Props = {
  value: JourneyCase
  onSave: (command: CaseCommand, assets: AssetWrite[]) => Promise<CommitResult>
  onCommand: (command: CaseCommand) => void
  ref?: Ref<EvidencePanelHandle>
}

function StoredPhoto({ caseId, evidence, label }: { caseId: string; evidence: Evidence; label: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    let created: string | null = null
    setUrl(null); setFailed(false)
    void (async () => {
      const blob = evidence.assetId ? await readAsset(caseId, evidence.assetId) : null
      if (cancelled) return
      try {
        if (!blob) throw new Error('Missing asset')
        await validatePhoto(blob)
        if (cancelled) return
        created = URL.createObjectURL(blob); setUrl(created)
      } catch { if (!cancelled) setFailed(true) }
    })()
    return () => { cancelled = true; if (created) URL.revokeObjectURL(created) }
  }, [caseId, evidence.assetId])
  return <div className="journey-photo-thumbnail">{url && !failed
    ? <img src={url} alt={label} onError={() => setFailed(true)} />
    : <span>{failed ? '사진을 열 수 없어요' : '사진 확인 중'}</span>}</div>
}

export function EvidencePanel({ value, onSave, onCommand, ref }: Props) {
  const [photos, setPhotos] = useState<Evidence[]>([])
  const [target, setTarget] = useState<CaptureTarget | null>(null)
  const [replacement, setReplacement] = useState<Evidence | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [phase, setPhase] = useState<Phase>('choose')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const liveStream = useRef<MediaStream | null>(null)
  const request = useRef(0)
  const preparation = useRef(0)
  const mounted = useRef(true)
  const saving = useRef<Promise<boolean> | null>(null)
  const label = captureTargets.find(item => item.id === target)?.label ?? ''
  const targetPhotos = photos.filter(photo => photo.captureTarget === target && photo.availability === 'available')
  const currentPhotos = photos.filter(photo => photo.assetId !== null)
  const obtained = captureTargets.filter(item => photos.some(photo => photo.captureTarget === item.id && photo.availability === 'available')).length

  useEffect(() => {
    let cancelled = false
    // Optimistic state에 새 asset이 있어도 durable commit 전에는 확보한 사진으로 표시하지 않음.
    void loadCase(value.id).then(stored => { if (!cancelled && stored) setPhotos(stored.evidence.filter(e => e.kind === 'photo')) })
    return () => { cancelled = true }
  }, [value.id, value.revision])

  function stopCamera() {
    request.current += 1
    liveStream.current?.getTracks().forEach(track => track.stop())
    liveStream.current = null
    setStream(null); setCameraReady(false)
  }

  useEffect(() => {
    mounted.current = true
    const stop = () => { stopCamera(); setPhase(current => ['camera', 'requesting'].includes(current) ? 'choose' : current) }
    window.addEventListener('pagehide', stop)
    return () => { mounted.current = false; request.current += 1; preparation.current += 1; liveStream.current?.getTracks().forEach(track => track.stop()); liveStream.current = null; window.removeEventListener('pagehide', stop) }
  }, [])

  useEffect(() => {
    if (value.stage === 'record' && !value.suspended) return
    stopCamera()
    setPhase(current => ['camera', 'requesting'].includes(current) ? 'choose' : current)
  }, [value.stage, value.suspended])

  useEffect(() => {
    if (!stream || !video.current) return
    const element = video.current
    element.srcObject = stream
    void element.play().catch(() => {
      stopCamera(); setPhase('choose'); setError('Camera를 사용할 수 없어요. 저장된 사진을 선택할 수 있어요.')
    })
    return () => { element.pause(); element.srcObject = null }
  }, [stream])

  useEffect(() => () => { if (draft) URL.revokeObjectURL(draft.url) }, [draft])

  useImperativeHandle(ref, () => ({ finishBeforeLeave: async () => {
    if (phase === 'capturing' || phase === 'decoding') { setError('사진을 확인하고 있어요. 잠시 뒤 다시 이동해주세요.'); return false }
    stopCamera()
    if (saving.current) return saving.current
    if (draft) { setError('새 사진을 저장하거나 버린 뒤 이동해주세요.'); return false }
    setPhase('choose')
    return true
  } }), [draft, phase])

  function selectTarget(next: CaptureTarget) {
    setTarget(next); setReplacement(null); setMessage(''); setError(''); setPhase('choose')
  }

  function photoSlot() {
    return replacement ?? photos.find(photo => photo.captureTarget === target && photo.assetId === null) ?? null
  }

  async function prepare(blob: Blob, sourceLabel: string) {
    const generation = ++preparation.current
    setError(''); setMessage(''); setSaveFailed(false)
    setPhase('decoding')
    try {
      const previous = photoSlot()
      if (!previous?.assetId && currentPhotos.length >= LIMITS.photoCount) throw new Error('사진은 최대 12장까지 남길 수 있어요. 기존 사진을 교체하거나 삭제해주세요.')
      await validatePhoto(blob)
      if (generation !== preparation.current || !mounted.current || !target) return
      const evidence: Evidence = { id: previous?.id ?? crypto.randomUUID(), label, kind: 'photo', origin: 'user',
        revision: (previous?.revision ?? 0) + 1, captureTarget: target, availability: 'available', assetId: crypto.randomUUID(),
        metadata: { mime: blob.type, bytes: blob.size, duration: null, capturedAt: new Date().toISOString(), sourceLabel } }
      setDraft({ evidence, blob, url: URL.createObjectURL(blob) }); setPhase('review')
    } catch (caught) {
      if (mounted.current && generation === preparation.current) {
        setPhase(draft ? 'review' : 'choose'); setError(caught instanceof Error ? caught.message : '사진을 열 수 없어요. 다른 사진을 선택해주세요.')
      }
    }
  }

  async function openCamera() {
    if (draft) return
    setError(''); setMessage(''); setCameraReady(false); setPhase('requesting')
    const generation = ++request.current
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('No camera')
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (!mounted.current || generation !== request.current) { next.getTracks().forEach(track => track.stop()); return }
      liveStream.current = next; setStream(next); setPhase('camera')
    } catch {
      if (mounted.current && generation === request.current) {
        stopCamera(); setPhase('choose'); setError('Camera를 사용할 수 없어요. 저장된 사진을 선택할 수 있어요.')
      }
    }
  }

  async function takePhoto() {
    if (!liveStream.current) return
    setCameraReady(false); setPhase('capturing')
    try {
      const blob = await capturePhoto(liveStream.current)
      stopCamera()
      if (mounted.current) await prepare(blob, '직접 촬영')
    } catch (caught) {
      stopCamera(); setPhase('choose'); setError(caught instanceof Error ? caught.message : '사진을 찍지 못했어요. 다시 시도해주세요.')
    }
  }

  async function commit(command: CaseCommand, assets: AssetWrite[]) {
    if (saving.current) return saving.current
    setPhase('saving'); setError(''); setMessage('')
    const work = (async () => {
      try {
        const result = await onSave(command, assets)
        if (!mounted.current) return result.ok
        if (!result.ok) {
          setSaveFailed(true)
          setError(result.reason === 'quota' ? '이 기록에 사진을 더 저장할 공간이 없어요. 이전 사진과 새 사진은 그대로 남아 있어요.'
            : '사진을 저장하지 못했어요. 이전 사진과 새 사진은 그대로 남아 있어요.')
          setPhase(draft ? 'review' : 'choose')
          return false
        }
        setPhotos(result.value.evidence.filter(e => e.kind === 'photo'))
        setDraft(null); setReplacement(null); setPhase('choose'); setMessage(command.type === 'evidence-remove' ? '사진을 삭제했어요.' : '사진을 저장했어요.')
        return true
      } catch {
        if (mounted.current) { setSaveFailed(true); setError('사진을 저장하지 못했어요. 이전 사진과 새 사진은 그대로 남아 있어요.'); setPhase(draft ? 'review' : 'choose') }
        return false
      } finally { saving.current = null }
    })()
    saving.current = work
    return work
  }

  function savePhoto() {
    if (!draft || !draft.evidence.assetId) return
    void commit({ type: 'evidence-put', evidence: draft.evidence }, [{ id: draft.evidence.assetId, caseId: value.id, blob: draft.blob }])
  }

  async function skip() {
    if (!target || draft || targetPhotos.length) return
    const previous = photoSlot()
    const evidence: Evidence = { id: previous?.id ?? crypto.randomUUID(), label, kind: 'photo', origin: 'user',
      revision: (previous?.revision ?? 0) + 1, assetId: null, availability: 'skipped', captureTarget: target,
      metadata: { mime: '', bytes: 0, duration: null, capturedAt: null, sourceLabel: '사용자가 생략' } }
    if (await commit({ type: 'evidence-put', evidence }, [])) { setTarget(null); setMessage('이 대상은 지금 생략했어요.') }
  }

  return <section className="journey-evidence" aria-label="사진 자료">
    <JourneyHeading step="현장 기록" title="사진 남기기">지금 남길 수 있는 사진만 선택해도 돼요.</JourneyHeading>
    <div className="journey-photo-progress"><span>확보한 대상</span><strong data-photo-count>{obtained} / 6</strong><span>{currentPhotos.length}장 보관 중</span></div>
    {!target ? <>
      <div className="journey-photo-targets">{captureTargets.map(item => {
        const entries = photos.filter(photo => photo.captureTarget === item.id)
        const count = entries.filter(photo => photo.availability === 'available').length
        const status = count ? '확보됨' : entries.some(photo => photo.availability === 'skipped') ? '생략' : entries.some(photo => ['failed', 'unavailable'].includes(photo.availability)) ? '확보 못함' : '사진 없음'
        return <button key={item.id} data-photo-target={item.id} aria-label={item.label + ' 사진'} onClick={() => selectTarget(item.id)}>
          <Camera aria-hidden="true" /><span><strong>{item.label}</strong><JourneyStatus tone={count ? 'confirmed' : status === '생략' ? 'skipped' : 'unknown'}>{status}{count > 0 && ` · ${count}장`}</JourneyStatus></span><ArrowRight aria-hidden="true" />
        </button>
      })}</div>
      {!obtained && <button className="journey-text-action" onClick={() => onCommand({ type: 'navigate', stage: 'review' })}>사진 없이 내용 확인<ArrowRight aria-hidden="true" /></button>}
    </> : <>
      <div className="journey-photo-target-heading"><button className="journey-text-action" disabled={['saving', 'capturing', 'decoding'].includes(phase) || !!draft} onClick={() => { stopCamera(); setTarget(null); setReplacement(null); setPhase('choose'); setError(''); setMessage('') }}><ArrowLeft aria-hidden="true" />사진 목록으로</button><h2>{label}</h2></div>
      {targetPhotos.length > 0 && <div className="journey-photo-saved">{targetPhotos.map((photo, index) => <article key={photo.id}>
        <StoredPhoto caseId={value.id} evidence={photo} label={`${label} 사진 ${index + 1}`} />
        <div><span>{photo.metadata.sourceLabel}</span><div>
          <button aria-label={`${label} 사진 ${index + 1} 교체`} disabled={phase !== 'choose' || !!draft} onClick={() => { setReplacement(photo); setMessage(''); setError(''); input.current?.click() }}><RefreshCw aria-hidden="true" />교체</button>
          <button aria-label={`${label} 사진 ${index + 1} 삭제`} disabled={phase !== 'choose' || !!draft} onClick={() => void commit({ type: 'evidence-remove', id: photo.id }, [])}><Trash2 aria-hidden="true" />삭제</button>
        </div></div>
      </article>)}</div>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="사진 파일 선택" className="journey-photo-file"
        disabled={phase !== 'choose'} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void prepare(file, '사진 선택') }} />
      {draft ? <div className="journey-photo-review">
        <img src={draft.url} alt={`저장 전 ${label} 사진`} />
        <p>{replacement ? '이 사진으로 바꿀까요? 저장될 때까지 이전 사진을 유지해요.' : '이 사진을 기록에 남길까요?'}</p>
        <JourneyAction disabled={phase === 'saving'} onClick={savePhoto}><Check aria-hidden="true" />{phase === 'saving' ? '사진 저장 중' : saveFailed ? '저장 다시 시도' : '이 사진 사용'}</JourneyAction>
        <JourneyAction secondary disabled={phase === 'saving'} onClick={() => { setDraft(null); setReplacement(null); setPhase('choose'); setError('') }}><X aria-hidden="true" />새 사진 버리기</JourneyAction>
      </div> : phase === 'capturing' || phase === 'decoding' ? <p className="journey-photo-message" role="status">사진을 확인하고 있어요.</p>
      : phase === 'camera' || phase === 'requesting' ? <div className="journey-photo-camera">
        <div className="journey-photo-viewfinder"><video ref={video} muted playsInline autoPlay aria-label={`${label} 촬영 화면`} onCanPlay={() => setCameraReady(true)} /><div className="journey-photo-frame" aria-hidden="true" /><span>{phase === 'requesting' ? 'Camera 사용을 기다리고 있어요' : label + '이 화면에 들어오게 맞춰주세요'}</span></div>
        <JourneyAction disabled={!cameraReady} onClick={() => void takePhoto()}><Camera aria-hidden="true" />사진 찍기</JourneyAction>
        <JourneyAction secondary onClick={() => { stopCamera(); setPhase('choose') }}>촬영 취소</JourneyAction>
      </div> : <div className="journey-photo-choose">
        <JourneyAction disabled={phase === 'saving'} onClick={() => void openCamera()}><Camera aria-hidden="true" />촬영하기</JourneyAction>
        <JourneyAction secondary disabled={phase === 'saving'} onClick={() => { setReplacement(null); input.current?.click() }}><ImagePlus aria-hidden="true" />사진 선택</JourneyAction>
        {!targetPhotos.length && <button className="journey-text-action" disabled={phase === 'saving'} onClick={() => void skip()}>지금 촬영하기 어려워요<ArrowRight aria-hidden="true" /></button>}
      </div>}
    </>}
    {error && <p className="journey-photo-message" role="alert">{error}</p>}
    {message && <p className="journey-photo-message" role="status">{message}</p>}
  </section>
}
