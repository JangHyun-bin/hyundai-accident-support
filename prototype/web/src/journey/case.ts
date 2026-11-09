import { manifest, scenarioFor, sceneFor, transition, type Session } from '../emergency/session'
import { validateCase } from './case-validation'
export { validateCase } from './case-validation'

export type Device = 'vehicle' | 'mobile'
export type Stage = 'response' | 'record' | 'review' | 'follow-up'
export type Agency = 'rescue' | 'vehicle' | 'insurance'
export type Source = 'device' | 'user' | 'fixture'
export type RequestStatus = 'not_sent' | 'connection_unknown' | 'connected' | 'checking' | 'unknown' | 'received' | 'sent' | 'failed' | 'not_received' | 'deferred' | 'declined'
export type Confirmation = 'neutral' | 'confirmed' | 'unknown' | 'attention'
export type Availability = 'pending' | 'available' | 'failed' | 'unavailable' | 'skipped'
export type EvidenceKind = 'photo' | 'audio' | 'video'
export type CaptureTarget = 'scene' | 'own-car' | 'other-car' | 'plate' | 'road-marks' | 'signals'
export const LIMITS = { photoBytes: 15 * 1024 * 1024, photoCount: 12, caseBytes: 150 * 1024 * 1024, voiceSeconds: 120, statementLength: 5000 } as const
export const captureTargets: { id: CaptureTarget; label: string }[] = [
  { id: 'scene', label: '현장 전체' }, { id: 'own-car', label: '내 차량' }, { id: 'other-car', label: '상대 차량' },
  { id: 'plate', label: '번호판' }, { id: 'road-marks', label: '바닥 흔적' }, { id: 'signals', label: '신호등' },
]
export type Observation = {
  id: string; kind: string; label: string; value: string; source: Source; observedAt: string | null
  confirmation: Confirmation; legacyFactId: string | null; supersedes: string | null
}
export type SafetyAction = { id: string; label: string; status: 'unknown' | 'requested' | 'user-confirmed' | 'device-confirmed' | 'unavailable'; source: Source; confirmedAt: string | null }
export type Evidence = {
  id: string; label: string; kind: EvidenceKind; revision: number; origin: 'sample' | 'user'
  assetId: string | null; availability: Availability; captureTarget: CaptureTarget | null
  metadata: { mime: string; bytes: number; duration: number | null; capturedAt: string | null; sourceLabel: string }
}
export type Statement = { id: string; text: string; audioEvidenceIds: string[]; revision: number; confirmedRevision: number | null }
export type Point = { x: number; y: number }
export type Diagram = {
  revision: number; origin: 'fixture' | 'user'; road: 'straight' | 'unsupported'
  vehicles: { id: 'own' | 'other'; position: Point; heading: number }[]
  contact: Point | null; confirmedRevision: number | null
}
export type EvidenceReference = { evidenceId: string; evidenceRevision: number; start: number | null; end: number | null }
export type ReportParagraph = {
  id: string; text: string; kind: 'observation' | 'statement' | 'inference' | 'unknown'
  references: EvidenceReference[]; revision: number; confirmedRevision: number | null
}
export type Report = { revision: number; paragraphs: ReportParagraph[]; basedOnRevision: number }
export type PayloadSelection = { observationIds: string[]; statementIds: string[]; evidenceIds: string[]; includeDiagram: boolean; includeReport: boolean }
export type PayloadSnapshot = { observations: Observation[]; statements: Statement[]; evidence: Evidence[]; diagram: Diagram | null; report: Report | null }
export type Receipt = { number: string | null; receivedAt: string; agencyName: string; next: string }
export type Submission = {
  id: string; kind: 'new' | 'imported' | 'contact'; agency: Agency; recipient: string | null
  approvedAt: string | null; payload: PayloadSnapshot | null; status: RequestStatus; externalReceipt: Receipt | null
}
export type ShareRecord = { id: string; recipient: string; approvedAt: string; payload: PayloadSnapshot; status: 'pending' | 'confirmed' | 'failed' | 'unknown' }
export type FollowUp = {
  shopId: string | null; repairItems: string[]; route: 'idle' | 'preview' | 'guiding' | 'unavailable'
  rental: 'idle' | 'checking' | 'eligible' | 'ineligible' | 'unknown'; source: Source; updatedAt: string | null
}
export type JourneyCase = {
  schemaVersion: 1; id: string; revision: number; createdAt: string; updatedAt: string
  emergency: Session; stage: Stage; returnStage: Stage; suspended: boolean
  observations: Observation[]; safetyActions: SafetyAction[]; evidence: Evidence[]; evidenceHistory: Evidence[]
  statements: Statement[]; statementHistory: Statement[]; diagram: Diagram | null; diagramHistory: Diagram[]
  report: Report | null; reportHistory: Report[]; pendingReport: Report | null; contentRevision: number
  submissions: Submission[]; activeSubmissionIds: Record<Agency, string | null>; shares: ShareRecord[]; followUp: FollowUp
}
export type CaseCommand =
  | { type: 'navigate'; stage: Stage }
  | { type: 'suspend' | 'resume' }
  | { type: 'observation'; observation: Observation }
  | { type: 'safety-action'; action: SafetyAction }
  | { type: 'emergency-edge'; edgeId: string; now: string }
  | { type: 'countdown'; target: string; now: string }
  | { type: 'contact-start'; now: string }
  | { type: 'request-result'; caseId: string; agency: Agency; submissionId: string; status: RequestStatus; externalReceipt: Receipt | null; now: string }
  | { type: 'statement-edit'; id: string; text: string; audioEvidenceIds: string[] }
  | { type: 'statement-confirm'; id: string }
  | { type: 'evidence-put'; evidence: Evidence }
  | { type: 'evidence-remove'; id: string }
  | { type: 'diagram-edit'; diagram: Diagram }
  | { type: 'diagram-confirm' }
  | { type: 'report-result'; report: Report }
  | { type: 'report-apply-pending' }
  | { type: 'paragraph-edit'; id: string; text: string; references: EvidenceReference[] }
  | { type: 'paragraph-confirm'; id: string }
  | { type: 'agency-decision'; agency: Agency; decision: 'deferred' | 'declined' }
  | { type: 'share-result'; caseId: string; shareId: string; status: ShareRecord['status'] }
  | { type: 'follow-up'; value: FollowUp }
