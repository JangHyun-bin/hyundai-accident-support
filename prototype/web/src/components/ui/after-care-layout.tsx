import {useLayoutEffect,useRef,useState,type ReactNode} from 'react'
import {Fan,House,Navigation,Phone} from 'lucide-react'
import {responseShapes,type ResponseShapes,type SlotRect} from '@/design-system/split-geometry'
import {CareSurface} from './after-care'
import '@/design-system/layout.css'

type ResponseProps={summary:ReactNode;primary:ReactNode;requests:ReactNode;navigation:ReactNode;guidance:ReactNode;action?:ReactNode;primaryTone?:'plain'|'call'}

export function VehicleShell({children}:{children:ReactNode}) {
  return <div className="ac-system ac-vehicle" data-care-component="vehicle-shell">
    <div className="ac-vehicle-status" aria-label="기어와 속도"><span><strong>P</strong> <b>0</b> km/h</span><span>AFTER / CARE</span></div>
    <div className="ac-vehicle-content">{children}</div>
    <div className="ac-vehicle-dock" aria-hidden="true"><span><Fan/>22.5°</span><span><House/><Navigation/><i/><Phone/></span><span>22.5°</span></div>
  </div>
}

export function ResponseLayout({summary,primary,requests,navigation,guidance,action,primaryTone='call'}:ResponseProps) {
  const grid=useRef<HTMLDivElement>(null)
  const [shapes,setShapes]=useState<ResponseShapes>({})
  const [ready,setReady]=useState(false)
  useLayoutEffect(()=>{
    const root=grid.current!;let frame=0;let alive=true
    const measure=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>{
        const bounds=root.getBoundingClientRect()
        const slot=(name:string):SlotRect=>{const r=root.querySelector<HTMLElement>(`[data-care-slot="${name}"]`)!.getBoundingClientRect();return {left:r.left-bounds.left,top:r.top-bounds.top,width:r.width,height:r.height}}
        const next=responseShapes(bounds.width,{primary:slot('primary'),navigation:slot('navigation'),guidance:slot('guidance')})
        setShapes(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);setReady(true)
      })
    }
    const observer=new ResizeObserver(measure)
    observer.observe(root);root.querySelectorAll('[data-care-slot]').forEach(node=>observer.observe(node))
    measure();document.fonts.ready.then(()=>{if(alive)measure()})
    return()=>{alive=false;observer.disconnect();cancelAnimationFrame(frame)}
  },[])
  return <div className="ac-layout-container"><div ref={grid} className="ac-response-grid" data-care-layout="response" data-layout-ready={ready} data-split={shapes.primary?'three-cells':'stack'}>
    <CareSurface className="ac-summary" data-care-slot="summary">{summary}</CareSurface>
    <CareSurface className="ac-primary" tone={primaryTone} shape={shapes.primary} data-care-slot="primary">{primary}</CareSurface>
    <CareSurface className="ac-guidance" tone="safety" shape={shapes.guidance} data-care-slot="guidance">{guidance}</CareSurface>
    <CareSurface className="ac-requests" data-care-slot="requests">{requests}</CareSurface>
    <CareSurface className="ac-navigation" tone="map" shape={shapes.navigation} data-care-slot="navigation">{navigation}</CareSurface>
    <div className="ac-layout-action" data-care-slot="action">{action}</div>
  </div></div>
}

export function TaskLayout({summary,navigation,children,action}:{summary:ReactNode;navigation?:ReactNode;children:ReactNode;action?:ReactNode}) {
  return <div className="ac-layout-container"><div className="ac-task-grid" data-care-layout="task">
    <CareSurface className="ac-task-summary">{summary}</CareSurface>
    <CareSurface className="ac-task-workspace">{children}{action&&<div className="ac-task-action">{action}</div>}</CareSurface>
    {navigation&&<CareSurface tone="map" className="ac-task-navigation">{navigation}</CareSurface>}
  </div></div>
}
