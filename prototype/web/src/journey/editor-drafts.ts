import { LIMITS, type CaptureTarget, type Evidence, type EvidenceReference, type PayloadSelection } from './case'
import { validateEvidence, validateEvidenceReference } from './case-validation'

export type ScopeTarget = 'insurance' | 'vehicle' | 'share'
export type ScopeDraft = { recipient: string; selection: PayloadSelection }
export type EditorDraft =
  | { kind: 'voice'; text: string; clips: { evidence: Evidence; blob: Blob }[] }
  | { kind: 'photo'; evidence: Evidence; blob: Blob; target: CaptureTarget | null; replacementId: string | null }
  | { kind: 'report'; id: string; text: string; references: EvidenceReference[]; isNew: boolean }
  | { kind: 'scope'; target: ScopeTarget; drafts: Record<ScopeTarget, ScopeDraft> }
export type EditorDraftKind = EditorDraft['kind']
export type StoredEditorDraft<K extends EditorDraftKind = EditorDraftKind> = Extract<EditorDraft, { kind: K }> & { version: string }
export type DraftDurability = { durable: boolean; reason?: 'quota' | 'unavailable' | 'invalid' }
export type EditorDraftData = {
  readEditorDraft: <K extends EditorDraftKind>(caseId: string, kind: K) => Promise<StoredEditorDraft<K> | null>
  writeEditorDraft: (caseId: string, draft: EditorDraft) => Promise<DraftDurability & { version: string }>
  clearEditorDraft: (caseId: string, kind: EditorDraftKind, expectedVersion?: string) => Promise<DraftDurability>
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(value)
const text = (value: unknown, length: number): value is string => typeof value === 'string' && value.length <= length
const target = (value: unknown): value is CaptureTarget => ['scene', 'own-car', 'other-car', 'plate', 'road-marks', 'signals'].includes(String(value))
const scopeTarget = (value: unknown): value is ScopeTarget => value === 'insurance' || value === 'vehicle' || value === 'share'
const ids = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 1000 && value.every(id) && new Set(value).size === value.length

export function validateSelection(value: unknown): value is PayloadSelection {
  return object(value) && ids(value.observationIds) && ids(value.statementIds) && ids(value.evidenceIds) &&
    typeof value.includeDiagram === 'boolean' && typeof value.includeReport === 'boolean'
}

function scopeDraft(value: unknown): value is ScopeDraft {
  return object(value) && text(value.recipient, 100) && validateSelection(value.selection)
}
function media(value: unknown): value is { evidence: Evidence; blob: Blob } {
  return object(value) && validateEvidence(value.evidence) && value.blob instanceof Blob && value.blob.size > 0 &&
    value.blob.size === value.evidence.metadata.bytes && value.blob.type === value.evidence.metadata.mime && value.evidence.assetId !== null
}

export function validateEditorDraft(value: unknown): value is EditorDraft {
  if (!object(value)) return false
  switch (value.kind) {
    case 'voice': return text(value.text, LIMITS.statementLength) && Array.isArray(value.clips) && value.clips.length <= 100 &&
      value.clips.every(clip => media(clip) && clip.evidence.kind === 'audio')
    case 'photo': return media(value) && value.evidence.kind === 'photo' && ('target' in value) && ('replacementId' in value) &&
      (value.target === null || target(value.target)) && (value.replacementId === null || id(value.replacementId))
    case 'report': return id(value.id) && text(value.text, 5000) && Array.isArray(value.references) && value.references.length <= 100 &&
      value.references.every(validateEvidenceReference) && typeof value.isNew === 'boolean'
    case 'scope': return scopeTarget(value.target) && object(value.drafts) &&
      scopeDraft(value.drafts.insurance) && scopeDraft(value.drafts.vehicle) && scopeDraft(value.drafts.share)
    default: return false
  }
}

export function parseStoredEditorDraft<K extends EditorDraftKind>(value: unknown, kind: K): StoredEditorDraft<K> | null {
  if (!object(value) || !id(value.version) || !validateEditorDraft(value) || value.kind !== kind) return null
  return value as StoredEditorDraft<K>
}
