import { checklistLabels, type FlowLayout } from '@/design-system/flow-study-model'
import type { JourneyCase, Submission } from './case'

export const safetyChecklist = [
  { id: 'checklist-hazard', label: checklistLabels[0] },
  { id: 'checklist-trunk', label: checklistLabels[1] },
  { id: 'checklist-route', label: checklistLabels[2] },
  { id: 'checklist-mobile', label: checklistLabels[3] },
] as const
export type ResponseStep = 1 | 2 | 3 | 4
export const safetyConfirmed = (value: JourneyCase, id: string) => value.safetyActions.some(action => action.id === id && ['user-confirmed', 'device-confirmed'].includes(action.status))
export const activeRequest = (value: JourneyCase, agency: Submission['agency']) => value.submissions.find(item => item.id === value.activeSubmissionIds[agency])
export const callState = (value: JourneyCase) => {
  const request = activeRequest(value, 'rescue')
  return request?.call ?? (request?.status === 'connected' ? 'connected' : request?.status === 'connection_unknown' ? 'connecting' : 'idle')
}
export const hasJourneyRecord = (value: JourneyCase) => value.statements.some(item => item.text.trim()) || value.evidence.some(item => item.availability === 'available') || !!value.diagram || !!value.report?.paragraphs.some(item => item.text.trim())

export function journeyFlow(value: JourneyCase, responseView: ResponseStep | null = null) {
  const request = activeRequest(value, 'insurance')
  const sent = request?.transport === 'sent' || !request?.transport && ['sent', 'received'].includes(request?.status ?? '')
  const step = value.stage === 'record' ? 5 : value.stage === 'review' || value.stage === 'follow-up' ? sent ? 7 : 6
    : responseView ?? (safetyConfirmed(value, 'safe-arrival') ? 4 : callState(value) === 'connected' || callState(value) === 'ended' ? 2 : 1)
  const layout: FlowLayout = step === 7 ? callState(value) === 'connected' || callState(value) === 'connecting' ? 'sending' : 'calm'
    : request?.transport === 'sending' ? 'sending' : step === 6 ? 'review' : step >= 4 ? 'safe' : step === 3 ? 'evacuate' : 'detect'
  return { step, layout, request, sending: request?.transport === 'sending', call: callState(value) }
}
