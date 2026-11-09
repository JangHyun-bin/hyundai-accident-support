import { useState } from 'react'
import { ArrowRight, AudioLines, CarFront, Check, ChevronRight, FileText, Mic, Play, ShieldCheck, Video, Volume2 } from 'lucide-react'
import { JourneyAction, JourneyHeading, JourneyLayout, JourneyStatus, type JourneyTone } from './JourneyLayout'

const views = ['vehicle', 'voice', 'report'] as const
type Preview = typeof views[number]
const labels = { vehicle: '차량 상태', voice: '음성 기록', report: '경위서 확인' }

function VehicleSummary() {
  return <>
    <div className="journey-summary-title"><CarFront aria-hidden="true" /><strong>충돌 감지</strong><span className="journey-summary-time">오후 9:12</span></div>
    <div className="journey-facts">
      <div><span>운전자 응답</span><JourneyStatus tone="confirmed">응답 확인</JourneyStatus></div>
      <div><span>차량 이동</span><JourneyStatus tone="unknown">미확인</JourneyStatus></div>
      <div><span>이동 경로</span><JourneyStatus tone="unknown">미확인</JourneyStatus></div>
    </div>
  </>
}

function MobileSummary({ step }: { step: string }) {
  return <div className="journey-mobile-context"><ShieldCheck aria-hidden="true" /><span>사고 기록</span><span>{step}</span></div>
}

function VehiclePreview() {
  return <JourneyLayout device="vehicle" summary={<VehicleSummary />} action={<JourneyAction disabled>안내 이어서 보기<ArrowRight aria-hidden="true" /></JourneyAction>}>
    <JourneyHeading title="차량에서 확인한 내용">확인된 정보부터 살펴볼 수 있어요.</JourneyHeading>
    <div className="journey-vehicle-detail">
      <div className="journey-car-outline">
        <svg viewBox="0 0 240 320" role="img"><title>우측 전방 충격 방향</title>
          <path d="M78 38Q120 22 162 38L180 100V257Q180 280 158 284H82Q60 280 60 257V100Z" />
          <path d="M79 103L86 66H154L161 103ZM79 229H161L153 257H87Z" />
          <path d="M75 120V208M165 120V208" />
          <path className="journey-impact" d="M200 46L171 77M182 47L200 46L199 64" />
        </svg><span>우측 전방</span>
      </div>
      <dl className="journey-detail-list">
        <div><dt>충격 방향</dt><dd>우측 전방<span>차량 감지 · 오후 9:12</span></dd></div>
        <div><dt>충격 세기</dt><dd>0.4 G<span>차량 감지 값</span></dd></div>
        <div><dt>사고 영상</dt><dd><JourneyStatus tone="confirmed">전방 영상 확보</JourneyStatus><span>20초 · 후방 영상 확인 중</span></dd></div>
      </dl>
    </div>
    <div className="journey-inline-note"><ShieldCheck aria-hidden="true" /><p>차량 손상과 이동 가능 여부는<br />아직 확인되지 않았어요.</p></div>
  </JourneyLayout>
}

function VoicePreview() {
  return <JourneyLayout device="mobile" summary={<MobileSummary step="기록" />} action={<><JourneyAction disabled><Check aria-hidden="true" />기록 저장</JourneyAction><JourneyAction secondary disabled><Mic aria-hidden="true" />추가로 말하기</JourneyAction></>}>
    <JourneyHeading step="음성 기록" title="이렇게 기록할까요?">기억과 다른 내용은 고칠 수 있어요.</JourneyHeading>
    <div className="journey-audio-review"><button className="journey-icon-button" disabled aria-label="녹음 재생"><Play aria-hidden="true" /></button><div><strong>방금 남긴 이야기</strong><span>00:23</span></div><AudioLines aria-hidden="true" /></div>
    <div className="journey-transcript"><span className="journey-eyebrow">남긴 내용</span><p>오른쪽에서 차가 들어오는 걸 봤어요. 그 뒤에 충격을 느꼈고, 지금은 차를 멈춘 상태예요.</p></div>
    <p className="journey-supporting">확실하지 않은 내용은 그대로 남겨도 돼요.</p>
    <button className="journey-text-action" disabled>내용 직접 고치기<ChevronRight aria-hidden="true" /></button>
  </JourneyLayout>
}

function ReportPreview() {
  return <JourneyLayout device="mobile" summary={<MobileSummary step="내용 확인" />} action={<JourneyAction disabled>전송할 내용 확인<ArrowRight aria-hidden="true" /></JourneyAction>}>
    <JourneyHeading step="사고 경위서" title="기록을 확인해주세요">자료와 기억을 함께 확인해요.</JourneyHeading>
    <div className="journey-report-meta"><span>11월 9일 · 오후 9:12</span><JourneyStatus tone="pending">검토 중</JourneyStatus></div>
    <article className="journey-paragraph">
      <div className="journey-paragraph-label"><span>영상에서 확인한 내용</span><JourneyStatus tone="confirmed">검토함</JourneyStatus></div>
      <p>오른쪽 차로의 차량이 내 차량 방향으로 이동하는 모습이 보여요.</p>
      <button className="journey-evidence-link" disabled><Video aria-hidden="true" /><span>전방 영상 · 00:08–00:16</span><ChevronRight aria-hidden="true" /></button>
    </article>
    <article className="journey-paragraph">
      <div className="journey-paragraph-label"><span>내가 남긴 이야기</span><JourneyStatus tone="unknown">확인 필요</JourneyStatus></div>
      <p>오른쪽에서 차가 들어온 뒤 충격을 느꼈고, 차량을 멈췄어요.</p>
      <button className="journey-evidence-link" disabled><Volume2 aria-hidden="true" /><span>음성 기록 · 00:23</span><ChevronRight aria-hidden="true" /></button>
    </article>
    <p className="journey-supporting">내용을 확인한 뒤 보낼 자료를 선택할 수 있어요.</p>
  </JourneyLayout>
}

export function JourneyCatalog() {
  const requested = new URLSearchParams(location.search).get('preview')
  const [preview, setPreview] = useState<Preview>(views.find(v => v === requested) ?? 'vehicle')
  return <main className="journey-catalog journey-theme">
    <header className="journey-review-heading"><div><p>COMPONENT CATALOG</p><h1>전체 여정 · 표현 기준</h1><span>새 화면은 이 기준의 값과 component만 사용. 없는 표현은 여기에 먼저 추가.</span></div><a href="/?study=emergency-catalog">기존 catalog<ArrowRight size={16} /></a></header>
    <nav className="journey-preview-tabs" aria-label="대표 화면">{views.map(view => <button key={view} aria-pressed={preview === view} onClick={() => setPreview(view)}>{labels[view]}</button>)}</nav>
    <p className="journey-preview-caption">고정 자료로 보는 표현 시안 · 실제 감지·녹음·전송 없음</p>
    {preview === 'vehicle' ? <VehiclePreview /> : preview === 'voice' ? <VoicePreview /> : <ReportPreview />}
    <section className="journey-component-states"><h2><FileText aria-hidden="true" />공통 상태</h2><div>{([
      ['unknown', '확인되지 않았어요'], ['pending', '확인 중'], ['confirmed', '확인됨'], ['failed', '저장하지 못했어요'], ['skipped', '지금은 남기지 않음'],
    ] as [JourneyTone, string][]).map(([tone, label]) => <JourneyStatus key={tone} tone={tone}>{label}</JourneyStatus>)}</div><p>자료 없음 · 아직 남긴 자료가 없어요.</p></section>
  </main>
}
