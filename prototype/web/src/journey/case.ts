import { scenarioFor, sceneFor, transition, type Session } from '../emergency/session'
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
export const LIMITS = { photoBytes: 15 * 1024 * 1024, photoCount: 12, caseBytes: 150 * 1024 * 1024, voiceSeconds: 120, statementLength: 5000, reportParagraphs: 100 } as const
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
  metadata: { mime: string; bytes: number; duration: number | null; eventTime?: number | null; capturedAt: string | null; sourceLabel: string }
}
export type Statement = { id: string; text: string; audioEvidenceIds: string[]; revision: number; confirmedRevision: number | null }
export type Point = { x: number; y: number }
export type NavigationData = { source: 'fixture'; vehicle: Point; destination: Point; distanceMeters: number; updatedAt: string }
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
  transport?: 'approved' | 'sending' | 'sent' | 'failed'; call?: 'connecting' | 'connected' | 'ended'
}
export type ShareRecord = { id: string; recipient: string; approvedAt: string; payload: PayloadSnapshot; status: 'pending' | 'confirmed' | 'failed' | 'unknown' }
export type FollowUpRequest = { id: string; shopId: string | null; source: Source; updatedAt: string | null }
export type FollowUp = {
  requestRevision?: number; routeRequest?: FollowUpRequest | null; rentalRequest?: FollowUpRequest | null
  shopId: string | null; repairItems: string[]; route: 'idle' | 'preview' | 'guiding' | 'unavailable'
  rental: 'idle' | 'checking' | 'eligible' | 'ineligible' | 'unknown'; source: Source; updatedAt: string | null
}
export type JourneyCase = {
  schemaVersion: 1; id: string; revision: number; createdAt: string; updatedAt: string
  emergency: Session; stage: Stage; returnStage: Stage; suspended: boolean; fixtureId: string | null; navigation: NavigationData | null
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
  | { type: 'navigation-data'; value: NavigationData }
  | { type: 'emergency-edge'; edgeId: string; now: string }
  | { type: 'countdown'; target: string; now: string }
  | { type: 'contact-start'; now: string }
  | { type: 'transport-start'; caseId: string; submissionId: string; retryId?: string; now: string }
  | { type: 'transport-result'; caseId: string; submissionId: string; status: 'sent' | 'failed'; now: string }
  | { type: 'call-end'; caseId: string; submissionId: string; now: string }
  | { type: 'request-result'; caseId: string; agency: Agency; submissionId: string; status: RequestStatus; externalReceipt: Receipt | null; now: string }
  | { type: 'statement-edit'; id: string; text: string; audioEvidenceIds: string[] }
  | { type: 'statement-confirm'; id: string }
  | { type: 'voice-save'; evidence: Evidence[]; statement: { id: string; text: string; audioEvidenceIds: string[] } | null }
  | { type: 'evidence-put'; evidence: Evidence }
  | { type: 'evidence-remove'; id: string }
  | { type: 'diagram-edit'; diagram: Diagram }
  | { type: 'diagram-confirm' }
  | { type: 'report-result'; report: Report }
  | { type: 'report-restore'; report: Report }
  | { type: 'report-apply-pending' }
  | { type: 'paragraph-edit'; id: string; text: string; references: EvidenceReference[] }
  | { type: 'paragraph-confirm'; id: string; revision?: number }
  | { type: 'paragraph-unconfirm'; id: string; revision: number }
  | { type: 'paragraph-remove'; id: string }
  | { type: 'agency-decision'; agency: Agency; decision: 'deferred' | 'declined' }
  | { type: 'share-result'; caseId: string; shareId: string; status: ShareRecord['status'] }
  | { type: 'follow-up'; value: FollowUp; now?: string }
  | ({ type: 'follow-up-result'; caseId: string; shopId: string | null; requestId: string; source: Source; updatedAt: string } &
      ({ kind: 'route'; status: 'guiding' | 'unavailable' } | { kind: 'rental'; status: 'eligible' | 'ineligible' | 'unknown' }))
export type AssetWrite = { id: string; caseId: string; blob: Blob }
export type CommitResult = { ok: true; value: JourneyCase } | { ok: false; reason: 'conflict' | 'unavailable' | 'quota' | 'invalid'; rejection?: 'paragraph-limit' | 'invalid-command'; draft: JourneyCase }
export type ApprovalResult = { ok: true; value: JourneyCase } | { ok: false; reason: 'recipient' | 'empty-selection' | 'missing-evidence' | 'unreviewed-content' | 'retry-not-allowed' }

export type ApprovalInput = { recipient: string; selection: PayloadSelection; id: string; now: string } &
  ({ kind: 'submission'; agency: Agency; transport?: 'explicit' } | { kind: 'share' })
export type ApprovalCommitResult = CommitResult | Extract<ApprovalResult, { ok: false }>

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
    stage: 'response', returnStage: 'response', suspended: ['suspended', 'paused'].includes(session.sceneId), fixtureId: null, navigation: null, activeSubmissionIds, submissions,
    observations: scenario.facts.map(fact => {
      const merged = { ...fact, ...session.facts[fact.id] }
      return { id: `imported-fact:${fact.id}`, kind: fact.id, label: merged.label, value: merged.value, source: 'fixture',
        observedAt: null, confirmation: merged.status as Confirmation, legacyFactId: fact.id, supersedes: null }
    }),
    safetyActions: [], evidence: [], evidenceHistory: [],
    statements: session.savedRecord ? [{ id: 'imported-statement', text: session.savedRecord, audioEvidenceIds: [], revision: 1, confirmedRevision: null }] : [],
    statementHistory: [], diagram: null, diagramHistory: [], report: null, reportHistory: [], pendingReport: null,
    contentRevision: 0, shares: [],
    followUp: { requestRevision: 0, routeRequest: null, rentalRequest: null, shopId: null, repairItems: [], route: 'idle', rental: 'idle', source: 'fixture', updatedAt: null },
  }
  if (!validateCase(value)) throw new Error('Invalid incident input')
  return value
}

