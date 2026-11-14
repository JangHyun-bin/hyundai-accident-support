import { isRecordReady, reduceCase, type CaseCommand, type JourneyCase, type SafetyAction } from '../journey/case'
import type { SdkFact, VehicleAction, VehicleActionId, VehicleProgress } from './api-contract'

export type PhonePresence = VehicleProgress['phone']

export function vehicleProgress(value: JourneyCase, phone: PhonePresence): VehicleProgress {
  const ready = isRecordReady(value)
  const help = value.safetyActions.find(action => action.id === 'help-requested')?.status === 'requested'
  const deferred = value.safetyActions.find(action => action.id === 'record-deferred')?.status === 'requested'
  const actions: VehicleAction[] = [{ id: 'need-help', label: '도움이 필요해요' }]
  let scene: VehicleProgress['scene']
  if (help) {
    actions.push({ id: 'resume-recording', label: '상태를 확인했어요' })
    scene = { id: 'help', title: '지금은 안전부터 확인해요',
      body: '다친 사람이 있거나 화재 등 급한 위험이 있으면 안전한 곳에서 직접 119에 연락하세요. 앱에서 전화를 걸거나 구조 요청을 보내지는 않았어요.', actions }
  } else if (deferred || value.suspended && ready) {
    actions.push({ id: 'resume-recording', label: '확인하고 기록할게요' }, { id: 'report-risk', label: '새로운 위험이 있어요' })
    scene = { id: 'record-deferred', title: '기록은 잠시 미뤄둘게요', body: '저장한 내용은 그대로 남아 있어요. 다시 시작할 때 주변 상태를 한 번 더 확인해 주세요.', actions }
  } else if (!ready) {
    actions.push({ id: value.suspended ? 'resume-recording' : 'confirm-record-ready', label: '급한 위험은 없어요' },
      { id: 'defer-recording', label: '기록은 나중에 할게요' })
    scene = { id: value.suspended ? 'risk-check' : 'situation-check', title: '먼저 주변을 확인해 주세요',
      body: '다친 사람이나 새로 생긴 위험이 있나요? 지금 상황을 직접 확인한 뒤 기록을 시작할 수 있어요.', actions }
  } else {
    actions.push({ id: 'report-risk', label: '새로운 위험이 있어요' }, { id: 'defer-recording', label: '잠시 멈출게요' })
    scene = { id: value.stage, title: value.stage === 'review' ? '휴대폰에서 내용을 확인하고 있어요' : '휴대폰에서 기록을 이어가세요',
      body: phone.online ? '휴대폰에서 최근 연결을 확인했어요. 사진과 진술을 저장하고 검토할 수 있어요.' : '휴대폰 연결을 기다리고 있어요. 마지막으로 저장된 내용은 보관돼 있어요.', actions }
  }
  const copy = value.shares.at(-1)
  return { schemaVersion: 1, caseId: value.id, revision: value.revision, updatedAt: value.updatedAt,
    stage: value.stage, returnStage: value.suspended ? value.returnStage : null, suspended: value.suspended,
    riskCheckRequired: !ready, scene, phone,
    record: { photos: value.evidence.filter(e => e.kind === 'photo' && e.availability === 'available').length,
      audio: value.evidence.filter(e => e.kind === 'audio' && e.availability === 'available').length,
      video: value.evidence.filter(e => e.kind === 'video' && e.availability === 'available').length,
      statement: !value.statements.some(s => s.text.trim()) ? 'empty' : value.statements.every(s => s.confirmedRevision === s.revision) ? 'confirmed' : 'draft',
      report: !value.report?.paragraphs.length ? 'empty' : value.report.paragraphs.every(p => p.confirmedRevision === p.revision) ? 'confirmed' : 'draft' },
    copy: { id: copy?.id ?? null, preparedAt: copy?.approvedAt ?? null }, insurance: { integration: 'unavailable', receipt: null } }
}

export function applyVehicleAction(current: JourneyCase, actionId: VehicleActionId, mutationId: string, now: string): JourneyCase {
  const safety = (id: string, label: string, status: SafetyAction['status']): CaseCommand => ({ type: 'safety-action',
    action: { id, label, status, source: 'user', confirmedAt: status === 'user-confirmed' ? now : null } })
  let commands: CaseCommand[]
  switch (actionId) {
    case 'need-help': commands = [safety('help-requested', '도움 필요', 'requested'), { type: 'suspend' }]; break
    case 'defer-recording': commands = [safety('record-deferred', '기록 미루기', 'requested'), { type: 'suspend' }]; break
    case 'report-risk': commands = [{ type: 'observation', observation: { id: `risk:${mutationId}`, kind: 'risk', label: '새로운 위험',
      value: '사용자가 위험을 알렸어요', source: 'user', observedAt: now, confirmation: 'attention', legacyFactId: null, supersedes: null } }]; break
    case 'decline-sharing': commands = [{ type: 'agency-decision', agency: 'insurance', decision: 'declined' }]; break
    case 'confirm-record-ready': case 'resume-recording':
      commands = [safety('record-ready', '기록할 수 있는 상태', 'user-confirmed'), safety('help-requested', '도움 필요', 'unknown'),
        safety('record-deferred', '기록 미루기', 'unknown')]
      if (current.suspended) commands.push({ type: 'resume' })
      if (current.returnStage === 'response' || !current.suspended) commands.push({ type: 'navigate', stage: 'record' })
      break
  }
  return commands.reduce(reduceCase, current)
}

export function applyVehicleFact(current: JourneyCase, fact: SdkFact, mutationId: string, now: string): JourneyCase {
  const simulation = fact.kind === 'reading' && fact.source === 'simulation'
  const deployed = fact.kind === 'reading' && fact.value
  const value = fact.kind === 'unavailable' ? `신호 확인 불가 · ${fact.cause}` : fact.value ? '에어백 전개값 true' : '에어백 전개값 false · 사고 여부 판단 불가'
  return reduceCase(current, { type: 'observation', observation: { id: `sdk:${mutationId}`, kind: deployed && !simulation ? 'risk' : 'seat-airbag-deployed',
    label: simulation ? `시뮬레이션 · ${fact.seatId}` : `차량 앱 보고 · Pleos SDK ${fact.sdkVersion} · ${fact.seatId}`, value,
    source: simulation ? 'fixture' : 'device', observedAt: now, confirmation: deployed && !simulation ? 'attention' : 'unknown',
    legacyFactId: null, supersedes: null } })
}
