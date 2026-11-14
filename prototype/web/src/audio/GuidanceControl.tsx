import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { stopGuidanceAudio, useGuidanceAudio } from './useGuidanceAudio'

let muted = false
const listeners = new Set<() => void>()
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }

// The single voice switch for the whole page; guidance itself starts with each new context.
export function GuidanceMuteToggle() {
  const silent = useSyncExternalStore(subscribe, () => muted)
  return <button type="button" className="ac-guidance-mute" aria-pressed={silent} onClick={() => { muted = !silent; if (muted) stopGuidanceAudio(); listeners.forEach(listener => listener()) }}>
    {silent ? <VolumeX aria-hidden="true" size={16} /> : <Volume2 aria-hidden="true" size={16} />}음성 안내 끄기
  </button>
}

// Typing into a form is the user's turn, so guidance yields to it.
export function ContextualGuidanceProvider({ children }: { children: ReactNode }) {
  return <div style={{ display: 'contents' }} onFocus={event => { if (event.target instanceof Element && event.target.matches('input:not([type=checkbox],[type=radio]),textarea')) stopGuidanceAudio() }}>{children}</div>
}

export function GuidanceControl({ text, contextKey }: { text: string; contextKey: string }) {
  const host = useRef<HTMLSpanElement>(null)
  const audio = useGuidanceAudio({ text, key: contextKey, host })
  const silent = useSyncExternalStore(subscribe, () => muted)
  const { play, stop } = audio
  useEffect(() => {
    if (silent) { stop(); return }
    const node = host.current!
    let audible = false, current = true
    const update = () => {
      const next = node.getClientRects().length > 0 && !node.closest('[hidden],[inert],[data-voice-phase="listening"],[data-voice-phase="saving"],[data-voice-phase="saved"]')
      // A context replaced within the same task (e.g. storage availability settling) must not speak first.
      if (next && !audible) queueMicrotask(() => { if (current) void play() })
      if (!next && audible) stop()
      audible = next
    }
    const observer = new MutationObserver(update)
    for (let element: HTMLElement | null = node; element; element = element.parentElement) observer.observe(element, { attributes: true, attributeFilter: ['hidden', 'inert', 'data-voice-phase'] })
    update()
    return () => { current = false; observer.disconnect() }
  }, [silent, play, stop, contextKey])
  return <>
    <span ref={host} aria-hidden="true" style={{ position: 'absolute' }} data-guidance-state={audio.state} />
    {audio.state === 'error' && <div className="ac-guidance-control"><p role="status">음성을 재생하지 못했어요. {text}</p></div>}
  </>
}
