import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Download, RotateCcw, Save } from 'lucide-react'
import { ResponseSurfacePreview } from '@/components/ui/response-concepts'
import { applyStudioFinish, completeSurfacePair, originalSurfaces, readSurfaceLibrary, surfaceColors, surfaceRanges, surfaceStorageKey, surfaceStyle, type Surface, type SurfaceLibrary, type SurfacePair } from './response-surfaces'
import {SurfaceThemeProvider,applySurfaceTheme} from '@/design-system/SurfaceTheme'
import {ResponseLayoutPreview} from '@/design-system/ResponseLayoutPreview'
import {CareAction} from '@/components/ui/after-care'
import './response-surface-study.css'

// Prototype: tune the existing B″ card surfaces; keep presets separate from incident records.
export function ResponseSurfaceStudy() {
  const [initial] = useState(readSurfaceLibrary)
  const [library, setLibrary] = useState(initial.value)
  const [message, setMessage] = useState(initial.error)
  const [target, setTarget] = useState<keyof SurfacePair>('safety')
  const [layout,setLayout]=useState<'response'|'task'>('response')
  const [compare, setCompare] = useState(false)
  const [name, setName] = useState(() => initial.value.presets.find(p => JSON.stringify(p.surfaces) === JSON.stringify(initial.value.draft))?.name ?? '')
  const draft = completeSurfacePair(library.draft)
  const presets = library.presets.map(p => ({ ...p, surfaces: completeSurfacePair(p.surfaces) }))
  const current = draft[target]
  const shown = compare ? originalSurfaces : draft
  const styles = { call: surfaceStyle(shown.call), safety: surfaceStyle(shown.safety) }
  const existing = presets.some(p => p.name === name.trim())
  const selected = JSON.stringify(draft) === JSON.stringify(originalSurfaces) ? 'original' : String(presets.findIndex(p => JSON.stringify(p.surfaces) === JSON.stringify(draft)))

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('finish') !== 'studio') return
    url.searchParams.delete('finish')
    window.history.replaceState(window.history.state, '', url)
    if (!initial.error) applyFinish()
  }, [library, initial.error])

  function persist(next: SurfaceLibrary, success = '') {
    next = { ...next, draft: completeSurfacePair(next.draft), presets: next.presets.map(p => ({ ...p, surfaces: completeSurfacePair(p.surfaces) })) }
    setLibrary(next)
    try {
      localStorage.setItem(surfaceStorageKey, JSON.stringify(next))
      setMessage(success)
    } catch {
      setMessage('Browser에 저장하지 못했어요. 현재 값은 JSON으로 내려받을 수 있어요.')
    }
  }
  function change<K extends keyof Surface>(key: K, value: Surface[K]) {
    persist({ ...library, draft: { ...draft, [target]: { ...current, [key]: value } } })
  }
  function applyFinish() {
    persist({ ...library, draft: applyStudioFinish(draft) }, '두 card에 같은 grain과 은은한 CA를 적용했어요. 저장한 preset은 유지돼요.')
    setCompare(false)
  }
  function savePreset(event: FormEvent) {
    event.preventDefault()
    const title = name.trim()
    if (!title) return
    const preset = { name: title, surfaces: draft }
    persist({ ...library, presets: existing ? presets.map(p => p.name === title ? preset : p) : [...presets, preset] }, `“${title}” preset ${existing ? '업데이트' : '저장'} 완료.`)
    setName(title)
  }
  function loadPreset(value: string) {
    const preset = value === 'original' ? { name: '', surfaces: originalSurfaces } : presets[Number(value)]
    if (!preset) return
    persist({ ...library, draft: preset.surfaces })
    setName(preset.name)
    setCompare(false)
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, name: name.trim() || 'Untitled', surfaces: draft }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'response-surface-preset.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <main className="rc-study rs-study ac-system">
    <header className="rc-study-header"><span className="rc-wordmark">AFTER / CARE <span>SURFACE STUDY</span></span><a href="?study=response-alts&focus=numeral&numeral=solid">숫자 비교 <ArrowRight size={15} /></a></header>
    <div className="rc-study-intro"><div><span className="rc-eyebrow">B″ / COLOR, LIGHT & SHADE</span><h1>빛과 깊이를, 내 취향으로.</h1></div><p>색을 고르고, 빛을 옮기고, shade를 다듬어요.<br />두 card의 조합을 하나의 preset으로 저장해요.</p></div>

    <div className="rs-workbench">
      <section className="rs-preview" aria-label="Surface 미리보기">
        <div className="rs-toolbar">
          <div className="rs-segment" role="group" aria-label="조절할 card">
            <button aria-pressed={target === 'call'} onClick={() => setTarget('call')}>대피 안내</button>
            <button aria-pressed={target === 'safety'} onClick={() => setTarget('safety')}>119 통화</button>
          </div>
          <button className="rs-compare" aria-pressed={compare} onClick={() => setCompare(!compare)}>{compare ? '편집 화면으로' : '원본 비교'}</button>
        </div>
        <div className="rs-stage"><div className="rc-device rc-B rc-B2 rs-canvas"><ResponseSurfacePreview target={target==='call'?'safety':'call'} style={styles[target]} effects={shown[target]} /></div></div>
        <div className="rs-caption"><span>{compare ? 'B″ ORIGINAL' : 'LIVE PREVIEW'}</span><span>{target === 'call' ? '01 / GUIDE' : '02 / CALL'}</span></div>
        <p className="rs-explanation">Gradient는 색의 흐름, shade는 안쪽의 깊이,<br />rim은 가장자리에 남는 얇은 빛.</p>
      </section>

      <aside className="rs-controls" aria-label="Surface 조절">
        <div className="rs-control-heading"><h2>{target === 'call' ? '대피 안내' : '119 통화'}</h2><button className="rs-reset" onClick={() => { persist({ ...library, draft: { ...draft, [target]: originalSurfaces[target] } }); setCompare(false) }}><RotateCcw size={13} /> 이 card 초기화</button></div>
        <fieldset disabled={compare}>
          <legend className="rs-sr-only">{target === 'call' ? '대피 안내' : '119 통화'} 색과 shade</legend>
          <button className="rs-finish" type="button" onClick={applyFinish}>추천 질감 · 두 card에 적용 <ArrowRight size={14} /></button>
          <div className="rs-colors">{surfaceColors.map(({ key, label }) => <label key={key}><span>{label}</span><div><input type="color" aria-label={label} value={current[key]} onChange={e => change(key, e.target.value)} /><code>{current[key].toUpperCase()}</code></div></label>)}</div>
          {([
            { id: 'gradient', title: '01 / Gradient', open: true },
            { id: 'shade', title: '02 / Shade', open: true },
            { id: 'shape', title: '03 / Shade 위치와 모양', open: false },
            { id: 'rim', title: '04 / Rim', open: true },
            { id: 'chromatic', title: '05 / Chromatic aberration', open: true },
            { id: 'grain', title: '06 / Film grain', open: true },
          ] as const).map(group => <details key={group.id} open={group.open}><summary>{group.title}</summary>{group.id === 'grain' && <p className="rs-effect-note">미세 입자와 뭉침을 겹치고 명암에 반응하는 grain.<br />같은 seed는 같은 질감을 유지해요.</p>}{group.id === 'chromatic' && <p className="rs-effect-note">중심은 선명하게, 가장자리로 갈수록 빛이 갈라져요.<br />Lens 축으로 분리가 강한 방향을 조절해요.</p>}<div className="rs-ranges">{surfaceRanges.filter(r => r.group === group.id).map(({ key, label, min, max, step, unit }) => <label className="rs-range" key={key}><span>{label}<output htmlFor={`rs-${key}`}>{current[key]}<small>{unit}</small></output></span><input id={`rs-${key}`} aria-label={label} type="range" min={min} max={max} step={step} value={current[key]} onChange={e => change(key, Number(e.target.value))} /></label>)}</div></details>)}
        </fieldset>
      </aside>
    </div>

    <section className="rs-presets" aria-label="나의 preset">
      <div><span className="rc-eyebrow">YOUR PRESETS</span><h2>마음에 드는 조합, 남겨두기.</h2><p>편집 내용과 저장한 preset은 이 browser에만 보관돼요.</p></div>
      <div className="rs-preset-controls">
        <label className="rs-select">불러오기<select aria-label="불러오기" value={selected} onChange={e => loadPreset(e.target.value)}><option value="-1" disabled>편집 중인 조합</option><option value="original">B″ Original</option>{presets.map((preset, index) => <option key={preset.name} value={index}>{preset.name}</option>)}</select></label>
        <form onSubmit={savePreset}><label htmlFor="rs-name">Preset 이름</label><div><input id="rs-name" placeholder="예: Quiet blue" maxLength={40} value={name} onChange={e => setName(e.target.value)} /><button type="submit" disabled={!name.trim()}><Save size={15} />{existing ? '이 preset 업데이트' : '새 preset 저장'}</button></div></form>
        <button className="rs-export" onClick={download}><Download size={15} />현재 조합 JSON 내려받기</button>
        <p className="rs-status" role="status">{message || '편집 내용 자동 보관 · 두 card를 함께 저장'}</p>
      </div>
    </section>

    <div className="rs-context-heading"><span className="rc-eyebrow">IN CONTEXT</span><h2>전체 화면에서 확인.</h2><p>{compare ? '원본 B″를 보는 중이에요.' : '위에서 조절한 값이 두 card에 함께 반영돼요.'}</p></div>
    <section className="rs-product-preview" aria-label="제품 layout 미리보기">
      <div className="rs-product-controls"><label>미리볼 layout<select aria-label="미리볼 layout" value={layout} onChange={e=>setLayout(e.target.value as 'response'|'task')}><option value="response">Response / Three cells</option><option value="task">Task / Workspace</option></select></label><CareAction disabled={compare} onClick={()=>{const result=applySurfaceTheme(draft);setMessage(result.ok?'제품에 적용했어요. Catalog와 전체 흐름에 같은 surface가 반영돼요.':result.error)}}>제품에 적용</CareAction><a href="/?study=design-system">Design system 열기</a></div>
      <SurfaceThemeProvider value={shown}><ResponseLayoutPreview layout={layout}/></SurfaceThemeProvider>
    </section>
    <details className="rs-values"><summary>현재 parameter 보기</summary><pre>{JSON.stringify(draft, null, 2)}</pre></details>
  </main>
}
