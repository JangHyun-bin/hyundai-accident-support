import { manifest, scopeItems } from '../emergency/session'
import { LIMITS, type JourneyCase } from './case'

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown, max = 5000): v is string => typeof v === 'string' && v.length <= max
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(v)
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0
const positive = (v: unknown): v is number => integer(v) && v > 0
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v))
const nullable = (v: unknown, check: (x: unknown) => boolean) => v === null || check(v)
const list = (v: unknown, check: (x: unknown) => boolean, max = 1000): v is unknown[] => Array.isArray(v) && v.length <= max && v.every(check)
const oneOf = (v: unknown, values: readonly string[]) => typeof v === 'string' && values.includes(v)
const status = (v: unknown) => typeof v === 'string' && Object.hasOwn(manifest.request_statuses, v)
const agency = (v: unknown) => oneOf(v, ['rescue', 'vehicle', 'insurance'])
const stage = (v: unknown) => oneOf(v, ['response', 'record', 'review', 'follow-up'])
const source = (v: unknown) => oneOf(v, ['device', 'user', 'fixture'])
const confirmation = (v: unknown) => oneOf(v, ['neutral', 'confirmed', 'unknown', 'attention'])
const uniqueIds = (items: unknown[]) => new Set(items.map(v => object(v) ? v.id : null)).size === items.length
const versionConfirmed = (v: Record<string, unknown>) => positive(v.revision) && (v.confirmedRevision === null || v.confirmedRevision === v.revision)

function session(v: unknown) {
  if (!object(v) || v.version !== 1 || !text(v.scenarioId, 8)) return false
  const scenario = manifest.scenarios.find(s => s.id === v.scenarioId)
  if (!scenario) return false
  const scene = (x: unknown) => scenario.states.some(s => s.id === x)
  const scope = (x: unknown) => list(x, y => typeof y === 'string' && scopeItems.includes(y), 3) && new Set(x).size === x.length
  if (!scene(v.sceneId) || !scene(v.returnTo) || !nullable(v.suspendedFrom, scene) ||
    ![v.record, v.savedRecord, v.approvedRecord].every(x => text(x, 500)) || !scope(v.scope) || !scope(v.approvedScope) ||
    typeof v.draftApproved !== 'boolean' || !integer(v.submissions) || v.submissions > 10000 ||
    !nullable(v.requestId, x => typeof x === 'string' && /^SC0[1-5]-\d+$/.test(x))) return false
  if (!object(v.requests) || Object.keys(v.requests).length !== 3 || !['rescue', 'vehicle', 'insurance'].every(a => status((v.requests as Record<string, unknown>)[a]))) return false
  return object(v.facts) && Object.entries(v.facts).every(([key, fact]) => scenario.facts.some(f => f.id === key) && object(fact) &&
    (fact.value === undefined || text(fact.value, 80)) && (fact.status === undefined || confirmation(fact.status)) &&
    (fact.label === undefined || text(fact.label, 80)) && (fact.id === undefined || fact.id === key))
}

function observation(v: unknown) {
  return object(v) && id(v.id) && text(v.kind, 80) && text(v.label, 80) && text(v.value, 80) &&
    source(v.source) && nullable(v.observedAt, date) && confirmation(v.confirmation) &&
    nullable(v.legacyFactId, id) && nullable(v.supersedes, id)
}

function safetyAction(v: unknown) {
  return object(v) && id(v.id) && text(v.label, 100) && source(v.source) && nullable(v.confirmedAt, date) &&
    oneOf(v.status, ['unknown', 'requested', 'user-confirmed', 'device-confirmed', 'unavailable']) &&
    (v.status !== 'device-confirmed' || v.source !== 'user')
}

