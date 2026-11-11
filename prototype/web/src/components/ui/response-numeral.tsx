import { useId } from 'react'

export type NumeralStyle = 'dot' | 'micro' | 'capsule' | 'solid'
export const numeralStyles: { id: NumeralStyle; name: string; description: string }[] = [
  { id: 'dot', name: 'Original dot', description: '현재 B″ · 둥근 dot과 희미한 격자' },
  { id: 'micro', name: 'Micro-dot', description: '더 작은 dot · 부드러운 숫자 윤곽' },
  { id: 'capsule', name: 'Capsule', description: '짧은 세로 capsule · 가늘고 정밀한 인상' },
  { id: 'solid', name: 'Solid', description: 'Asta Sans · 원래 글자 비율' },
]

export function ResponseNumeral({ kind = 'dot' }: { kind?: NumeralStyle }) {
  const clip = useId().replace(/:/g, '')
  const glyphs = ['00100/01100/00100/00100/00100/00100/01110', '00100/01100/00100/00100/00100/00100/01110', '01110/10001/10001/01111/00001/00010/11100']
  const text = <text x="1" y="68" fontFamily="Asta, sans-serif" fontSize="90" fontWeight="400" letterSpacing="-3">119</text>
  return <svg className="rc-dot-number" data-numeral={kind} viewBox="0 0 178 72" role="img" aria-label="119" fill="currentColor">
    {kind === 'solid' ? text : kind === 'micro' ? <>
      <defs><clipPath id={clip}>{text}</clipPath></defs>
      <g clipPath={`url(#${clip})`}>{Array.from({ length: 55 * 23 }, (_, i) => <circle key={i} cx={1 + i % 55 * 3.3} cy={1 + Math.floor(i / 55) * 3.3} r="1.05" />)}</g>
    </> : glyphs.flatMap((glyph, n) => glyph.split('/').flatMap((row, y) => [...row].map((on, x) => kind === 'capsule'
      ? <rect key={`${n}-${y}-${x}`} x={n * 62 + x * 10 + 4.3} y={y * 10 + 2.4} width="3.4" height="7.2" rx="1.7" opacity={on === '1' ? 1 : .04}/>
      : <circle key={`${n}-${y}-${x}`} cx={n * 62 + x * 10 + 6} cy={y * 10 + 6} r="3.1" opacity={on === '1' ? 1 : .09}/>)))}
  </svg>
}
