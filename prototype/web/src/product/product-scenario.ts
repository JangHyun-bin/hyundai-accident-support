import type { Scenario, Session } from '../emergency/session'

export const productScenario: Scenario = {
  id: 'product', title: '사고 후 상황 확인', summary: '주변 상태를 직접 확인하고 필요한 도움과 기록을 선택해요.',
  source_nodes: [], open_decisions: [], initial: 'situation-check', facts: [],
  requests: [{ id: 'rescue', label: '긴급 도움', status: 'not_sent' }, { id: 'vehicle', label: '차량 도움', status: 'not_sent' },
    { id: 'insurance', label: '보험사 전달', status: 'not_sent' }],
  presentation: { detected: '상황 확인', visible_facts: [], visible_requests: [] },
  states: [{ id: 'situation-check', label: '상황 확인', phase: 'decide', title: '먼저 주변을 확인해 주세요',
    voice: '다친 사람이나 새로 생긴 위험이 있나요? 지금 상황을 확인한 뒤 필요한 도움을 선택해 주세요.',
    cue: { symbol: 'check', status: 'unknown', label: '직접 확인이 필요해요', detail: '차량 신호만으로 안전을 판단하지 않아요.' },
    request_overrides: {}, fact_overrides: {}, actions: [], events: [], deferred: [] }],
}

export function createProductSession(): Session {
  return { version: 1, scenarioId: 'product', sceneId: 'situation-check',
    requests: { rescue: 'not_sent', vehicle: 'not_sent', insurance: 'not_sent' }, facts: {},
    record: '', savedRecord: '', scope: [], approvedScope: [], approvedRecord: '', draftApproved: false,
    requestId: null, submissions: 0, returnTo: 'situation-check', suspendedFrom: null }
}
