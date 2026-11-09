import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, CarFront, Check, MapPin, Navigation, Wrench } from 'lucide-react'
import { JourneyAction, JourneyHeading, JourneyStatus, type JourneyTone } from './JourneyLayout'
import type { CaseCommand, FollowUp, JourneyCase, Source } from './case'
import { followUpDirectories, followUpRepairItems, type FollowUpDirectory } from './follow-up-fixtures'
import './follow-up.css'

const rentalLabels: Record<FollowUp['rental'], { title: string; detail: string; tone: JourneyTone }> = {
  idle: { title: '대차 자격 확인 필요', detail: '보험 가입 여부만으로 대차 이용 가능 여부를 알 수는 없어요.', tone: 'unknown' },
  checking: { title: '대차 가능 여부 확인 중', detail: '제공 기관의 결과를 기다리고 있어요.', tone: 'pending' },
  eligible: { title: '대차 이용 가능 확인', detail: '세부 이용 조건은 제공 기관의 안내를 확인해주세요.', tone: 'confirmed' },
  ineligible: { title: '대차 이용 불가 확인', detail: '제공 기관에서 이용이 어렵다고 안내했어요.', tone: 'failed' },
  unknown: { title: '대차 가능 여부 미확인', detail: '아직 결과를 확인하지 못했어요. 필요하면 다시 확인할 수 있어요.', tone: 'unknown' },
}
const unknownDirectory: FollowUpDirectory = { status: 'empty', shops: [], source: null, sourceLabel: '출처 미확인', updatedAt: null, origin: null }
function time(value: string) { return new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function sourceLabel(source: Source) { return source === 'fixture' ? '제공된 안내' : source === 'user' ? '직접 확인 요청' : '연결된 서비스 안내' }
function distance(meters: number | null) { return meters === null ? '거리 미확인' : meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km` }

export function FollowUpPanel({ value, onCommand, directory: providedDirectory, onDirtyChange, navigation }: {
  value: JourneyCase; onCommand: (command: CaseCommand) => void; directory?: FollowUpDirectory; onDirtyChange?: (dirty: boolean) => void; navigation?: ReactNode
}) {
  const directory = providedDirectory ?? (value.fixtureId ? followUpDirectories.ready : unknownDirectory)
  const followUp = value.followUp
  const shop = directory.shops.find(item => item.id === followUp.shopId)
  const [choosingShop, setChoosingShop] = useState(!followUp.shopId)
  const [repairItems, setRepairItems] = useState<string[]>([...followUp.repairItems])
  const [reviewing, setReviewing] = useState(false)
  const savedItems = JSON.stringify(followUp.repairItems)
  const dirty = JSON.stringify(repairItems) !== savedItems || reviewing
  const rental = rentalLabels[followUp.rental]
  const options = [...new Set<string>([...followUpRepairItems, ...followUp.repairItems])]

  useEffect(() => { setRepairItems([...followUp.repairItems]); setReviewing(false) }, [savedItems, value.id])
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function update(patch: Partial<FollowUp>) {
    onCommand({ type: 'follow-up', now: new Date().toISOString(), value: { ...followUp, ...patch, source: directory.source ?? 'user', updatedAt: directory.updatedAt } })
  }
  function selectShop(id: string) {
    if (followUp.shopId !== id) update({ shopId: id, route: 'idle', rental: 'idle' })
    setChoosingShop(false)
  }

  return <section className="journey-follow-up" aria-label="사고 후속 처리">
    <JourneyHeading step="후속 처리" title="필요한 다음 일을 살펴보세요">정비소와 이동 경로, 대차 여부를 따로 확인할 수 있어요.</JourneyHeading>
    <section className="journey-follow-up-section" aria-labelledby="follow-up-shops-title">
      <header className="journey-follow-up-heading"><Wrench aria-hidden="true" /><h2 id="follow-up-shops-title">정비소 선택</h2></header>
      <p className="journey-follow-up-source">{directory.sourceLabel}<span>{directory.updatedAt ? `${time(directory.updatedAt)} 확인` : '갱신 시각 미확인'}</span></p>
      {directory.status === 'stale' && <div className="journey-follow-up-notice"><JourneyStatus tone="unknown">입고 가능 여부를 다시 확인해주세요</JourneyStatus><p>이전에 받은 안내예요. 정비소 선택만으로 입고가 확정되지는 않아요.</p></div>}
      {directory.status === 'empty' && <div className="journey-follow-up-empty"><MapPin aria-hidden="true" /><h3>제공된 정비소가 없어요</h3><p>정비소 정보가 확인되면 목록에 표시돼요. 다른 내용은 계속 확인할 수 있어요.</p></div>}
      {directory.status === 'failed' && <div className="journey-follow-up-empty"><JourneyStatus tone="failed">정비소 정보를 불러오지 못했어요</JourneyStatus><p>남긴 기록은 유지돼요. 정보가 다시 확인되면 목록에 표시돼요.</p></div>}
      {followUp.shopId && !shop && directory.status !== 'empty' && directory.status !== 'failed' && <p role="status">선택한 정비소 정보를 다시 확인해주세요.</p>}
      {(choosingShop || !shop) && <div className="journey-follow-up-shops">{directory.shops.map(item => <article className="journey-shop" key={item.id}>
        <div className="journey-shop-title"><h3>{item.name}</h3><span>{distance(item.distanceMeters)}</span></div>
        <p className="journey-supporting">{item.description}</p>
        <dl className="journey-shop-intake"><dt>{directory.status === 'stale' ? '이전 입고 안내' : '입고 가능 안내'}</dt><dd>{item.intakeAt ? `${time(item.intakeAt)} 이후` : '정비소 확인 필요'}</dd></dl>
        <JourneyAction secondary disabled={dirty} aria-label={`${item.name} 선택`} aria-pressed={item.id === followUp.shopId} onClick={() => selectShop(item.id)}>
          {item.id === followUp.shopId ? <><Check aria-hidden="true" />선택됨</> : <>이 정비소 선택<ArrowRight aria-hidden="true" /></>}
        </JourneyAction>
      </article>)}</div>}
      {shop && !choosingShop && <div className="journey-selected-shop"><span className="journey-eyebrow">선택한 정비소</span><strong>{shop.name}</strong><p>{distance(shop.distanceMeters)} · {shop.description}</p>
        <button className="journey-follow-up-text-button" disabled={dirty} onClick={() => setChoosingShop(true)}>정비소 다시 선택</button>
      </div>}
    </section>
    {!shop && dirty && <section className="journey-follow-up-section" aria-label="보관 중인 점검 항목">
      <p className="journey-supporting">선택 중인 항목을 보관하고 있어요. 정비소 정보가 확인되면 이어서 검토할 수 있어요.</p>
      <button className="journey-follow-up-text-button" onClick={() => { setRepairItems([...followUp.repairItems]); setReviewing(false) }}>선택 취소</button>
    </section>}
    {shop && <>
      <section className="journey-follow-up-section" aria-labelledby="follow-up-repairs-title">
        <header className="journey-follow-up-heading"><CarFront aria-hidden="true" /><h2 id="follow-up-repairs-title">정비소에 전할 항목</h2></header>
        <p className="journey-supporting">예상 점검 항목이며, 실제 수리 범위와 비용은 정비소 확인이 필요해요.</p>
        <p className="journey-follow-up-source">{followUp.repairItems.length ? '직접 선택한 내용' : directory.source === 'fixture' ? '제공된 점검 항목' : '직접 선택할 항목'}</p>
        {!reviewing ? <>
          <fieldset className="journey-repair-options"><legend className="sr-only">전할 항목 선택</legend>{options.map(item => <label key={item}>
            <input type="checkbox" checked={repairItems.includes(item)} onChange={event => setRepairItems(previous => event.target.checked ? [...previous, item] : previous.filter(entry => entry !== item))} /><span>{item}</span>
          </label>)}</fieldset>
          <JourneyAction secondary disabled={!repairItems.length && !followUp.repairItems.length} onClick={() => setReviewing(true)}>선택한 항목 검토</JourneyAction>
        </> : <section className="journey-repair-review" aria-label="정비소에 전할 내용"><h3>{shop.name}</h3>{!repairItems.length && <p>선택한 항목이 없어요. 이전 선택을 비울 수 있어요.</p>}<ul>{repairItems.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="journey-supporting">아직 정비소에 전달하지 않았어요.</p>
          <JourneyAction onClick={() => { update({ repairItems: [...repairItems] }); setReviewing(false) }}>검토 내용 저장</JourneyAction>
          <JourneyAction secondary onClick={() => setReviewing(false)}>항목 다시 선택</JourneyAction>
        </section>}
        {dirty && <button className="journey-follow-up-text-button" onClick={() => { setRepairItems([...followUp.repairItems]); setReviewing(false) }}>선택 취소</button>}
      </section>
      <section className="journey-follow-up-section" aria-labelledby="follow-up-route-title">
        <header className="journey-follow-up-heading"><Navigation aria-hidden="true" /><h2 id="follow-up-route-title">이동 경로</h2></header>
        <div className="journey-follow-up-route"><div><span>목적지</span><strong>{shop.name}</strong></div><span>{distance(shop.distanceMeters)}</span></div>
        {(followUp.route === 'preview' || followUp.route === 'guiding') && navigation && <div className="journey-follow-up-navigation" aria-label="정비소 경로 지도">{navigation}</div>}
        <p className="journey-supporting">차량 이동 가능 여부는 별도로 확인해주세요.</p>
        {followUp.routeRequest && <p className="journey-follow-up-source">{sourceLabel(followUp.routeRequest.source)}<span>{followUp.routeRequest.updatedAt ? `${time(followUp.routeRequest.updatedAt)} ${followUp.routeRequest.source === 'user' ? '요청' : '확인'}` : '갱신 시각 미확인'}</span></p>}
        {followUp.route === 'guiding' ? <><JourneyStatus tone="confirmed">경로 안내 중</JourneyStatus><JourneyAction secondary onClick={() => update({ route: 'idle' })}>안내 종료</JourneyAction></>
          : followUp.route === 'preview' ? <><JourneyStatus tone="pending">경로 미리보기</JourneyStatus><JourneyAction onClick={() => update({ route: 'guiding' })}>안내 시작</JourneyAction></>
          : <>{followUp.route === 'unavailable' && <JourneyStatus tone="unknown">경로를 확인하지 못했어요</JourneyStatus>}<JourneyAction secondary onClick={() => update({ route: 'preview' })}>경로 미리보기</JourneyAction></>}
      </section>
    </>}
    <section className="journey-follow-up-section" aria-labelledby="follow-up-rental-title">
      <header className="journey-follow-up-heading"><CarFront aria-hidden="true" /><h2 id="follow-up-rental-title">대차 이용</h2></header>
      <JourneyStatus tone={rental.tone}>{rental.title}</JourneyStatus><p className="journey-supporting">{rental.detail}</p>
      {followUp.rental === 'idle' && <JourneyAction secondary onClick={() => update({ rental: 'checking' })}>대차 가능 여부 확인</JourneyAction>}
      {followUp.rental === 'unknown' && <JourneyAction secondary onClick={() => update({ rental: 'checking' })}>대차 다시 확인</JourneyAction>}
      {followUp.rental !== 'idle' && followUp.rentalRequest && <p className="journey-follow-up-source">{sourceLabel(followUp.rentalRequest.source)}<span>{followUp.rentalRequest.updatedAt ? `${time(followUp.rentalRequest.updatedAt)} ${followUp.rentalRequest.source === 'user' ? '요청' : '확인'}` : '갱신 시각 미확인'}</span></p>}
    </section>
  </section>
}