export type AssetWrite = { id: string; caseId: string; blob: Blob }
export type CommitResult = { ok: true; value: JourneyCase } | { ok: false; reason: 'conflict' | 'unavailable' | 'quota' | 'invalid'; draft: JourneyCase }
export type ApprovalResult = { ok: true; value: JourneyCase } | { ok: false; reason: 'recipient' | 'empty-selection' | 'missing-evidence' | 'unreviewed-content' | 'retry-not-allowed' }

export const agencies: Agency[] = ['rescue', 'vehicle', 'insurance']

export function createCase(session: Session, id: string, now: string): JourneyCase {
  const emergency = structuredClone(session)
  const scenario = scenarioFor(session.scenarioId)
  const activeSubmissionIds: JourneyCase['activeSubmissionIds'] = { rescue: null, vehicle: null, insurance: null }
  const submissions: Submission[] = []
  for (const agency of agencies) {
    const status = session.requests[agency] as RequestStatus
    if (['not_sent', 'deferred', 'declined'].includes(status)) continue
    const requestId = `${id}:imported:${agency}`
    activeSubmissionIds[agency] = requestId
    submissions.push({ id: requestId, kind: 'imported', agency, recipient: null, approvedAt: null, payload: null, status, externalReceipt: null })
  }
  const value: JourneyCase = {
    schemaVersion: 1, id, revision: 0, createdAt: now, updatedAt: now, emergency,
    stage: 'response', returnStage: 'response', suspended: false, activeSubmissionIds, submissions,
    observations: scenario.facts.map(fact => {
      const merged = { ...fact, ...session.facts[fact.id] }
      return { id: `imported-fact:${fact.id}`, kind: fact.id, label: merged.label, value: merged.value, source: 'fixture',
        observedAt: null, confirmation: merged.status as Confirmation, legacyFactId: fact.id, supersedes: null }
    }),
    safetyActions: [], evidence: [], evidenceHistory: [],
    statements: session.savedRecord ? [{ id: 'imported-statement', text: session.savedRecord, audioEvidenceIds: [], revision: 1, confirmedRevision: null }] : [],
    statementHistory: [], diagram: null, diagramHistory: [], report: null, reportHistory: [], pendingReport: null,
    contentRevision: 0, shares: [],
    followUp: { shopId: null, repairItems: [], route: 'idle', rental: 'idle', source: 'fixture', updatedAt: null },
  }
  if (!validateCase(value)) throw new Error('Invalid incident input')
  return value
}

