import type { CSSProperties } from 'react'
import { surfaceEffectDefaults } from '@/components/ui/surface-effects'

export const surfaceColors = [
  { key: 'top', label: '첫 색' }, { key: 'base', label: '중간 색' },
  { key: 'bottom', label: '끝 색' }, { key: 'shade', label: 'Shade 색' },
] as const
export const surfaceRanges = [
  { key: 'angle', label: 'Gradient 방향', min: 0, max: 360, step: 1, unit: '°', group: 'gradient' },
  { key: 'topSpread', label: '첫 색 번짐', min: 0, max: 49, step: 1, unit: '%', group: 'gradient' },
  { key: 'bottomSpread', label: '끝 색 번짐', min: 0, max: 49, step: 1, unit: '%', group: 'gradient' },
  { key: 'opacity', label: 'Shade 농도', min: 0, max: 100, step: 1, unit: '%', group: 'shade' },
  { key: 'blur', label: 'Blur', min: 0, max: 100, step: 1, unit: 'px', group: 'shade' },
  { key: 'x', label: '가로 위치', min: 0, max: 100, step: .5, unit: '%', group: 'shape' },
  { key: 'y', label: '세로 위치', min: 0, max: 100, step: .5, unit: '%', group: 'shape' },
  { key: 'width', label: 'Shade 너비', min: 20, max: 140, step: 1, unit: '%', group: 'shape' },
  { key: 'height', label: 'Shade 높이', min: 20, max: 140, step: 1, unit: '%', group: 'shape' },
  { key: 'radius', label: 'Shade 둥글기', min: 0, max: 200, step: 1, unit: 'px', group: 'shape' },
  { key: 'rim', label: 'Rim 밝기', min: 0, max: 100, step: 1, unit: '%', group: 'rim' },
  { key: 'chromatic', label: '색 분리', min: 0, max: 24, step: .25, unit: 'px', group: 'chromatic' },
  { key: 'chromaticAngle', label: 'Lens 축', min: 0, max: 360, step: 1, unit: '°', group: 'chromatic' },
  { key: 'grain', label: 'Grain 강도', min: 0, max: 100, step: 1, unit: '%', group: 'grain' },
  { key: 'grainSize', label: '입자 크기', min: .4, max: 4, step: .1, unit: 'px', group: 'grain' },
  { key: 'grainClumping', label: '입자 뭉침', min: 0, max: 100, step: 1, unit: '%', group: 'grain' },
  { key: 'grainTone', label: '명암 반응', min: 0, max: 100, step: 1, unit: '%', group: 'grain' },
  { key: 'grainSeed', label: 'Grain seed', min: 1, max: 999, step: 1, unit: '', group: 'grain' },
] as const

type ColorKey = typeof surfaceColors[number]['key']
type RangeKey = typeof surfaceRanges[number]['key']
export type Surface = Record<ColorKey, string> & Record<RangeKey, number>
export type SurfacePair = { call: Surface; safety: Surface }
export type SurfacePreset = { name: string; surfaces: SurfacePair }
export type SurfaceLibrary = { version: 1; draft: SurfacePair; presets: SurfacePreset[] }
export const surfaceStorageKey = 'response-surface-study-v1'
export const originalSurfaces: SurfacePair = {
  call: { ...surfaceEffectDefaults, top: '#b9a6ff', base: '#2e43ff', bottom: '#6d7dff', shade: '#05082a', angle: 180, topSpread: 27, bottomSpread: 24, opacity: 100, blur: 46, x: 50, y: 58.5, width: 86, height: 89, radius: 90, rim: 27 },
  safety: { ...surfaceEffectDefaults, top: '#f6bf96', base: '#c2683a', bottom: '#dc8a5c', shade: '#1d0b05', angle: 180, topSpread: 30, bottomSpread: 25, opacity: 100, blur: 42, x: 50, y: 58, width: 84, height: 96, radius: 60, rim: 27 },
}

export function applyStudioFinish(pair: SurfacePair): SurfacePair {
  const finish = { chromatic: 1, chromaticAngle: 0, grain: 12, grainSize: .8, grainClumping: 12, grainTone: 75, grainSeed: 303 }
  return { call: { ...pair.call, ...finish }, safety: { ...pair.safety, ...finish } }
}

export function completeSurfacePair(pair: SurfacePair): SurfacePair {
  return { call: { ...surfaceEffectDefaults, ...pair.call }, safety: { ...surfaceEffectDefaults, ...pair.safety } }
}

export function surfaceStyle(s: Surface): CSSProperties {
  return {
    '--rs-gradient': `linear-gradient(${s.angle}deg, ${s.top} 0%, ${s.base} ${s.topSpread}%, ${s.base} ${100 - s.bottomSpread}%, ${s.bottom} 100%)`,
    '--rs-core': s.shade,
    '--rs-inset': `${s.y - s.height / 2}% ${100 - s.x - s.width / 2}% ${100 - s.y - s.height / 2}% ${s.x - s.width / 2}%`,
    '--rs-blur': `${s.blur}px`, '--rs-opacity': s.opacity / 100, '--rs-radius': `${s.radius}px`,
    '--rs-rim': `#ffffff${Math.round(s.rim / 100 * 255).toString(16).padStart(2, '0')}`,
  } as CSSProperties
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function readSurface(raw: unknown): Surface {
  if (!isObject(raw)) throw new Error('Invalid surface')
  const value: Record<string, unknown> = { ...surfaceEffectDefaults, ...raw }
  if (!surfaceColors.every(({ key }) => typeof value[key] === 'string' && /^#[0-9a-f]{6}$/i.test(value[key])) ||
    !surfaceRanges.every(({ key, min, max }) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= min && value[key] <= max)) throw new Error('Invalid surface')
  return value as Surface
}
export function readSurfacePair(value: unknown): SurfacePair {
  if (!isObject(value)) throw new Error('Invalid surface pair')
  return { call: readSurface(value.call), safety: readSurface(value.safety) }
}
export function readSurfaceLibrary(): { value: SurfaceLibrary; error: string } {
  const fallback: SurfaceLibrary = { version: 1, draft: originalSurfaces, presets: [] }
  try {
    const raw = localStorage.getItem(surfaceStorageKey)
    if (raw === null) return { value: fallback, error: '' }
    const value: unknown = JSON.parse(raw)
    if (!isObject(value) || value.version !== 1 || !Array.isArray(value.presets)) throw new Error('Invalid preset')
    const presets = value.presets.map((p: unknown) => {
      if (!isObject(p) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 40) throw new Error('Invalid preset')
      return { name: p.name, surfaces: readSurfacePair(p.surfaces) }
    })
    return { value: { version: 1, draft: readSurfacePair(value.draft), presets }, error: '' }
  } catch {
    return { value: fallback, error: '저장한 설정을 읽지 못했어요. 기본값으로 시작해요.' }
  }
}
