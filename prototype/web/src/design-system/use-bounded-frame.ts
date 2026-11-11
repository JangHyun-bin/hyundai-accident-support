import {useLayoutEffect,useState,type RefObject} from 'react'
import type {FlowFrame,FlowFrameInput,FlowMetrics} from './flow-contract'

export function resolveFlowFrame(input:FlowFrameInput):FlowFrame {
 const {width,height,device,metrics}=input
 const mobile=device==='mobile',wide=!mobile&&width>=78*metrics.rem+48
 const padding=mobile||width<=600?12:16
 const statusHeight=mobile?0:Math.max(width<=416?72:48,metrics.labelLineHeight*(width<=416?2:1)+24)
 const dockHeight=mobile?0:Math.max(64,metrics.labelLineHeight+32)
 const progress=Math.max(32,metrics.labelLineHeight+8)
 const copy=metrics.labelLineHeight+metrics.headingLineHeight*(wide?1:2)+metrics.bodyLineHeight*(wide?2:3)+16
 const action=wide?Math.max(2*metrics.touch,copy):copy+2*metrics.touch
 const urgent=Math.max(metrics.touch,2*metrics.bodyLineHeight+16)
 const headerHeight=Math.ceil(progress+action+urgent+16)
 const contentHeight=Math.floor(height-2*padding-(mobile?16:48)-statusHeight-dockHeight-headerHeight)
 // 세 줄 본문과 필수 control을 함께 표시할 수 없는 환경만 document로 전환.
 const callHeight=Math.max(106*metrics.rem/16,metrics.callLineHeight+2*metrics.labelLineHeight+24*metrics.rem/16)
 const minimum=3*metrics.bodyLineHeight+metrics.touch+metrics.headingLineHeight+(wide?48:metrics.touch+callHeight+96)
 const mode=contentHeight<minimum?'document':mobile?'mobile':wide?'wide':'narrow'
 return {...input,mode,contentHeight:mode==='document'?Math.ceil(minimum):contentHeight,headerHeight,statusHeight,dockHeight,
  revision:[width,height,device,...Object.values(metrics)].join('/'),
  reason:mode==='document'?'essential-controls-and-three-lines-do-not-fit':mobile?'mobile-device':wide?'two-readable-vehicle-panes':'single-readable-vehicle-pane'}
}

export function useBoundedFrame(ref:RefObject<HTMLElement|null>,device:'vehicle'|'mobile',previewHeight?:number):FlowFrame|null {
 const [frame,setFrame]=useState<FlowFrame|null>(null)
 useLayoutEffect(()=>{
  const host=ref.current
  if(!host)return
  let alive=true,request=0
  const probe=document.createElement('span')
  probe.setAttribute('aria-hidden','true')
  Object.assign(probe.style,{position:'fixed',visibility:'hidden',pointerEvents:'none',width:'1rem',height:'1rem',overflow:'hidden'})
  host.append(probe)
  const measure=()=>{
   request=0
   const width=host.getBoundingClientRect().width
   if(!width)return
   const line=(token:string,leading:number)=>{
    probe.style.fontSize=`var(${token})`;probe.style.lineHeight=String(leading)
    return parseFloat(getComputedStyle(probe).lineHeight)
   }
   const metrics:FlowMetrics={rem:parseFloat(getComputedStyle(document.documentElement).fontSize),bodyLineHeight:line('--ac-type-body',1.31),headingLineHeight:line('--ac-type-guide',1.22),callLineHeight:line('--ac-type-call',1.31),labelLineHeight:line('--ac-type-label',1.31),touch:device==='mobile'?48:64}
   const height=previewHeight??Math.max(0,(window.visualViewport?.height??window.innerHeight)-32)
   const next=resolveFlowFrame({width,height,device,metrics})
   setFrame(previous=>previous?.revision===next.revision?previous:next)
  }
  const schedule=()=>{if(!request)request=requestAnimationFrame(measure)}
  const observer=new ResizeObserver(schedule)
  observer.observe(host);observer.observe(probe)
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule)
  document.fonts.addEventListener('loadingdone',schedule)
  document.fonts.ready.then(()=>{if(alive)schedule()})
  measure()
  return()=>{alive=false;cancelAnimationFrame(request);observer.disconnect();probe.remove();window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);document.fonts.removeEventListener('loadingdone',schedule)}
 },[ref,device,previewHeight])
 return frame
}
