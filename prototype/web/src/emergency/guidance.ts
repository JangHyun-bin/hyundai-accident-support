import variants from '../audio/emergency-guidance.json' with { type: 'json' }
import { scenarioFor, type Scene, type Session } from './session'

const insuranceLabels: Record<string, string> = {
  declined: '거절 유지 · 보내지 않음', deferred: '보류 유지 · 보내지 않음', not_sent: '요청 전 · 보내지 않음',
  sent: '전송됨 · 접수 미확인', unknown: '접수 미확인', checking: '접수 확인 중',
  received: '접수 확인', failed: '전송 실패', not_received: '미접수 확인',
  connected: '통화 연결 · 접수 미확인', connection_unknown: '연결 미확인 · 접수 미확인',
}
const insuranceScenes: Record<string, string> = {
  declined: 'declined', deferred: 'deferred', not_sent: 'declined', sent: 'sent',
  checking: 'checking', received: 'received', failed: 'failed',
}

export function resolveGuidance(session: Session, scene: Scene, persistent: boolean) {
  let text = scene.voice
  let instruction = scene.instruction
  let title = scene.title
  let cueLabel = scene.cue.label
  const recordStorageLabel = persistent ? '이 기기에 보관된 기록' : '기기 저장 실패 · 현재 화면에서만 유지'
  const insuranceStatus = session.requests.insurance
  const insuranceLabel = insuranceLabels[insuranceStatus]

  if (scene.id === 'record_saved') {
    // A saved in-memory draft is not a durable commit, nor proof it was never sent.
    text = persistent ? scenarioFor('SC01').states.find(state => state.id === 'record_saved')!.voice : variants.record_storage_failed
    instruction = text
    if (!persistent) title = '기기에 저장하지 못했어요'
  }
  if (session.scenarioId === 'SC04' && ['support', 'paused', 'deferred'].includes(scene.id)) {
    cueLabel = insuranceLabel
    const sourceScene = insuranceScenes[insuranceStatus]
    if (sourceScene) text = scenarioFor('SC04').states.find(state => state.id === sourceScene)!.voice
    if (['unknown', 'connected', 'connection_unknown'].includes(insuranceStatus)) text = variants.insurance_unconfirmed
    if (insuranceStatus === 'not_received') text = variants.insurance_not_received
    if (insuranceStatus === 'deferred' && !persistent) text = variants.deferred_storage_failed
    if (scene.id === 'paused' && !persistent) title = '남은 일을 현재 화면에 유지해요'
    instruction = text
  }
  // Persistence and request changes invalidate playback even when their selected script is identical.
  const contextKey = JSON.stringify([session.scenarioId, scene.id, persistent, session.requests, text])
  return { text, contextKey, title, instruction, cueLabel, recordStorageLabel, insuranceLabel }
}
