import { useSyncExternalStore } from 'react'
import './host.css'

export type DialResult = 'opened' | 'unavailable' | 'rejected'
export type HandoffCommand = 'journey' | 'start' | 'approve' | 'renew' | 'retry'
export type AppWindowSize = { width: number; height: number; scale: number }
type ChabunNative = { host(): string; handoff(command: HandoffCommand, argJson: string): void; dial(number: '119'): string }
type WindowPx = { width: number; height: number }

declare global {
  interface Window { ChabunNative?: ChabunNative }
  interface WindowEventMap { 'chabun:handoff': CustomEvent<unknown>; 'chabun:vehicle-fact': CustomEvent<unknown>; 'chabun:host-ready': Event; 'chabun:host-resize': CustomEvent<unknown> }
}

const bridge = window.ChabunNative ?? null

function readHost(): unknown {
  try { return bridge ? JSON.parse(bridge.host()) : null } catch { return null }
}

function windowPx(value: unknown): WindowPx | null {
  if (typeof value !== 'object' || value === null || !('width' in value) || !('height' in value)) return null
  const { width, height } = value
  return typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0 && width <= 10_000 && height <= 10_000
    ? { width: Math.round(width), height: Math.round(height) } : null
}

function hostWindowPx(): WindowPx | null {
  const info = readHost()
  return typeof info === 'object' && info !== null && 'windowPx' in info ? windowPx(info.windowPx) : null
}

const info = readHost()
export const inPleosApp = bridge !== null || new URLSearchParams(location.search).get('host') === 'pleos-app'
export const hostDemo = typeof info === 'object' && info !== null && 'demo' in info && info.demo === true
export const hasNativeBridge = bridge !== null
// Builds without a backend origin run standalone, so the phone link is offered only when native reports a server.
export const phoneHandoff = bridge === null || (typeof info === 'object' && info !== null && 'handoff' in info && info.handoff === true)
if (inPleosApp) document.documentElement.dataset.host = 'pleos-app'

// The journey is laid out at the window's physical pixels, like the app window of the simulated 2560×1440 display, then fitted to the
// WebView's CSS viewport (Pleos runs WebViews at devicePixelRatio 1.375, so 1682 physical px arrive as 1224 CSS px).
function measure(physical: WindowPx | null): AppWindowSize {
  const size = physical ?? { width: Math.round(innerWidth * devicePixelRatio), height: Math.round(innerHeight * devicePixelRatio) }
  return { ...size, scale: Math.min(innerWidth / size.width, innerHeight / size.height) || 1 }
}

let appWindow = measure(hostWindowPx())
const windowListeners = new Set<() => void>()
function resize(physical: WindowPx | null) {
  const next = measure(physical)
  if (next.width === appWindow.width && next.height === appWindow.height && next.scale === appWindow.scale) return
  appWindow = next
  windowListeners.forEach(listener => listener())
}
if (inPleosApp) {
  window.addEventListener('resize', () => resize(hostWindowPx()))
  window.addEventListener('chabun:host-resize', event => resize(windowPx(event.detail) ?? hostWindowPx()))
}

function subscribeWindow(listener: () => void) {
  windowListeners.add(listener)
  return () => { windowListeners.delete(listener) }
}

export function useAppWindow(): AppWindowSize {
  return useSyncExternalStore(subscribeWindow, () => appWindow)
}

export function sendHandoff(command: HandoffCommand, argument: Record<string, string> = {}) {
  bridge?.handoff(command, JSON.stringify(argument))
}

export function dial119(): DialResult | null {
  if (!bridge) return null
  const result = bridge.dial('119')
  return result === 'opened' || result === 'unavailable' ? result : 'rejected'
}