function evidence(v: unknown) {
  if (!object(v) || !id(v.id) || !text(v.label, 100) || !positive(v.revision) ||
    !oneOf(v.kind, ['photo', 'audio', 'video']) || !oneOf(v.origin, ['sample', 'user']) ||
    !nullable(v.assetId, id) || !oneOf(v.availability, ['pending', 'available', 'failed', 'unavailable', 'skipped']) ||
    !nullable(v.captureTarget, x => oneOf(x, ['scene', 'own-car', 'other-car', 'plate', 'road-marks', 'signals']))) return false
  const m = v.metadata
  if (!object(m) || !text(m.mime, 100) || !integer(m.bytes) || m.bytes > LIMITS.caseBytes ||
    !nullable(m.duration, n => typeof n === 'number' && Number.isFinite(n) && n >= 0) ||
    !nullable(m.capturedAt, date) || !text(m.sourceLabel, 100)) return false
  if (v.kind === 'photo' && m.bytes > LIMITS.photoBytes) return false
  if (v.kind === 'audio' && typeof m.duration === 'number' && m.duration > LIMITS.voiceSeconds) return false
  if (m.eventTime !== undefined && m.eventTime !== null && (typeof m.eventTime !== 'number' || !Number.isFinite(m.eventTime) ||
    m.eventTime < 0 || (typeof m.duration === 'number' && m.eventTime > m.duration))) return false
  if (v.availability === 'available') {
    if (!id(v.assetId) || m.bytes <= 0) return false
    if (v.kind === 'photo' && !oneOf(m.mime, ['image/jpeg', 'image/png', 'image/webp'])) return false
    if (v.kind === 'audio' && !/^audio\/(webm|ogg|mp4|mpeg|wav)(;.*)?$/.test(m.mime)) return false
    if (v.kind === 'video' && !/^video\/(mp4|webm|ogg)(;.*)?$/.test(m.mime)) return false
  }
  return true
}

function statement(v: unknown) {
  return object(v) && id(v.id) && text(v.text, LIMITS.statementLength) && (v.text.trim().length > 0 || v.confirmedRevision === null) &&
    list(v.audioEvidenceIds, id, 100) && new Set(v.audioEvidenceIds).size === v.audioEvidenceIds.length && versionConfirmed(v)
}
function point(v: unknown) {
  return object(v) && [v.x, v.y].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)
}
function diagram(v: unknown) {
  return object(v) && versionConfirmed(v) && oneOf(v.origin, ['fixture', 'user']) && oneOf(v.road, ['straight', 'unsupported']) &&
    list(v.vehicles, car => object(car) && oneOf(car.id, ['own', 'other']) && point(car.position) &&
      typeof car.heading === 'number' && Number.isFinite(car.heading) && car.heading >= 0 && car.heading < 360, 2) &&
    uniqueIds(v.vehicles) && nullable(v.contact, point)
}
function reference(v: unknown) {
  return object(v) && id(v.evidenceId) && positive(v.evidenceRevision) &&
    ((v.start === null && v.end === null) || (typeof v.start === 'number' && typeof v.end === 'number' &&
      Number.isFinite(v.start) && Number.isFinite(v.end) && v.start >= 0 && v.end > v.start))
}
function report(v: unknown) {
  return object(v) && positive(v.revision) && integer(v.basedOnRevision) &&
    list(v.paragraphs, p => object(p) && id(p.id) && text(p.text, 5000) &&
      oneOf(p.kind, ['observation', 'statement', 'inference', 'unknown']) && list(p.references, reference, 100) && versionConfirmed(p), 100) &&
    uniqueIds(v.paragraphs)
}
function payload(v: unknown) {
  return object(v) && list(v.observations, observation) && list(v.statements, statement) &&
    list(v.evidence, evidence) && nullable(v.diagram, diagram) && nullable(v.report, report)
}
function receipt(v: unknown) {
  return object(v) && nullable(v.number, x => text(x, 100)) && date(v.receivedAt) && text(v.agencyName, 100) && text(v.next, 500)
}
function submission(v: unknown) {
  return object(v) && id(v.id) && oneOf(v.kind, ['new', 'imported', 'contact']) && agency(v.agency) &&
    nullable(v.recipient, x => text(x, 100)) && nullable(v.approvedAt, date) && nullable(v.payload, payload) &&
    (v.kind !== 'new' || (v.payload !== null && v.approvedAt !== null && typeof v.recipient === 'string' && v.recipient.trim().length > 0)) &&
    (v.kind !== 'contact' || (v.agency === 'rescue' && v.payload === null && v.approvedAt === null)) &&
    status(v.status) && nullable(v.externalReceipt, receipt)
}
function share(v: unknown) {
  return object(v) && id(v.id) && text(v.recipient, 100) && v.recipient.trim().length > 0 &&
    date(v.approvedAt) && payload(v.payload) && oneOf(v.status, ['pending', 'confirmed', 'failed', 'unknown'])
}
function followUpRequest(v: unknown) {
  return object(v) && id(v.id) && nullable(v.shopId, id) && source(v.source) && nullable(v.updatedAt, date)
}
function followUp(v: unknown) {
  return object(v) && (v.requestRevision === undefined || integer(v.requestRevision)) &&
    [v.routeRequest, v.rentalRequest].every(request => request === undefined || request === null || object(request) && followUpRequest(request) && request.shopId === v.shopId) &&
    nullable(v.shopId, id) && list(v.repairItems, x => text(x, 200), 30) &&
    oneOf(v.route, ['idle', 'preview', 'guiding', 'unavailable']) && oneOf(v.rental, ['idle', 'checking', 'eligible', 'ineligible', 'unknown']) &&
    source(v.source) && nullable(v.updatedAt, date)
}

