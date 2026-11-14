import { useEffect, useMemo, useState } from 'react'
import { Link2, ShieldCheck, Smartphone } from 'lucide-react'
import { CareAction, CareHeading, CareStatus } from '@/components/ui/after-care'
import { CaseDataProvider } from '@/journey/case-data'
import { createRemoteCaseData } from './remote-case-data'
import type { ClaimResponse, PhoneSession } from './api-contract'
import { claimPair, claimStatus, PairingError, rememberedClaim, rememberClaim, restorePhoneSession, takePairToken } from './pairing'
import { EmergencyHelp, ProductFlow } from './ProductFlow'
import './product.css'
import { ContextualGuidanceProvider } from '@/audio/GuidanceControl'
import { BrandLockup } from '@/components/ui/brand'

type Connection =
  | { kind: 'checking' }
  | { kind: 'unpaired' }
  | { kind: 'claiming' }
  | { kind: 'waiting'; claim: ClaimResponse; disconnected: boolean }
  | { kind: 'failed'; reason: 'invalid' | 'expired' | 'unavailable' }
  | { kind: 'ready'; session: PhoneSession }

function ConnectedProduct({ session }: { session: PhoneSession }) {
  const data = useMemo(() => createRemoteCaseData({ session }), [session])
  return <CaseDataProvider data={data}><ProductFlow session={session} /></CaseDataProvider>
}

export function ProductApp() {
  return <ContextualGuidanceProvider><PhoneConnection /></ContextualGuidanceProvider>
}

function PhoneConnection() {
  const [token] = useState(takePairToken)
  const [connection, setConnection] = useState<Connection>({ kind: 'checking' })
  const [attempt, setAttempt] = useState(0)
  const [help, setHelp] = useState(false)
  const [showPairing, setShowPairing] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function connect() {
      try {
        if (attempt === 0 && token.kind === 'invalid') { setConnection({ kind: 'failed', reason: 'invalid' }); return }
        if (attempt === 0 && token.kind === 'token') {
          setConnection({ kind: 'claiming' })
          const claim = await claimPair(token.token)
          if (cancelled) return
          rememberClaim(claim)
          setConnection({ kind: 'waiting', claim, disconnected: false })
          return
        }
        const session = await restorePhoneSession()
        if (cancelled) return
        if (session) { rememberClaim(null); setConnection({ kind: 'ready', session }); return }
        const claim = rememberedClaim()
        setConnection(claim ? { kind: 'waiting', claim, disconnected: false } : { kind: 'unpaired' })
      } catch (error) {
        if (!cancelled) setConnection({ kind: 'failed', reason: error instanceof PairingError && error.kind !== 'access' ? error.kind : 'expired' })
      }
    }
    void connect()
    return () => { cancelled = true }
  }, [token, attempt])

  const pending = connection.kind === 'waiting' ? connection.claim : null
  useEffect(() => {
    if (!pending) return
    const claim = pending
    let cancelled = false
    let timer: number | undefined
    async function poll() {
      if (Date.parse(claim.expiresAt) <= Date.now()) {
        rememberClaim(null); setConnection({ kind: 'failed', reason: 'expired' }); return
      }
      try {
        const status = await claimStatus(claim.claimId)
        if (cancelled) return
        if (status.state === 'approved') { rememberClaim(null); setConnection({ kind: 'ready', session: status.session }); return }
        if (status.state !== 'pending') { rememberClaim(null); setConnection({ kind: 'failed', reason: 'expired' }); return }
        setConnection({ kind: 'waiting', claim, disconnected: false })
      } catch (error) {
        if (cancelled) return
        if (error instanceof PairingError && (error.kind === 'access' || error.kind === 'expired')) { rememberClaim(null); setConnection({ kind: 'failed', reason: 'expired' }); return }
        setConnection({ kind: 'waiting', claim, disconnected: true })
      }
      if (!cancelled) timer = window.setTimeout(() => void poll(), 2000)
    }
    void poll()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [pending])

  if (connection.kind === 'ready') return <ConnectedProduct session={connection.session} />
  return <div className="product-app ac-system journey-theme" data-care-device="mobile">
    <header className="product-header"><a href="/" aria-label="차분 처음 화면"><BrandLockup /></a><span>사고 후 도움</span></header>
    <main className="product-main product-connect">
      {connection.kind === 'waiting' ? <section className="product-card product-pairing" aria-label="차량 연결 승인">
        <ShieldCheck aria-hidden="true" />
        <CareHeading title="차량 화면에서 연결을 승인해주세요">두 화면의 코드가 같은지 확인해주세요.</CareHeading>
        <p id="pairing-title" className="product-pair-code" aria-label={'연결 확인 코드 ' + connection.claim.verificationCode}>{connection.claim.verificationCode}</p>
        <CareStatus tone="pending">{connection.disconnected ? '연결 상태를 다시 확인하고 있어요' : '차량의 승인을 기다리고 있어요'}</CareStatus>
        <p className="product-muted">승인 전에는 사고 기록을 열 수 없어요. 모르는 연결은 승인하지 마세요.</p>
      </section> : <section className="product-card">
        <CareHeading eyebrow="먼저 상황을 확인해주세요" title="다친 분이 있거나, 지금 위험한가요?">위험하다면 기록보다 도움을 먼저 요청하세요.</CareHeading>
        <div className="product-actions">
          <CareAction onClick={() => setHelp(true)}>도움이 필요해요</CareAction>
          <CareAction secondary onClick={() => setShowPairing(true)}>기록을 이어갈게요</CareAction>
        </div>
        {(showPairing || connection.kind === 'failed') && <section className="product-pair-instructions">
          <Smartphone aria-hidden="true" /><h2>차량의 QR을 휴대전화로 읽어주세요</h2>
          <p>차량에서 연결을 승인하면 같은 사고 기록을 이어갈 수 있어요.</p>
        </section>}
        {connection.kind === 'failed' && <p role="alert" className="product-notice">{connection.reason === 'unavailable' ? '서버에 연결하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해주세요.' : connection.reason === 'invalid' ? '연결 주소를 확인할 수 없어요. 차량에서 새 QR을 열어주세요.' : '연결이 만료되었거나 취소됐어요. 차량에서 새 QR을 열어주세요.'}</p>}
        {connection.kind === 'checking' || connection.kind === 'claiming' ? <p role="status" className="product-muted">{connection.kind === 'claiming' ? '차량에 연결을 신청하고 있어요.' : '이전 연결을 확인하고 있어요.'}</p> : <CareAction secondary onClick={() => { setConnection({ kind: 'checking' }); setAttempt(previous => previous + 1) }}><Link2 aria-hidden="true" />연결 다시 확인</CareAction>}
      </section>}
      {connection.kind === 'waiting' && <CareAction secondary onClick={() => setHelp(true)}>도움이 필요해요</CareAction>}
      <EmergencyHelp open={help} onClose={() => setHelp(false)} />
      <p className="product-limit">보험사 자동 접수와 긴급전화 자동 발신은 제공하지 않아요.</p>
    </main>
  </div>
}
