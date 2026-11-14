import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Grid2X2, X } from 'lucide-react'
import { ResponseConceptScreen, responseConcepts, responseConceptLabel, type ResponseConcept } from '@/components/ui/response-concepts'

type View = ResponseConcept | 'compare'
const query = new URLSearchParams(location.search)
const baseFamily = query.get('family') === 'base' || (!query.has('family') && ['A', 'C', 'compare'].includes(query.get('variant') ?? ''))
const family = baseFamily ? 'base' : 'B'
const groups: Record<typeof family, ResponseConcept[]> = { base: ['A', 'B', 'C'], B: ['B', 'B1', 'B2'] }
const variants = groups[family]
const copy = {
  base: { edition: '02', eyebrow: 'THREE DIRECTIONS / ONE MOMENT', title: '같은 순간, 세 가지 표현.', description: '119 통화 연결 직후. 같은 정보와 1:1 화면을 유지하며\ncard의 구조와 시각적 강조를 비교하는 시안.', link: '?study=response-alts&family=B&variant=compare', linkLabel: 'B′ / B″ 보기', rule: '강조 surface는 화면당 한 곳' },
  B: { edition: '03', eyebrow: 'SIGNAL / TWO REFINEMENTS', title: 'B에서, 더 깊게.', description: '같은 구조, 더 정교한 재질과 명암.\n기존 B와 Finance Bento를 더 가까이 해석한 두 안.', link: '?study=response-alts&family=base&variant=compare', linkLabel: 'A / B / C 보기', rule: 'B′ 통화 한 곳 강조 · B″ 통화와 행동의 재질 구분' },
}[family]
function readView(): View {
  const query = new URLSearchParams(location.search).get('variant')
  return variants.find(key => key === query) ?? (family === 'B' ? 'B2' : 'compare')
}

function Thumbnail({ variant }: { variant: ResponseConcept }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const [height, setHeight] = useState(860)
  useEffect(() => {
    const host = ref.current
    if (!host) return
    const screen = host.querySelector<HTMLElement>('.rc-device')!
    const observer = new ResizeObserver(() => {
      setScale(host.clientWidth / 1440)
      setHeight(screen.offsetHeight)
    })
    observer.observe(host)
    observer.observe(screen)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="rc-thumbnail" style={{ height: height * scale }} aria-hidden="true" inert><div style={{ width: 1440, transform: `scale(${scale})`, transformOrigin: 'top left' }}><ResponseConceptScreen variant={variant} onRecord={() => {}} /></div></div>
}

// Preview only: URL selects appearance; no case state, microphone, or location access.
export function ResponseConceptStudy() {
  const [view, setView] = useState<View>(readView)
  const [notice, setNotice] = useState(false)
  function choose(next: View) {
    const url = new URL(location.href)
    url.searchParams.set('variant', next)
    url.searchParams.set('family', family)
    history.replaceState(null, '', url)
    setView(next)
    setNotice(false)
  }
  function cycle(step: number) {
    const current = view === 'compare' ? (step > 0 ? -1 : 0) : variants.indexOf(view)
    choose(variants[(current + step + variants.length) % variants.length])
  }
  useEffect(() => {
    const pop = () => setView(readView())
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="tab"]')) return
      if (event.altKey || event.metaKey || event.ctrlKey) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        cycle(event.key === 'ArrowLeft' ? -1 : 1)
      }
    }
    window.addEventListener('popstate', pop)
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('keydown', key) }
  }, [view])

  return <main className={`rc-study ${view === 'compare' ? 'rc-overview' : ''}`}>
    <header className="rc-study-header"><a href={`?study=response-alts&family=${family}&variant=compare`} className="rc-wordmark">차분 <span>DESIGN EXPLORATION {copy.edition}</span></a><a href={copy.link}>{copy.linkLabel} <ArrowRight size={15} /></a></header>
    <div className="rc-study-intro"><div><span className="rc-eyebrow">{view === 'compare' ? copy.eyebrow : `DIRECTION ${responseConceptLabel[view]} / ${responseConcepts[view].name.toUpperCase()}`}</span><h1>{view === 'compare' ? copy.title : responseConcepts[view].name}</h1></div><p>{view === 'compare' ? copy.description : responseConcepts[view].description}</p></div>
    {view === 'compare' ? <div className="rc-comparison">{variants.map(key => <article className="rc-option" key={key}><div className="rc-option-heading"><span>{responseConceptLabel[key]}</span><h2>{responseConcepts[key].name}</h2></div><Thumbnail variant={key} /><p>{responseConcepts[key].note}</p><button onClick={() => choose(key)}>{responseConceptLabel[key]} 크게 보기 <ArrowRight size={17} /></button></article>)}</div> : <ResponseConceptScreen key={view} variant={view} onRecord={() => setNotice(true)} />}
    <div className="rc-study-meta"><p>고정 시연 상태 · 통화 연결 / 접수 미확인 / 위치 미확인 · 실제 통화·녹음 없음</p><details><summary>시안의 표현 기준</summary><p>새 화면은 아래 각 안의 palette·type·radius만 사용. 제품 design system에는 아직 미적용.</p><div className="rc-palette-grid">{variants.map(key => <div key={key}><b>{responseConceptLabel[key]} / {responseConcepts[key].name}</b><div>{responseConcepts[key].palette.map(color => <span key={color}><i style={{ background: color }} />{color}</span>)}</div></div>)}</div><p>Asta · 14 / 18 / 24 / 36 / 100px · Card 28px · Control 16px · {copy.rule}</p></details></div>
    {notice && <div className="rc-notice" role="status"><p>기록 button의 위치를 비교하는 시안이에요. 녹음은 시작하지 않았어요.</p><button onClick={() => setNotice(false)} aria-label="안내 닫기"><X size={18} /></button></div>}
    {import.meta.env.DEV && <nav className="rc-switcher" aria-label="시안 선택"><button onClick={() => cycle(-1)} aria-label="이전 시안"><ArrowLeft size={18} /></button><button className={view === 'compare' ? 'is-current' : ''} aria-pressed={view === 'compare'} onClick={() => choose('compare')} aria-label="세 시안 비교"><Grid2X2 size={17} /></button>{variants.map(key => <button key={key} className={view === key ? 'is-current' : ''} aria-pressed={view === key} onClick={() => choose(key)}>{responseConceptLabel[key]}<span>{responseConcepts[key].name.replace("Signal / ", "")}</span></button>)}<button onClick={() => cycle(1)} aria-label="다음 시안"><ArrowRight size={18} /></button></nav>}
  </main>
}
