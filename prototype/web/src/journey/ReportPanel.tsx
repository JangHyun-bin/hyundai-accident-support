import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { FileText, X } from 'lucide-react'
import { JourneyAction, JourneyStatus } from './JourneyLayout'
import { ClipPlayer } from './ClipPlayer'
import { evidenceForReference, LIMITS, type CaseCommand, type CommitResult, type Evidence, type EvidenceReference, type JourneyCase, type ReportParagraph } from './case'
import { openEvidence } from './evidence-media'
import './report.css'

const kinds = { observation: '자료 관측', statement: '사용자 진술', inference: '추정', unknown: '미확인' }
type Draft = { id: string; text: string; references: EvidenceReference[]; isNew: boolean }

export function EvidenceView({ caseId, evidence, reference, onFailure }: { caseId: string; evidence: Evidence | null; reference: EvidenceReference; onFailure: () => void }) {
  const [media, setMedia] = useState<{ blob: Blob; url: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const failure = useRef(onFailure)
  failure.current = onFailure
  useEffect(() => {
    let cancelled = false
    let url = ''
    setMedia(null); setFailed(false)
    async function load() {
      try {
        if (!evidence) throw new Error('Missing reference')
        const blob = await openEvidence(caseId, evidence, reference)
        if (cancelled) return
        url = URL.createObjectURL(blob); setMedia({ blob, url })
      } catch { if (!cancelled) { setFailed(true); failure.current() } }
    }
    void load()
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [caseId, evidence?.id, evidence?.revision, evidence?.assetId, reference.start, reference.end])
  if (failed) return <p role="status">근거를 열 수 없어요</p>
  if (!media || !evidence) return <p role="status">근거를 불러오고 있어요.</p>
  if (evidence.kind === 'video') return <ClipPlayer evidence={evidence} blob={media.blob} range={reference.start !== null && reference.end !== null ? { start: reference.start, end: reference.end } : undefined} />
  return <section className="journey-report-evidence"><h3>{evidence.label}</h3>
    {evidence.kind === 'photo' ? <img src={media.url} alt={evidence.label} onError={() => { setFailed(true); failure.current() }} />
      : <audio controls src={media.url} aria-label={evidence.label} onError={() => { setFailed(true); failure.current() }}
        onLoadedMetadata={event => { if (reference.start !== null) event.currentTarget.currentTime = reference.start }}
        onTimeUpdate={event => { if (reference.end !== null && event.currentTarget.currentTime >= reference.end) event.currentTarget.pause() }} />}
    <p className="journey-supporting">{evidence.metadata.sourceLabel}</p>
  </section>
}

export type ReportPanelHandle = { preserveDraft: () => void; recoveryCommand: () => CaseCommand | null }
export function ReportPanel({ value, onCommand, reloadVersion = 0, active = true, onDirtyChange, ref }: {
  value: JourneyCase; onCommand: (command: CaseCommand) => Promise<CommitResult>; reloadVersion?: number; active?: boolean; onDirtyChange?: (dirty: boolean) => void
  ref?: Ref<ReportPanelHandle>
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [drawer, setDrawer] = useState<string | null>(null)
  const [checking, setChecking] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const savingDraft = useRef(false)
  const panel = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const current = useRef(value)
  current.current = value
  const paragraphs = value.report?.paragraphs ?? []
  const selected = paragraphs.find(p => p.id === drawer)
  const dirty = draft !== null
  function recoveryCommand(): Extract<CaseCommand, { type: 'paragraph-edit' }> | null {
    if (!draft) return null
    const text = panel.current?.querySelector('textarea')?.value ?? draft.text
    return { type: 'paragraph-edit', id: draft.id, references: draft.references, text }
  }
  useImperativeHandle(ref, () => ({ preserveDraft: () => {
    const command = recoveryCommand()
    if (command?.type === 'paragraph-edit' && draft && command.text !== draft.text) setDraft({ ...draft, text: command.text })
  }, recoveryCommand }))
  useEffect(() => { setDraft(null); setMessage('') }, [reloadVersion])
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    const node = dialog.current
    if (drawer && selected && active) node?.showModal()
    else { node?.close(); if (!active) setDrawer(null) }
  }, [drawer, !!selected, active])

  function failed(paragraph: ReportParagraph) {
    setErrors(previous => ({ ...previous, [paragraph.id]: '근거를 열 수 없어요' }))
    onCommand({ type: 'paragraph-unconfirm', id: paragraph.id, revision: paragraph.revision })
  }
  async function confirm(paragraph: ReportParagraph) {
    const source = value
    setChecking(paragraph.id)
    try {
      for (const reference of paragraph.references) {
        const evidence = evidenceForReference(source, reference)
        if (!evidence) throw new Error('Broken reference')
        await openEvidence(source.id, evidence, reference)
      }
      if (current.current.id !== source.id || current.current.report?.revision !== source.report?.revision) return
      setErrors(previous => { const next = { ...previous }; delete next[paragraph.id]; return next })
      onCommand({ type: 'paragraph-confirm', id: paragraph.id, revision: paragraph.revision })
    } catch { if (current.current.id === source.id) failed(paragraph) }
    finally { setChecking(null) }
  }
  async function saveDraft() {
    const command = recoveryCommand()
    if (!command || savingDraft.current) return
    savingDraft.current = true; setSaving(true); setMessage('')
    try {
      const result = await onCommand(command)
      if (!result.ok) {
        setMessage(result.rejection === 'paragraph-limit'
          ? `경위서는 ${LIMITS.reportParagraphs}문장까지 남길 수 있어요. 기존 문장을 수정하거나 제외해주세요.`
          : result.rejection ? '문장을 저장할 수 없어요. 입력 내용을 확인해주세요.'
          : '저장하지 못했어요. 정정 내용은 이 화면에 남아 있어요.')
        panel.current?.querySelector('textarea')?.focus({ preventScroll: true })
        return
      }
      panel.current?.focus(); setDraft(null)
      setErrors(previous => { const next = { ...previous }; delete next[command.id]; return next })
    } catch {
      setMessage('저장하지 못했어요. 정정 내용은 이 화면에 남아 있어요.')
      panel.current?.querySelector('textarea')?.focus({ preventScroll: true })
    } finally { savingDraft.current = false; setSaving(false) }
  }
  function editor() {
    if (!draft) return null
    const references = paragraphs.find(p => p.id === draft.id)?.references ?? []
    return <div className="journey-report-editor">
      <label htmlFor={`report-edit-${draft.id}`}>문장 내용</label><textarea id={`report-edit-${draft.id}`} autoFocus value={draft.text} readOnly={saving} maxLength={LIMITS.statementLength} onChange={event => setDraft({ ...draft, text: event.target.value })} />
      <span className="journey-supporting">{draft.text.length} / {LIMITS.statementLength}</span>
      {references.map((reference, index) => <label className="journey-report-reference-choice" key={index}>
        <input type="checkbox" checked={draft.references.some(item => JSON.stringify(item) === JSON.stringify(reference))} onChange={event => setDraft({ ...draft,
          references: event.target.checked ? [...draft.references, reference] : draft.references.filter(item => JSON.stringify(item) !== JSON.stringify(reference)),
        })} />
        {value.evidence.find(e => e.id === reference.evidenceId)?.label ?? '확보하지 못한 자료'} 포함
      </label>)}
      {message && <p role="status" className="journey-report-error">{message}</p>}
      <JourneyAction disabled={saving || !draft.text.trim()} onClick={() => void saveDraft()}>{saving ? '정정 저장 중' : '정정 저장'}</JourneyAction>
      <JourneyAction secondary disabled={saving} onClick={() => { panel.current?.focus(); setDraft(null); setMessage('') }}>정정 취소</JourneyAction>
    </div>
  }
  return <section ref={panel} tabIndex={-1} className="journey-report" aria-label="경위서 검토">
    <header className="journey-report-heading"><FileText aria-hidden="true" /><div><h2>내용을 한 문장씩 확인해주세요</h2><p className="journey-supporting">추정과 미확인은 확인한 뒤에도 그대로 표시돼요.</p></div></header>
    {!paragraphs.length && <p className="journey-supporting">아직 작성된 경위서가 없어요.</p>}
    {paragraphs.map((paragraph, index) => {
      if (draft?.isNew && draft.id === paragraph.id) return null
      const broken = paragraph.references.some(reference => !evidenceForReference(value, reference))
      const original = value.reportHistory.flatMap(report => report.paragraphs).find(p => p.id === paragraph.id)
      const corrected = original && original.text !== paragraph.text
      return <article tabIndex={-1} className="journey-report-paragraph" aria-label={`문장 ${index + 1}`} key={paragraph.id}>
        <div className="journey-report-meta"><span>{kinds[paragraph.kind]}{corrected ? ' · 사용자 정정' : ''}</span>
          <JourneyStatus tone={paragraph.confirmedRevision === paragraph.revision && !broken && !errors[paragraph.id] ? 'confirmed' : 'unknown'}>
            {paragraph.confirmedRevision === paragraph.revision && !broken && !errors[paragraph.id] ? '내용 확인함' : '확인 필요'}
          </JourneyStatus></div>
        {draft?.id === paragraph.id ? editor() : <>
          <p className="journey-report-text">{paragraph.text}</p>
          {corrected && <details className="journey-report-original"><summary>원문 보기</summary><p>{original.text}</p></details>}
          {(broken || errors[paragraph.id]) && <p className="journey-report-error" role="status">근거를 열 수 없어요</p>}
          <div className="journey-report-tools">
            {paragraph.references.length > 0 && <button type="button" onClick={event => { trigger.current = event.currentTarget; setDrawer(paragraph.id) }}>근거 보기</button>}
            <button type="button" disabled={dirty || checking !== null} onClick={() => { setMessage(''); setDraft({ id: paragraph.id, text: paragraph.text, references: structuredClone(paragraph.references), isNew: false }) }}>정정하기</button>
            <button type="button" disabled={dirty || checking !== null} onClick={() => { panel.current?.focus(); onCommand({ type: 'paragraph-remove', id: paragraph.id }) }}>문장 제외</button>
          </div>
          {paragraph.confirmedRevision !== paragraph.revision && <JourneyAction secondary disabled={dirty || checking !== null || broken} onClick={event => { event.currentTarget.closest('article')?.focus(); void confirm(paragraph) }}>{checking === paragraph.id ? '근거 확인 중' : '문장 확인'}</JourneyAction>}
        </>}
      </article>
    })}
    {draft && (draft.isNew || !paragraphs.some(p => p.id === draft.id)) && editor()}
    <p className="journey-supporting" role="status">경위서 {paragraphs.length} / {LIMITS.reportParagraphs}문장{paragraphs.length >= LIMITS.reportParagraphs ? ' · 문장 추가 한도에 도달했어요. 기존 문장은 수정하거나 제외할 수 있어요.' : ''}</p>
    <JourneyAction secondary disabled={dirty || checking !== null || paragraphs.length >= LIMITS.reportParagraphs} onClick={() => { setMessage(''); setDraft({ id: crypto.randomUUID(), text: '', references: [], isNew: true }) }}>문장 추가</JourneyAction>
    {value.pendingReport && <details className="journey-report-candidate"><summary>새 초안 비교</summary>
      <p className="journey-supporting">현재 내용은 교체하기 전까지 유지돼요. 교체한 뒤에는 다시 확인해주세요.</p>
      {value.pendingReport.basedOnRevision !== value.contentRevision && <p role="status">최근 정정 내용이 반영되지 않은 초안이에요.</p>}
      <h3>현재 내용</h3>{paragraphs.map(p => <p key={p.id}>{p.text}</p>)}
      <h3>새 초안</h3>{value.pendingReport.paragraphs.map(p => <p key={p.id}><span className="journey-supporting">{kinds[p.kind]}</span><br />{p.text}</p>)}
      <JourneyAction disabled={dirty || checking !== null} onClick={() => onCommand({ type: 'report-apply-pending' })}>이 초안으로 교체</JourneyAction>
    </details>}
    <dialog className="journey-report-drawer" ref={dialog} aria-labelledby="report-evidence-title" onCancel={() => setDrawer(null)} onClose={() => {
      setDrawer(null)
      if (active && trigger.current?.getClientRects().length) trigger.current.focus()
    }}>
      <header><h2 id="report-evidence-title">문장의 근거</h2><button type="button" aria-label="근거 닫기" onClick={() => setDrawer(null)}><X aria-hidden="true" /></button></header>
      {selected && <><p className="journey-report-text">{selected.text}</p>{selected.references.map((reference, index) => <EvidenceView
        key={`${reference.evidenceId}-${reference.evidenceRevision}-${index}`} caseId={value.id} evidence={evidenceForReference(value, reference)} reference={reference} onFailure={() => failed(selected)} />)}</>}
    </dialog>
  </section>
}
