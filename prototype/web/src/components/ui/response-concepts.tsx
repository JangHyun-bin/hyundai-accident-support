import { useState, type CSSProperties } from 'react'
import { ArrowRight, AudioLines, CarFront, CircleHelp, Fan, House, MapPin, Mic, Navigation, Phone, Shield, Sun, Footprints } from 'lucide-react'
import './response-concepts.css'
import { ResponseNumeral, type NumeralStyle } from './response-numeral'
import { SurfaceEffectsLayer, type SurfaceEffects } from './surface-effects'

export type ResponseConcept = 'A' | 'B' | 'C' | 'B1' | 'B2'
export const responseConceptLabel: Record<ResponseConcept, string> = { A: 'A', B: 'B', C: 'C', B1: 'B′', B2: 'B″' }
export const responseConcepts = {
  A: { name: 'Porcelain', note: '넓은 여백 · tab과 연결된 card · 부드러운 map', description: '밝은 reference에 Bento의 정보 묶음만 더한 안. 통화와 주변 상황을 동등하게 배치.', palette: ['#f3f2ee', '#ffffff', '#292a31', '#ded8ee'] },
  B: { name: 'Signal', note: '하나의 깊은 gradient · 큰 통화 card · 분리된 상태 tile', description: 'Finance Bento의 빛과 깊이를 통화 card 한 곳에 집중. 현재 연결 상태를 가장 먼저 읽는 안.', palette: ['#eae9e6', '#ffffff', '#171b39', '#b5b6fb'] },
  C: { name: 'Instrument', note: 'Dot typography · 목록형 상태 · 행동 우선 배치', description: '계기판처럼 정돈된 어두운 화면. 통화는 compact하게, 대피 안내는 크게 읽는 안.', palette: ['#17191b', '#24272a', '#f2f2ed', '#d6dfb0'] },
  B1: { name: 'Signal / Halo', note: '밝은 shell · 빛나는 rim · 어두운 통화 card', description: 'B의 밝은 구조에 원본의 깊은 명암을 결합. 빛은 가장자리에, 글자는 어두운 중심에 배치한 안.', palette: ['#eae9e6', '#111218', '#3d4dff', '#b9a6ff'] },
  B2: { name: 'Signal / Studio', note: '검은 shell · dot 숫자 · blue와 copper surface', description: 'Finance Bento에 더 가까운 안. 통화는 blue, 행동 안내는 copper, 나머지 상태는 차분한 glass로 구분.', palette: ['#09090c', '#2e43ff', '#c2683a', '#e8ff1f'] },
} satisfies Record<ResponseConcept, { name: string; note: string; description: string; palette: string[] }>

function Spectrum({ dense = false }: { dense?: boolean }) {
  const base = [4, 8, 12, 7, 18, 26, 16, 30, 23, 15, 27, 34, 18, 25, 32, 22, 13, 25, 19, 30, 22, 16, 24, 14, 9, 15, 7, 5, 3]
  const heights = dense ? base.flatMap((height, i) => i < base.length - 1 ? [height, (height + base[i + 1]) / 2] : [height]) : base
  return <div className="rc-spectrum" aria-hidden="true">{heights.map((height, i) => <i key={i} style={{ '--bar': `${height}px`, '--delay': `${i * -0.17}s` } as CSSProperties} />)}</div>
}

function Condition({ compact = false }: { compact?: boolean }) {
  return <section className={`rc-condition ${compact ? 'rc-condition-compact' : ''}`} aria-label="현재 상황">
    <div className="rc-condition-title"><CarFront /><h2>충돌 감지 <span>· 부상 있음</span></h2><time>21:12</time></div>
    <dl className="rc-facts"><div><dt>운전자 조작</dt><dd><CircleHelp />미확인</dd></div><div><dt>이동 경로</dt><dd><CircleHelp />미확인</dd></div></dl>
  </section>
}

function Requests() {
  return <div className="rc-requests" aria-label="기관별 요청 상태">
    {[
      { name: '구호', status: '통화 연결', detail: '접수 미확인', icon: Phone },
      { name: '차량 지원', status: '요청 전', detail: '', icon: CarFront },
      { name: '보험사', status: '요청 전', detail: '', icon: Shield },
    ].map(({ name, status, detail, icon: Icon }, i) => <section className="rc-request" key={name}>
      <div className="rc-request-label"><Icon /><span>{name}</span><span className="rc-index">0{i + 1}</span></div>
      <strong>{status}</strong><small>{detail || '\u00a0'}</small>
    </section>)}
  </div>
}

function MapField() {
  return <section className="rc-map" aria-label="주변 위치 미확인">
    <svg className="rc-map-art" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path className="rc-block" d="M0 0h239l-65 201H0ZM292 0h308v183l-368 15ZM0 244h159L95 440H0ZM214 240l386-14v232l-450-17ZM0 479h79L40 600H0ZM132 483l468 16v101H94Z" />
      <path className="rc-road" d="M256-20h20L76 620H54ZM-20 212l640-18v20L-20 232ZM-20 453l640 20v19L-20 472Z" />
      <path className="rc-lane" d="m268-20-202 640M-20 223l640-18" />
    </svg>
    <div className="rc-map-heading"><span>내 주변</span><span>위치 미확인</span></div>
    <div className="rc-location"><span className="rc-pin"><MapPin /></span><h3>위치 확인 중</h3><p>아직 안내 지점이 확인되지 않았어요.</p></div>
    <span className="rc-map-caption">위치가 확인되면 주변 안내를 볼 수 있어요</span>
  </section>
}

