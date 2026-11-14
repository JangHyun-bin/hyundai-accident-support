import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { JourneyAction, JourneyEditorLayout, JourneyStatus } from '@/journey/JourneyLayout'
import { PayloadContent } from '@/journey/SubmissionPanel'
import { useCaseData } from '@/journey/case-data'
import { preparePayload, type ApprovalCommitResult, type ApprovalInput, type JourneyCase, type PayloadSelection, type PayloadSnapshot, type ShareRecord } from '@/journey/case'
import { useEditorDraft } from './useEditorDraft'
import type { EditorDraft } from '@/journey/editor-drafts'

const emptySelection = (): PayloadSelection => ({ observationIds: [], statementIds: [], evidenceIds: [], includeDiagram: false, includeReport: false })
const scopeDraft = (selection: PayloadSelection): Extract<EditorDraft, { kind:'scope' }> => ({ kind:'scope', target:'share', drafts:{ insurance:{ recipient:'', selection:emptySelection() }, vehicle:{ recipient:'', selection:emptySelection() }, share:{ recipient:'내 기록 사본', selection } } })
const errors: Record<Exclude<ApprovalCommitResult, { ok: true }>['reason'], string> = {
  recipient: '사본 범위를 다시 확인해주세요.',
  'empty-selection': '사본에 담을 내용을 하나 이상 선택해주세요.',
  'missing-evidence': '원본을 확인할 수 없어요. 경위서에 연결된 자료도 함께 선택해주세요.',
  'unreviewed-content': '내용이 바뀌었거나 확인이 필요해요. 내용을 살펴본 뒤 다시 선택해주세요.',
  'retry-not-allowed': '이미 보관한 사본이에요. 사본 목록을 확인해주세요.',
  conflict: '다른 기기에서 기록이 바뀌었어요. 선택은 유지돼요. 최신 기록을 확인해주세요.',
  unavailable: '사본을 서버에 보관하지 못했어요. 선택한 내용은 그대로 있어요.',
  quota: '저장 공간이 부족해요. 선택한 내용은 그대로 있어요.',
  invalid: '사본을 보관하지 못했어요. 선택한 내용은 그대로 있어요.',
}
const extensions: Record<string, string> = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'audio/wav':'wav', 'audio/webm':'webm', 'audio/mp4':'m4a', 'audio/ogg':'ogg', 'video/mp4':'mp4', 'video/webm':'webm' }

function CopyDownloads({ record, caseId }: { record: ShareRecord; caseId: string }) {
  const data = useCaseData()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const created = URL.createObjectURL(new Blob([JSON.stringify({ caseId, copyId: record.id, preparedAt: record.approvedAt, insurance: { integration: 'unavailable', receipt: null }, payload: record.payload }, null, 2)], { type: 'application/json' }))
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [caseId, record])
  async function download(id: string) {
    const evidence = record.payload.evidence.find(item => item.id === id)
    if (!evidence?.assetId || busy) return
    setBusy(id); setMessage('')
    try {
      const blob = await data.readAsset(caseId, evidence.assetId)
      if (!blob) throw new Error('Missing original')
      const created = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const extension = extensions[blob.type.split(';')[0]] ?? 'bin'
      link.href = created; link.download = `${evidence.label}-${evidence.id}.${extension}`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(created), 60000)
      setMessage('다운로드를 시작했어요. 파일 앱이나 다운로드 목록에서 확인해주세요.')
    } catch { setMessage('원본을 내려받지 못했어요. 기록과 사본은 그대로 있어요.') }
    finally { setBusy(null) }
  }
  return <section className="product-copy-downloads" aria-label="준비한 내 사본">
    <JourneyStatus tone="confirmed">사본 범위를 서버에 보관했어요</JourneyStatus>
    <p className="journey-supporting">보험사나 상대방에게 보내지 않았어요. 원본 파일은 각각 내려받을 수 있어요.</p>
    {url ? <a className="product-contact" href={url} download={`사고기록-${record.id}.json`} onClick={() => setMessage('다운로드를 시작했어요. 다운로드 목록을 확인해주세요.')}><Download aria-hidden="true" />기록 사본 내려받기</a> : <p className="journey-supporting">사본 파일을 준비하고 있어요.</p>}
    {record.payload.evidence.map(item => <JourneyAction secondary key={item.id} disabled={!!busy} onClick={() => void download(item.id)}>{busy === item.id ? '원본 확인 중' : `${item.label} 원본 내려받기`}</JourneyAction>)}
    {message && <p role="status" className="journey-supporting">{message}</p>}
  </section>
}

