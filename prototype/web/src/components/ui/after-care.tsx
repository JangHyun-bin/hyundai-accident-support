import {useEffect,useRef,useState} from 'react'
import type {ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode} from 'react'
import {Check, CircleHelp, Clock3, Info, Minus, TriangleAlert} from 'lucide-react'
import {useSurfaceTheme} from '@/design-system/SurfaceTheme'
import type {SurfaceShape} from '@/design-system/split-geometry'
import {semanticSurfaces,surfaceStyle} from '@/design-system/surfaces'
import {SurfaceEffectsLayer} from './surface-effects'
import {initialMotion,materialTimeline} from '@/design-system/interaction-study-model'
import './after-care.css'

export type CareTone='unknown'|'pending'|'confirmed'|'failed'|'skipped'|'info'
export function CareSurface({tone='plain',children,className='',style,shape,interactiveMaterial=true,notificationKey,...props}:HTMLAttributes<HTMLElement>&{tone?:'plain'|'call'|'safety'|'map';shape?:SurfaceShape;interactiveMaterial?:boolean;notificationKey?:string}) {
  const host=useRef<HTMLElement>(null)
  useEffect(()=>{
    if(notificationKey===undefined||!host.current)return
    const element=host.current,value={light:0,chroma:0,shade:0},media=matchMedia('(prefers-reduced-motion: reduce)')
    const paint=()=>{element.style.setProperty('--ac-notify-light',String(value.light));element.style.setProperty('--ac-notify-chroma',String(value.chroma));element.style.setProperty('--ac-notify-shade',`${value.shade}px`)}
    const timeline=materialTimeline(value,initialMotion,1,paint)
    const stop=()=>{timeline.kill();Object.assign(value,{light:0,chroma:0,shade:0});paint()}
    if(!media.matches)timeline.play()
    media.addEventListener('change',stop)
    return()=>{stop();media.removeEventListener('change',stop)}
  },[notificationKey])
  const theme=semanticSurfaces(useSurfaceTheme())
  const material=tone==='call'||tone==='safety'?theme[tone]:null
  return <section {...props} ref={host} data-care-surface={tone} data-shaped={shape?true:undefined} className={`ac-surface ${className}`} style={{...(material?surfaceStyle(material):{}),...style}}>
    <div className="ac-material-frame" data-shape-path={shape?.path} style={shape?{left:shape.left,top:shape.top,width:shape.width,height:shape.height,'--ac-clip':`path("${shape.path}")`} as CSSProperties:undefined}>{material?(interactiveMaterial?<><div className="ac-material-idle"/><div className="ac-material-illumination"><SurfaceEffectsLayer effects={material} resizeDebounceMs={160}/></div></>:<SurfaceEffectsLayer effects={material}/>):<div className="ac-solid-source"/>}</div>{children}
  </section>
}
export function CareAction({secondary=false,className='',children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{secondary?:boolean}) {
  return <button type="button" {...props} className={`ac-action${secondary?' ac-secondary':''} ${className}`}>{children}</button>
}
export function CareStatus({tone,children,className=''}:{tone:CareTone;children:ReactNode;className?:string}) {
  const Icon={unknown:CircleHelp,pending:Clock3,confirmed:Check,failed:TriangleAlert,skipped:Minus,info:Info}[tone]
  return <span className={`ac-status ${className}`} data-care-component="status" data-tone={tone}><Icon aria-hidden="true"/><span>{children}</span></span>
}
export function CareHeading({eyebrow,title,children,level=1}:{eyebrow?:string;title:string;children?:ReactNode;level?:1|2|3}) {
  const Tag=level===1?'h1':level===2?'h2':'h3'
  return <header className="ac-heading">{eyebrow&&<span className="ac-eyebrow">{eyebrow}</span>}<Tag tabIndex={-1}>{title}</Tag>{children&&<p>{children}</p>}</header>
}
// 실제 입력은 levels 전달. 통화 시연에는 고정된 합성 spectrum 사용.
export function CareSpectrum({active=true,levels}:{active?:boolean;levels?:number[]}) {
  const host=useRef<HTMLDivElement>(null)
  const [visible,setVisible]=useState(true),[foreground,setForeground]=useState(()=>document.visibilityState!=='hidden')
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting))
    if(host.current)observer.observe(host.current)
    const changed=()=>setForeground(document.visibilityState!=='hidden')
    document.addEventListener('visibilitychange',changed)
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',changed)}
  },[])
  const bars=levels??[.12,.18,.22,.34,.48,.28,.55,.72,.62,.41,.83,.58,.76,.91,.65,.72,.52,.88,.61,.44,.73,.55,.32,.47,.28,.23,.17,.1]
  return <div ref={host} className="ac-spectrum" data-active={active&&visible&&foreground} data-source={levels?'input':'simulation'} aria-hidden="true">{bars.map((v,i)=><i key={i} style={{'--ac-bar':`${Math.max(4,Math.min(1,Math.max(0,v))*42)}px`,'--ac-delay':`${-i*.13}s`,'--ac-duration':`${1.4+i%4*.16}s`} as CSSProperties}/>)}</div>
}
