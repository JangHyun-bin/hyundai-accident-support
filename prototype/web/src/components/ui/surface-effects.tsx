import './surface-effects.css'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

export const surfaceEffectDefaults = { chromatic: 0, chromaticAngle: 0, grain: 0, grainSize: 1.2, grainClumping: 35, grainTone: 70, grainSeed: 17 }
export type SurfaceEffects = typeof surfaceEffectDefaults

// shortcut: radial lateral CA 근사이며 calibrated lens rendering은 spectral ray tracing 필요.
function dispersionMap(angle: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const pixels = ctx.createImageData(256, 256)
  const cos = Math.cos(angle * Math.PI / 180), sin = Math.sin(angle * Math.PI / 180)
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    // Filter 여백까지 map을 채워야 card 밖에서도 radial 방향 유지.
    const u = (x / 255 * 2 - 1) * 1.2, v = (y / 255 * 2 - 1) * 1.2
    const radius2 = (u*u + v*v) / 2, axial = u*cos + v*sin
    const falloff = (.18 + .82 * radius2) / 1.073
    const i = (y * 256 + x) * 4
    pixels.data[i] = 127.5 + 127.5 * (.65*u + .35*axial*cos) * falloff
    pixels.data[i + 1] = 127.5 + 127.5 * (.65*v + .35*axial*sin) * falloff
    pixels.data[i + 2] = 128; pixels.data[i + 3] = 255
  }
  ctx.putImageData(pixels, 0, 0)
  return canvas.toDataURL('image/png')
}

// CSS pixel 기준의 두 correlated Gaussian field로 반복 tile 없이 입자 생성.
// shortcut: Gaussian 근사이며 실제 film emulsion 재현이 필요하면 physical model로 교체.
function grainTexture(width: number, height: number, size: number, clumping: number, seed: number) {
  let state = seed | 0
  const random = () => {
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ state >>> 15, 1 | state)
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
  const field = (pitch: number) => {
    const columns = Math.ceil(width / pitch) + 2, rows = Math.ceil(height / pitch) + 2
    const values = Float32Array.from({ length: columns * rows }, () => Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(2 * Math.PI * random()))
    return (x: number, y: number) => {
      const px = x / pitch, py = y / pitch, ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy
      const a = (1 - fx) * (1 - fy), b = fx * (1 - fy), c = (1 - fx) * fy, d = fx * fy
      return (values[iy * columns + ix] * a + values[iy * columns + ix + 1] * b + values[(iy + 1) * columns + ix] * c + values[(iy + 1) * columns + ix + 1] * d) / Math.sqrt(a*a + b*b + c*c + d*d)
    }
  }
  const fine = field(size), coarse = field(size * 3.7), mix = clumping / 100 * .65
  const norm = Math.hypot(1 - mix, mix)
  const scale = Math.min(window.devicePixelRatio || 1, 2, 2048 / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(width * scale)); canvas.height = Math.max(1, Math.ceil(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const pixels = ctx.createImageData(canvas.width, canvas.height)
  const samples = [[.25,.25],[.75,.25],[.25,.75],[.75,.75]]
  // Subpixel 4회 sampling으로 출력 pixel보다 작은 입자의 aliasing 감소.
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    let noise = 0
    for (const [ox, oy] of samples) {
      const sx = (x + ox) / scale, sy = (y + oy) / scale
      noise += ((1 - mix) * fine(sx, sy) + mix * coarse(sx, sy)) / norm * .25
    }
    const value = Math.round(127.5 + 42 * noise), i = (y * canvas.width + x) * 4
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value
    pixels.data[i + 3] = 255
  }
  ctx.putImageData(pixels, 0, 0)
  return canvas.toDataURL('image/png')
}

export function SurfaceEffectsLayer({ effects }: { effects: SurfaceEffects }) {
  const id = `surface-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const host = useRef<HTMLDivElement>(null)
  const [texture, setTexture] = useState('')
  const grainOn = effects.grain > 0
  const chromaticOn = effects.chromatic > 0
  const dispersion = useMemo(() => chromaticOn ? dispersionMap(effects.chromaticAngle) : '', [chromaticOn, effects.chromaticAngle])
  useEffect(() => {
    if (!grainOn || !host.current) return
    const node = host.current
    let frame = 0
    const draw = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const { width, height } = node.getBoundingClientRect()
        if (width && height) setTexture(grainTexture(width, height, effects.grainSize, effects.grainClumping, effects.grainSeed))
      })
    }
    const observer = new ResizeObserver(draw)
    observer.observe(node)
    draw()
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [grainOn, effects.grainSize, effects.grainClumping, effects.grainSeed])
  const tones = Array.from({ length: 17 }, (_, i) => {
    const luminance = i / 16
    const response = .22 + .78 * Math.sqrt(4 * luminance * (1 - luminance))
    return (1 + (response - 1) * effects.grainTone / 100) * effects.grain / 100
  }).join(' ')
  const source = chromaticOn && dispersion ? 'rgb' : 'SourceGraphic'
  return <div className="rs-material" data-chromatic={chromaticOn || undefined} ref={host} aria-hidden="true" style={chromaticOn ? {filter: `url(#${id})`} : undefined}>
    <svg className="rs-material-defs" aria-hidden="true"><defs><filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      {chromaticOn && dispersion && <>
        <feImage href={dispersion} x="-10%" y="-10%" width="120%" height="120%" preserveAspectRatio="none" result="dispersion" />
        <feDisplacementMap in="SourceGraphic" in2="dispersion" scale={-effects.chromatic * .9} xChannelSelector="R" yChannelSelector="G" result="redWarp" />
        <feGaussianBlur in="redWarp" stdDeviation={effects.chromatic * .012} result="redFocus" />
        <feComposite in="redFocus" in2="SourceGraphic" operator="over" result="redExtended" />
        <feColorMatrix in="redExtended" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
        <feDisplacementMap in="SourceGraphic" in2="dispersion" scale={effects.chromatic * 1.1} xChannelSelector="R" yChannelSelector="G" result="blueWarp" />
        <feGaussianBlur in="blueWarp" stdDeviation={effects.chromatic * .028} result="blueFocus" />
        <feComposite in="blueFocus" in2="SourceGraphic" operator="over" result="blueExtended" />
        <feColorMatrix in="blueExtended" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
        <feBlend in="red" in2="green" mode="screen" result="rg" />
        <feBlend in="rg" in2="blue" mode="screen" result="rgb" />
      </>}
      {grainOn && texture && <>
        <feImage href={texture} x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="grain" />
        <feColorMatrix in={source} values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .2126 .7152 .0722 0 0" result="luminance" />
        <feComponentTransfer in="luminance" result="grainMask"><feFuncA type="table" tableValues={tones} /></feComponentTransfer>
        <feComposite in="grainMask" in2="SourceAlpha" operator="in" result="grainCoverage" />
        <feComposite in="grain" in2="grainCoverage" operator="in" result="weightedGrain" />
        <feBlend in="weightedGrain" in2={source} mode="soft-light" result="finished" />
      </>}
      {chromaticOn
        ? <feMerge><feMergeNode in={grainOn && texture ? 'finished' : source} /></feMerge>
        : <feComposite in={grainOn && texture ? 'finished' : source} in2="SourceAlpha" operator="in" />}
    </filter></defs></svg>
    <div className="rs-material-source" style={chromaticOn ? undefined : {filter: `url(#${id})`}}><i /></div>
  </div>
}
