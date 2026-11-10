import { useEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { ResponseConceptScreen } from '@/components/ui/response-concepts'
import { ResponseNumeral, numeralStyles, type NumeralStyle } from '@/components/ui/response-numeral'
import './response-numeral-study.css'

function readNumeral(): NumeralStyle {
  return numeralStyles.find(item => item.id === new URLSearchParams(location.search).get('numeral'))?.id ?? 'dot'
}

export function ResponseNumeralStudy() {
  const [numeral, setNumeral] = useState(readNumeral)
  const [notice, setNotice] = useState(false)
  function choose(value: NumeralStyle) {
    const url = new URL(location.href)
    url.searchParams.set('numeral', value)
    history.replaceState(null, '', url)
    setNumeral(value)
  }
  useEffect(() => {
    const pop = () => setNumeral(readNumeral())
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [])
  return <main className="rc-study rn-study">
    <header className="rc-study-header"><span className="rc-wordmark">AFTER / CARE <span>NUMERAL STUDY</span></span><a href="?study=response-alts&family=B&variant=B2">기존 B″ <ArrowRight size={15}/></a></header>
    <div className="rc-study-intro"><div><span className="rc-eyebrow">B″ / ONE DETAIL</span><h1>119, 숫자만 비교.</h1></div><p>B″의 색 · card · 배치 그대로.<br/>아래 안을 선택하면 숫자 표현만 바뀌어요.</p></div>
    <div className="rn-options" role="group" aria-label="119 숫자 디자인">
      {numeralStyles.map((item, index) => <button key={item.id} className="rn-option" aria-pressed={numeral === item.id} onClick={() => choose(item.id)}>
        <span className="rn-swatch rc-B2" aria-hidden="true"><ResponseNumeral kind={item.id}/></span>
        <span className="rn-option-title"><span>0{index + 1} / {item.name}</span><i aria-hidden="true">{numeral === item.id ? '●' : '○'}</i></span><span className="rn-description">{item.description}</span>
      </button>)}
    </div>
    <ResponseConceptScreen variant="B2" numeral={numeral} onRecord={() => setNotice(true)} />
    <div className="rc-study-meta"><p>고정 시연 상태 · 숫자 표현만 비교 · 실제 통화·녹음 없음</p><p>같은 SVG 영역 · 같은 위치 · 같은 흰색</p></div>
    {notice && <div className="rc-notice" role="status"><p>숫자 디자인을 비교하는 시안이에요. 녹음은 시작하지 않았어요.</p><button onClick={() => setNotice(false)} aria-label="안내 닫기"><X size={18}/></button></div>}
    <nav className="rc-switcher" aria-label="숫자 표현 선택">{numeralStyles.map((item, i) => <button key={item.id} aria-pressed={numeral === item.id} className={numeral === item.id ? 'is-current' : ''} onClick={() => choose(item.id)}>0{i + 1}<span>{item.name}</span></button>)}</nav>
  </main>
}
