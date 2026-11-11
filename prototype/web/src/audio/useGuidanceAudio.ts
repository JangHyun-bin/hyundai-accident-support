import {useCallback,useLayoutEffect,useRef,useState,type RefObject} from 'react'
import {guidanceAsset} from './manifest'
export type GuidanceState='idle'|'loading'|'speaking'|'error'
let activeStop:(()=>void)|null=null
export function stopGuidanceAudio(){activeStop?.()}

export function useGuidanceAudio({text,key,host}:{text:string;key:string;host?:RefObject<HTMLElement|null>}) {
 const [state,setState]=useState<GuidanceState>('idle')
 const generation=useRef(0),dispose=useRef<(()=>void)|null>(null),mounted=useRef(true)
 const stop=useCallback(()=>{
  generation.current++;dispose.current?.();dispose.current=null
  if(activeStop===stop)activeStop=null
  if(mounted.current)setState('idle')
 },[])
 useLayoutEffect(()=>{mounted.current=true;stop();return()=>{mounted.current=false;stop()}},[key,text,stop])
 const play=useCallback(async()=>{
  stopGuidanceAudio();stop()
  if(document.visibilityState==='hidden'||(host&&!host.current?.getClientRects().length))return
  const asset=guidanceAsset(text)
  if(!asset){setState('error');return}
  const request=++generation.current
  const audio=new Audio(asset.path)
  audio.preload='auto'
  const current=()=>mounted.current&&generation.current===request
  const fail=()=>{if(current()){stop();setState('error')}}
  const playing=()=>{if(current())setState('speaking')}
  const ended=()=>{if(current())stop()}
  const hidden=()=>{if(document.visibilityState==='hidden')stop()}
  const visibility=new MutationObserver(()=>{if(host&&!host.current?.getClientRects().length)stop()})
  for(let node=host?.current;node;node=node.parentElement)visibility.observe(node,{attributes:true,attributeFilter:['hidden','inert','style','class']})
  audio.addEventListener('playing',playing);audio.addEventListener('error',fail);audio.addEventListener('ended',ended)
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',stop)
  document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media=>media.pause())
  document.addEventListener('play',stop,true)
  dispose.current=()=>{
   audio.removeEventListener('playing',playing);audio.removeEventListener('error',fail);audio.removeEventListener('ended',ended)
   audio.pause();audio.removeAttribute('src');audio.load();visibility.disconnect()
   document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',stop);document.removeEventListener('play',stop,true)
  }
  activeStop=stop;setState('loading')
  try{await audio.play();if(current())setState('speaking')}catch{fail()}
 },[text,host,stop])
 return {state,play,stop,toggle:()=>{if(state==='speaking'||state==='loading')stop();else void play()}}
}
