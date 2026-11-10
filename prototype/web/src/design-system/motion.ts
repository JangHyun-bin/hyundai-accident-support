import {useLayoutEffect,useRef} from 'react'
// 상태 commit을 기다리게 하지 않고, 새 내용만 짧게 나타냄. Countdown tick은 key에 포함하지 않음.
export function useCareMotion<T extends HTMLElement>(key:string){
 const host=useRef<T>(null),previous=useRef(key)
 useLayoutEffect(()=>{
  const changed=previous.current!==key;previous.current=key
  const node=host.current,reduce=matchMedia('(prefers-reduced-motion: reduce)')
  if(!node||!changed||reduce.matches||!node.getClientRects().length)return
  const css=getComputedStyle(node)
  const animation=node.animate([{opacity:.72,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:parseFloat(css.getPropertyValue('--ac-motion-state'))||240,easing:css.getPropertyValue('--ac-ease').trim()||'ease-out'})
  const cancel=()=>animation.cancel();reduce.addEventListener('change',cancel)
  return()=>{cancel();reduce.removeEventListener('change',cancel)}
 },[key])
 return host
}
