import { useCallback, useEffect, useRef, useState } from 'react'
import { commitCase, loadCase } from './case-store'
import { openEvidence } from './evidence-media'
import { LIMITS, makeSubmission, makeShare, preparePayload, reduceCase, type ApprovalInput, type ApprovalCommitResult, type PayloadSnapshot, type AssetWrite, type CaseCommand, type CommitResult, type JourneyCase } from './case'

type SaveState = 'saved' | 'saving' | 'conflict' | 'unavailable' | 'quota' | 'invalid'
export type LocalRecoveryDraft = { commands: CaseCommand[]; assets: AssetWrite[] }
export type Recovery = { value: JourneyCase; assets: AssetWrite[]; commands: CaseCommand[] }
export type JourneyCaseController = {
  value: JourneyCase | null; loading: boolean; missing: boolean; saveState: SaveState
  recoveries: Recovery[]; reloadVersion: number
  dispatch: (command: CaseCommand) => void
  save: (command: CaseCommand, assets?: AssetWrite[]) => Promise<CommitResult>
  approve: (input: ApprovalInput, preview: PayloadSnapshot) => Promise<ApprovalCommitResult>
  flush: () => Promise<CommitResult>
  start: (record: JourneyCase) => Promise<CommitResult>
  reload: (draft?: LocalRecoveryDraft) => Promise<void>
}

