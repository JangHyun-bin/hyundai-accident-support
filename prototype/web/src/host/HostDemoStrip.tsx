import { useState, type CSSProperties, type ReactNode } from 'react'
import { useAppWindow } from './pleos-host'

export function HostDemoStrip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { scale } = useAppWindow()
  return <div className="host-demo-strip" style={{ '--pleos-scale': scale } as CSSProperties}>
    <button type="button" className="host-demo-strip-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>시연</button>
    {open && <div className="host-demo-strip-panel" role="group" aria-label="시연 조작">{children}</div>}
  </div>
}