export function isRecordReady(value: JourneyCase): boolean {
  return value.safetyActions.some(action => action.id === 'record-ready' && action.source === 'user' &&
    action.status === 'user-confirmed' && action.confirmedAt !== null)
}

export function riskCheckRequired(value: JourneyCase): boolean {
  return !isRecordReady(value)
}

export function canSubmit(value: JourneyCase, agency: Agency): boolean {
  return ['not_sent', 'deferred', 'declined', 'failed', 'not_received'].includes(value.emergency.requests[agency])
}

export type PayloadResult = { ok: true; value: PayloadSnapshot } | Extract<ApprovalResult, { ok: false }>

export function preparePayload(current: JourneyCase, selection: PayloadSelection): PayloadResult {
  const observations = current.observations.filter(item => selection.observationIds.includes(item.id))
  const statements = current.statements.filter(item => selection.statementIds.includes(item.id))
  const evidence = current.evidence.filter(item => selection.evidenceIds.includes(item.id))
  if (observations.length !== selection.observationIds.length || statements.length !== selection.statementIds.length) return { ok: false, reason: 'unreviewed-content' }
  if (evidence.length !== selection.evidenceIds.length || evidence.some(item => item.availability !== 'available' || !item.assetId)) return { ok: false, reason: 'missing-evidence' }
  if (!observations.length && !statements.length && !evidence.length && !selection.includeDiagram && !selection.includeReport) return { ok: false, reason: 'empty-selection' }
  if (statements.some(item => !item.text.trim() || item.confirmedRevision !== item.revision)) return { ok: false, reason: 'unreviewed-content' }
  const diagram = selection.includeDiagram ? current.diagram : null
  if (selection.includeDiagram && (!diagram || diagram.road === 'unsupported' || !diagram.vehicles.length || diagram.confirmedRevision !== diagram.revision)) return { ok: false, reason: 'unreviewed-content' }
  const report = selection.includeReport ? current.report : null
  if (selection.includeReport && (!report || !report.paragraphs.length || report.paragraphs.some(item => !item.text.trim() || item.confirmedRevision !== item.revision))) return { ok: false, reason: 'unreviewed-content' }
  if (report?.paragraphs.some(item => item.references.some(reference => !evidenceForReference(current, reference) || !selection.evidenceIds.includes(reference.evidenceId)))) return { ok: false, reason: 'missing-evidence' }
  return { ok: true, value: structuredClone({ observations,
    statements: statements.map(item => ({ ...item, audioEvidenceIds: item.audioEvidenceIds.filter(id => selection.evidenceIds.includes(id)) })),
    evidence, diagram, report }) }
}

