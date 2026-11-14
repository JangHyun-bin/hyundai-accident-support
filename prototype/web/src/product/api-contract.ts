import type { CaseCommand, JourneyCase, PayloadSelection, PayloadSnapshot, Stage } from '../journey/case'

export type PhoneSession = {
  role: 'phone'
  caseId: string
  clientId: string
  csrfToken: string
  expiresAt: string
}

export type VehicleActionId = 'need-help' | 'confirm-record-ready' | 'defer-recording' | 'report-risk' | 'resume-recording' | 'decline-sharing'
export type VehicleAction = { id: VehicleActionId; label: string }
export type VehicleProgress = {
  schemaVersion: 1
  caseId: string
  revision: number
  updatedAt: string
  stage: Stage
  returnStage: Stage | null
  suspended: boolean
  riskCheckRequired: boolean
  scene: { id: string; title: string; body: string; actions: VehicleAction[] }
  phone: { paired: boolean; online: boolean; lastSeenAt: string | null; clientId: string | null }
  record: { photos: number; audio: number; video: number; statement: 'empty' | 'draft' | 'confirmed'; report: 'empty' | 'draft' | 'confirmed' }
  copy: { id: string | null; preparedAt: string | null }
  insurance: { integration: 'unavailable'; receipt: null }
}

export type CreateCaseRequest = { creationId: string; creationSecret: string; deviceLabel: string }
export type CreateCaseResponse = { caseId: string; vehicleCredential: string; expiresAt: string; progress: VehicleProgress }
export type PairResponse = { pairId: string; joinUrl: string; expiresAt: string }
export type PairClaim = { claimId: string; verificationCode: string; deviceLabel: string; expiresAt: string }
export type ClaimResponse = { claimId: string; verificationCode: string; expiresAt: string }
export type ClaimStatus = { state: 'pending' | 'expired' | 'cancelled' } | { state: 'approved'; session: PhoneSession }

export type ProductPhoneCommand = Extract<CaseCommand, {
  type: 'navigate' | 'suspend' | 'resume' | 'observation' | 'safety-action'
    | 'statement-edit' | 'statement-confirm' | 'voice-save' | 'evidence-put' | 'evidence-remove'
    | 'diagram-edit' | 'diagram-confirm' | 'report-result' | 'report-restore' | 'report-apply-pending'
    | 'paragraph-edit' | 'paragraph-confirm' | 'paragraph-unconfirm' | 'paragraph-remove'
    | 'agency-decision' | 'follow-up'
}>

export type ChangeRequest = { expectedRevision: number; mutationId: string; commands: ProductPhoneCommand[] }
export type AssetManifest = { id: string; mime: string; bytes: number; sha256: string }
export type MultipartChange = ChangeRequest & { assets: AssetManifest[] }
export type ChangeResponse = { value: JourneyCase; duplicate: boolean; ackMutationId: string; ackRevision: number }
export type CopyRequest = { expectedRevision: number; mutationId: string; id: string; selection: PayloadSelection; preview: PayloadSnapshot }
export type CopyResponse = { value: JourneyCase; copyId: string; payload: PayloadSnapshot; duplicate: boolean; ackMutationId: string; ackRevision: number }

export type SdkFact = {
  signal: 'seat-airbag-deployed'
  seatId: string
  sdkVersion: '2.3.2'
  observedAt: string
} & (
  | { kind: 'reading'; value: boolean; source: 'pleos-sdk' | 'simulation' }
  | { kind: 'unavailable'; cause: 'permission-denied' | 'capability-missing' | 'disconnected' | 'read-failed' }
)
export type VehicleFactRequest = { expectedRevision: number; mutationId: string; fact: SdkFact }
export type VehicleActionRequest = { expectedRevision: number; mutationId: string; actionId: VehicleActionId }
export type ApiErrorCode = 'invalid-request' | 'access-required' | 'forbidden' | 'missing' | 'conflict' | 'too-large' | 'invalid-change' | 'unavailable' | 'rate-limited'
export type ApiErrorBase = { error: { code: ApiErrorCode; message: string } }
export type PhoneApiError = ApiErrorBase & { latestRevision?: number; value?: JourneyCase }
export type VehicleApiError = ApiErrorBase & { latestRevision?: number; progress?: VehicleProgress }
