import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, FileText, Mic, Phone, TriangleAlert } from 'lucide-react'
import { CareAction, CareHeading, CareStatus } from '@/components/ui/after-care'
import { useJourneyCase } from '@/journey/useJourneyCase'
import { VoiceRecordPanel, type VoiceRecordHandle } from '@/journey/VoiceRecordPanel'
import { EvidencePanel, type EvidencePanelHandle } from '@/journey/EvidencePanel'
import { JourneyReviewPanel, type JourneyReviewHandle } from '@/journey/JourneyReviewPanel'
import { JourneyRecovery } from '@/journey/JourneyRecovery'
import type { CaseCommand, Stage } from '@/journey/case'
import { stopGuidanceAudio } from '@/audio/useGuidanceAudio'
import type { PhoneSession } from './api-contract'
import { riskCheckRequired } from './product-case'
import { BrandLockup } from '@/components/ui/brand'

export function EmergencyHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open) { stopGuidanceAudio(); dialog.current?.showModal() }
    else dialog.current?.close()
  }, [open])
  return <dialog ref={dialog} className="product-help" aria-labelledby="product-help-title" onCancel={onClose} onClose={onClose}>
    <div className="product-help-content">
      <h2 id="product-help-title">지금 도움이 필요한가요?</h2>
      <p>다친 분이 있거나 화재·연기 등 급한 위험이 있다면 119에 상황과 위치를 알려주세요.</p>
      <p>차도에 머물지 마세요. 이동이 위험하면 무리하게 움직이지 말고 구조대의 안내를 받으세요.</p>
      <a className="product-contact" href="tel:119"><Phone aria-hidden="true" />119 전화 화면 열기</a>
      <p className="product-muted">전화 앱을 열어요. 통화 연결과 출동 여부는 이 화면에서 확인할 수 없어요.</p>
      <CareAction secondary onClick={onClose}>닫기</CareAction>
    </div>
  </dialog>
}

function FollowUpContacts() {
  return <>
    <section className="product-followup-item"><h2>보험사에 직접 연락</h2><p>보험사 접수는 연결되어 있지 않아요. 가입한 보험사 앱이나 보험증권에서 연락처를 확인해주세요.</p><CareStatus tone="unknown">보험사 전송 없음 · 접수 미확인</CareStatus></section>
    <section className="product-followup-item"><h2>차량 점검·이동</h2><p>운행이 불안하면 직접 운전하지 말고 보험사 긴급출동이나 정비소에 문의하세요. 견인·정비 예약은 자동으로 이루어지지 않아요.</p></section>
    <section className="product-followup-item"><h2>대차·렌터카</h2><p>필요하면 보험사나 대여 업체에 직접 문의하세요. 이용 가능 여부와 보장 범위는 아직 확인되지 않았어요.</p></section>
  </>
}

