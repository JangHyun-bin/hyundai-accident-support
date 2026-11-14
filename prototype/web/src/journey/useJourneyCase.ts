import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useCaseData } from './case-data'
import { JourneyCaseSync, type CaseSyncSnapshot, type LocalRecoveryDraft } from './case-sync'
import type { ApprovalInput, ApprovalCommitResult, AssetWrite, CaseCommand, CommitResult, JourneyCase, PayloadSnapshot } from './case'

export type { LocalRecoveryDraft, Recovery, SaveState } from './case-sync'
export type JourneyCaseController = CaseSyncSnapshot & {
  dispatch: (command: CaseCommand) => void
  save: (command: CaseCommand, assets?: AssetWrite[]) => Promise<CommitResult>
  approve: (input: ApprovalInput, preview: PayloadSnapshot) => Promise<ApprovalCommitResult>
  approveCopy: (input: ApprovalInput, preview: PayloadSnapshot) => Promise<ApprovalCommitResult>
  flush: () => Promise<CommitResult>
  start: (record: JourneyCase) => Promise<CommitResult>
  reload: (draft?: LocalRecoveryDraft) => Promise<void>
}

export function useJourneyCase(caseId: string | null): JourneyCaseController {
  const data = useCaseData()
  const sync = useMemo(() => new JourneyCaseSync(data), [data])
  const snapshot = useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getSnapshot)
  useEffect(() => { void sync.open(caseId) }, [sync, caseId])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const state = sync.getSnapshot()
      if (data.mode === 'remote' && state.durable || !state.value || state.saveState === 'saved' && !state.recoveries.length) return
      event.preventDefault(); event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [data, sync])
  useEffect(() => {
    if (data.mode !== 'remote') return
    const reconnect = () => {
      if (!sync.getSnapshot().value) return
      void sync.flush().then(() => sync.refresh(), () => sync.refresh())
    }
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void sync.refresh() }, 4000)
    window.addEventListener('online', reconnect)
    window.addEventListener('focus', reconnect)
    return () => { clearInterval(timer); window.removeEventListener('online', reconnect); window.removeEventListener('focus', reconnect) }
  }, [data, sync])
  return { ...snapshot, dispatch: sync.dispatch, save: sync.save, approve: sync.approve, approveCopy: sync.approveCopy,
    flush: sync.flush, start: sync.start, reload: sync.reload }
}