export function canSubmit(value: JourneyCase, agency: Agency): boolean {
  return ['not_sent', 'deferred', 'declined', 'failed', 'not_received'].includes(value.emergency.requests[agency])
}

function invalidateReport(value: JourneyCase) {
  value.contentRevision += 1
  if (value.report) {
    value.reportHistory.push(structuredClone(value.report))
    value.report = { ...value.report, revision: value.report.revision + 1,
      paragraphs: value.report.paragraphs.map(p => ({ ...p, confirmedRevision: null })) }
  }
}

function addObservation(value: JourneyCase, observation: Observation) {
  if (value.observations.some(o => o.id === observation.id)) return
  value.observations.push(structuredClone(observation))
  const key = observation.legacyFactId
  if (!key) return
  const superseded = new Set(value.observations.map(o => o.supersedes))
  const active = value.observations.filter(o => o.legacyFactId === key && !superseded.has(o.id))
  const known = active.filter(o => o.confirmation !== 'unknown')
  const conflicting = new Set(known.map(o => o.value)).size > 1
  const latest = known.at(-1) ?? active.at(-1)!
  value.emergency.facts[key] = conflicting
    ? { value: '정보 확인 필요', status: 'unknown' }
    : { value: latest.value, status: latest.confirmation }
}

function startContact(value: JourneyCase, now: string) {
  const id = `${value.id}:contact:${value.submissions.filter(s => s.kind === 'contact').length + 1}`
  value.activeSubmissionIds.rescue = id
  value.submissions.push({ id, agency: 'rescue', kind: 'contact', recipient: '119', approvedAt: null,
    payload: null, status: 'connection_unknown', externalReceipt: null })
  if (value.emergency.requests.rescue !== 'received') value.emergency.requests.rescue = 'connection_unknown'
  value.updatedAt = now
}

function moveEmergencyCursor(value: JourneyCase, target: string, now: string) {
  const scenario = scenarioFor(value.emergency.scenarioId)
  const destination = scenario.states.find(s => s.id === target)
  if (!destination) return
  value.emergency.sceneId = target
  for (const [id, fact] of Object.entries(destination.fact_overrides)) {
    const definition = scenario.facts.find(f => f.id === id)
    if (!definition || fact.value === undefined) continue
    addObservation(value, { id: `scene:${target}:${id}:${value.observations.length}`, kind: id,
      label: definition.label, value: fact.value, source: 'fixture', observedAt: now,
      confirmation: (fact.status ?? 'unknown') as Confirmation, legacyFactId: id, supersedes: null })
  }
}

