import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react'
import { JourneyAction, JourneyEditorLayout, JourneyStatus } from './JourneyLayout'
import { DiagramEditor } from './DiagramEditor'
import { EvidenceView } from './ReportPanel'
import { canSubmit, preparePayload, type ApprovalInput, type ApprovalCommitResult, type CaseCommand, type JourneyCase, type PayloadSelection, type PayloadSnapshot } from './case'
import './submission.css'

type Target = 'insurance' | 'vehicle' | 'share'
type Draft = { recipient: string; selection: PayloadSelection }
const labels = { insurance: '보험사 접수', vehicle: '차량 지원', share: '상대방 공유' }
const purposes = { insurance: '사고 접수와 보상 검토', vehicle: '차량 지원 요청 검토', share: '사고 내용과 선택한 자료 공유' }
const failures: Record<Exclude<ApprovalCommitResult, { ok: true }>['reason'], string> = {
  recipient: '수신처를 입력해주세요.', 'empty-selection': '보낼 내용을 하나 이상 선택해주세요.',
  'missing-evidence': '선택한 자료와 경위서의 근거를 다시 확인해주세요. 경위서에 연결된 자료도 함께 선택해야 해요.',
  'unreviewed-content': '보낼 내용이 바뀌었거나 아직 확인하지 않은 내용이 있어요. 내용을 확인하고 다시 선택해주세요.',
  'retry-not-allowed': '이미 요청한 내용의 결과를 확인하고 있어요. 새 요청은 아직 보낼 수 없어요.',
  conflict: '다른 화면에서 기록이 바뀌었어요. 최신 기록을 확인해주세요.',
  unavailable: '승인한 내용을 보관하지 못했어요. 요청은 시작되지 않았어요.',
  quota: '저장 공간이 부족해요. 요청은 시작되지 않았어요.',
  invalid: '자료를 보관하지 못했어요. 요청은 시작되지 않았어요.',
}
function emptyDraft(): Draft { return { recipient: '', selection: { observationIds: [], statementIds: [], evidenceIds: [], includeDiagram: false, includeReport: false } } }
function emptyDrafts(): Record<Target, Draft> { return { insurance: emptyDraft(), vehicle: emptyDraft(), share: emptyDraft() } }
function hasSelection(selection: PayloadSelection) { return selection.observationIds.length + selection.statementIds.length + selection.evidenceIds.length > 0 || selection.includeDiagram || selection.includeReport }

function pauseCollapsedMedia(event: SyntheticEvent<HTMLDetailsElement>) {
  if (!event.currentTarget.open) for (const media of event.currentTarget.querySelectorAll<HTMLMediaElement>('video,audio')) media.pause()
}

function PayloadContent({ payload, caseId, active, onMediaFailure }: { payload: PayloadSnapshot; caseId: string; active: boolean; onMediaFailure?: () => void }) {
  const [opened, setOpened] = useState<string | null>(null)
  const media = payload.evidence.find(item => item.id === opened)
  return <div className="journey-payload">
    {payload.observations.length > 0 && <section><h3>차량 상태</h3>{payload.observations.map(item => <p key={item.id}>{item.label} · {item.value}<span>{item.confirmation === 'confirmed' ? '확인됨' : '미확인'} · {item.source === 'user' ? '직접 남긴 내용' : item.source === 'fixture' ? '준비된 자료' : '차량 감지'}</span></p>)}</section>}
    {payload.statements.length > 0 && <section><h3>남긴 이야기</h3>{payload.statements.map(item => <p key={item.id}>{item.text}</p>)}</section>}
    {payload.report && <section><h3>경위서</h3>{payload.report.paragraphs.map(item => <p key={item.id}><span>{{ observation: '자료 관측', statement: '사용자 진술', inference: '추정', unknown: '미확인' }[item.kind]}</span>{item.text}</p>)}</section>}
    {payload.diagram && <section><h3>사고 도식</h3><p>확인한 도식 포함 · {payload.diagram.origin === 'user' ? '사용자 정정본' : '제안된 도식'}</p><DiagramEditor value={payload.diagram} readOnly /></section>}
    {payload.evidence.length > 0 && <section><h3>함께 보내는 자료</h3>{payload.evidence.map(item => <p key={item.id}><strong>{item.label}</strong><span>{item.metadata.sourceLabel} · {(item.metadata.bytes / 1024 / 1024).toFixed(1)} MiB{item.metadata.duration !== null ? ` · ${item.metadata.duration.toFixed(1)}초` : ''}</span></p>)}</section>}
    {payload.evidence.length > 0 && <div className="journey-report-tools">{payload.evidence.map(item => <button key={item.id} onClick={() => setOpened(opened === item.id ? null : item.id)}>{item.label} 열기</button>)}</div>}
    {media && active && <EvidenceView caseId={caseId} evidence={media} reference={{ evidenceId: media.id, evidenceRevision: media.revision, start: null, end: null }} onFailure={() => onMediaFailure?.()} />}
  </div>
}

