import {createContext, useContext, useEffect, useState, type ReactNode} from 'react'
import {applyStudioFinish, originalSurfaces, readSurfacePair, type SurfacePair} from './surfaces'
import './tokens.css'

export const appliedThemeKey='after-care-theme-v1'
const changed='after-care-theme-change'
export const defaultSurfaceTheme=applyStudioFinish({
  call:{...originalSurfaces.call,blur:49,height:97,radius:25,rim:43},
  safety:{...originalSurfaces.safety,blur:49,bottomSpread:23,y:56.5,radius:68},
})
type ThemeState={surfaces:SurfacePair;error:string}
const ThemeContext=createContext<ThemeState>({surfaces:defaultSurfaceTheme,error:''})

export function readAppliedTheme():ThemeState {
  try {
    const raw=localStorage.getItem(appliedThemeKey)
    if(raw===null)return {surfaces:readSurfacePair(defaultSurfaceTheme),error:''}
    const stored:unknown=JSON.parse(raw)
    if(!stored||typeof stored!=='object'||!('version' in stored)||stored.version!==1||!('surfaces' in stored))throw new Error('Invalid theme')
    return {surfaces:readSurfacePair(stored.surfaces),error:''}
  }catch{
    return {surfaces:readSurfacePair(defaultSurfaceTheme),error:'적용한 theme를 읽지 못했어요. 기본값으로 표시하며 저장된 내용은 유지해요.'}
  }
}

export function applySurfaceTheme(pair:unknown):{ok:boolean;error:string} {
  try {
    const surfaces=readSurfacePair(pair)
    localStorage.setItem(appliedThemeKey,JSON.stringify({version:1,surfaces}))
    window.dispatchEvent(new Event(changed))
    return {ok:true,error:''}
  }catch{
    return {ok:false,error:'Theme를 적용하지 못했어요. 값과 browser 저장 공간을 확인해주세요.'}
  }
}

export function SurfaceThemeProvider({value,children}:{value?:SurfacePair;children:ReactNode}) {
  const [state,setState]=useState<ThemeState>(()=>value?{surfaces:value,error:''}:readAppliedTheme())
  useEffect(()=>{
    if(value)return
    const update=()=>setState(readAppliedTheme())
    const storage=(event:StorageEvent)=>{if(event.key===appliedThemeKey||event.key===null)update()}
    window.addEventListener(changed,update);window.addEventListener('storage',storage)
    // Mount 직전 다른 tab에서 저장한 값도 반영.
    update()
    return()=>{window.removeEventListener(changed,update);window.removeEventListener('storage',storage)}
  },[value])
  return <ThemeContext.Provider value={value?{surfaces:value,error:''}:state}>{children}</ThemeContext.Provider>
}
export const useSurfaceTheme=()=>useContext(ThemeContext).surfaces
export const useSurfaceThemeIssue=()=>useContext(ThemeContext).error
