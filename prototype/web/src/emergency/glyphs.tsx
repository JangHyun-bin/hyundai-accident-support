import { useId, type ReactNode } from 'react'
import book from '../../../../specs/emergency-experience/glyphs.json'

// 정본은 specs/emergency-experience/glyphs.json 이다. Compose 도 같은 file 을 읽는다.
type Part = { d: string; op?: string; paint?: string; width?: number; rule?: string }
type Depth = { inner: { dy: number; blur: number; opacity: number }; lip: { dy: number; opacity: number }; top?: { dy: number; opacity: number } }
type Mark = { shape: string; face: string[]; edge: string; symbol: string; ink: string }

const glyphs = book.glyphs as Record<string, Part[]>
const marks = book.marks as Record<string, Mark>
const depths = book.depth as Record<'deep' | 'shallow', Depth>

export const glyphFor = {
  cue: (symbol: string) => (book.cue as Record<string, string>)[symbol],
  fact: (id: string) => (book.facts as Record<string, string>)[id],
  action: (id: string) => (book.actions as Record<string, string>)[id] ?? book.actions.default,
}

const { plate } = book.material
// 결(grain) 은 시안 값을 그대로 둔다. 색은 glyphs.json 에서 온다.
export const metalPlate = `repeating-linear-gradient(92deg, rgba(255,255,255,.035) 0 1px, rgba(0,0,0,.04) 1px 2px), linear-gradient(${plate.angle}deg, ${plate.stops.map(([color, at]) => `${color} ${Number(at) * 100}%`).join(', ')})`

function part(item: Part, key: string | number, fill: string, stroke = fill) {
  const stroked = item.paint === 'stroke' || item.paint === 'fill+stroke'
  return <path key={key} d={item.d} fillRule={item.rule as 'evenodd' | undefined} fill={item.paint === 'stroke' ? 'none' : fill}
    stroke={stroked ? stroke : undefined} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" />
}

// Part 는 순서대로 누적한다. cut 은 그때까지 그린 모양만 mask 로 뺀다.
function shapes(name: string, fill: string, uid: string) {
  const masks: ReactNode[] = []
  let drawn: ReactNode[] = []
  glyphs[name].forEach((item, index) => {
    if (item.op !== 'cut') return void drawn.push(part(item, index, fill))
    const id = `${uid}-cut-${index}`
    masks.push(<mask key={id} id={id} maskUnits="userSpaceOnUse" x="-12" y="-12" width="72" height="72"><rect x="-12" y="-12" width="72" height="72" fill="#fff" />{part(item, 'cut', '#000')}</mask>)
    drawn = [<g key={id} mask={`url(#${id})`}>{drawn}</g>]
  })
  return { masks, drawn }
}

export function Glyph({ name, depth, size }: { name: string; depth: 'deep' | 'shallow' | 'solid'; size: number }) {
  const uid = useId().replace(/:/g, '')
  const { masks, drawn } = shapes(name, depth === 'solid' ? 'currentColor' : `url(#glyph-face-${depth})`, uid)
  return <svg data-glyph={name} viewBox="0 0 48 48" width={size} height={size} overflow="visible" aria-hidden="true">
    {masks.length > 0 && <defs>{masks}</defs>}
    <g filter={depth === 'solid' ? undefined : `url(#glyph-${depth})`}>{drawn}</g>
  </svg>
}

export function StatusMark({ tone, size }: { tone: string; size: number }) {
  const mark = marks[tone]
  const face = `url(#mark-face-${tone})`
  return <svg data-mark={tone} viewBox="0 0 48 48" width={size} height={size} overflow="visible" aria-hidden="true">
    {mark.shape === 'disc' ? <circle cx="24" cy="24" r="22" fill={face} stroke={mark.edge} strokeWidth="1" /> : glyphs[mark.shape].map((item, index) => part(item, index, face, mark.edge))}
    {glyphs[mark.symbol].map((item, index) => part(item, `symbol-${index}`, mark.ink))}
  </svg>
}

function Engrave({ id, depth }: { id: string; depth: Depth }) {
  const { inner, lip, top } = depth
  return <filter id={id} x="-15%" y="-15%" width="130%" height="135%">
    <feComponentTransfer in="SourceAlpha" result="inverse"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
    <feOffset in="inverse" dy={inner.dy} result="innerOffset" />
    <feGaussianBlur in="innerOffset" stdDeviation={inner.blur} result="innerBlur" />
    <feFlood floodColor="#000" floodOpacity={inner.opacity} />
    <feComposite in2="innerBlur" operator="in" />
    <feComposite in2="SourceAlpha" operator="in" result="innerShadow" />
    <feOffset in="SourceAlpha" dy={lip.dy} result="lipOffset" />
    <feComposite in="lipOffset" in2="SourceAlpha" operator="out" result="lipEdge" />
    <feFlood floodColor="#fff" floodOpacity={lip.opacity} />
    <feComposite in2="lipEdge" operator="in" result="lipLight" />
    {top && <>
      <feOffset in="SourceAlpha" dy={top.dy} result="topOffset" />
      <feComposite in="topOffset" in2="SourceAlpha" operator="out" result="topEdge" />
      <feFlood floodColor="#000" floodOpacity={top.opacity} />
      <feComposite in2="topEdge" operator="in" result="topShade" />
    </>}
    <feMerge><feMergeNode in="lipLight" />{top && <feMergeNode in="topShade" />}<feMergeNode in="SourceGraphic" /><feMergeNode in="innerShadow" /></feMerge>
  </filter>
}

const vertical = (id: string, stops: [string, number][]) =>
  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">{stops.map(([color, at]) => <stop key={at} offset={at} stopColor={color} />)}</linearGradient>

// 차량 화면에 한 번 둔다. Glyph 와 StatusMark 가 id 로 참조한다.
export function GlyphDefs() {
  const faces = book.material.face as unknown as Record<string, [string, number][]>
  return <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
    {Object.entries(faces).map(([depth, stops]) => vertical(`glyph-face-${depth}`, stops))}
    {Object.entries(marks).map(([tone, mark]) => vertical(`mark-face-${tone}`, [[mark.face[0], 0], [mark.face[1], 1]]))}
    <Engrave id="glyph-deep" depth={depths.deep} />
    <Engrave id="glyph-shallow" depth={depths.shallow} />
  </defs></svg>
}
