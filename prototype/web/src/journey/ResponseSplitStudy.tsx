import {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {ArrowLeft, ArrowRight, X} from 'lucide-react'
import {ResponseConceptScreen} from '@/components/ui/response-concepts'
import {applyStudioFinish, readSurfaceLibrary, surfaceStyle, type SurfacePair} from './response-surfaces'
import {drawSplit} from './response-split-geometry'
import './response-split-study.css'

// Throwaway 시안: 같은 B″의 A 사선 분할과 B 세 영역 접점을 비교. Preset은 읽기만 수행.
type View = 'A' | 'B' | 'both'
const descriptions = {
  A: {name:'Shared cut', text:'오른쪽 두 card만 사선으로 연결. 기존 1:1 구조 유지.'},
  B: {name:'Three cells', text:'통화·map·대피 안내가 어긋난 접점에서 만나는 구성.'},
}

function SplitBoard({variant, surfaces, onRecord}: {variant:'A'|'B'; surfaces:SurfacePair; onRecord:()=>void}) {
  const host = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const node = host.current!
    let alive = true
    const resize = () => setScale(Math.min(1,node.clientWidth/1440))
    const observer = new ResizeObserver(resize)
    observer.observe(node); resize(); drawSplit(node,variant)
    document.fonts.ready.then(() => {if(alive) drawSplit(node,variant)})
    return () => {alive=false;observer.disconnect()}
  },[variant])
  return <article className={`rps-option rps-${variant}`} aria-label={`Split ${variant}`}>
    <header className="rps-caption"><div><span>{variant}</span><h2>{descriptions[variant].name}</h2></div><p>{descriptions[variant].text}</p></header>
    <div className="rps-board" ref={host} style={{height:860*scale}}>
      <div className="rps-artboard" style={{transform:`scale(${scale})`}}>
        <ResponseConceptScreen variant="B2" numeral="solid" surfaces={{call:surfaceStyle(surfaces.call),safety:surfaceStyle(surfaces.safety)}} effects={surfaces} onRecord={onRecord}/>
      </div>
    </div>
  </article>
}

export function ResponseSplitStudy() {
  const [initial] = useState(readSurfaceLibrary)
  const [surfaces] = useState(() => applyStudioFinish(initial.value.draft))
  const [view,setView] = useState<View>(() => {const v=new URLSearchParams(location.search).get('variant');return v==='A'||v==='both'?v:'B'})
  const [notice,setNotice] = useState(false)
  function select(next:View) {
    setView(next)
    const url=new URL(location.href);url.searchParams.set('variant',next);history.replaceState(history.state,'',url)
  }
  useEffect(() => {
    const onKey = (event:KeyboardEvent) => {
      if(event.altKey||event.ctrlKey||event.metaKey||(event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable=true]')))return
      if(event.key==='ArrowLeft'||event.key==='ArrowRight') {event.preventDefault();select(view==='A'?'B':view==='B'?'A':event.key==='ArrowLeft'?'A':'B')}
    }
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
  },[view])
  return <main className="rc-study rps-study">
    <header className="rc-study-header"><span className="rc-wordmark">AFTER / CARE <span>SPLIT STUDY</span></span><a href="?study=response-alts&focus=surface">Surface 조절 <ArrowRight size={15}/></a></header>
    <div className="rc-study-intro"><div><span className="rc-eyebrow">B″ / TWO WAYS TO SHARE AN EDGE</span><h1>경계는 부드럽게, 정보는 또렷하게.</h1></div><p>같은 색과 내용, 두 가지 분할.<br/>Grain 12% · CA 1px · gap 16px</p></div>
    {initial.error&&<p role="status" className="rps-read-error">{initial.error}</p>}
    <section className={`rps-comparison rps-view-${view}`} aria-label="Split 시안 비교">
      {(view==='both'?['A','B'] as const:[view]).map(variant=><SplitBoard key={variant} variant={variant} surfaces={surfaces} onRecord={()=>setNotice(true)}/>)}
    </section>
    <p className="rps-footnote">비교 화면은 차량 display 비율로 축소 표시. A·B를 선택하면 크게 볼 수 있어요. 저장한 preset은 변경하지 않아요.</p>
    <nav className="rps-switcher" aria-label="Split 보기">
      <button aria-label="이전 시안" onClick={()=>select(view==='A'?'B':'A')}><ArrowLeft size={17}/></button>
      {(['A','both','B'] as const).map(v=><button key={v} aria-pressed={view===v} onClick={()=>select(v)}>{v==='both'?'A + B':v}</button>)}
      <button aria-label="다음 시안" onClick={()=>select(view==='B'?'A':'B')}><ArrowRight size={17}/></button>
    </nav>
    {notice&&<div className="rc-notice" role="status"><p>분할 형태를 비교하는 시안이에요. 녹음은 시작하지 않았어요.</p><button onClick={()=>setNotice(false)} aria-label="안내 닫기"><X size={18}/></button></div>}
  </main>
}
