import { validateCase, type JourneyCase } from '../journey/case'
import { createProductSession } from './product-scenario'
export { isRecordReady, riskCheckRequired } from '../journey/case'

export function createProductCase(id: string, now: string): JourneyCase {
  const value: JourneyCase = {
    schemaVersion: 1, id, revision: 0, createdAt: now, updatedAt: now,
    emergency: createProductSession(),
    stage: 'response', returnStage: 'response', suspended: false, fixtureId: null, navigation: null,
    observations: [], safetyActions: [{ id: 'record-ready', label: '기록할 수 있는 상태', status: 'unknown', source: 'user', confirmedAt: null }],
    evidence: [], evidenceHistory: [], statements: [], statementHistory: [], diagram: null, diagramHistory: [],
    report: null, reportHistory: [], pendingReport: null, contentRevision: 0,
    submissions: [], activeSubmissionIds: { rescue: null, vehicle: null, insurance: null }, shares: [],
    followUp: { requestRevision: 0, routeRequest: null, rentalRequest: null, shopId: null, repairItems: [],
      route: 'idle', rental: 'idle', source: 'user', updatedAt: null },
  }
  if (!validateCase(value)) throw new Error('Invalid production case')
  return value
}
