import { scopeItems, type Scene, type Session } from './session'
import { resolveGuidance } from './guidance'

export function WorkflowPanel({ scene, session, persistent = true, onChange }: { scene: Scene; session: Session; persistent?: boolean; onChange: (change: { record?: string; scope?: string[] }) => void }) {
  if (!scene.panel) return null
  const insurance = session.scenarioId === 'SC04'
  const recipient = insurance ? '보험사 사고 접수 담당' : '차량 지원 접수 담당'
  const guidance = resolveGuidance(session, scene, persistent)
  if (scene.panel === 'record') return <div className="ac-workflow" data-workflow="record">
    <label className="ac-field-label" htmlFor="accident-record">사고 기록{!persistent && ' · 기기 저장 불가'} <span>{session.record.length} / 500</span></label>
    <textarea className="ac-field" id="accident-record" maxLength={500} rows={3} value={session.record} onChange={e => onChange({ record: e.target.value })} placeholder="기억나는 위치와 사고 경위를 적어주세요" />
    <p className="ac-field-note">확인하지 못한 내용은 추측하지 않아도 돼요.</p>
  </div>
  if (scene.panel === 'record_summary') return <div className="ac-workflow" data-workflow="record_summary"><span className="ac-field-label">{guidance.recordStorageLabel}</span><p className="ac-record-preview">{session.savedRecord || '아직 저장한 기록이 없어요.'}</p></div>
  if (scene.panel === 'scope') return <div className="ac-workflow" data-workflow="scope">
    <dl className="ac-detail-rows"><div><dt>받는 곳</dt><dd>{recipient}</dd></div><div><dt>목적</dt><dd>{insurance ? '보험 사고 접수' : '이동 불가 차량 지원'}</dd></div></dl>
    <fieldset className="ac-scope"><legend>보낼 항목</legend>{scopeItems.map(item => <label key={item}><input type="checkbox" disabled={item === '사고 기록' && !session.savedRecord} checked={session.scope.includes(item)} onChange={e => onChange({ scope: e.target.checked ? scopeItems.filter(x => x === item || session.scope.includes(x)) : session.scope.filter(x => x !== item) })} /><span>{item}{item === '사고 기록' && !session.savedRecord && ' 없음'}</span></label>)}</fieldset>
  </div>
  if (scene.panel === 'resume') return <div className="ac-workflow" data-workflow="resume"><dl className="ac-detail-rows"><div><dt>기존 요청</dt><dd>{session.requests.vehicle === 'received' ? '중단 중 접수 확인' : '결과 확인 필요'}</dd></div><div><dt>기록과 전송 범위</dt><dd>{persistent ? '그대로 보관 중' : '현재 화면에서만 유지 · 기기 저장 실패'}</dd></div></dl></div>
  if (scene.panel === 'support') return <div className="ac-workflow" data-workflow="support"><dl className="ac-detail-rows"><div><dt>구호·차량 지원</dt><dd>접수 확인 · 도착은 별도 확인</dd></div><div><dt>보험사 전송</dt><dd>{guidance.insuranceLabel}</dd></div></dl></div>
  return <div className="ac-workflow" data-workflow="receipt"><dl className="ac-detail-rows"><div><dt>확인 대상</dt><dd>{session.scenarioId === 'SC01' ? '구호 요청' : recipient}</dd></div><div><dt>다음 확인</dt><dd>{insurance ? '담당자 안내' : '현장 도착 · 인계'}</dd></div></dl></div>
}
