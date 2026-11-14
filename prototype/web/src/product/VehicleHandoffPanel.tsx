import { useMemo } from 'react'
import { Smartphone } from 'lucide-react'
import { create } from 'qrcode'
import { CareAction, CareHeading, CareStatus } from '@/components/ui/after-care'
import type { PairClaim, VehicleProgress } from './api-contract'
import type { VehicleHandoff, VehicleHandoffState } from './vehicle-handoff'
import './vehicle-handoff.css'

const clock = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
const draftLabel = { empty: '없음', draft: '작성 중', confirmed: '확인됨' } as const

function JoinQr({ url }: { url: string }) {
  const { path, size } = useMemo(() => {
    const { modules } = create(url, { errorCorrectionLevel: 'M' })
    let d = ''
    for (let row = 0; row < modules.size; row++)
      for (let col = 0; col < modules.size; col++)
        if (modules.get(row, col)) d += `M${col} ${row}h1v1h-1z`
    return { path: d, size: modules.size }
  }, [url])
  return <svg className="vh-qr" viewBox={`-4 -4 ${size + 8} ${size + 8}`} shapeRendering="crispEdges" role="img" aria-label="휴대폰 연결 QR 코드" data-join-url={url}>
    <rect x={-4} y={-4} width={size + 8} height={size + 8} fill="#fff" /><path d={path} fill="#000" />
  </svg>
}

function RecordSummary({ record }: { record: VehicleProgress['record'] }) {
  const items = [
    { id: 'photos', label: '사진', value: `${record.photos}장` },
    { id: 'audio', label: '음성', value: `${record.audio}개` },
    ...record.video > 0 ? [{ id: 'video', label: '영상', value: `${record.video}개` }] : [],
    { id: 'statement', label: '진술', value: draftLabel[record.statement] },
    { id: 'report', label: '경위서', value: draftLabel[record.report] },
  ]
  return <dl className="vh-record" aria-label="휴대폰 기록">{items.map(item => <div key={item.id} data-record={item.id}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
}

function ClaimRequest({ claim, onApprove }: { claim: PairClaim; onApprove: () => void }) {
  const code = `${claim.verificationCode.slice(0, 3)} ${claim.verificationCode.slice(3)}`
  return <div className="vh-claim" data-claim={claim.claimId}>
    <p className="fs-cell-muted">{claim.deviceLabel}에서 연결을 요청했어요</p>
    <strong className="vh-code" aria-label={`확인 숫자 ${claim.verificationCode.split('').join(' ')}`}>{code}</strong>
    <p>휴대폰 화면의 숫자와 같으면 승인해 주세요</p>
    <CareAction onClick={onApprove}>승인</CareAction>
  </div>
}

function compactSummary(state: VehicleHandoffState): string {
  switch (state.kind) {
    case 'idle': return '휴대폰 연결 전'
    case 'starting': return '연결 준비 중'
    case 'pairing': return state.claims.length ? '승인을 기다려요' : '휴대폰을 기다려요'
    case 'connected': return state.progress.phone.online ? `휴대폰 연결됨 · 사진 ${state.progress.record.photos}장` : '휴대폰 응답 없음'
    case 'failed': return { unavailable: '서버 연결 안 됨', expired: '연결 코드 만료', access: '다시 연결 필요' }[state.reason]
  }
}

function PhonePresence({ phone }: { phone: VehicleProgress['phone'] }) {
  if (phone.online) return <CareStatus tone="confirmed">휴대폰 연결됨</CareStatus>
  return <CareStatus tone="unknown">{phone.lastSeenAt ? `휴대폰 응답 없음 · 마지막 확인 ${clock(phone.lastSeenAt)}` : '휴대폰 응답 없음'}</CareStatus>
}

function Body({ handoff }: { handoff: VehicleHandoff }) {
  const { state } = handoff
  switch (state.kind) {
    case 'idle': return <>
      <CareHeading level={2} eyebrow="휴대폰으로 이어 기록" title="기록은 휴대폰에서 이어갈 수 있어요">사진과 진술은 휴대폰에 남기고, 진행 상황은 여기서 볼 수 있어요.</CareHeading>
      <div className="vh-actions"><CareAction onClick={handoff.start}>휴대폰 연결하기</CareAction></div>
    </>
    case 'starting': return <>
      <CareHeading level={2} eyebrow="휴대폰으로 이어 기록" title="연결 코드를 만들고 있어요" />
      <CareStatus tone="pending">잠시만 기다려 주세요</CareStatus>
    </>
    case 'pairing': return <>
      <CareHeading level={2} eyebrow="휴대폰으로 이어 기록" title={state.claims.length ? '숫자를 확인해 주세요' : '휴대폰 카메라로 QR 코드를 찍어 주세요'} />
      <div className="vh-pairing">
        <JoinQr url={state.pair.joinUrl} />
        <div className="vh-pairing-side">
          {state.claims.length
            ? state.claims.map(claim => <ClaimRequest key={claim.claimId} claim={claim} onApprove={() => handoff.approve(claim.claimId)} />)
            : <CareStatus tone="pending">휴대폰을 기다리고 있어요</CareStatus>}
          <div className="vh-meta"><span>{clock(state.pair.expiresAt)}까지 쓸 수 있어요</span><CareAction secondary onClick={handoff.renew}>새 코드 받기</CareAction></div>
        </div>
      </div>
    </>
    case 'connected': return <>
      <CareHeading level={2} eyebrow="휴대폰으로 이어 기록" title="휴대폰과 연결됐어요">휴대폰에서 저장한 내용이 여기에 표시돼요.</CareHeading>
      <PhonePresence phone={state.progress.phone} />
      <RecordSummary record={state.progress.record} />
    </>
    case 'failed': return <>
      {state.reason === 'unavailable' && <>
        <CareHeading level={2} eyebrow="휴대폰으로 이어 기록" title="서버에 연결할 수 없어요">저장된 내용은 그대로 있어요. 잠시 후 다시 시도해 주세요.</CareHeading>
        <div className="vh-actions"><CareAction onClick={handoff.retry}>다시 시도</CareAction></div>
      </>}
      {state.reason === 'expired' && <>
        <CareHeading level={2} eyebrow="휴대폰으로 이어 기록" title="연결 코드가 만료됐어요">새 코드를 받아 휴대폰으로 다시 찍어 주세요.</CareHeading>
        <div className="vh-actions"><CareAction onClick={handoff.renew}>새 코드 받기</CareAction></div>
      </>}
      {state.reason === 'access' && <>
        <CareHeading level={2} eyebrow="휴대폰으로 이어 기록" title="연결 정보를 확인할 수 없어요">이 화면에서 새로 연결해 주세요.</CareHeading>
        <div className="vh-actions"><CareAction onClick={handoff.retry}>새로 연결하기</CareAction></div>
      </>}
      {state.progress && <><p className="vh-meta">마지막으로 확인한 기록 · {clock(state.progress.updatedAt)}</p><RecordSummary record={state.progress.record} /></>}
    </>
  }
}

export function VehicleHandoffPanel({ handoff, compact = false }: { handoff: VehicleHandoff; compact?: boolean }) {
  if (compact) return <div className="vh-panel" data-compact="true" data-handoff={handoff.state.kind}>
    <div className="fs-cell-label"><span>휴대폰 연결</span><Smartphone aria-hidden="true" /></div>
    <p className="vh-summary">{compactSummary(handoff.state)}</p>
  </div>
  return <section className="vh-panel" data-handoff={handoff.state.kind} aria-live="polite"><Body handoff={handoff} /></section>
}
