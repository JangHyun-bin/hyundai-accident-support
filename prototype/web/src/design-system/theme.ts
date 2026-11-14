export type ColorTheme = 'light' | 'dark'

declare global {
  interface WindowEventMap { 'chabun:host-theme': CustomEvent<unknown> }
}

const isTheme = (value: unknown): value is ColorTheme => value === 'light' || value === 'dark'

// The Pleos WebView reports the app's night mode through the bridge, so the host decides before the OS media query; ?theme pins review screenshots.
export function followColorTheme() {
  const root = document.documentElement
  const query = new URLSearchParams(location.search).get('theme')
  const pinned = isTheme(query) ? query : null
  const system = matchMedia('(prefers-color-scheme: light)')
  let host: ColorTheme | null = null
  const apply = (info: unknown) => {
    if (typeof info === 'object' && info !== null && 'theme' in info && isTheme(info.theme)) host = info.theme
    const theme = pinned ?? host ?? (system.matches ? 'light' : 'dark')
    root.dataset.theme = theme
    root.style.colorScheme = theme
    root.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--ac-background').trim())
  }
  let native: unknown = null
  try { native = JSON.parse(window.ChabunNative?.host() ?? 'null') } catch { native = null }
  window.addEventListener('chabun:host-theme', event => apply(event.detail))
  system.addEventListener('change', () => apply(null))
  apply(native)
}