export function makeSubmission(current: JourneyCase, input: {
  agency: Agency; recipient: string; selection: PayloadSelection; id: string; now: string; transport?: 'explicit'
}): ApprovalResult {
  if (!input.recipient.trim() || input.recipient.length > 100) return { ok: false, reason: 'recipient' }
  if (!canSubmit(current, input.agency) || current.submissions.some(item => item.id === input.id)) return { ok: false, reason: 'retry-not-allowed' }
  const payload = preparePayload(current, input.selection)
  if (!payload.ok) return payload
  const next = structuredClone(current)
  next.submissions.push({ id: input.id, kind: 'new', agency: input.agency, recipient: input.recipient.trim(), approvedAt: input.now,
    payload: payload.value, status: input.transport === 'explicit' ? 'checking' : 'sent', externalReceipt: null,
    ...(input.transport === 'explicit' ? { transport: 'approved' as const } : {}) })
  next.activeSubmissionIds[input.agency] = input.id
  next.emergency.requests[input.agency] = input.transport === 'explicit' ? 'checking' : 'sent'
  next.updatedAt = input.now
  return validateCase(next) ? { ok: true, value: next } : { ok: false, reason: 'unreviewed-content' }
}

export function makeShare(current: JourneyCase, input: {
  recipient: string; selection: PayloadSelection; id: string; now: string
}): ApprovalResult {
  if (!input.recipient.trim() || input.recipient.length > 100) return { ok: false, reason: 'recipient' }
  if (current.shares.some(item => item.id === input.id)) return { ok: false, reason: 'retry-not-allowed' }
  const payload = preparePayload(current, input.selection)
  if (!payload.ok) return payload
  const next = structuredClone(current)
  next.shares.push({ id: input.id, recipient: input.recipient.trim(), approvedAt: input.now, payload: payload.value, status: 'pending' })
  next.updatedAt = input.now
  return validateCase(next) ? { ok: true, value: next } : { ok: false, reason: 'unreviewed-content' }
}

export function evidenceForReference(value: JourneyCase, reference: EvidenceReference): Evidence | null {
  const evidence = value.evidence.find(item => item.id === reference.evidenceId && item.revision === reference.evidenceRevision)
  if (!evidence || evidence.availability !== 'available' || !evidence.assetId) return null
  if (reference.start !== null || reference.end !== null) {
    if (evidence.kind === 'photo' || reference.start === null || reference.end === null ||
      !Number.isFinite(reference.start) || !Number.isFinite(reference.end) || reference.start < 0 || reference.end <= reference.start ||
      evidence.metadata.duration === null || reference.end > evidence.metadata.duration) return null
  }
  return evidence
}

function applyReport(value: JourneyCase, report: Report) {
  if (value.report) value.reportHistory.push(structuredClone(value.report))
  value.report = { ...structuredClone(report), revision: (value.report?.revision ?? 0) + 1,
    paragraphs: report.paragraphs.map(paragraph => ({ ...structuredClone(paragraph), confirmedRevision: null })) }
}

function invalidateReport(value: JourneyCase) {
  value.contentRevision += 1
  if (value.report) {
    value.reportHistory.push(structuredClone(value.report))
    value.report = { ...value.report, revision: value.report.revision + 1,
      paragraphs: value.report.paragraphs.map(p => ({ ...p, confirmedRevision: null })) }
  }
}

function putEvidence(value: JourneyCase, evidence: Evidence): boolean {
  const index = value.evidence.findIndex(item => item.id === evidence.id)
  const previous = value.evidence[index]
  if (previous && JSON.stringify(previous) === JSON.stringify(evidence)) return true
  const history = value.evidenceHistory.filter(item => item.id === evidence.id)
  const revision = previous?.revision ?? Math.max(0, ...history.map(item => item.revision))
  if (evidence.revision !== revision + 1 || (previous && previous.kind !== evidence.kind)) return false
  const retained = [...value.evidence, ...value.evidenceHistory,
    ...value.submissions.flatMap(item => item.payload?.evidence ?? []), ...value.shares.flatMap(item => item.payload.evidence)]
  if (evidence.assetId && retained.some(item => item.assetId === evidence.assetId)) return false
  if (previous) value.evidenceHistory.push(structuredClone(previous))
  if (index < 0) value.evidence.push(structuredClone(evidence))
  else value.evidence[index] = structuredClone(evidence)
  return true
}

