import { useEffect, useRef, useState } from 'react'
import { Columns2, Eye, EyeOff, Maximize2, Minimize2, Square } from 'lucide-react'
import { cases } from './cases'
import { FocusView } from './FocusView'
import { ScreenHeader, type ViewProps } from './ScreenParts'
import { ImpeccableView } from './variants/ImpeccableView'
import { UiUxView } from './variants/UiUxView'
import { HallmarkView } from './variants/HallmarkView'
import { AntiSlopView } from './variants/AntiSlopView'
import './tools-study.css'

const designs = {
  impeccable: { name: 'Impeccable', label: '안 1', View: ImpeccableView },
  uiux: { name: 'UI UX Pro Max', label: '안 2', View: UiUxView },
  hallmark: { name: 'Hallmark', label: '안 3', View: HallmarkView },
  antislop: { name: 'anti-slop', label: '안 4', View: AntiSlopView },
  focus: { name: '기존 A', label: '기존 A', View: FocusView },
}
type DesignId = keyof typeof designs
const designIds = Object.keys(designs) as DesignId[]
const validDesign = (value: string | null, fallback: DesignId): DesignId =>
  value && Object.hasOwn(designs, value) ? value as DesignId : fallback

function readSettings() {
  const params = new URLSearchParams(location.search)
  return {
    left: validDesign(params.get('view'), 'impeccable'),
    right: validDesign(params.get('compare'), 'uiux'),
    paired: params.has('compare'),
    revealed: params.get('names') === '1',
  }
}

function StudyCanvas({ design, side, actualSize, ...props }: ViewProps & { design: DesignId; side: string; actualSize: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const element = container.current!
    const resize = () => setScale(Math.min(1, element.clientWidth / 1440, Math.max(240, innerHeight - 340) / 810))
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    window.addEventListener('resize', resize)
    return () => { observer.disconnect(); window.removeEventListener('resize', resize) }
  }, [])
  const displayScale = actualSize ? 1 : scale
  const { View } = designs[design]
  return <div className="study-canvas-viewport" ref={container}>
    <div className="canvas-space" style={{ width: 1440 * displayScale, height: 810 * displayScale }}>
      <section className="app-screen" data-design={design} aria-label={`사고 대응 화면 ${side}`} style={{ transform: `scale(${displayScale})` }}>
        <ScreenHeader /><View {...props} />
      </section>
    </div>
  </div>
}

export function ToolsStudy() {
  const [settings, setSettings] = useState(readSettings)
  const [expanded, setExpanded] = useState(false)
  const [actualSize, setActualSize] = useState(false)
  useEffect(() => {
    const onBack = () => setSettings(readSettings())
    window.addEventListener('popstate', onBack)
    return () => window.removeEventListener('popstate', onBack)
  }, [])
  function update(change: Partial<typeof settings>) {
    const next = { ...settings, ...change }
    setSettings(next)
    const url = new URL(location.href)
    url.searchParams.set('view', next.left)
    if (next.paired) url.searchParams.set('compare', next.right)
    else url.searchParams.delete('compare')
    if (next.revealed) url.searchParams.set('names', '1')
    else url.searchParams.delete('names')
    history.replaceState(null, '', url)
  }
  const label = (id: DesignId) => settings.revealed && id !== 'focus' ? `${designs[id].label} · ${designs[id].name}` : designs[id].label
  const sides = settings.paired ? ['left', 'right'] as const : ['left'] as const
  const props = { caseData: cases.urgent, expanded, setExpanded }

  return <main className="tool-study">
    <header className="study-header"><a href="/?study=tools" className="study-brand">차분 <span>Design study 02</span></a><div><span className="study-demo">시연용 가상 정보</span><a href="/?view=focus">이전 A/B 보기</a></div></header>
    <div className="study-intro"><div><h1>같은 상황, 네 가지 화면.</h1><p>고속도로 · 부상 있음 · 차량 이동 가능 · 조작과 경로 미확인</p></div><button className="study-control" aria-pressed={settings.revealed} onClick={() => update({ revealed: !settings.revealed })}>{settings.revealed ? <EyeOff size={17} /> : <Eye size={17} />}{settings.revealed ? '도구 이름 숨기기' : '도구 이름 공개'}</button></div>
    <div className="study-toolbar">
      <nav aria-label="Design 후보" className="study-candidates">{designIds.map(id => <button key={id} aria-pressed={settings.left === id} onClick={() => update({ left: id })}>{label(id)}</button>)}</nav>
      <div className="study-modes"><button className="study-control" aria-pressed={settings.paired} onClick={() => { update({ paired: !settings.paired }); setActualSize(false) }}>{settings.paired ? <Square size={17} /> : <Columns2 size={17} />}{settings.paired ? '한 화면으로 보기' : '나란히 보기'}</button><button className="study-control" aria-pressed={actualSize} disabled={settings.paired} onClick={() => setActualSize(!actualSize)}>{actualSize ? <Minimize2 size={17} /> : <Maximize2 size={17} />}{actualSize ? '전체 보기' : '원래 크기'}</button></div>
    </div>
    <div className={`study-panels ${settings.paired ? 'paired' : ''}`}>
      {sides.map(side => <div className="study-pane" key={side}>
        <div className="study-pane-heading"><label>{side === 'left' ? settings.paired ? '왼쪽' : '현재 화면' : '오른쪽'}<select aria-label={`${side === 'left' ? '왼쪽' : '오른쪽'} 안`} value={settings[side]} onChange={event => update({ [side]: validDesign(event.target.value, 'impeccable') })}>{designIds.map(id => <option value={id} key={id}>{label(id)}</option>)}</select></label><span>1440 × 810</span></div>
        <StudyCanvas {...props} design={settings[side]} side={side === 'left' ? '왼쪽' : '오른쪽'} actualSize={actualSize && !settings.paired} />
      </div>)}
    </div>
    <footer className="study-footer"><p>‘도움 요청 안내 보기’를 눌러 보세요. 두 화면의 펼침 상태는 함께 바뀝니다.</p><p>비교 기준: 다음 행동이 잘 보이는가 · 미확인 정보가 구분되는가 · 읽기 편한가</p><span>선호도 비교용 prototype · 실제 전화·전송 없음</span></footer>
  </main>
}
