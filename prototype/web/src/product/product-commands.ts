import { LIMITS, type Evidence, type JourneyCase } from '../journey/case'
import { validateObservation, validateSafetyAction, validateEvidence, validateDiagram, validateReport,
  validateEvidenceReference, validateFollowUp, validatePayload } from '../journey/case-validation'
import type { AssetManifest, ChangeRequest, CopyRequest, MultipartChange, ProductPhoneCommand,
  VehicleActionId, VehicleActionRequest, VehicleFactRequest } from './api-contract'

export class InvalidProductInput extends Error {}
export const inputObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
export const inputId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(value)
export const inputRevision = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const mutationId = (value: unknown): value is string => inputId(value) && value.length <= 128
export const inputText = (value: unknown, max: number = LIMITS.statementLength): value is string => typeof value === 'string' && value.length <= max
const ids = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 1000 && value.every(inputId) && new Set(value).size === value.length
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key))
const invalid = (): never => { throw new InvalidProductInput('요청 내용을 확인해 주세요.') }
const stages = ['response', 'record', 'review', 'follow-up'] as const
const actionIds: VehicleActionId[] = ['need-help', 'confirm-record-ready', 'defer-recording', 'report-risk', 'resume-recording', 'decline-sharing']

function userEvidence(value: unknown): value is Evidence {
  return validateEvidence(value) && value.origin === 'user'
}

export function parsePhoneCommand(value: unknown): ProductPhoneCommand {
  if (!inputObject(value) || typeof value.type !== 'string') return invalid()
  const hasKeys = (...fields: string[]) => keys(value, ['type', ...fields])
  switch (value.type) {
    case 'navigate':
      if (hasKeys('stage')) for (const stage of stages) if (value.stage === stage) return { type: value.type, stage }
      return invalid()
    case 'suspend': case 'resume': case 'diagram-confirm': case 'report-apply-pending':
      return hasKeys() ? { type: value.type } : invalid()
    case 'observation': {
      const observation = value.observation
      if (!hasKeys('observation') || !validateObservation(observation) || observation.source !== 'user' || observation.legacyFactId !== null) return invalid()
      return { type: value.type, observation: { id: observation.id, kind: observation.kind, label: observation.label,
        value: observation.value, source: 'user', observedAt: observation.observedAt, confirmation: observation.confirmation,
        legacyFactId: null, supersedes: observation.supersedes } }
    }
    case 'safety-action': {
      const action = value.action
      if (!hasKeys('action') || !validateSafetyAction(action) || action.source !== 'user' || action.status === 'device-confirmed') return invalid()
      return { type: value.type, action: { id: action.id, label: action.label, status: action.status, source: 'user', confirmedAt: action.confirmedAt } }
    }
    case 'statement-edit':
      if (!hasKeys('id', 'text', 'audioEvidenceIds') || !inputId(value.id) || !inputText(value.text) || !ids(value.audioEvidenceIds)) return invalid()
      return { type: value.type, id: value.id, text: value.text, audioEvidenceIds: value.audioEvidenceIds }
    case 'statement-confirm': case 'evidence-remove': case 'paragraph-remove':
      return hasKeys('id') && inputId(value.id) ? { type: value.type, id: value.id } : invalid()
    case 'voice-save': {
      if (!hasKeys('evidence', 'statement') || !Array.isArray(value.evidence) || value.evidence.length > 100 ||
        !value.evidence.every(userEvidence) || value.evidence.some(item => item.kind !== 'audio')) return invalid()
      const statement = value.statement
      if (statement !== null && (!inputObject(statement) || !keys(statement, ['id', 'text', 'audioEvidenceIds']) ||
        !inputId(statement.id) || !inputText(statement.text) || !ids(statement.audioEvidenceIds))) return invalid()
      if (statement === null) return { type: value.type, evidence: value.evidence.map(cleanEvidence), statement: null }
      if (!inputObject(statement) || !inputId(statement.id) || !inputText(statement.text) || !ids(statement.audioEvidenceIds)) return invalid()
      return { type: value.type, evidence: value.evidence.map(cleanEvidence), statement: { id: statement.id, text: statement.text, audioEvidenceIds: statement.audioEvidenceIds } }
    }
    case 'evidence-put':
      return hasKeys('evidence') && userEvidence(value.evidence) ? { type: value.type, evidence: cleanEvidence(value.evidence) } : invalid()
    case 'diagram-edit': {
      const diagram = value.diagram
      if (!hasKeys('diagram') || !validateDiagram(diagram) || diagram.origin !== 'user') return invalid()
      return { type: value.type, diagram: { revision: diagram.revision, origin: 'user', road: diagram.road,
        vehicles: diagram.vehicles.map(car => ({ id: car.id, position: { x: car.position.x, y: car.position.y }, heading: car.heading })),
        contact: diagram.contact === null ? null : { x: diagram.contact.x, y: diagram.contact.y }, confirmedRevision: diagram.confirmedRevision } }
    }
    case 'report-result': case 'report-restore': {
      const report = value.report
      if (!hasKeys('report') || !validateReport(report)) return invalid()
      return { type: value.type, report: { revision: report.revision, basedOnRevision: report.basedOnRevision,
        paragraphs: report.paragraphs.map(p => ({ id: p.id, text: p.text, kind: p.kind, revision: p.revision,
          confirmedRevision: null, references: p.references.map(ref => ({ evidenceId: ref.evidenceId, evidenceRevision: ref.evidenceRevision, start: ref.start, end: ref.end })) })) } }
    }
    case 'paragraph-edit':
      if (!hasKeys('id', 'text', 'references') || !inputId(value.id) || !inputText(value.text) || !Array.isArray(value.references) ||
        value.references.length > 100 || !value.references.every(validateEvidenceReference)) return invalid()
      return { type: value.type, id: value.id, text: value.text,
        references: value.references.map(ref => ({ evidenceId: ref.evidenceId, evidenceRevision: ref.evidenceRevision, start: ref.start, end: ref.end })) }
    case 'paragraph-confirm':
      if (!hasKeys('id', 'revision') || !inputId(value.id) || value.revision !== undefined && !inputRevision(value.revision)) return invalid()
      return { type: value.type, id: value.id, ...(value.revision === undefined ? {} : { revision: value.revision }) }
    case 'paragraph-unconfirm':
      return hasKeys('id', 'revision') && inputId(value.id) && inputRevision(value.revision) ? { type: value.type, id: value.id, revision: value.revision } : invalid()
    case 'agency-decision':
      if (!hasKeys('agency', 'decision') || value.decision !== 'deferred' && value.decision !== 'declined') return invalid()
      if (value.agency !== 'rescue' && value.agency !== 'vehicle' && value.agency !== 'insurance') return invalid()
      return { type: value.type, agency: value.agency, decision: value.decision }
    case 'follow-up': {
      const followUp = value.value
      if (!hasKeys('value', 'now') || !validateFollowUp(followUp) || followUp.source !== 'user' ||
        followUp.route !== 'idle' || followUp.rental !== 'idle' || followUp.routeRequest || followUp.rentalRequest) return invalid()
      return { type: value.type, value: { shopId: followUp.shopId, repairItems: [...followUp.repairItems], source: 'user',
        updatedAt: followUp.updatedAt, route: 'idle', rental: 'idle', routeRequest: null, rentalRequest: null } }
    }
    default: return invalid()
  }
}

