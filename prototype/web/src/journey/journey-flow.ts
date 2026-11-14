import { checklistLabels, type FlowLayout } from '@/design-system/flow-study-model'
import type { JourneyCase, Submission } from './case'

export const safetyChecklist = [
  { id: 'checklist-hazard', label: checklistLabels[0] },
  { id: 'checklist-trunk', label: checklistLabels[1] },
  { id: 'checklist-route', label: checklistLabels[2] },
  { id: 'checklist-mobile', label: checklistLabels[3] },
] as const
export const noUrgentDanger = { id: 'situation-clear', label: '급한 위험 없음' } as const

export type CallState = 'idle' | 'connecting' | 'connected' | 'ended'
export type ResponsePath = 'unanswered' | 'call' | 'clear'
export type ResponseStep = 1 | 2 | 3 | 4
type JourneyStep = ResponseStep | 5 | 6 | 7
export type FlowScene = 'situation' | 'situation-call' | 'situation-clear' | 'calling' | 'call' | 'call-ended' | 'move' | 'ready'
  | 'record-empty' | 'record' | 'review' | 'review-ready' | 'review-failed' | 'sending' | 'sent' | 'received' | 'sent-review'
type SceneCopy = { title: string; support: string; action: string; blocked?: true; demo?: true }
type GuideState = 'situation' | 'call' | 'move' | 'safe'

export const safetyConfirmed = (value: JourneyCase, id: string) => value.safetyActions.some(action => action.id === id && ['user-confirmed', 'device-confirmed'].includes(action.status))
export const activeRequest = (value: JourneyCase, agency: Submission['agency']) => value.submissions.find(item => item.id === value.activeSubmissionIds[agency])
export const callState = (value: JourneyCase): CallState => {
  const request = activeRequest(value, 'rescue')
  return request?.call ?? (request?.status === 'connected' ? 'connected' : request?.status === 'connection_unknown' ? 'connecting' : 'idle')
}
export const hasJourneyRecord = (value: JourneyCase) => value.statements.some(item => item.text.trim()) || value.evidence.some(item => item.availability === 'available') || !!value.diagram || !!value.report?.paragraphs.some(item => item.text.trim())
export const responsePath = (value: JourneyCase): ResponsePath => callState(value) !== 'idle' ? 'call' : safetyConfirmed(value, noUrgentDanger.id) ? 'clear' : 'unanswered'

const isResponseStep = (step: JourneyStep): step is ResponseStep => step <= 4
const responseSteps: Record<ResponseStep, { layout: FlowLayout; next: (path: ResponsePath, arrived: boolean) => ResponseStep | 'record' | null; back: (path: ResponsePath) => ResponseStep | null }> = {
  1: { layout: 'detect', next: path => path === 'call' ? 2 : path === 'clear' ? 3 : null, back: () => null },
  2: { layout: 'detect', next: (_, arrived) => arrived ? 4 : 3, back: () => 1 },
  3: { layout: 'evacuate', next: () => 4, back: path => path === 'call' ? 2 : 1 },
  4: { layout: 'safe', next: () => 'record', back: () => 3 },
}
const resumeStep: Record<ResponsePath, ResponseStep> = { unanswered: 1, call: 2, clear: 3 }
const situationScene: Record<ResponsePath, FlowScene> = { unanswered: 'situation', call: 'situation-call', clear: 'situation-clear' }
const callScene: Record<CallState, FlowScene> = { idle: 'calling', connecting: 'calling', connected: 'call', ended: 'call-ended' }