export function validateCase(v: unknown): v is JourneyCase {
  if (!object(v) || v.schemaVersion !== 1 || !id(v.id) || !integer(v.revision) || !date(v.createdAt) || !date(v.updatedAt) ||
    !session(v.emergency) || !stage(v.stage) || !stage(v.returnStage) || typeof v.suspended !== 'boolean' ||
    !nullable(v.fixtureId, id) || !nullable(v.navigation, n => object(n) && n.source === 'fixture' && point(n.vehicle) && point(n.destination) &&
      typeof n.distanceMeters === 'number' && Number.isFinite(n.distanceMeters) && n.distanceMeters > 0 && date(n.updatedAt)) ||
    !list(v.observations, observation) || !uniqueIds(v.observations) || !list(v.safetyActions, safetyAction) || !uniqueIds(v.safetyActions) ||
    !list(v.evidence, evidence) || !uniqueIds(v.evidence) || !list(v.evidenceHistory, evidence) ||
    !list(v.statements, statement) || !uniqueIds(v.statements) || !list(v.statementHistory, statement) ||
    !nullable(v.diagram, diagram) || !list(v.diagramHistory, diagram) || !nullable(v.report, report) ||
    !list(v.reportHistory, report) || !nullable(v.pendingReport, report) || !integer(v.contentRevision) ||
    !list(v.submissions, submission) || !uniqueIds(v.submissions) || !object(v.activeSubmissionIds) ||
    Object.keys(v.activeSubmissionIds).length !== 3 || !list(v.shares, share) || !uniqueIds(v.shares) || !followUp(v.followUp)) return false
  const value = v as JourneyCase
  if (value.evidence.filter(e => e.kind === 'photo' && (e.assetId !== null || e.metadata.bytes > 0)).length > LIMITS.photoCount) return false
  if (!value.statements.every(s => s.audioEvidenceIds.every(key => value.evidence.some(e => e.id === key && e.kind === 'audio')))) return false
  if (!['rescue', 'vehicle', 'insurance'].every(a => {
    const key = (v.activeSubmissionIds as Record<string, unknown>)[a]
    return key === null || value.submissions.some(s => s.id === key && s.agency === a)
  })) return false
  const scenario = manifest.scenarios.find(s => s.id === value.emergency.scenarioId)!
  return value.observations.every(o => (!o.legacyFactId || scenario.facts.some(f => f.id === o.legacyFactId)) &&
    (!o.supersedes || value.observations.some(previous => previous.id === o.supersedes && previous.kind === o.kind && previous.id !== o.id)))
}
