import { useEffect, useImperativeHandle, useRef, useState, type Ref, type ReactNode } from 'react'
import { JourneyAction, JourneyEditorLayout, JourneyStatus } from './JourneyLayout'
import { ClipPlayer } from './ClipPlayer'
import { EvidenceView, ReportPanel, type ReportPanelHandle } from './ReportPanel'
import { SubmissionPanel, type SubmissionPanelHandle } from './SubmissionPanel'
import { DiagramEditor } from './DiagramEditor'
import { useCaseData } from './case-data'
import type { ApprovalInput, ApprovalCommitResult, CommitResult, PayloadSnapshot, CaseCommand, Evidence, JourneyCase } from './case'
import { CopyPanel } from '@/product/CopyPanel'

export function StoredClip({ caseId, evidence, revision, saving, range, active = true }: { caseId: string; evidence: Evidence; revision: number; saving: boolean; range?: { start: number; end: number }; active?: boolean }) {
  const data = useCaseData()
  const [media, setMedia] = useState<{ caseId: string; id: string | null; revision: number; blob: Blob | null } | null>(null)
  useEffect(() => {
    // Metadata can render before its atomic asset commit. A miss belongs to that durable revision,
    // not permanently to the asset ID; successfully loaded immutable bytes remain cached.
    if (media?.caseId === caseId && media.id === evidence.assetId &&
      (!evidence.assetId || media.blob || media.revision === revision)) return
    let cancelled = false
    if (!evidence.assetId) { setMedia({ caseId, id: null, revision, blob: null }); return }
    void data.readAsset(caseId, evidence.assetId).then(blob => {
      if (!cancelled) setMedia({ caseId, id: evidence.assetId, revision, blob })
    }).catch(() => { if (!cancelled) setMedia({ caseId, id: evidence.assetId, revision, blob: null }) })
    return () => { cancelled = true }
  }, [data, caseId, evidence.assetId, revision, media])
  const current = media?.caseId === caseId && media.id === evidence.assetId ? media : null
  if (evidence.assetId && (!current || !current.blob && (saving || current.revision !== revision))) {
    return <p role="status">{saving ? '영상을 보관하고 있어요.' : '영상을 불러오고 있어요.'}</p>
  }
  return <ClipPlayer evidence={evidence} blob={current?.blob ?? null} range={range} active={active} />
}

