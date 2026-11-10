import type {ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode} from 'react'
import {Check, CircleHelp, Clock3, Minus, TriangleAlert} from 'lucide-react'
import {useSurfaceTheme} from '@/design-system/SurfaceTheme'
import type {SurfaceShape} from '@/design-system/split-geometry'
import {surfaceStyle} from '@/design-system/surfaces'
import {SurfaceEffectsLayer} from './surface-effects'
import './after-care.css'

export type CareTone='unknown'|'pending'|'confirmed'|'failed'|'skipped'
export function CareSurface({tone='plain',children,className='',style,shape,...props}:HTMLAttributes<HTMLElement>&{tone?:'plain'|'call'|'safety'|'map';shape?:SurfaceShape}) {
  const theme=useSurfaceTheme()
  const material=tone==='call'||tone==='safety'?theme[tone]:null
  return <section {...props} data-care-surface={tone} data-shaped={shape?true:undefined} className={`ac-surface ${className}`} style={{...(material?surfaceStyle(material):{}),...style}}>
    <div className="ac-material-frame" data-shape-path={shape?.path} style={shape?{left:shape.left,top:shape.top,width:shape.width,height:shape.height,'--ac-clip':`path("${shape.path}")`} as CSSProperties:undefined}>{material?<SurfaceEffectsLayer effects={material}/>:<div className="ac-solid-source"/>}</div>{children}
  </section>
}
export function CareAction({secondary=false,className='',children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{secondary?:boolean}) {
  return <button type="button" {...props} className={`ac-action${secondary?' ac-secondary':''} ${className}`}>{children}</button>
}
export function CareStatus({tone,children}:{tone:CareTone;children:ReactNode}) {
  const Icon={unknown:CircleHelp,pending:Clock3,confirmed:Check,failed:TriangleAlert,skipped:Minus}[tone]
  return <span className="ac-status" data-care-component="status" data-tone={tone}><Icon aria-hidden="true"/><span>{children}</span></span>
}
export function CareHeading({eyebrow,title,children,level=1}:{eyebrow?:string;title:string;children?:ReactNode;level?:1|2|3}) {
  const Tag=level===1?'h1':level===2?'h2':'h3'
  return <header className="ac-heading">{eyebrow&&<span className="ac-eyebrow">{eyebrow}</span>}<Tag tabIndex={-1}>{title}</Tag>{children&&<p>{children}</p>}</header>
}
// 실제 입력은 levels 전달. 통화 시연에는 고정된 합성 spectrum 사용.
export function CareSpectrum({active=true,levels}:{active?:boolean;levels?:number[]}) {
  const bars=levels??[.12,.18,.22,.34,.48,.28,.55,.72,.62,.41,.83,.58,.76,.91,.65,.72,.52,.88,.61,.44,.73,.55,.32,.47,.28,.23,.17,.1]
  return <div className="ac-spectrum" data-active={active} data-source={levels?'input':'simulation'} aria-hidden="true">{bars.map((v,i)=><i key={i} style={{'--ac-bar':`${Math.max(4,Math.min(1,Math.max(0,v))*42)}px`,'--ac-delay':`${-i*.13}s`,'--ac-duration':`${1.4+i%4*.16}s`} as CSSProperties}/>)}</div>
}
