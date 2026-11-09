import { useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Check, CircleHelp, Clock3, Minus, TriangleAlert } from 'lucide-react'
import { DISPLAY, PleosDisplay } from '../emergency/PleosDisplay'
import type { Device } from './case'
export type { Device } from './case'
import '../emergency/emergency.css'
import './journey.css'

export type JourneyTone = 'unknown' | 'pending' | 'confirmed' | 'failed' | 'skipped'

export function JourneyStatus({ tone, children }: { tone: JourneyTone; children: ReactNode }) {
  const Icon = { unknown: CircleHelp, pending: Clock3, confirmed: Check, failed: TriangleAlert, skipped: Minus }[tone]
  return <span className="journey-status" data-tone={tone}><Icon aria-hidden="true" /><span>{children}</span></span>
}

export function JourneyAction({ secondary, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return <button {...props} className={`journey-action${secondary ? ' is-secondary' : ''}${props.className ? ` ${props.className}` : ''}`}>{children}</button>
}

export function JourneyHeading({ step, title, children }: { step?: string; title: string; children?: ReactNode }) {
  return <header className="journey-heading">{step && <p className="journey-eyebrow">{step}</p>}<h1 tabIndex={-1}>{title}</h1>{children && <p className="journey-supporting">{children}</p>}</header>
}

export function JourneyLayout({ device, summary, children, action }: {
  device: Device; summary: ReactNode; children: ReactNode; action?: ReactNode
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const node = viewport.current
    if (!node) return
    const measure = () => setScale(Math.min(1, node.clientWidth / DISPLAY.width))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [device])
  const surface = <section className="journey-surface" data-journey-device={device}>
    <div className="journey-summary">{summary}</div>
    <div className="journey-response">
      <div className="journey-content">{children}</div>
      {action && <footer className="journey-actions">{action}</footer>}
    </div>
  </section>
  return <div className="journey-theme">
    {device === 'vehicle'
      ? <div ref={viewport} className="journey-vehicle-viewport" style={{ height: DISPLAY.height * scale }}><PleosDisplay scale={scale}>{surface}</PleosDisplay></div>
      : <div className="journey-mobile-viewport">{surface}</div>}
  </div>
}