function cleanEvidence(evidence: Evidence): Evidence {
  return { id: evidence.id, label: evidence.label, kind: evidence.kind, revision: evidence.revision, origin: 'user',
    assetId: evidence.assetId, availability: evidence.availability, captureTarget: evidence.captureTarget,
    metadata: { mime: evidence.metadata.mime, bytes: evidence.metadata.bytes, duration: evidence.metadata.duration,
      capturedAt: evidence.metadata.capturedAt, sourceLabel: evidence.metadata.sourceLabel,
      ...(evidence.metadata.eventTime === undefined ? {} : { eventTime: evidence.metadata.eventTime }) } }
}

export function stampPhoneCommand(command: ProductPhoneCommand, now: string): ProductPhoneCommand {
  switch (command.type) {
    case 'observation': return { ...command, observation: { ...command.observation, observedAt: now } }
    case 'safety-action': return { ...command, action: { ...command.action, confirmedAt: command.action.status === 'user-confirmed' ? now : null } }
    case 'follow-up': return { ...command, now, value: { ...command.value, updatedAt: now } }
    case 'evidence-put': return { ...command, evidence: { ...command.evidence, metadata: { ...command.evidence.metadata, capturedAt: now } } }
    case 'voice-save': return { ...command, evidence: command.evidence.map(evidence => ({ ...evidence, metadata: { ...evidence.metadata, capturedAt: now } })) }
    default: return command
  }
}