export function CopyPanel({ value, onApprove, onCancel, onDirtyChange, active }: {
  value: JourneyCase
  onApprove: (input: ApprovalInput, preview: PayloadSnapshot) => Promise<ApprovalCommitResult>
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
  active: boolean
}) {
  const [selection, setSelection] = useState(emptySelection)
  const [preview, setPreview] = useState<{ input: ApprovalInput; payload: PayloadSnapshot } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const editorDraft = useEditorDraft({ caseId:value.id, kind:'scope', restore: saved => {
    setSelection(saved.drafts.share.selection); setPreview(null)
  } })
  useEffect(() => {
    if (!editorDraft.ready) return
    void editorDraft.preserve(scopeDraft(selection))
  }, [selection, editorDraft.ready, editorDraft.preserve])
  useEffect(() => { if (!active) setPreview(null) }, [active])
  const dirty = busy || preview !== null || selection.observationIds.length + selection.statementIds.length + selection.evidenceIds.length > 0 || selection.includeDiagram || selection.includeReport
  useEffect(() => { onDirtyChange(busy || editorDraft.failed || !editorDraft.ready) }, [busy, editorDraft.failed, editorDraft.ready, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function toggle(group: 'observationIds' | 'statementIds' | 'evidenceIds', id: string) {
    setSelection(previous => ({ ...previous, [group]: previous[group].includes(id) ? previous[group].filter(item => item !== id) : [...previous[group], id] })); setError('')
  }
  function showPreview() {
    const payload = preparePayload(value, selection)
    if (!payload.ok) { setError(errors[payload.reason]); return }
    setPreview({ input: { kind: 'share', recipient: '내 기록 사본', id: crypto.randomUUID(), now: new Date().toISOString(), selection: structuredClone(selection) }, payload: payload.value }); setError('')
  }
  async function approve() {
    if (!preview || submitting.current) return
    submitting.current = true; setBusy(true); setError('')
    try {
      const result = await onApprove(preview.input, preview.payload)
      if (!result.ok) { setError(errors[result.reason]); return }
      setPreview(null); setSelection(emptySelection())
      void editorDraft.preserve(null)
    } catch { setError(errors.unavailable) }
    finally { submitting.current = false; setBusy(false) }
  }
  return <section className="journey-submission journey-editor-panel" aria-label="내 사본 범위 확인">
    <JourneyEditorLayout step="내 사본 준비" title="사본에 담을 내용을 선택하세요" description="선택한 내용만 사본으로 준비해요. 보험사에 전송하지 않아요." primary={preview ? <JourneyAction disabled={busy || !active} onClick={() => void approve()}>{busy ? '사본 보관 중' : '이 내용으로 내 사본 준비'}</JourneyAction> : <JourneyAction disabled={!editorDraft.ready} onClick={showPreview}>선택한 내용 미리보기</JourneyAction>}>
      {!preview ? <fieldset className="journey-send-options" disabled={busy || !editorDraft.ready}><legend>사본에 담을 내용</legend>
        {value.observations.map(item => <label key={item.id}><input type="checkbox" checked={selection.observationIds.includes(item.id)} onChange={() => toggle('observationIds', item.id)} /><span>{item.label} · {item.value}</span></label>)}
        {value.statements.map((item, index) => <label key={item.id}><input type="checkbox" checked={selection.statementIds.includes(item.id)} onChange={() => toggle('statementIds', item.id)} /><span>직접 남긴 내용 {index + 1}<small>{item.text}{item.confirmedRevision !== item.revision ? ' · 내용 확인 필요' : ''}</small></span></label>)}
        {value.evidence.map(item => <label key={item.id}><input type="checkbox" checked={selection.evidenceIds.includes(item.id)} disabled={item.availability !== 'available'} onChange={() => toggle('evidenceIds', item.id)} /><span>{item.label}{item.availability !== 'available' && <small>원본 없음</small>}</span></label>)}
        {value.diagram && <label><input type="checkbox" checked={selection.includeDiagram} onChange={event => setSelection(previous => ({ ...previous, includeDiagram: event.target.checked }))} /><span>확인한 사고 도식</span></label>}
        {value.report && <label><input type="checkbox" checked={selection.includeReport} onChange={event => setSelection(previous => ({ ...previous, includeReport: event.target.checked }))} /><span>확인한 경위서</span></label>}
      </fieldset> : <section className="journey-send-preview" aria-label="내 사본 미리보기"><h2>이 내용으로 준비할까요?</h2><PayloadContent payload={preview.payload} caseId={value.id} active={active} onMediaFailure={() => setError(errors['missing-evidence'])} /><JourneyAction secondary disabled={busy} onClick={() => { setPreview(null); setError('') }}>선택 다시 하기</JourneyAction></section>}
      {error && <p role="alert" className="journey-supporting">{error}</p>}
      <JourneyAction secondary disabled={busy} onClick={() => { setPreview(null); onCancel() }}>내용 확인으로 돌아가기</JourneyAction>
      {value.shares.length > 0 && <CopyDownloads record={value.shares[value.shares.length - 1]} caseId={value.id} />}
      {value.shares.length > 1 && <details><summary>이전에 준비한 사본</summary>{value.shares.slice(0,-1).map(record => <CopyDownloads key={record.id} record={record} caseId={value.id} />)}</details>}
      {!editorDraft.ready && !editorDraft.failed && <p role="status" className="journey-supporting">이 기기에 남긴 사본 범위를 확인하고 있어요.</p>}
      {editorDraft.failed && <p role="alert" className="journey-supporting">이 기기에 선택한 범위를 보관하지 못했어요. 화면을 닫지 말고 다시 시도해주세요. <button type="button" onClick={() => editorDraft.ready ? void editorDraft.preserve(scopeDraft(selection)) : editorDraft.retry()}>초안 보관 다시 시도</button></p>}
    </JourneyEditorLayout>
  </section>
}
