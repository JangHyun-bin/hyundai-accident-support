import {useLayoutEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react'
import {Fan,House,Navigation,Phone} from 'lucide-react'
import {responseShapes,type ResponseShapes,type SlotRect} from '@/design-system/split-geometry'
import {CareSurface} from './after-care'
import {FlowFrameContext} from '@/design-system/flow-contract'
import {useBoundedFrame} from '@/design-system/use-bounded-frame'
import '@/design-system/layout.css'

type ResponseProps={summary:ReactNode;primary:ReactNode;requests:ReactNode;navigation:ReactNode;guidance:ReactNode;action?:ReactNode;primaryTone?:'plain'|'call';interactive?:boolean;notificationKey?:string}

export function VehicleShell({children,device='vehicle',presentation,header,previewHeight}:{children:ReactNode;device?:'vehicle'|'mobile';presentation?:'bounded';header?:ReactNode;previewHeight?:number}) {
  const host=useRef<HTMLDivElement>(null)
  const measured=useBoundedFrame(host,device,previewHeight),frame=presentation==='bounded'?measured:null
  const progress=frame?Math.max(32,frame.metrics.labelLineHeight+8):0,urgent=frame?Math.max(frame.metrics.touch,2*frame.metrics.bodyLineHeight+16):0
  const style=frame?{'--flow-stage-height':`${frame.height}px`,'--flow-content-height':`${frame.contentHeight}px`,'--flow-header-height':`${frame.headerHeight}px`,'--flow-status-height':`${frame.statusHeight}px`,'--flow-dock-height':`${frame.dockHeight}px`,'--flow-progress-height':`${progress}px`,'--flow-action-height':`${frame.headerHeight-progress-urgent-16}px`,'--flow-urgent-height':`${urgent}px`} as CSSProperties:undefined
  return <FlowFrameContext.Provider value={frame}><div ref={host} className="ac-system ac-vehicle" data-care-component="vehicle-shell" data-care-device={device} data-presentation={presentation} data-flow-mode={frame?.mode} data-flow-reason={frame?.reason} data-flow-font-size={frame?.metrics.rem} style={style}>
    <div className="ac-vehicle-status" role="region" aria-label="차량 상태 표시" data-figma-node="28:2041">
      <time dateTime="21:12">오후 9:12</time>
      <span className="ac-vehicle-mode"><span className="ac-vehicle-mode-mark"><img src="/figma/ivi-status-bar/mode-indicator.svg" width="14" height="14" alt=""/></span><span>차분 · 사고 대응 모드</span></span>
      <span className="ac-vehicle-connectivity" aria-label="5G, 외부 온도 18°C">{'5G   18°C'}</span>
    </div>
    {presentation==='bounded'&&<div className="ac-vehicle-header">{header}</div>}
    <div className="ac-vehicle-content">{children}</div>
    <div className="ac-vehicle-dock" aria-hidden="true"><span><Fan/>22.5°</span><span><House/><Navigation/><i/><Phone/></span><span>22.5°</span></div>
  </div></FlowFrameContext.Provider>
}

export function ResponseLayout({summary,primary,requests,navigation,guidance,action,primaryTone='call',interactive=false,notificationKey}:ResponseProps) {
  const grid=useRef<HTMLDivElement>(null)
  const [shapes,setShapes]=useState<ResponseShapes>({})
  const [ready,setReady]=useState(false)
  useLayoutEffect(()=>{
    const root=grid.current!;let frame=0;let alive=true
    const measure=()=>{
      if(frame)return
      frame=requestAnimationFrame(()=>{
        frame=0
        const bounds=root.getBoundingClientRect()
        const slot=(name:string):SlotRect=>{const r=root.querySelector<HTMLElement>(`[data-care-slot="${name}"]`)!.getBoundingClientRect();return {left:r.left-bounds.left,top:r.top-bounds.top,width:r.width,height:r.height}}
        const css=getComputedStyle(root)
        const next=responseShapes(bounds.width,{primary:slot('primary'),navigation:slot('navigation'),guidance:slot('guidance')},interactive?parseFloat(css.columnGap)||16:16,interactive?{
          radius:parseFloat(css.getPropertyValue('--ac-split-radius'))||28,
          tiltDeg:parseFloat(css.getPropertyValue('--ac-split-tilt'))||0,
          junctionBias:parseFloat(css.getPropertyValue('--ac-split-bias'))||0,
        }:{})
        if(interactive){
          // Absolute backgrounds can update without rerendering the content on every frame.
          let safe=true
          const context=document.createElement('canvas').getContext('2d')!
          for(const name of ['primary','navigation','guidance'] as const){
            const shape=next[name];if(!shape)continue
            const element=root.querySelector<HTMLElement>(`[data-care-slot="${name}"]`)!,rect=element.getBoundingClientRect()
            const path=new Path2D(shape.path),walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT)
            const inside=(r:DOMRect)=>[[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]].every(([x,y])=>context.isPointInPath(path,x-rect.left-shape.left,y-rect.top-shape.top))
            while(walker.nextNode()){
              if(!walker.currentNode.textContent?.trim())continue
              const range=document.createRange();range.selectNodeContents(walker.currentNode)
              for(const r of range.getClientRects())if(r.width&&r.height&&!inside(r))safe=false
            }
            element.querySelectorAll('button,input,textarea').forEach(control=>{if(!inside(control.getBoundingClientRect()))safe=false})
          }
          for(const name of ['primary','navigation','guidance'] as const){
            const element=root.querySelector<HTMLElement>(`[data-care-slot="${name}"]`)!,background=element.querySelector<HTMLElement>('.ac-material-frame')!,shape=safe?next[name]:undefined
            element.toggleAttribute('data-shaped',!!shape)
            if(shape){
              Object.assign(background.style,{left:`${shape.left}px`,top:`${shape.top}px`,width:`${shape.width}px`,height:`${shape.height}px`})
              background.style.setProperty('--ac-clip',`path("${shape.path}")`);background.dataset.shapePath=shape.path
            }else{background.removeAttribute('style');delete background.dataset.shapePath}
          }
          root.dataset.split=next.primary?(safe?'three-cells':'rectangles'):'stack'
        }else setShapes(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next)
        setReady(true)
      })
    }
    const observer=new ResizeObserver(measure)
    observer.observe(root);root.querySelectorAll('[data-care-slot]').forEach(node=>observer.observe(node))
    root.addEventListener('care-layout-change',measure)
    measure();document.fonts.ready.then(()=>{if(alive)measure()})
    return()=>{alive=false;observer.disconnect();cancelAnimationFrame(frame);root.removeEventListener('care-layout-change',measure)}
  },[interactive])
  return <div className="ac-layout-container"><div ref={grid} className="ac-response-grid" data-interactive={interactive||undefined} data-care-layout="response" data-layout-ready={ready} data-split={shapes.primary?'three-cells':'stack'}>
    <CareSurface className="ac-summary" data-care-slot="summary">{summary}</CareSurface>
    <CareSurface className="ac-primary" notificationKey={notificationKey} interactiveMaterial tone={primaryTone} shape={shapes.primary} data-care-slot="primary">{primary}</CareSurface>
    <CareSurface className="ac-guidance" notificationKey={notificationKey} interactiveMaterial tone="safety" shape={shapes.guidance} data-care-slot="guidance">{guidance}</CareSurface>
    <CareSurface className="ac-requests" data-care-slot="requests">{requests}</CareSurface>
    <CareSurface className="ac-navigation" tone="map" shape={shapes.navigation} data-care-slot="navigation">{navigation}</CareSurface>
    <div className="ac-layout-action" data-care-slot="action">{action}</div>
  </div></div>
}

export function TaskLayout({summary,navigation,children,action}:{summary:ReactNode;navigation?:ReactNode;children:ReactNode;action?:ReactNode}) {
  return <div className="ac-layout-container"><div className="ac-task-grid" data-care-layout="task">
    <CareSurface className="ac-task-summary">{summary}</CareSurface>
    <CareSurface className="ac-task-workspace"><div className="ac-task-body" tabIndex={0} role="region" aria-label="작업 내용">{children}</div>{action&&<div className="ac-task-action">{action}</div>}</CareSurface>
    {navigation&&<CareSurface tone="map" className="ac-task-navigation">{navigation}</CareSurface>}
  </div></div>
}
