import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Maximize2, Minimize2 } from 'lucide-react'
import { cases, type Variant } from './cases'
import { FocusView } from './FocusView'
import { ContextView } from './ContextView'
import { ScreenHeader } from './ScreenParts'
import { Catalog } from './Catalog'

const readVariant = (): Variant => new URLSearchParams(location.search).get('view') === 'context' ? 'context' : 'focus'

export default function App() {
  const [variant, setVariant] = useState<Variant>(readVariant)
  const [expanded, setExpanded] = useState(false)
  const [actualSize, setActualSize] = useState(false)
  const [scale, setScale] = useState(1)
  const viewport = useRef<HTMLDivElement>(null)
  const catalog = new URLSearchParams(location.search).has('catalog')

  useEffect(() => {
    if (!viewport.current) return
    const updateScale = () => setScale(Math.min(1, viewport.current!.clientWidth / 1440, Math.max(240, window.innerHeight - 310) / 810))
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport.current)
    window.addEventListener('resize', updateScale)
    return () => { observer.disconnect(); window.removeEventListener('resize', updateScale) }
  }, [])
  useEffect(() => {
    const handleBack = () => setVariant(readVariant())
    window.addEventListener('popstate', handleBack)
    return () => window.removeEventListener('popstate', handleBack)
  }, [])
  function selectVariant(next: Variant) {
    setVariant(next)
    const url = new URL(location.href)
    url.searchParams.set('view', next)
    history.replaceState(null, '', url)
  }
  const displayScale = actualSize ? 1 : scale
  const props = { caseData: cases.urgent, expanded, setExpanded }

  return <main className="review-page">
    <header className="review-header"><a className="review-brand" href="/">차분<span>Design study 01</span></a><div className="review-meta"><span className="demo-dot" /><span className="demo-copy">시연용 가상 정보</span><a href={catalog ? '/?study=legacy' : '/?study=legacy&catalog'}>{catalog ? '화면 비교' : 'Design 기준'}<ArrowRight size={14} aria-hidden="true" /></a></div></header>
    {catalog ? <Catalog /> : <>
      <div className="review-intro"><div><p className="eyebrow">사고 후 대응 지원 · 첫 화면 비교</p><h2>{variant === 'focus' ? '다음 행동에 집중하는 화면.' : '현재 상황을 함께 보는 화면.'}</h2></div><button className="size-control" aria-pressed={actualSize} onClick={() => setActualSize(!actualSize)}>{actualSize ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{actualSize ? '전체 보기' : '원래 크기'}</button></div>
      <div className={`viewport ${actualSize ? 'actual-size' : ''}`} ref={viewport}><div className="canvas-space" style={{ width: 1440 * displayScale, height: 810 * displayScale }}><section className="app-screen" aria-label="사고 대응 화면" style={{ transform: `scale(${displayScale})` }}><ScreenHeader />{variant === 'focus' ? <FocusView {...props} /> : <ContextView {...props} />}</section></div></div>
      <div className="review-caption"><span>SC01 · 고속도로 / 부상 / 차량 이동 가능</span><span>1440 × 810 · {Math.round(displayScale * 100)}%</span></div>
      <nav className="variant-bar" aria-label="화면 구조 비교"><button className="cycle-button" aria-label="이전 안" onClick={() => selectVariant(variant === 'focus' ? 'context' : 'focus')}><ArrowLeft size={18} /></button><div className="variant-options"><button aria-label="행동 중심" aria-pressed={variant === 'focus'} onClick={() => selectVariant('focus')}><span>A</span>행동 중심</button><button aria-label="상황 중심" aria-pressed={variant === 'context'} onClick={() => selectVariant('context')}><span>B</span>상황 중심</button></div><button className="cycle-button" aria-label="다음 안" onClick={() => selectVariant(variant === 'focus' ? 'context' : 'focus')}><ArrowRight size={18} /></button></nav>
      <p className="review-hint"><a href="/?study=tools">네 가지 design 도구 적용안 비교하기 →</a></p>
    </>}
  </main>
}