export function ProductFlow({ session }: { session: PhoneSession }) {
  const journey = useJourneyCase(session.caseId)
  const { value } = journey
  const voice = useRef<VoiceRecordHandle>(null)
  const photos = useRef<EvidencePanelHandle>(null)
  const review = useRef<JourneyReviewHandle>(null)
  const [method, setMethod] = useState<'voice' | 'photos'>('photos')
  const [help, setHelp] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [rechecked, setRechecked] = useState(false)
  const safety = !!value && (!rechecked || value.stage === 'response' || value.suspended || riskCheckRequired(value))

  useEffect(() => {
    if (!safety) return
    voice.current?.preserveDraft()
    void photos.current?.preserveDraft()
    review.current?.preserveDraft()
    stopGuidanceAudio()
  }, [safety])

  function preserve() {
    voice.current?.preserveDraft()
    void photos.current?.preserveDraft()
    review.current?.preserveDraft()
    stopGuidanceAudio()
  }
  async function finishEditors() {
    const recordReady = value?.stage !== 'record' || (method === 'voice' ? await voice.current?.finishBeforeLeave() ?? true : await photos.current?.finishBeforeLeave() ?? true)
    const reviewReady = value?.stage !== 'review' || (await review.current?.finishBeforeLeave() ?? true)
    if (!recordReady || !reviewReady) { setNotice('남기던 내용을 확인하고 저장해주세요. 입력은 그대로 남아 있어요.'); return false }
    return true
  }
  async function navigate(stage: Stage) {
    if (!value || busy) return
    if (stage === 'response') preserve()
    else if (!await finishEditors()) return
    setBusy(true); setNotice('')
    try {
      const result = await journey.save({ type: 'navigate', stage })
      if (!result.ok) setNotice('저장하지 못했어요. 입력 내용은 그대로 남아 있어요.')
    } finally { setBusy(false) }
  }
  async function ready() {
    if (!value || busy) return
    setBusy(true); setNotice('')
    try {
      const confirmed = await journey.save({ type: 'safety-action', action: { id: 'record-ready', label: '현재 상태 재확인', status: 'user-confirmed', source: 'user', confirmedAt: new Date().toISOString() } })
      if (!confirmed.ok) { setNotice('상태 확인을 저장하지 못했어요. 다시 시도해주세요.'); return }
      if (value.suspended && !(await journey.save({ type: 'resume' })).ok) return
      const destination = value.stage !== 'response' ? value.stage : value.returnStage === 'response' ? 'record' : value.returnStage
      const result = await journey.save({ type: 'navigate', stage: destination })
      if (!result.ok) setNotice('기록을 열지 못했어요. 입력 내용은 그대로 남아 있어요.')
      else setRechecked(true)
    } finally { setBusy(false) }
  }
  async function defer() {
    if (!value || busy) return
    preserve(); setBusy(true); setNotice('')
    try {
      const result = await journey.save({ type: 'suspend' })
      if (!result.ok) setNotice('보류 상태를 저장하지 못했어요. 입력 내용은 그대로 남아 있어요.')
    } finally { setBusy(false) }
  }
  async function declineSharing() {
    if (!value || busy || !await finishEditors()) return
    setBusy(true); setNotice('')
    try {
      const decision = await journey.save({ type:'agency-decision', agency:'insurance', decision:'declined' })
      if (!decision.ok) { setNotice('선택을 저장하지 못했어요. 기록은 그대로 있어요.'); return }
      await journey.save({ type:'navigate', stage:'follow-up' })
    } finally { setBusy(false) }
  }
  function risk() {
    if (!value) return
    preserve()
    setRechecked(false)
    journey.dispatch({ type: 'observation', observation: { id: crypto.randomUUID(), kind: 'risk', label: '현재 위험', value: '새 위험이 있어 상태 재확인 필요', source: 'user', observedAt: new Date().toISOString(), confirmation: 'attention', legacyFactId: null, supersedes: null } })
  }
  async function reload() {
    if (reloading) return
    setReloading(true)
    try {
      preserve()
      const recorded = await voice.current?.recoveryDraft()
      const paragraph = review.current?.recoveryCommand()
      await journey.reload({ commands: [...(recorded?.commands ?? []), ...(paragraph ? [paragraph] : [])], assets: recorded?.assets ?? [] })
    } finally { setReloading(false) }
  }
  async function selectMethod(next: 'voice' | 'photos') {
    if (!await finishEditors()) return
    setNotice(''); setMethod(next)
  }
  function panelCommand(command: CaseCommand) {
    if (command.type === 'navigate') void navigate(command.stage)
    else journey.dispatch(command)
  }
  const tabs = <nav className="journey-record-tabs" aria-label="기록 방법">
    <button type="button" aria-pressed={method === 'photos'} onClick={() => void selectMethod('photos')}><Camera aria-hidden="true" />사진</button>
    <button type="button" aria-pressed={method === 'voice'} onClick={() => void selectMethod('voice')}><Mic aria-hidden="true" />음성·직접 입력</button>
  </nav>
  return <div className="product-app ac-system journey-theme" data-care-device="mobile" data-case-id={value?.id} data-product-stage={value?.stage}>
    <header className="product-header"><span className="product-wordmark"><BrandLockup /></span><span>차량과 이어진 사고 기록</span></header>
    <main className="product-main">
      {journey.loading && <section className="product-card"><p role="status">사고 기록을 불러오고 있어요.</p></section>}
      {!value && !journey.loading && <section className="product-card"><CareHeading title="기록을 열지 못했어요">연결을 확인해주세요. 이 화면에서 새 기록을 만들지는 않아요.</CareHeading><CareAction secondary onClick={() => location.reload()}>연결 다시 확인</CareAction></section>}
      {value && <>
        <nav className="product-navigation" aria-label="사고 후 할 일">
          <button aria-current={safety ? 'page' : undefined} disabled={busy} onClick={() => void navigate('response')}>현재 상황</button>
          <button aria-current={!safety && value.stage === 'record' ? 'page' : undefined} disabled={busy || !!safety} onClick={() => void navigate('record')}>기록</button>
          <button aria-current={!safety && value.stage === 'review' ? 'page' : undefined} disabled={busy || !!safety} onClick={() => void navigate('review')}>내용 확인</button>
          <button aria-current={!safety && value.stage === 'follow-up' ? 'page' : undefined} disabled={busy || !!safety} onClick={() => void navigate('follow-up')}>이후 할 일</button>
        </nav>
        <section hidden={!safety} className="product-card product-situation" aria-label="현재 상황 확인">
          <CareHeading eyebrow={value.suspended ? '기록은 잠시 멈췄어요' : '먼저 상황을 확인해주세요'} title="다친 분이 있거나, 지금 위험한가요?">{value.suspended ? '남기던 내용은 유지돼요. 현재 상태를 다시 확인한 뒤 이어가세요.' : '도움 요청과 기록은 별개예요. 지금 할 수 있는 일을 선택해주세요.'}</CareHeading>
          <div className="product-actions">
            <CareAction onClick={() => setHelp(true)}>도움이 필요해요</CareAction>
            <CareAction secondary disabled={busy} onClick={() => void ready()}>지금 기록할 수 있어요</CareAction>
            {!value.suspended && <CareAction secondary disabled={busy} onClick={() => void defer()}>지금은 쉬어갈게요</CareAction>}
          </div>
          <details className="product-facts"><summary>기록 없이 이후 할 일 보기</summary><FollowUpContacts /></details>
          <p className="product-muted">에어백이 작동하지 않았거나 차량 정보를 읽지 못했어도, 사고나 위험이 없다는 뜻은 아니에요.</p>
          <details className="product-facts"><summary>차량에서 확인한 정보</summary>{value.observations.filter(item => item.kind !== 'risk').length ? value.observations.filter(item => item.kind !== 'risk').map(item => <p key={item.id}>{item.label} · {item.value}<span>{item.source === 'device' ? '차량 SDK 보고' : item.source === 'fixture' ? '모의 입력' : '직접 확인'} · {item.confirmation === 'confirmed' ? '확인됨' : '미확인'}</span></p>) : <p>아직 확인한 차량 정보가 없어요.</p>}</details>
        </section>
        <section hidden={!!safety || value.stage !== 'record'} className="product-workspace" aria-label="사고 기록">
          <p className="product-muted">남길 수 있는 것만, 순서 없이 기록하세요. 사진이나 음성을 꼭 남길 필요는 없어요.</p>
          <div hidden={method !== 'photos'} inert={reloading}><EvidencePanel ref={photos} value={value} onSave={journey.save} onCommand={panelCommand} navigation={tabs} /></div>
          <div hidden={method !== 'voice'} inert={reloading}><VoiceRecordPanel ref={voice} value={value} mode="device" onSave={journey.save} durable={journey.saveState === 'saved'} reloadVersion={journey.reloadVersion} navigation={tabs} /></div>
          <div className="product-actions"><CareAction secondary disabled={busy} onClick={() => void navigate('review')}><FileText aria-hidden="true" />남긴 내용 확인</CareAction><CareAction secondary disabled={busy} onClick={() => void defer()}>잠시 쉬기</CareAction><CareAction secondary disabled={busy} onClick={() => void navigate('follow-up')}>기록 없이 이후 할 일 보기</CareAction></div>
        </section>
        <section hidden={!!safety || value.stage !== 'review'} className="product-workspace" aria-label="기록 검토">
          <JourneyReviewPanel ref={review} mode="product" value={value} saving={journey.saveState === 'saving'} reloading={reloading} reloadVersion={journey.reloadVersion} onCommand={journey.save} onApprove={journey.approveCopy} />
          <div className="product-actions"><CareAction secondary disabled={busy} onClick={() => void navigate('record')}><ArrowLeft aria-hidden="true" />기록으로</CareAction><CareAction secondary disabled={busy} onClick={() => void navigate('follow-up')}>이후 할 일 보기</CareAction><CareAction secondary disabled={busy} onClick={() => void declineSharing()}>보험사에 보내지 않고 마치기</CareAction></div>
        </section>
        <section hidden={!!safety || value.stage !== 'follow-up'} className="product-card" aria-label="이후 할 일">
          <CareHeading title="다음에 할 일을 확인하세요">지금 결정하지 않아도 돼요. 남긴 기록은 다시 열 수 있어요.</CareHeading>
          <section className="product-followup-item"><h2>내 기록 사본</h2><CareStatus tone={value.shares.length ? 'confirmed' : 'unknown'}>{value.shares.length ? '선택한 내용의 사본을 준비했어요' : '아직 준비한 사본이 없어요'}</CareStatus><CareAction secondary onClick={() => void navigate('review')}>내용과 사본 범위 확인</CareAction></section>
          <FollowUpContacts />
          <CareAction secondary onClick={() => void navigate('record')}>기록 이어가기</CareAction>
        </section>
        <section className="product-save-state" aria-live="polite" aria-atomic="true">
          <p>{journey.saveState === 'saved' ? '저장한 내용은 서버에 보관돼요. 편집 중인 초안은 저장을 눌러주세요.' : journey.saveState === 'saving' ? '서버에 저장하고 있어요' : journey.saveState === 'conflict' ? '다른 기기에서 기록이 바뀌었어요. 내 입력은 유지돼요.' : journey.saveState === 'access-required' || journey.saveState === 'forbidden' ? '연결 권한을 확인할 수 없어요. 입력은 이 화면에 남아 있어요. 차량에서 다시 연결해주세요.' : '서버에 저장하지 못했어요. 입력 내용은 유지돼요.'}</p>
          {journey.saveState === 'conflict' ? <CareAction secondary disabled={reloading} onClick={() => void reload()}>{reloading ? '최신 기록 확인 중' : '내 입력을 보존하고 최신 기록 보기'}</CareAction> : journey.saveState === 'access-required' || journey.saveState === 'forbidden' ? <CareAction secondary onClick={() => location.reload()}>연결 다시 확인</CareAction> : ['unavailable', 'quota', 'invalid'].includes(journey.saveState) && <CareAction secondary onClick={() => void journey.flush()}>저장 다시 시도</CareAction>}
        </section>
        {!journey.durable && <p role="alert" className="product-notice">이 기기에 초안을 안전하게 보관하지 못했어요. 화면을 닫거나 새로고침하지 말고 저장 상태를 확인해주세요.</p>}
        {notice && <p role="status" className="product-notice">{notice}</p>}
        <JourneyRecovery entries={journey.recoveries} current={value} onRestore={journey.dispatch} durable={journey.durable} />
      </>}
      <footer className="product-help-bar"><button onClick={() => setHelp(true)}><Phone aria-hidden="true" />도움 요청</button>{value && <button onClick={risk}><TriangleAlert aria-hidden="true" />새 위험이 있어요</button>}</footer>
      <EmergencyHelp open={help} onClose={() => setHelp(false)} />
    </main>
  </div>
}