function editStatement(value: JourneyCase, input: { id: string; text: string; audioEvidenceIds: string[] }, confirm = false): boolean {
  if (input.text.length > LIMITS.statementLength ||
    !input.audioEvidenceIds.every(id => value.evidence.some(e => e.id === id && e.kind === 'audio'))) return false
  const index = value.statements.findIndex(s => s.id === input.id)
  const previous = value.statements[index]
  if (previous && previous.text === input.text && JSON.stringify(previous.audioEvidenceIds) === JSON.stringify(input.audioEvidenceIds)) {
    if (confirm && input.text.trim()) previous.confirmedRevision = previous.revision
    return true
  }
  if (previous) value.statementHistory.push(structuredClone(previous))
  const revision = previous ? previous.revision + 1 : 1
  const statement: Statement = { ...input, audioEvidenceIds: [...input.audioEvidenceIds], revision,
    confirmedRevision: confirm && input.text.trim() ? revision : null }
  if (index < 0) value.statements.push(statement)
  else value.statements[index] = statement
  return true
}

function addObservation(value: JourneyCase, observation: Observation) {
  if (value.observations.some(o => o.id === observation.id)) return
  value.observations.push(structuredClone(observation))
  invalidateReport(value)
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
    payload: null, status: 'connection_unknown', externalReceipt: null, call: 'connecting' })
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
      if (current.emergency.scenarioId === 'product' && command.stage !== 'response' &&
        (current.suspended || !isRecordReady(current))) return current
      if (current.submissions.some(item => item.transport === 'sending')) return current
      next.returnStage = current.stage
      next.stage = command.stage
      break
    case 'suspend':
    case 'resume': {
      if (current.emergency.scenarioId === 'product') {
        if (command.type === 'resume' && !isRecordReady(current)) return current
        if (command.type === 'suspend' && !current.suspended) next.returnStage = current.stage
        if (command.type === 'suspend') {
          const ready = next.safetyActions.find(action => action.id === 'record-ready')
          if (ready) { ready.status = 'unknown'; ready.confirmedAt = null }
        }
        next.suspended = command.type === 'suspend'
        next.stage = command.type === 'suspend' ? 'response' : current.returnStage
        break
      }
      const scene = sceneFor(current.emergency)
      const edge = [...scene.actions, ...scene.events].find(item => item.effect === command.type)
      if (edge) {
        const advanced = transition(current.emergency, edge)
        moveEmergencyCursor(next, advanced.sceneId, current.updatedAt)
        next.emergency.suspendedFrom = advanced.suspendedFrom
      }
      next.suspended = command.type === 'suspend'
      if (command.type === 'suspend') {
        if (!current.suspended) next.returnStage = current.stage
      } else next.stage = current.returnStage
      break
    }
    case 'observation':
      if (current.observations.some(item => item.id === command.observation.id)) return current
      addObservation(next, command.observation)
      if (command.observation.kind === 'risk' && command.observation.confirmation === 'attention') {
        if (current.stage !== 'response') next.returnStage = current.stage
        next.stage = 'response'
        if (current.emergency.scenarioId === 'product') {
          next.suspended = true
          const ready = next.safetyActions.find(action => action.id === 'record-ready')
          if (ready) { ready.status = 'unknown'; ready.confirmedAt = null }
          const deferred = next.safetyActions.find(action => action.id === 'record-deferred')
          if (deferred) { deferred.status = 'unknown'; deferred.confirmedAt = null }
        }
      }
      break
    case 'safety-action': {
      const index = next.safetyActions.findIndex(a => a.id === command.action.id)
      if (index < 0) next.safetyActions.push(structuredClone(command.action))
      else next.safetyActions[index] = structuredClone(command.action)
      break
    }
    case 'navigation-data': next.navigation = structuredClone(command.value); break
    case 'statement-edit': {
      if (!editStatement(next, { id: command.id, text: command.text, audioEvidenceIds: command.audioEvidenceIds })) return current
      if (JSON.stringify(next.statements) === JSON.stringify(current.statements)) return current
      invalidateReport(next)
      break
    }
    case 'statement-confirm': {
      const statement = next.statements.find(s => s.id === command.id)
      if (!statement?.text.trim()) return current
      statement.confirmedRevision = statement.revision
      break
    }
    case 'voice-save':
      if (command.evidence.some(e => e.kind !== 'audio') || !command.evidence.every(e => putEvidence(next, e))) return current
      if (command.statement && !editStatement(next, command.statement, true)) return current
      if (JSON.stringify(next.evidence) === JSON.stringify(current.evidence) && JSON.stringify(next.statements) === JSON.stringify(current.statements)) return current
      invalidateReport(next)
      break
    case 'evidence-put':
      if (!putEvidence(next, command.evidence)) return current
      if (JSON.stringify(next.evidence) === JSON.stringify(current.evidence)) return current
      invalidateReport(next)
      break
    case 'evidence-remove': {
      const removed = next.evidence.find(e => e.id === command.id)
      if (!removed) return current
      next.evidenceHistory.push(removed)
      next.evidence = next.evidence.filter(e => e.id !== command.id)
      for (const statement of next.statements) {
        if (!statement.audioEvidenceIds.includes(command.id)) continue
        next.statementHistory.push(structuredClone(statement))
        statement.audioEvidenceIds = statement.audioEvidenceIds.filter(id => id !== command.id)
        statement.revision += 1
        statement.confirmedRevision = null
      }
      invalidateReport(next)
      const snapshots = [...next.submissions.flatMap(item => item.payload ? [item.payload] : []), ...next.shares.map(item => item.payload)]
      const reports = [next.report, next.pendingReport, ...next.reportHistory, ...snapshots.map(item => item.report)]
      next.evidenceHistory = next.evidenceHistory.filter(item => item.id !== command.id ||
        reports.some(report => report?.paragraphs.some(p => p.references.some(ref => ref.evidenceId === item.id && ref.evidenceRevision === item.revision))) ||
        snapshots.some(snapshot => snapshot.evidence.some(e => e.assetId === item.assetId)) ||
        [...next.statements, ...next.statementHistory].some(statement => statement.audioEvidenceIds.includes(item.id)))
      break
    }
    case 'diagram-edit':
      if (current.diagram) next.diagramHistory.push(structuredClone(current.diagram))
      next.diagram = { ...structuredClone(command.diagram), revision: (current.diagram?.revision ?? 0) + 1, confirmedRevision: null }
      invalidateReport(next)
      break
    case 'diagram-confirm':
      if (!next.diagram || next.diagram.road === 'unsupported' || !next.diagram.vehicles.length) return current
      next.diagram.confirmedRevision = next.diagram.revision
      break
    case 'report-result': {
      if (current.emergency.scenarioId !== 'product' && !current.fixtureId || command.report.basedOnRevision > current.contentRevision) return current
      if (!current.evidence.some(e => e.availability === 'available') && !current.statements.some(s => s.text.trim())) return current
      const candidate = { ...structuredClone(command.report), paragraphs: command.report.paragraphs.map(p => ({ ...p, confirmedRevision: null })) }
      if (current.report || candidate.basedOnRevision !== current.contentRevision) next.pendingReport = candidate
      else applyReport(next, candidate)
      break
    }
    case 'report-restore':
      applyReport(next, { ...command.report, basedOnRevision: current.contentRevision })
      break
    case 'report-apply-pending':
      if (!next.pendingReport) return current
      applyReport(next, next.pendingReport)
      next.pendingReport = null
      break
    case 'paragraph-edit': {
      if (command.text.length > LIMITS.statementLength) return current
      if (!current.report?.paragraphs.some(p => p.id === command.id) && (current.report?.paragraphs.length ?? 0) >= LIMITS.reportParagraphs) return current
      if (!next.report) next.report = { revision: 0, basedOnRevision: current.contentRevision, paragraphs: [] }
      else next.reportHistory.push(structuredClone(next.report))
      const index = next.report.paragraphs.findIndex(p => p.id === command.id)
      const previous = next.report.paragraphs[index]
      const paragraph: ReportParagraph = { id: command.id, text: command.text, kind: previous?.kind ?? 'statement',
        references: structuredClone(command.references), revision: (previous?.revision ?? 0) + 1, confirmedRevision: null }
      if (index < 0) next.report.paragraphs.push(paragraph)
      else next.report.paragraphs[index] = paragraph
      next.report.revision += 1
      break
    }
    case 'paragraph-confirm': {
      const paragraph = next.report?.paragraphs.find(p => p.id === command.id)
      if (!paragraph?.text.trim() || command.revision !== undefined && command.revision !== paragraph.revision || paragraph.references.some(ref => !evidenceForReference(next, ref))) return current
      paragraph.confirmedRevision = paragraph.revision
      break
    }
    case 'paragraph-unconfirm': {
      const paragraph = next.report?.paragraphs.find(p => p.id === command.id)
      if (!paragraph || paragraph.revision !== command.revision || paragraph.confirmedRevision === null) return current
      paragraph.confirmedRevision = null
      break
    }
    case 'paragraph-remove':
      if (!next.report?.paragraphs.some(p => p.id === command.id)) return current
      next.reportHistory.push(structuredClone(next.report))
      next.report.paragraphs = next.report.paragraphs.filter(p => p.id !== command.id)
      next.report.revision += 1
      break
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
      if (edge.effect === 'suspend' || edge.effect === 'resume') return reduceCase(current, { type: edge.effect })
      if (edge.effect === 'return') { next.suspended = false; next.stage = current.returnStage; break }
      const destination = scenarioFor(current.emergency.scenarioId).states.find(s => s.id === edge.to)!
      const isStart = ['connect', 'reconnect', 'retry', 'no_response'].includes(edge.id) &&
        destination.request_overrides.rescue === 'connection_unknown'
      if (isStart) startContact(next, command.now)
      else if (Object.keys(destination.request_overrides).some(agency => destination.request_overrides[agency] !== current.emergency.requests[agency])) return current
      const advanced = transition(current.emergency, edge)
      moveEmergencyCursor(next, advanced.sceneId, command.now)
      if (edge.effect === 'handoff') {
        addObservation(next, { id: `handoff:${next.observations.length}`, kind: 'handoff', label: '구호 인계', value: '인계 확인',
          source: 'fixture', observedAt: command.now, confirmation: 'confirmed', legacyFactId: 'handoff', supersedes: null })
      }
      if (edge.effect === 'risk') {
        addObservation(next, { id: `risk:${next.observations.length}`, kind: 'risk', label: '차량 위험', value: '위험 감지',
          source: 'fixture', observedAt: command.now, confirmation: 'attention', legacyFactId: 'risk', supersedes: null })
        if (current.stage !== 'response') next.returnStage = current.stage
        next.stage = 'response'
      }
      break
    }
    case 'follow-up': {
      const previous = current.followUp
      const desired = command.value
      const followUp = next.followUp
      followUp.repairItems = [...desired.repairItems]
      if (desired.shopId !== previous.shopId) {
        followUp.shopId = desired.shopId
        followUp.route = 'idle'; followUp.rental = 'idle'
        followUp.routeRequest = null; followUp.rentalRequest = null
        followUp.source = desired.source; followUp.updatedAt = desired.updatedAt
      } else {
        if (desired.route !== previous.route) {
          if (desired.route === 'preview' && previous.shopId) {
            followUp.requestRevision = (followUp.requestRevision ?? 0) + 1
            followUp.routeRequest = { id: `${current.id}:route:${followUp.requestRevision}`, shopId: previous.shopId, source: 'user', updatedAt: command.now ?? null }
          } else if (desired.route === 'guiding' && previous.route === 'preview' && previous.routeRequest) {
            followUp.routeRequest = { ...previous.routeRequest, updatedAt: command.now ?? previous.routeRequest.updatedAt }
          } else if (desired.route === 'idle') followUp.routeRequest = null
          else return current
          followUp.route = desired.route
        }
        if (desired.rental !== previous.rental) {
          if (desired.rental === 'checking' && ['idle', 'unknown'].includes(previous.rental)) {
            followUp.requestRevision = (followUp.requestRevision ?? 0) + 1
            followUp.rentalRequest = { id: `${current.id}:rental:${followUp.requestRevision}`, shopId: previous.shopId, source: 'user', updatedAt: command.now ?? null }
          } else if (desired.rental === 'idle') followUp.rentalRequest = null
          else return current
          followUp.rental = desired.rental
        }
      }
      if (command.now) next.updatedAt = command.now
      break
    }
    case 'follow-up-result': {
      if (command.caseId !== current.id || command.source === 'user' || !['route', 'rental'].includes(command.kind)) return current
      const key = command.kind === 'route' ? 'routeRequest' : 'rentalRequest'
      const request = current.followUp[key]
      if (!request || request.id !== command.requestId || request.shopId !== command.shopId || current.followUp.shopId !== command.shopId ||
        request.updatedAt && Date.parse(command.updatedAt) < Date.parse(request.updatedAt)) return current
      if (command.kind === 'rental' && ['eligible', 'ineligible'].includes(current.followUp.rental) && command.status === 'unknown') return current
      next.followUp[key] = { ...request, source: command.source, updatedAt: command.updatedAt }
      if (command.kind === 'route') next.followUp.route = command.status
      else next.followUp.rental = command.status
      next.updatedAt = command.updatedAt
      break
    }
    case 'agency-decision':
      if (!canSubmit(current, command.agency)) return current
      next.emergency.requests[command.agency] = command.decision
      break
    case 'share-result': {
      if (command.caseId !== current.id) return current
      const share = next.shares.find(item => item.id === command.shareId)
      if (!share || share.status === 'confirmed' && command.status !== 'confirmed') return current
      share.status = command.status
      break
    }
    case 'transport-start':
    case 'transport-result': {
      if (command.caseId !== current.id) return current
      let request = next.submissions.find(item => item.id === command.submissionId)
      if (!request || next.activeSubmissionIds[request.agency] !== request.id || request.status === 'received') return current
      if (command.type === 'transport-start') {
        if (request.transport !== 'approved' && request.transport !== 'failed') return current
        if (request.transport === 'failed') {
          if (!command.retryId || next.submissions.some(item => item.id === command.retryId)) return current
          request = { ...structuredClone(request), id: command.retryId }
          next.submissions.push(request)
          next.activeSubmissionIds[request.agency] = request.id
        }
        request.transport = 'sending'; request.status = 'checking'
      } else {
        if (request.transport !== 'sending') return current
        request.transport = command.status; request.status = command.status
      }
      next.emergency.requests[request.agency] = request.status
      next.updatedAt = command.now
      break
    }
    case 'call-end': {
      if (command.caseId !== current.id || command.submissionId !== current.activeSubmissionIds.rescue) return current
      const request = next.submissions.find(item => item.id === command.submissionId && item.agency === 'rescue')
      if (!request || !['connecting', 'connected'].includes(request.call ?? (request.status === 'connected' ? 'connected' : ''))) return current
      request.call = 'ended'
      next.updatedAt = command.now
      break
    }
    case 'request-result': {
      if (command.caseId !== current.id || !['connection_unknown', 'connected', 'checking', 'unknown', 'received', 'sent', 'failed', 'not_received'].includes(command.status)) return current
      const request = next.submissions.find(s => s.id === command.submissionId && s.agency === command.agency)
      if (!request || request.transport && (request.transport !== 'sent' || !['received', 'unknown', 'not_received'].includes(command.status))) return current
      if (request.kind === 'contact' && command.status === 'failed') request.call = 'ended'
      if (command.agency === 'rescue' && command.status === 'connected' && request.call !== 'ended') request.call = 'connected'
      if (request.status === 'received' && command.status !== 'received') {
        return request.call !== current.submissions.find(item => item.id === request.id)?.call ? { ...next, updatedAt: command.now } : current
      }
      request.status = command.status
      request.externalReceipt = command.externalReceipt ?? request.externalReceipt
      if (next.activeSubmissionIds[command.agency] === request.id && (current.emergency.requests[command.agency] !== 'received' || command.status === 'received')) {
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
