import {useLayoutEffect,useMemo,useRef,useState,type ReactNode,type CSSProperties} from 'react'
import {Fan,House,Navigation,Phone} from 'lucide-react'
import {responseShapes,type ResponseShapes,type SlotRect} from '@/design-system/split-geometry'
import {CareSurface} from './after-care'
import {FlowFrameContext,type FlowFrame,type FlowMetrics} from '@/design-system/flow-contract'
import {useBoundedFrame} from '@/design-system/use-bounded-frame'
import {inPleosApp,useAppWindow} from '@/host/pleos-host'
import {publicAsset} from '@/lib/utils'
import '@/design-system/layout.css'
import './pleos-display.css'

type ResponseProps={summary:ReactNode;primary:ReactNode;requests:ReactNode;navigation:ReactNode;guidance:ReactNode;action?:ReactNode;primaryTone?:'plain'|'call';interactive?:boolean;notificationKey?:string}
export type AppWindow='full'|'split'

const display={width:2560,height:1440}
const windowRect={left:853,top:90,height:1210}
const windowWidths:Record<AppWindow,number>={full:1682,split:841}
const systemAreas=[
  {id:'status-bar',left:0,top:0,width:2560,height:90},
  {id:'driving-view',left:0,top:90,width:853,height:1210},
  {id:'edge',left:2535,top:90,width:25,height:1210},
  {id:'gnb',left:0,top:1300,width:2560,height:140},
] as const

function connectWindowFrame(width:number,height:number,metrics:FlowMetrics):FlowFrame {
  const wide=width>=78*metrics.rem+48
  const callHeight=Math.max(106*metrics.rem/16,metrics.callLineHeight+2*metrics.labelLineHeight+24*metrics.rem/16)
  const minimum=3*metrics.bodyLineHeight+metrics.touch+metrics.headingLineHeight+(wide?48:metrics.touch+callHeight+96)
  const mode=height<minimum?'document':wide?'wide':'narrow'
  return {width,height,device:'vehicle',metrics,mode,contentHeight:mode==='document'?Math.ceil(minimum):height,statusHeight:0,dockHeight:0,
    revision:['connect',width,height,...Object.values(metrics)].join('/'),
    reason:mode==='document'?'essential-controls-and-three-lines-do-not-fit':wide?'two-readable-vehicle-panes':'single-readable-vehicle-pane'}
}

export function VehicleShell({children,device='vehicle',presentation,controls,previewHeight,appWindow='full'}:{children:ReactNode;device?:'vehicle'|'mobile';presentation?:'bounded';controls?:ReactNode;previewHeight?:number;appWindow?:AppWindow}) {
  const host=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null)
  const pleos=presentation==='bounded'&&device==='vehicle'
  // Inside the Pleos app the page is the app window itself: no simulated system areas, laid out at its physical size and fitted to the viewport.
  const app=pleos&&inPleosApp
  const physical=useAppWindow()
  const measured=useBoundedFrame(host,device,previewHeight)
  const metrics=measured?.metrics,windowWidth=app?physical.width:windowWidths[appWindow],windowHeight=app?physical.height:windowRect.height
  const signature=metrics?Object.values(metrics).join('/'):''
  const windowFrame=useMemo(()=>metrics?connectWindowFrame(windowWidth,windowHeight,metrics):null,[windowWidth,windowHeight,signature])
  const frame=pleos?windowFrame:presentation==='bounded'?measured:null
  useLayoutEffect(()=>{
    const node=stage.current
    if(!pleos||!node)return
    const fit=()=>{if(node.clientWidth)node.style.setProperty('--pleos-scale',String(Math.min(1,node.clientWidth/display.width)))}
    const observer=new ResizeObserver(fit)
    observer.observe(node);fit()
    return()=>observer.disconnect()
  },[pleos])
  const style=app?{width:windowWidth,height:windowHeight,'--pleos-scale':physical.scale} as CSSProperties
    :frame&&!pleos?{'--flow-stage-height':`${frame.height}px`,'--flow-content-height':`${frame.contentHeight}px`,'--flow-status-height':`${frame.statusHeight}px`,'--flow-dock-height':`${frame.dockHeight}px`} as CSSProperties:undefined
  const windowKind:AppWindow=app?(physical.width*2>windowWidths.full+windowWidths.split?'full':'split'):appWindow
  const shell=<div ref={host} className="ac-system ac-vehicle" data-care-component="vehicle-shell" data-care-device={device} data-presentation={pleos?'pleos':presentation} data-pleos-app={app||undefined} data-app-window={pleos?windowKind:undefined} data-flow-mode={frame?.mode} data-flow-reason={frame?.reason} data-flow-font-size={frame?.metrics.rem} style={style}>
    {app?null:pleos?<div className="ac-pleos-system" aria-hidden="true">{systemAreas.map(({id,...rect})=><img key={id} data-system={id} src={publicAsset(`/pleos-frame/${id}.png`)} alt="" width={rect.width} height={rect.height} style={rect}/>)}</div>
    :<div className="ac-vehicle-status" role="region" aria-label="차량 상태 표시" data-figma-node="28:2041">
      <time dateTime="21:12">오후 9:12</time>
      <span className="ac-vehicle-mode"><span className="ac-vehicle-mode-mark"><img src={publicAsset('/figma/ivi-status-bar/mode-indicator.svg')} width="14" height="14" alt=""/></span><span>차분 · 사고 대응 모드</span></span>
      <span className="ac-vehicle-connectivity" aria-label="5G, 외부 온도 18°C">{'5G   18°C'}</span>
    </div>}
    <div className="ac-vehicle-content" style={app?{inset:0}:pleos?{left:windowRect.left,top:windowRect.top,width:windowWidth,height:windowRect.height}:undefined}>{children}</div>
    {app?null:pleos?appWindow==='split'&&<div className="ac-pleos-other-app" aria-hidden="true" style={{left:windowRect.left+windowWidth,top:windowRect.top,width:windowWidths.full-windowWidth,height:windowRect.height}}>다른 앱</div>
    :<div className="ac-vehicle-dock" aria-hidden="true"><span><Fan/>22.5°</span><span><House/><Navigation/><i/><Phone/></span><span>22.5°</span></div>}
  </div>
  return <FlowFrameContext.Provider value={frame}>{presentation==='bounded'&&!app?<div ref={stage} className="ac-vehicle-stage" data-display={pleos?'pleos':undefined}>{shell}</div>:shell}{controls&&!app&&<div className="ac-system ac-display-controls" data-flow-mode={frame?.mode}>{controls}</div>}</FlowFrameContext.Provider>
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