export function parseChange(value: unknown): MultipartChange {
  if (!inputObject(value) || !keys(value, ['expectedRevision', 'mutationId', 'commands', 'assets']) || !inputRevision(value.expectedRevision) ||
    !mutationId(value.mutationId) || !Array.isArray(value.commands) || value.commands.length < 1 || value.commands.length > 100) return invalid()
  const assets: AssetManifest[] = []
  if (value.assets !== undefined) {
    if (!Array.isArray(value.assets) || value.assets.length > 100) return invalid()
    for (const item of value.assets) {
      if (!inputObject(item) || !keys(item, ['id', 'mime', 'bytes', 'sha256']) || !inputId(item.id) || !inputText(item.mime, 100) ||
        !inputRevision(item.bytes) || item.bytes <= 0 || item.bytes > LIMITS.caseBytes || typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256)) return invalid()
      assets.push({ id: item.id, mime: item.mime, bytes: item.bytes, sha256: item.sha256 })
    }
    if (new Set(assets.map(asset => asset.id)).size !== assets.length) return invalid()
  }
  const request: ChangeRequest = { expectedRevision: value.expectedRevision, mutationId: value.mutationId, commands: value.commands.map(parsePhoneCommand) }
  return { ...request, assets }
}

export function parseCopy(value: unknown): CopyRequest {
  if (!inputObject(value) || !keys(value, ['expectedRevision', 'mutationId', 'id', 'selection', 'preview']) || !inputRevision(value.expectedRevision) ||
    !mutationId(value.mutationId) || !inputId(value.id) || !inputObject(value.selection) || !validatePayload(value.preview)) return invalid()
  const selection = value.selection
  if (!keys(selection, ['observationIds', 'statementIds', 'evidenceIds', 'includeDiagram', 'includeReport']) || !ids(selection.observationIds) || !ids(selection.statementIds) ||
    !ids(selection.evidenceIds) || typeof selection.includeDiagram !== 'boolean' || typeof selection.includeReport !== 'boolean') return invalid()
  return { expectedRevision: value.expectedRevision, mutationId: value.mutationId, id: value.id,
    selection: { observationIds: selection.observationIds, statementIds: selection.statementIds, evidenceIds: selection.evidenceIds,
      includeDiagram: selection.includeDiagram, includeReport: selection.includeReport }, preview: value.preview }
}

export function parseVehicleAction(value: unknown): VehicleActionRequest {
  if (!inputObject(value) || !keys(value, ['expectedRevision', 'mutationId', 'actionId']) || !inputRevision(value.expectedRevision) || !mutationId(value.mutationId)) return invalid()
  for (const actionId of actionIds) if (value.actionId === actionId) return { expectedRevision: value.expectedRevision, mutationId: value.mutationId, actionId }
  return invalid()
}

export function parseVehicleFact(value: unknown): VehicleFactRequest {
  if (!inputObject(value) || !keys(value, ['expectedRevision', 'mutationId', 'fact']) || !inputRevision(value.expectedRevision) || !mutationId(value.mutationId) || !inputObject(value.fact)) return invalid()
  const fact = value.fact
  if (fact.signal !== 'seat-airbag-deployed' || !inputId(fact.seatId) || fact.seatId.length > 32 || fact.sdkVersion !== '2.3.2' ||
    typeof fact.observedAt !== 'string' || !Number.isFinite(Date.parse(fact.observedAt))) return invalid()
  const common = { signal: fact.signal, seatId: fact.seatId, sdkVersion: fact.sdkVersion, observedAt: fact.observedAt } as const
  if (fact.kind === 'reading' && keys(fact, ['signal', 'seatId', 'sdkVersion', 'observedAt', 'kind', 'value', 'source']) &&
    typeof fact.value === 'boolean' && (fact.source === 'pleos-sdk' || fact.source === 'simulation')) {
    return { expectedRevision: value.expectedRevision, mutationId: value.mutationId, fact: { ...common, kind: 'reading', value: fact.value, source: fact.source } }
  }
  if (fact.kind === 'unavailable' && keys(fact, ['signal', 'seatId', 'sdkVersion', 'observedAt', 'kind', 'cause'])) {
    for (const cause of ['permission-denied', 'capability-missing', 'disconnected', 'read-failed'] as const) {
      if (fact.cause === cause) return { expectedRevision: value.expectedRevision, mutationId: value.mutationId, fact: { ...common, kind: 'unavailable', cause } }
    }
  }
  return invalid()
}

export function isProductCase(value: JourneyCase): boolean {
  return value.emergency.scenarioId === 'product' && value.fixtureId === null
}