export function SubmissionPanel({ value, onApprove, onCommand, onCancel, onDirtyChange, active, explicitTransport=false, footer }: {
  footer?:ReactNode
  explicitTransport?: boolean
  value: JourneyCase; onApprove: (input: ApprovalInput, preview: PayloadSnapshot) => Promise<ApprovalCommitResult>
  onCommand: (command: CaseCommand) => void; onCancel: () => void; onDirtyChange: (dirty: boolean) => void; active: boolean
}) {
  const [target, setTarget] = useState<Target>('insurance')
  const [drafts, setDrafts] = useState(emptyDrafts)
  const [preview, setPreview] = useState<{ input: ApprovalInput; payload: PayloadSnapshot } | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState('')
  const [approved, setApproved] = useState(false)
  const draft = drafts[target]
  const dirty = busy || preview !== null || Object.values(drafts).some(item => !!item.recipient || hasSelection(item.selection))
  const currentRequest = target === 'share' ? null : value.submissions.find(item => item.id === value.activeSubmissionIds[target])
  const currentShare = target === 'share' ? value.shares.at(-1) : null
  const allowed = target === 'share' || canSubmit(value, target)
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function change(next: Partial<Draft>) { setDrafts(previous => ({ ...previous, [target]: { ...previous[target], ...next } })); setError(''); setApproved(false) }
  function toggle(group: 'observationIds' | 'statementIds' | 'evidenceIds', id: string) {
    const selected = draft.selection[group]
    change({ selection: { ...draft.selection, [group]: selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id] } })
  }
  function showPreview() {
    if (!draft.recipient.trim()) { setError(failures.recipient); return }
    const payload = preparePayload(value, draft.selection)
    if (!payload.ok) { setError(failures[payload.reason]); return }
    const common = { recipient: draft.recipient.trim(), selection: structuredClone(draft.selection), id: crypto.randomUUID(), now: new Date().toISOString() }
    setPreview({ input: target === 'share' ? { ...common, kind: 'share' } : { ...common, kind: 'submission', agency: target, ...(explicitTransport && target === 'insurance' ? { transport: 'explicit' as const } : {}) }, payload: payload.value })
    setError('')
  }
  async function approve() {
    if (!preview || submitting.current) return
    submitting.current = true; setBusy(true); setError('')
    try {
      const result = await onApprove({ ...preview.input, now: new Date().toISOString() }, preview.payload)
      if (!result.ok) { setError(failures[result.reason]); return }
      setPreview(null); setApproved(true)
      setDrafts(previous => ({ ...previous, [target]: emptyDraft() }))
    } finally { submitting.current = false; setBusy(false) }
  }
  return <section className="journey-submission journey-editor-panel" aria-label="전송 검토">
    <JourneyEditorLayout guidanceKey={[target,!!preview,busy,approved,currentRequest?.status,currentShare?.status].join('/')} step="전송 검토" title="보낼 범위를 직접 선택해주세요" description={'수신처와 내용을 확인한 뒤 요청할 수 있어요.'} primary={allowed||preview ? (preview
      ? <JourneyAction disabled={busy} onClick={() => void approve()}>{busy ? '승인 내용 보관 중' : target === 'share' ? '이 내용으로 공유 요청' : '이 내용으로 요청'}</JourneyAction>
      : <JourneyAction onClick={showPreview}>선택한 내용 미리보기</JourneyAction>) : null}>

    <nav className="journey-record-tabs journey-review-tabs" aria-label="보낼 대상">{(['insurance', 'vehicle', 'share'] as const).map(item => <button key={item} disabled={busy} aria-pressed={target === item} onClick={() => { setTarget(item); setPreview(null); setError(''); setApproved(false) }}>{labels[item]}</button>)}</nav>
    {approved && <p role="status">승인한 내용이 보관됐어요</p>}
    {currentRequest && <section className="journey-receipt" aria-label="요청 결과">
      <JourneyStatus tone={currentRequest.status === 'received' ? 'confirmed' : currentRequest.status === 'failed' ? 'failed' : 'pending'}>
        {currentRequest.transport === 'approved' ? '승인 완료 · 전송 전' : currentRequest.transport === 'sending' ? '전송 중 · 접수 미확인' : currentRequest.transport === 'sent' && currentRequest.status === 'sent' ? '전송 완료 · 접수 미확인' : currentRequest.status === 'received' ? '접수 확인됨' : currentRequest.status === 'failed' ? '전송 실패 확인됨' : currentRequest.status === 'not_received' ? '미접수 확인됨' : '접수 결과 확인 중'}
      </JourneyStatus>
      <p>{currentRequest.recipient ?? labels[target]}</p>
      {currentRequest.status === 'received' && <><strong>{currentRequest.externalReceipt?.number ?? '접수번호 확인 중'}</strong>
        {currentRequest.externalReceipt && <p>{currentRequest.externalReceipt.agencyName} · {new Date(currentRequest.externalReceipt.receivedAt).toLocaleString('ko-KR')}<br />{currentRequest.externalReceipt.next}</p>}</>}
      <details onToggle={pauseCollapsedMedia}><summary>승인했던 내용</summary>{currentRequest.payload ? <PayloadContent payload={currentRequest.payload} caseId={value.id} active={active} /> : <p>과거 전송 내용 확인 불가</p>}</details>
      {!allowed && currentRequest.status !== 'received' && <p className="journey-supporting">결과가 확인되지 않은 동안에는 같은 요청을 다시 보내지 않아요.</p>}
    </section>}
    {currentShare && <section className="journey-receipt" aria-label="공유 결과"><JourneyStatus tone={currentShare.status === 'confirmed' ? 'confirmed' : currentShare.status === 'failed' ? 'failed' : 'pending'}>
      {currentShare.status === 'confirmed' ? '공유 확인됨' : currentShare.status === 'failed' ? '공유 실패 확인됨' : '공유 결과 확인 중'}</JourneyStatus>
      <p>{currentShare.recipient}</p><details onToggle={pauseCollapsedMedia}><summary>공유 승인한 내용</summary><PayloadContent payload={currentShare.payload} caseId={value.id} active={active} /></details>
    </section>}
    {allowed && !preview && <>
      <label className="journey-recipient">수신처<input maxLength={100} value={draft.recipient} onChange={event => change({ recipient: event.target.value })} /></label>
      <p className="journey-supporting">목적 · {purposes[target]}</p>
      <fieldset className="journey-send-options"><legend>보낼 내용</legend>
        {value.observations.map(item => <label key={item.id}><input type="checkbox" checked={draft.selection.observationIds.includes(item.id)} onChange={() => toggle('observationIds', item.id)} /><span>{item.label} · {item.value}</span></label>)}
        {value.statements.map((item, index) => <label key={item.id}><input type="checkbox" checked={draft.selection.statementIds.includes(item.id)} onChange={() => toggle('statementIds', item.id)} /><span>남긴 이야기 {index + 1}<small>{item.text}{item.confirmedRevision !== item.revision ? ' · 확인 필요' : ''}</small></span></label>)}
        {value.evidence.map(item => <label key={item.id}><input type="checkbox" aria-label={item.label} disabled={item.availability !== 'available'} checked={draft.selection.evidenceIds.includes(item.id)} onChange={() => toggle('evidenceIds', item.id)} /><span>{item.label}{item.availability !== 'available' && <small>확보하지 못한 자료</small>}</span></label>)}
        {value.diagram && <label><input type="checkbox" checked={draft.selection.includeDiagram} onChange={event => change({ selection: { ...draft.selection, includeDiagram: event.target.checked } })} /><span>사고 도식{value.diagram.confirmedRevision !== value.diagram.revision && <small>확인 필요</small>}</span></label>}
        {value.report && <label><input type="checkbox" checked={draft.selection.includeReport} onChange={event => change({ selection: { ...draft.selection, includeReport: event.target.checked } })} /><span>경위서</span></label>}
      </fieldset>
      {target !== 'share' && <div className="journey-report-tools"><button onClick={() => { onCommand({ type: 'agency-decision', agency: target, decision: 'deferred' }); setError('지금은 보류했어요. 준비되면 다시 검토할 수 있어요.') }}>나중에 결정</button><button onClick={() => { onCommand({ type: 'agency-decision', agency: target, decision: 'declined' }); setError('전송하지 않기로 했어요. 남긴 기록은 유지돼요.') }}>전송하지 않기</button></div>}
    </>}
    {preview && <section className="journey-send-preview" aria-label="보낼 내용 미리보기">
      <h2>이 내용으로 요청할까요?</h2><p>{preview.input.recipient}</p><p className="journey-supporting">목적 · {purposes[target]}</p>
      <PayloadContent payload={preview.payload} caseId={value.id} active={active} onMediaFailure={() => setError(failures['missing-evidence'])} />
      <JourneyAction secondary disabled={busy} onClick={() => { setPreview(null); setError('') }}>선택 다시 하기</JourneyAction>
    </section>}
    {target !== 'share' && value.submissions.some(item => item.agency === target && item.id !== currentRequest?.id) && <details className="journey-receipt" onToggle={pauseCollapsedMedia}><summary>이전 요청 내용</summary>
      {value.submissions.filter(item => item.agency === target && item.id !== currentRequest?.id).map(item => <section key={item.id}><h3>{item.recipient ?? labels[target]}</h3>
        <p>{item.approvedAt ? new Date(item.approvedAt).toLocaleString('ko-KR') : '과거 요청'}</p>{item.payload ? <PayloadContent payload={item.payload} caseId={value.id} active={active} /> : <p>과거 전송 내용 확인 불가</p>}
      </section>)}
    </details>}
    {target === 'share' && value.shares.length > 1 && <details className="journey-receipt" onToggle={pauseCollapsedMedia}><summary>이전 공유 내용</summary>{value.shares.slice(0, -1).map(item => <section key={item.id}><h3>{item.recipient}</h3><PayloadContent payload={item.payload} caseId={value.id} active={active} /></section>)}</details>}
    {error && <p role="status">{error}</p>}
    <JourneyAction secondary disabled={busy || currentRequest?.transport === 'sending'} onClick={() => { setDrafts(emptyDrafts()); setPreview(null); setError(''); onCancel() }}>전송 검토 닫기</JourneyAction>
    {footer}
    </JourneyEditorLayout>

  </section>
}