export function reduceCase(current: JourneyCase, command: CaseCommand): JourneyCase {
  const next = structuredClone(current)
  switch (command.type) {
    case 'navigate':
      next.returnStage = current.stage
      next.stage = command.stage
      break
    case 'suspend': next.suspended = true; next.returnStage = current.stage; break
    case 'resume': next.suspended = false; next.stage = current.returnStage; break
    case 'observation':
      addObservation(next, command.observation)
      if (command.observation.kind === 'risk' && command.observation.confirmation === 'attention') {
        next.returnStage = current.stage; next.stage = 'response'
      }
      break
    case 'safety-action': {
      const index = next.safetyActions.findIndex(a => a.id === command.action.id)
      if (index < 0) next.safetyActions.push(structuredClone(command.action))
      else next.safetyActions[index] = structuredClone(command.action)
      break
    }
    case 'statement-edit': {
      if (!command.text.trim() || command.text.length > LIMITS.statementLength ||
        !command.audioEvidenceIds.every(id => next.evidence.some(e => e.id === id && e.kind === 'audio'))) return current
      const index = next.statements.findIndex(s => s.id === command.id)
      const previous = next.statements[index]
      if (previous) next.statementHistory.push(structuredClone(previous))
      const statement: Statement = { id: command.id, text: command.text, audioEvidenceIds: [...command.audioEvidenceIds],
        revision: previous ? previous.revision + 1 : 1, confirmedRevision: null }
      if (index < 0) next.statements.push(statement)
      else next.statements[index] = statement
      invalidateReport(next)
      break
    }
    case 'statement-confirm': {
      const statement = next.statements.find(s => s.id === command.id)
      if (!statement) return current
      statement.confirmedRevision = statement.revision
      break
    }
    case 'contact-start':
      startContact(next, command.now)
      moveEmergencyCursor(next, 'contact_unknown', command.now)
      next.stage = 'response'
      break
    case 'countdown': {
      const auto = sceneFor(current.emergency).auto_contact
      if (!auto || ![auto.cancel, auto.expire].includes(command.target)) return current
      if (command.target === auto.expire) startContact(next, command.now)
      moveEmergencyCursor(next, command.target, command.now)
      break
    }
    case 'emergency-edge': {
      const scene = sceneFor(current.emergency)
      const edge = [...scene.actions, ...scene.events].find(e => e.id === command.edgeId)
      if (!edge) return current
      if (edge.to === 'record' || edge.effect === 'save_record') {
        next.returnStage = current.stage; next.stage = 'record'; break
      }
      if (edge.effect === 'submit' || edge.to === 'review') {
        next.returnStage = current.stage; next.stage = 'review'; break
      }
      if (['receive', 'not_received'].includes(edge.effect ?? '')) return current
      if (edge.effect === 'suspend') { next.suspended = true; next.returnStage = current.stage; break }
      if (edge.effect === 'resume' || edge.effect === 'return') { next.suspended = false; next.stage = current.returnStage; break }
      const destination = scenarioFor(current.emergency.scenarioId).states.find(s => s.id === edge.to)!
      const isStart = ['connect', 'reconnect', 'retry', 'no_response'].includes(edge.id) &&
        destination.request_overrides.rescue === 'connection_unknown'
      if (isStart) startContact(next, command.now)
      else if (Object.keys(destination.request_overrides).some(agency => destination.request_overrides[agency] !== current.emergency.requests[agency])) return current
      const advanced = transition(current.emergency, edge)
      moveEmergencyCursor(next, advanced.sceneId, command.now)
      if (edge.effect === 'risk') {
        addObservation(next, { id: `risk:${next.observations.length}`, kind: 'risk', label: '차량 위험', value: '위험 감지',
          source: 'fixture', observedAt: command.now, confirmation: 'attention', legacyFactId: 'risk', supersedes: null })
        next.returnStage = current.stage; next.stage = 'response'
      }
      break
    }
    case 'request-result': {
      if (command.caseId !== current.id || !Object.hasOwn(manifest.request_statuses, command.status)) return current
      const request = next.submissions.find(s => s.id === command.submissionId && s.agency === command.agency)
      if (!request) return current
      if (request.status === 'received' && command.status !== 'received') return current
      request.status = command.status
      request.externalReceipt = command.externalReceipt ?? request.externalReceipt
      if (next.activeSubmissionIds[command.agency] === request.id) {
        next.emergency.requests[command.agency] = command.status
        const scene = sceneFor(next.emergency)
        const matching = [...scene.actions, ...scene.events].find(edge =>
          scenarioFor(next.emergency.scenarioId).states.find(s => s.id === edge.to)?.request_overrides[command.agency] === command.status)
        if (matching) moveEmergencyCursor(next, matching.to, command.now)
      }
      next.updatedAt = command.now
      break
    }
    default: return current
  }
  return validateCase(next) ? next : current
}
