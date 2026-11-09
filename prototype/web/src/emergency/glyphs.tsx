import { useId, type ReactNode } from 'react'
import book from '../../../../specs/emergency-experience/glyphs.json'

// 정본은 specs/emergency-experience/glyphs.json 이다. Compose 도 같은 file 을 읽는다.
type Part = { d: string; op?: string; paint?: string; width?: number; rule?: string }
type Mark = { shape: string; symbol: string }

const glyphs = book.glyphs as Record<string, Part[]>
const marks = book.marks as Record<string, Mark>

export const glyphFor = {
  cue: (symbol: string) => (book.cue as Record<string, string>)[symbol],
  fact: (id: string) => (book.facts as Record<string, string>)[id],
  action: (id: string) => (book.actions as Record<string, string>)[id] ?? book.actions.default,
  self: (id: string) => (book.self as Record<string, string>)[id],
}

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

export function Glyph({ name, size }: { name: string; size: number }) {
  const uid = useId().replace(/:/g, '')
  const { masks, drawn } = shapes(name, 'currentColor', uid)
  return <svg data-glyph={name} viewBox="0 0 48 48" width={size} height={size} overflow="visible" aria-hidden="true">
    {masks.length > 0 && <defs>{masks}</defs>}
    <g>{drawn}</g>
  </svg>
}

export function StatusMark({ tone, size }: { tone: string; size: number }) {
  const mark = marks[tone]
  return <svg data-mark={tone} viewBox="0 0 48 48" width={size} height={size} overflow="visible" aria-hidden="true">
    {mark.shape === 'disc' ? <circle cx="24" cy="24" r="22" fill="var(--mark-face)" stroke="var(--mark-edge)" strokeWidth="1" /> : glyphs[mark.shape].map((item, index) => part(item, index, 'var(--mark-face)', 'var(--mark-edge)'))}
    <g data-ink>{glyphs[mark.symbol].map((item, index) => part(item, index, 'var(--mark-ink)'))}</g>
  </svg>
}
