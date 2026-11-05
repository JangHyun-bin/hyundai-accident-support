export type Variant = 'focus' | 'context'
export type CaseId = 'urgent' | 'partial' | 'unconfirmed'
export type RequestStatus = 'not-sent' | 'sent' | 'received' | 'unknown'
export interface DesignCase {
  title: string
  guidance: string
  primaryActionLabel: string
  context: { label: string; value: string }[]
  requests: { id: string; label: string; status: RequestStatus }[]
  sourceNodes: string[]
}

const urgent: DesignCase = {
  title: '지금은 사람의 안전이 먼저예요.',
  guidance: '다친 사람이 있어요. 구호를 위한 도움 요청부터 확인해요.',
  primaryActionLabel: '도움 요청 안내 보기',
  context: [
    { label: '탑승자', value: '부상 있음' },
    { label: '도로', value: '고속도로' },
    { label: '차량', value: '이동 가능' },
    { label: '이동 전 확인', value: '조작·경로 미확인' },
  ],
  requests: [
    { id: 'rescue', label: '구호', status: 'not-sent' },
    { id: 'vehicle', label: '차량 지원', status: 'not-sent' },
    { id: 'insurance', label: '보험', status: 'not-sent' },
  ],
  sourceNodes: ['I2', 'S1', 'G4'],
}

export const cases: Record<CaseId, DesignCase> = {
  urgent,
  partial: { ...urgent, requests: urgent.requests.map((r, i) => ({ ...r, status: i === 0 ? 'received' : i === 1 ? 'sent' : 'not-sent' })) },
  unconfirmed: { ...urgent, requests: urgent.requests.map((r, i) => ({ ...r, status: i === 0 ? 'received' : i === 1 ? 'unknown' : 'not-sent' })) },
}

export const requestLabels: Record<RequestStatus, string> = {
  'not-sent': '요청 전', sent: '전송됨', received: '접수 확인', unknown: '접수 미확인',
}