export function useJourneyCase(initialId: string | null): JourneyCaseController {
  const [value, setValue] = useState<JourneyCase | null>(null)
  const [loading, setLoading] = useState(!!initialId)
  const [missing, setMissing] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [recoveries, setRecoveries] = useState<Recovery[]>([])
  const [reloadVersion, setReloadVersion] = useState(0)
  const current = useRef<JourneyCase | null>(null)
  const persistedRevision = useRef<number | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const pendingAssets = useRef(new Map<string, AssetWrite>())
  const change = useRef(0)
  const savedChange = useRef(0)
  const conflicted = useRef(false)
  const epoch = useRef(0)

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!recoveries.length && (!current.current || change.current === savedChange.current && !conflicted.current)) return
      event.preventDefault(); event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [recoveries])

  const adopt = useCallback((record: JourneyCase) => {
    epoch.current += 1
    current.current = record
    persistedRevision.current = record.revision || null
    change.current = 0
    savedChange.current = record.revision ? 0 : -1
    conflicted.current = false
    pendingAssets.current.clear()
    setValue(record); setMissing(false); setSaveState(record.revision ? 'saved' : 'saving')
  }, [])

  useEffect(() => {
    if (!initialId) return
    let cancelled = false
    void loadCase(initialId).then(record => {
      if (cancelled) return
      if (record) adopt(record)
      else setMissing(true)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [initialId, adopt])

  const flush = useCallback((): Promise<CommitResult> => {
    const requestedEpoch = epoch.current
    const job = queue.current.then(async (): Promise<CommitResult> => {
      if (epoch.current !== requestedEpoch) return { ok: false, reason: 'conflict', draft: current.current! }
      const snapshot = current.current
      if (!snapshot) throw new Error('No incident is open')
      if (conflicted.current) return { ok: false, reason: 'conflict', draft: snapshot }
      if (change.current === savedChange.current && snapshot.revision > 0) return { ok: true, value: snapshot }
      const generation = change.current
      const generationEpoch = epoch.current
      const writes = [...pendingAssets.current.values()]
      setSaveState('saving')
      const result = await commitCase(snapshot, persistedRevision.current, writes)
      if (epoch.current !== generationEpoch || current.current?.id !== snapshot.id) return result
      if (result.ok) {
        persistedRevision.current = result.value.revision
        savedChange.current = generation
        for (const write of writes) pendingAssets.current.delete(write.id)
        // 저장 중 들어온 위험 event나 새 입력은 과거 snapshot으로 되돌리지 않음.
        const latest = current.current === snapshot ? result.value
          : { ...current.current, revision: result.value.revision, updatedAt: result.value.updatedAt }
        current.current = latest
        setValue(latest)
        setSaveState(change.current === generation ? 'saved' : 'saving')
      } else {
        conflicted.current = result.reason === 'conflict'
        setSaveState(result.reason)
      }
      return result
    })
    queue.current = job.then(() => {}, () => {})
    return job
  }, [])

  const save = useCallback((command: CaseCommand, assets: AssetWrite[] = []): Promise<CommitResult> => {
    const previous = current.current
    if (!previous) return Promise.reject(new Error('No incident is open'))
    const saveEpoch = epoch.current
    const next = reduceCase(previous, command)
    if (next === previous && command.type === 'paragraph-edit') {
      const full = !previous.report?.paragraphs.some(p => p.id === command.id) && (previous.report?.paragraphs.length ?? 0) >= LIMITS.reportParagraphs
      return Promise.resolve({ ok: false, reason: 'invalid', rejection: full ? 'paragraph-limit' : 'invalid-command', draft: previous })
    }
    if (next === previous && assets.length && !assets.every(asset => pendingAssets.current.get(asset.id)?.blob === asset.blob)) {
      return Promise.resolve({ ok: false, reason: 'invalid', draft: previous })
    }
    if (next !== previous) {
      for (const asset of assets) pendingAssets.current.set(asset.id, asset)
      current.current = next
      change.current += 1
      setValue(next); setSaveState('saving')
    }
    return flush().then(result => {
      if (result.ok || epoch.current !== saveEpoch || (!assets.length && command.type !== 'voice-save') || current.current?.id !== previous.id) return result
      // Media 실패는 해당 편집만 복원. 그동안 들어온 긴급 상태와 다른 편집은 유지.
      const latest = current.current
      const restored = { ...latest }
      for (const key of Object.keys(next) as (keyof JourneyCase)[]) {
        if (JSON.stringify(next[key]) !== JSON.stringify(previous[key]) && JSON.stringify(latest[key]) === JSON.stringify(next[key])) {
          Object.assign(restored, { [key]: previous[key] })
        }
      }
      const referenced = new Set([...restored.evidence, ...restored.evidenceHistory,
        ...restored.submissions.flatMap(item => item.payload?.evidence ?? []), ...restored.shares.flatMap(item => item.payload.evidence)].map(item => item.assetId))
      for (const asset of assets) if (!referenced.has(asset.id)) pendingAssets.current.delete(asset.id)
      current.current = restored
      change.current += 1
      setValue(restored)
      return result
    })
  }, [flush])

  const approve = useCallback(async (input: ApprovalInput, preview: PayloadSnapshot): Promise<ApprovalCommitResult> => {
    const caseId = current.current?.id
    const approvalEpoch = epoch.current
    const saved = await flush()
    if (!saved.ok) return saved
    const job = queue.current.then(async (): Promise<ApprovalCommitResult> => {
      const source = current.current!
      if (epoch.current !== approvalEpoch || source.id !== caseId) return { ok: false, reason: 'unreviewed-content' }
      if (conflicted.current) return { ok: false, reason: 'conflict', draft: source }
      const selected = preparePayload(source, input.selection)
      if (!selected.ok) return selected
      if (JSON.stringify(selected.value) !== JSON.stringify(preview)) return { ok: false, reason: 'unreviewed-content' }
      try {
        for (const evidence of selected.value.evidence) await openEvidence(source.id, evidence)
        for (const paragraph of selected.value.report?.paragraphs ?? []) {
          for (const reference of paragraph.references) {
            const evidence = selected.value.evidence.find(item => item.id === reference.evidenceId)!
            await openEvidence(source.id, evidence, reference)
          }
        }
      } catch { return { ok: false, reason: 'missing-evidence' } }
      const latest = current.current!
      if (epoch.current !== approvalEpoch || latest.id !== source.id) return { ok: false, reason: 'unreviewed-content' }
      const payload = preparePayload(latest, input.selection)
      if (!payload.ok) return payload
      if (JSON.stringify(payload.value) !== JSON.stringify(preview)) return { ok: false, reason: 'unreviewed-content' }
      const approval = input.kind === 'submission' ? makeSubmission(latest, input) : makeShare(latest, input)
      if (!approval.ok) return approval
      const generation = change.current
      const writes = [...pendingAssets.current.values()]
      setSaveState('saving')
      const result = await commitCase(approval.value, persistedRevision.current, writes)
      if (epoch.current !== approvalEpoch || current.current?.id !== caseId) return { ok: false, reason: 'unreviewed-content' }
      if (!result.ok) {
        conflicted.current = result.reason === 'conflict'
        setSaveState(result.reason)
        return result
      }
      persistedRevision.current = result.value.revision
      savedChange.current = generation
      for (const write of writes) pendingAssets.current.delete(write.id)
      const live = current.current!
      const committed = { ...live, revision: result.value.revision, updatedAt: result.value.updatedAt }
      // 승인 저장 중 들어온 긴급 event와 새 입력은 유지하고 승인 이력만 합침.
      if (input.kind === 'submission') {
        committed.submissions = [...live.submissions, result.value.submissions.at(-1)!]
        committed.activeSubmissionIds = { ...live.activeSubmissionIds, [input.agency]: input.id }
        committed.emergency = { ...live.emergency, requests: { ...live.emergency.requests, [input.agency]: result.value.emergency.requests[input.agency] } }
      } else committed.shares = [...live.shares, result.value.shares.at(-1)!]
      current.current = committed
      setValue(committed)
      setSaveState(change.current === generation ? 'saved' : 'saving')
      return { ok: true, value: committed }
    })
    queue.current = job.then(() => {}, () => {})
    return job
  }, [flush])

  const dispatch = useCallback((command: CaseCommand) => { void save(command) }, [save])

  const start = useCallback(async (record: JourneyCase) => {
    if (current.current) {
      const saved = await flush()
      if (!saved.ok) return saved
    }
    adopt(record)
    return flush()
  }, [adopt, flush])

  const reload = useCallback(async (draft: LocalRecoveryDraft = { commands: [], assets: [] }) => {
    const source = current.current
    if (!source) return
    const reloadEpoch = epoch.current
    const latest = await loadCase(source.id)
    if (epoch.current !== reloadEpoch || current.current?.id !== source.id) return
    if (latest) {
      const commands = draft.commands
      const recovery = {
        value: commands.reduce(reduceCase, structuredClone(current.current)),
        assets: [...pendingAssets.current.values(), ...draft.assets],
        commands,
      }
      setRecoveries(previous => [...previous, recovery]); adopt(latest)
      setReloadVersion(previous => previous + 1)
    } else setMissing(true)
  }, [adopt])

  return { value, loading, missing, saveState, recoveries, reloadVersion, dispatch, save, approve, flush, start, reload }
}
