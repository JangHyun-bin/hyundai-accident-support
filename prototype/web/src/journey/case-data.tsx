import { createContext, useContext, type ReactNode } from 'react'
import { commitCase, loadCase, readAsset } from './case-store'
import type { ApprovalInput, AssetWrite, CaseCommand, JourneyCase, PayloadSnapshot } from './case'
import type { DraftDurability, EditorDraftData } from './editor-drafts'
import { createProductOutbox, tabDraftId, type ProductOutbox } from '../product/product-outbox'

export type CaseLoadResult = { kind: 'found'; value: JourneyCase } | { kind: 'missing' | 'access-required' | 'forbidden' | 'unavailable' }
export type CaseDataFailure = 'conflict' | 'unavailable' | 'quota' | 'invalid' | 'access-required' | 'forbidden'
export type CaseWriteResult =
  | { ok: true; value: JourneyCase; ackMutationId: string; ackRevision: number }
  | { ok: false; reason: CaseDataFailure; latest?: JourneyCase }
type BatchBase = { mutationId: string; expectedRevision: number | null; base: JourneyCase | null; local: JourneyCase; assets: AssetWrite[]; createdAt: string }
export type CaseChangeBatch = BatchBase & { kind: 'changes'; commands: CaseCommand[] }
export type CaseCopyBatch = BatchBase & { kind: 'copy'; input: ApprovalInput; preview: PayloadSnapshot }
export type CaseStartBatch = BatchBase & { kind: 'start' }
export type CaseBatch = CaseChangeBatch | CaseCopyBatch | CaseStartBatch
export type StoredCaseBatch = { batch: CaseBatch; status: 'pending' | 'conflict' | 'recovery'; latest: JourneyCase | null }
export type CaseOutbox = {
  stageBatch: (batch: CaseBatch) => Promise<DraftDurability>
  readBatches: (caseId: string) => Promise<StoredCaseBatch[]>
  acknowledgeBatch: (caseId: string, mutationId: string) => Promise<DraftDurability>
  markBatch: (caseId: string, mutationId: string, status: StoredCaseBatch['status'], latest: JourneyCase | null) => Promise<DraftDurability>
}
export type CaseData = EditorDraftData & CaseOutbox & {
  mode: 'remote' | 'study'
  load: (caseId: string) => Promise<CaseLoadResult>
  apply: (batch: CaseChangeBatch | CaseStartBatch) => Promise<CaseWriteResult>
  approveCopy: (batch: CaseCopyBatch) => Promise<CaseWriteResult>
  readAsset: (caseId: string, assetId: string) => Promise<Blob | null>
}

const context = createContext<CaseData | null>(null)
export function CaseDataProvider({ data, children }: { data: CaseData; children: ReactNode }) {
  return <context.Provider value={data}>{children}</context.Provider>
}
export function useCaseData(): CaseData {
  const data = useContext(context)
  if (!data) throw new Error('CaseDataProvider is required. Studies must explicitly provide studyCaseData.')
  return data
}

const studyPending = new Map<string, StoredCaseBatch>()
let drafts: ProductOutbox | undefined
const draftStore = () => drafts ??= createProductOutbox({ origin: 'study', clientId: 'study', draftId: tabDraftId() })
async function commitStudy(batch: CaseBatch): Promise<CaseWriteResult> {
  const result = await commitCase(batch.local, batch.expectedRevision, batch.assets)
  return result.ok ? { ok: true, value: result.value, ackMutationId: batch.mutationId, ackRevision: result.value.revision }
    : { ok: false, reason: result.reason }
}

export const studyCaseData: CaseData = {
  mode: 'study',
  load: async caseId => {
    const value = await loadCase(caseId)
    return value ? { kind: 'found', value } : { kind: 'missing' }
  },
  apply: commitStudy,
  approveCopy: commitStudy,
  readAsset,
  stageBatch: async batch => {
    studyPending.set(batch.mutationId, { batch, status: 'pending', latest: null })
    return { durable: false, reason: 'unavailable' }
  },
  readBatches: async caseId => [...studyPending.values()].filter(record => record.batch.local.id === caseId),
  acknowledgeBatch: async (caseId, mutationId) => {
    if (studyPending.get(mutationId)?.batch.local.id === caseId) studyPending.delete(mutationId)
    return { durable: true }
  },
  markBatch: async (caseId, mutationId, status, latest) => {
    const record = studyPending.get(mutationId)
    if (record?.batch.local.id === caseId) studyPending.set(mutationId, { ...record, status, latest })
    return { durable: false, reason: 'unavailable' }
  },
  readEditorDraft: (caseId, kind) => draftStore().readEditorDraft(caseId, kind),
  writeEditorDraft: (caseId, draft) => draftStore().writeEditorDraft(caseId, draft),
  clearEditorDraft: (caseId, kind, expectedVersion) => draftStore().clearEditorDraft(caseId, kind, expectedVersion),
}
