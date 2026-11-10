import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { JourneyAction, JourneyHeading, JourneyStatus } from './JourneyLayout'
import { ClipPlayer } from './ClipPlayer'
import { ReportPanel } from './ReportPanel'
import { SubmissionPanel } from './SubmissionPanel'
import { DiagramEditor } from './DiagramEditor'
import { readAsset } from './case-store'
import type { ApprovalInput, ApprovalCommitResult, PayloadSnapshot, CaseCommand, Evidence, JourneyCase } from './case'

export function StoredClip({ caseId, evidence, range, active = true }: { caseId: string; evidence: Evidence; range?: { start: number; end: number }; active?: boolean }) {
  const [media, setMedia] = useState<{ id: string | null; blob: Blob | null } | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!evidence.assetId) { setMedia({ id: null, blob: null }); return }
    void readAsset(caseId, evidence.assetId).then(blob => { if (!cancelled) setMedia({ id: evidence.assetId, blob }) })
    return () => { cancelled = true }
  }, [caseId, evidence.assetId])
  if (evidence.assetId && media?.id !== evidence.assetId) return <p role="status">영상을 불러오고 있어요.</p>
  return <ClipPlayer evidence={evidence} blob={media?.blob ?? null} range={range} active={active} />
}

export type JourneyReviewHandle = { finishBeforeLeave: () => Promise<boolean> }
export function JourneyReviewPanel({ value, onCommand, onApprove, ref }: { value: JourneyCase; onCommand: (command: CaseCommand) => void; onApprove: (input: ApprovalInput, preview: PayloadSnapshot) => Promise<ApprovalCommitResult>; ref?: Ref<JourneyReviewHandle> }) {
  const [tab, setTab] = useState<'clips' | 'diagram' | 'report'>('clips')
  const [diagramDirty, setDiagramDirty] = useState(false)
  const [reportDirty, setReportDirty] = useState(false)
  const [submission, setSubmission] = useState(false)
  const [submissionDirty, setSubmissionDirty] = useState(false)
  const reviewContent = useRef<HTMLDivElement>(null)
  const submissionContent = useRef<HTMLDivElement>(null)
  useEffect(() => { (submission ? submissionContent : reviewContent).current?.querySelector<HTMLElement>('h1')?.focus() }, [submission])
  const clips = value.evidence.filter(item => item.kind === 'video')
  useImperativeHandle(ref, () => ({ finishBeforeLeave: async () => !diagramDirty && !reportDirty && !submissionDirty }), [diagramDirty, reportDirty, submissionDirty])
  return <>
    <div ref={reviewContent} hidden={submission} className="journey-review-content">
    <JourneyHeading step="사고 내용 확인" title="남겨진 자료를 살펴보세요">확인할 수 없는 내용은 그대로 남겨도 돼요.</JourneyHeading>
    <nav className="journey-record-tabs journey-review-tabs" aria-label="확인할 자료">
      <button aria-pressed={tab === 'clips'} onClick={() => setTab('clips')}>사고 영상</button>
      <button aria-pressed={tab === 'diagram'} onClick={() => setTab('diagram')}>사고 도식</button>
      <button aria-pressed={tab === 'report'} onClick={() => setTab('report')}>경위서</button>
    </nav>
    <div hidden={tab !== 'clips'} className="journey-review-clips">
      {clips.length ? clips.map(item => <StoredClip key={item.id} caseId={value.id} evidence={item} active={!submission && value.stage === 'review' && tab === 'clips'} />)
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
    <div hidden={tab !== 'report'}><ReportPanel value={value} onCommand={onCommand} active={!submission && value.stage === 'review' && tab === 'report'} onDirtyChange={setReportDirty} /></div>
    <JourneyAction disabled={diagramDirty || reportDirty} onClick={() => setSubmission(true)}>보낼 내용 확인</JourneyAction>
    </div>
    <div ref={submissionContent} hidden={!submission}><SubmissionPanel value={value} onApprove={onApprove} onCommand={onCommand} active={submission && value.stage === 'review'} onCancel={() => setSubmission(false)} onDirtyChange={setSubmissionDirty} /></div>
  </>
}