function Safety({ style, effects }: { style?: CSSProperties; effects?: SurfaceEffects }) {
  return <section className="rc-safety" style={style} aria-label="지금 해야 할 행동">
    {effects && (effects.chromatic > 0 || effects.grain > 0) && <SurfaceEffectsLayer effects={effects} />}
    <div className="rc-safety-label"><Footprints /><span>움직일 수 있으면</span></div>
    <h2>가드레일 밖으로<br />대피하세요</h2>
    <div className="rc-safety-footer"><span>안전한 곳에서 기다리세요.</span><ArrowRight aria-hidden="true" /></div>
  </section>
}

function RecordAction({ onRecord }: { onRecord: () => void }) {
  return <button type="button" className="rc-record" onClick={onRecord}><Mic /><span>안전한 곳에서 <strong>말로 기록하기</strong></span><ArrowRight /></button>
}

function Call({ dots = false, dense = false, numeral, style, effects }: { dots?: boolean; dense?: boolean; numeral?: NumeralStyle; style?: CSSProperties; effects?: SurfaceEffects }) {
  return <div className="rc-call" style={style}>
    {effects && (effects.chromatic > 0 || effects.grain > 0) && <SurfaceEffectsLayer effects={effects} />}
    <div className="rc-call-top"><span><AudioLines />119 긴급 통화</span><span className="rc-connected">연결됨</span></div>
    <div className="rc-call-center"><div className="rc-call-number"><span className="rc-phone"><Phone /></span>{dots ? <ResponseNumeral kind={numeral} /> : <span className="rc-number">119</span>}</div><h2>통화 연결됨</h2><Spectrum dense={dense} /></div>
    <div className="rc-call-footer"><span>119와 통화 중이에요</span><span>접수 미확인</span></div>
  </div>
}

function VariantA({ onRecord }: { onRecord: () => void }) {
  const [tab, setTab] = useState<'call' | 'vehicle'>('call')
  return <div className="rc-layout">
    <div className="rc-left"><Condition /><section className="rc-tabbed">
      <div className="rc-tabs" role="group" aria-label="확인할 내용"><button aria-pressed={tab === 'call'} onClick={() => setTab('call')}>119 통화</button><button aria-pressed={tab === 'vehicle'} onClick={() => setTab('vehicle')}>차량 상태</button></div>
      <div className="rc-tab-body">{tab === 'call' ? <Call /> : <div className="rc-vehicle-detail"><h2>차량에서 확인한 내용</h2><dl>{['충격 방향', '차량 이동', '비상등'].map(label => <div key={label}><dt>{label}</dt><dd>미확인</dd></div>)}</dl></div>}<Requests /><RecordAction onRecord={onRecord} /></div>
    </section></div>
    <div className="rc-right"><MapField /><Safety /></div>
  </div>
}

type SurfaceStyles = { call: CSSProperties; safety: CSSProperties }
type SurfaceEffectsPair = { call: SurfaceEffects; safety: SurfaceEffects }

export function ResponseSurfacePreview({ target, style, effects }: { target: 'call' | 'safety'; style: CSSProperties; effects?: SurfaceEffects }) {
  return target === 'call' ? <Call dots dense numeral="solid" style={style} effects={effects} /> : <Safety style={style} effects={effects} />
}

function VariantB({ onRecord, dots = false, numeral, surfaces, effects }: { onRecord: () => void; dots?: boolean; numeral?: NumeralStyle; surfaces?: SurfaceStyles; effects?: SurfaceEffectsPair }) {
  return <div className="rc-layout">
    <div className="rc-left"><Condition compact /><Call dots={dots} dense={dots} numeral={numeral} style={surfaces?.call} effects={effects?.call} /><Requests /></div>
    <div className="rc-right"><MapField /><Safety style={surfaces?.safety} effects={effects?.safety} /><RecordAction onRecord={onRecord} /></div>
  </div>
}

function VariantC({ onRecord }: { onRecord: () => void }) {
  return <div className="rc-layout">
    <div className="rc-left"><Condition /><Call dots /><div className="rc-ledger"><div className="rc-ledger-heading"><span>도움 요청 현황</span><span>현재 상태</span></div><Requests /></div></div>
    <div className="rc-right"><Safety /><MapField /><RecordAction onRecord={onRecord} /></div>
  </div>
}

export function ResponseConceptScreen({ variant, onRecord, numeral, surfaces, effects }: { variant: ResponseConcept; onRecord: () => void; numeral?: NumeralStyle; surfaces?: SurfaceStyles; effects?: SurfaceEffectsPair }) {
  const isB = variant === 'B' || variant === 'B1' || variant === 'B2'
  const Variant = variant === 'A' ? VariantA : isB ? VariantB : VariantC
  return <div className={`rc-device ${isB ? 'rc-B ' : ''}rc-${variant}`}>
    <div className="rc-system"><div><span>P</span><strong>0 <small>km/h</small></strong></div><span className="rc-system-context">사고 대응</span><div><Sun /><span>18°</span><time>오후 9:12</time></div></div>
    <Variant onRecord={onRecord} dots={variant === 'B2'} numeral={numeral} surfaces={surfaces} effects={effects} />
    <div className="rc-dock" aria-hidden="true"><span><Fan />22.5°</span><div><House /><Navigation /><span className="rc-dock-active"><Phone /></span></div><span>22.5°<Fan /></span></div>
  </div>
}