export type JourneyReviewHandle = { finishBeforeLeave: () => Promise<boolean>; openSubmission: () => void; preserveDraft: () => void; recoveryCommand: () => CaseCommand | null }
export function JourneyReviewPanel({ value, saving, reloading, onCommand, onApprove, reloadVersion = 0, explicitTransport=false, mode='study', ref, footer }: { footer?:ReactNode; reloadVersion?: number; explicitTransport?: boolean; mode?:'study'|'product'; value: JourneyCase; saving: boolean; reloading: boolean; onCommand: (command: CaseCommand) => Promise<CommitResult>; onApprove: (input: ApprovalInput, preview: PayloadSnapshot) => Promise<ApprovalCommitResult>; ref?: Ref<JourneyReviewHandle> }) {
  const [tab, setTab] = useState<'records' | 'clips' | 'diagram' | 'report'>(mode === 'product' ? 'records' : 'clips')
  const [diagramDirty, setDiagramDirty] = useState(false)
  const [reportDirty, setReportDirty] = useState(false)
  const [submission, setSubmission] = useState(false)
  const [submissionDirty, setSubmissionDirty] = useState(false)
  const [opened, setOpened] = useState<string | null>(null)
  const [recordError, setRecordError] = useState('')
  const reviewContent = useRef<HTMLDivElement>(null)
  const submissionContent = useRef<HTMLDivElement>(null)
  const reportPanel = useRef<ReportPanelHandle>(null)
  const submissionPanel = useRef<SubmissionPanelHandle>(null)
  useEffect(() => { (submission ? submissionContent : reviewContent).current?.querySelector<HTMLElement>('h1')?.focus({preventScroll:true}) }, [submission])
  const clips = value.evidence.filter(item => item.kind === 'video')
  useImperativeHandle(ref, () => ({ preserveDraft: () => { reportPanel.current?.preserveDraft(); submissionPanel.current?.preserveDraft() }, recoveryCommand: () => reportPanel.current?.recoveryCommand() ?? null, finishBeforeLeave: async () => !diagramDirty && !reportDirty && !submissionDirty, openSubmission: () => { if (!diagramDirty && !reportDirty) setSubmission(true) } }), [diagramDirty, reportDirty, submissionDirty])
  return <>
    <div ref={reviewContent} hidden={submission} inert={reloading} aria-busy={reloading} className="journey-review-content journey-editor-panel">
    <JourneyEditorLayout guidanceKey={tab+'/'+submission} step="사고 내용 확인" title={mode === 'product' ? '남긴 내용을 확인하세요' : '남겨진 자료를 살펴보세요'} description={'확실하지 않은 내용은 미확인으로 남겨도 돼요.'} primary={<JourneyAction disabled={diagramDirty || reportDirty} onClick={() => setSubmission(true)}>{mode === 'product' ? '내 사본 범위 선택' : '보낼 내용 확인'}</JourneyAction>}>

    <nav className="journey-record-tabs journey-review-tabs" aria-label="확인할 자료">
      {mode === 'product' && <button aria-pressed={tab === 'records'} onClick={() => setTab('records')}>사진·음성·글</button>}
      <button aria-pressed={tab === 'clips'} onClick={() => setTab('clips')}>사고 영상</button>
      <button aria-pressed={tab === 'diagram'} onClick={() => setTab('diagram')}>사고 도식</button>
      <button aria-pressed={tab === 'report'} onClick={() => setTab('report')}>경위서</button>
    </nav>
    {mode === 'product' && <div hidden={tab !== 'records'} className="product-record-review">
      {!value.statements.length && !value.evidence.some(item => item.kind !== 'video') && <p className="journey-supporting">아직 남긴 기록이 없어요. 지금 기록하지 않고 이후 할 일을 확인해도 돼요.</p>}
      {value.statements.map(item => <article key={item.id}><h2>직접 남긴 내용</h2><p>{item.text}</p>{item.confirmedRevision === item.revision ? <JourneyStatus tone="confirmed">내용 확인함</JourneyStatus> : <JourneyAction secondary disabled={saving || !item.text.trim()} onClick={async () => { const result = await onCommand({ type: 'statement-confirm', id: item.id }); if (!result.ok) setRecordError('내용 확인을 저장하지 못했어요. 입력은 그대로 있어요.') }}>이 내용 확인</JourneyAction>}</article>)}
      {value.evidence.filter(item => item.kind !== 'video').map(item => <article key={item.id}><h2>{item.label}</h2><p className="journey-supporting">{item.metadata.sourceLabel} · {item.availability === 'available' ? '원본 보관됨' : '원본 없음'}</p><JourneyAction secondary disabled={item.availability !== 'available'} onClick={() => { setOpened(opened === item.id ? null : item.id); setRecordError('') }}>{opened === item.id ? '원본 닫기' : '원본 확인'}</JourneyAction>{opened === item.id && tab === 'records' && !submission && value.stage === 'review' && <EvidenceView caseId={value.id} evidence={item} reference={{ evidenceId:item.id, evidenceRevision:item.revision, start:null, end:null }} onFailure={() => setRecordError('원본을 열지 못했어요. 다시 연결한 뒤 확인해주세요.')} />}</article>)}
      {recordError && <p role="status" className="journey-supporting">{recordError}</p>}
    </div>}
    <div hidden={tab !== 'clips'} className="journey-review-clips">
      {clips.length ? clips.map(item => <StoredClip key={item.id} caseId={value.id} evidence={item} revision={value.revision} saving={saving} active={!submission && value.stage === 'review' && tab === 'clips'} />)
        : <p className="journey-supporting">제공된 영상이 없어요. 남긴 기록으로 계속 확인할 수 있어요.</p>}
    </div>
    <div hidden={tab !== 'diagram'}>
      {value.diagram ? <>
        <DiagramEditor value={value.diagram} original={value.diagramHistory[0] ?? value.diagram} onDirtyChange={setDiagramDirty} onChange={diagram => onCommand({ type: 'diagram-edit', diagram })} />
        {value.diagram.road !== 'unsupported' && (value.diagram.confirmedRevision === value.diagram.revision
          ? <JourneyStatus tone="confirmed">도식 내용 확인함</JourneyStatus>
          : <JourneyAction secondary disabled={diagramDirty} onClick={() => onCommand({ type: 'diagram-confirm' })}>도식 내용 확인</JourneyAction>)}
      </> : <p className="journey-supporting">아직 확인할 도식이 없어요. 기억나는 내용만 기록해도 돼요.</p>}
    </div>
    <div hidden={tab !== 'report'}><ReportPanel ref={reportPanel} value={value} onCommand={onCommand} reloadVersion={reloadVersion} active={!submission && value.stage === 'review' && tab === 'report'} onDirtyChange={setReportDirty} /></div>
    {footer}
    </JourneyEditorLayout>

    </div>
    <div ref={submissionContent} hidden={!submission} inert={reloading} aria-busy={reloading} className="journey-editor-holder">{mode === 'product' ? <CopyPanel value={value} onApprove={onApprove} active={submission && value.stage === 'review' && !value.suspended} onCancel={() => setSubmission(false)} onDirtyChange={setSubmissionDirty} /> : <SubmissionPanel ref={submissionPanel} footer={footer} explicitTransport={explicitTransport} value={value} onApprove={onApprove} onCommand={onCommand} active={submission && value.stage === 'review'} onCancel={() => setSubmission(false)} onDirtyChange={setSubmissionDirty} />}</div>
  </>
}