const situation = { title: '주변 상황을 먼저 살펴보세요', support: '다친 사람이 있거나 연기·불꽃이 보이면 바로 119에 연결하세요.' }
const recording = { title: '기억나는 내용을 남겨주세요', support: '말, 사진, 직접 입력 중 편한 방법을 고르세요.' }
const reviewing = { title: '보험사에 보낼 내용을 확인하세요', support: '받는 곳과 보낼 자료는 직접 골라요.' }
export const sceneCopy: Record<FlowScene, SceneCopy> = {
  situation: { ...situation, action: '상황을 고르면 다음으로 넘어가요', blocked: true },
  'situation-call': { ...situation, action: '119 통화 보기' },
  'situation-clear': { ...situation, action: '대피 안내 보기' },
  calling: { title: '119에 연결하고 있어요', support: '연결되면 다친 사람과 지금 위치를 알려 주세요.', action: '통화 연결 확인', demo: true },
  call: { title: '119와 통화 중이에요', support: '안내를 들으며 안전한 곳으로 이동하세요.', action: '대피 안내 보기' },
  'call-ended': { title: '119 통화가 끝났어요', support: '도움이 더 필요하면 다시 연결할 수 있어요.', action: '대피 안내 보기' },
  move: { title: '안전한 곳으로 이동하세요', support: '할 수 있는 것부터 하나씩 해 주세요.', action: '안전한 곳에 있어요' },
  ready: { title: '기억나는 내용을 남겨 둘까요?', support: '말이나 사진으로 편하게 남길 수 있어요.', action: '기록 시작' },
  'record-empty': { ...recording, action: '기록을 저장하면 다음으로 넘어가요', blocked: true },
  record: { ...recording, action: '남긴 내용 확인' },
  review: { ...reviewing, action: '받는 곳과 보낼 자료 고르기' },
  'review-ready': { ...reviewing, action: '승인한 내용 보내기' },
  'review-failed': { title: '보내지 못했어요', support: '기록은 그대로 있어요. 승인한 내용 그대로 다시 보낼 수 있어요.', action: '다시 보내기' },
  sending: { title: '기록을 보내고 있어요', support: '보내는 동안에도 기록과 통화는 그대로 유지돼요.', action: '보험사 전송 완료', demo: true },
  sent: { title: '보험사에 기록을 보냈어요', support: '보험사 접수는 아직 확인되지 않았어요.', action: '다음 할 일 보기' },
  received: { title: '보험사에 기록을 보냈어요', support: '보험사 접수가 확인됐어요.', action: '다음 할 일 보기' },
  'sent-review': { title: '보낸 내용을 확인하세요', support: '보낸 기록과 공유 내역을 볼 수 있어요.', action: '완료 화면으로' },
}
export const guideCopy: Record<GuideState, { title: string; note: string }> = {
  situation: { title: '다친 사람이나 위험한 상황이 있나요?', note: '연기나 불꽃, 기름 냄새가 나거나 다친 사람이 있으면 119에 연결하세요.' },
  call: { title: '통화하며 주변을 살펴보세요', note: '움직일 수 있으면 안전한 곳으로 이동하세요.' },
  move: { title: '안전한 곳으로 이동하세요', note: '차가 다니지 않는 곳으로 피하세요.' },
  safe: { title: '안전한 곳에 머물러 주세요', note: '이제 기억나는 내용을 남길 수 있어요.' },
}

export function journeyFlow(value: JourneyCase, responseView: ResponseStep | null = null) {
  const request = activeRequest(value, 'insurance')
  const call = callState(value)
  const path = responsePath(value)
  const arrived = safetyConfirmed(value, 'safe-arrival')
  const sending = request?.transport === 'sending'
  const sent = request?.transport === 'sent' || !request?.transport && ['sent', 'received'].includes(request?.status ?? '')
  const step: JourneyStep = value.stage === 'record' ? 5 : value.stage === 'review' || value.stage === 'follow-up' ? sent ? 7 : 6
    : responseView ?? (arrived ? 4 : resumeStep[path])
  const response = isResponseStep(step) ? responseSteps[step] : null
  const scene: FlowScene = sending && step >= 4 ? 'sending'
    : step === 1 ? situationScene[path] : step === 2 ? callScene[call] : step === 3 ? 'move' : step === 4 ? 'ready'
    : step === 5 ? hasJourneyRecord(value) ? 'record' : 'record-empty'
    : step === 6 ? request?.transport === 'failed' ? 'review-failed' : request?.transport === 'approved' ? 'review-ready' : 'review'
    : request?.status === 'received' ? 'received' : 'sent'
  const layout: FlowLayout = scene === 'sending' ? 'sending' : response ? response.layout
    : step === 7 ? call === 'connected' || call === 'connecting' ? 'sending' : 'calm'
    : step === 6 ? 'review' : 'safe'
  const guide: GuideState = arrived ? 'safe' : step >= 3 ? 'move' : step === 2 ? 'call' : 'situation'
  return { step, scene, layout, guide, path, call, arrived, request, sending,
    next: response?.next(path, arrived) ?? null, back: response?.back(path) ?? null }
}
