import {useEffect, useState} from 'react'
import {ArrowRight, Mic, Phone} from 'lucide-react'
import {CareAction, CareHeading, CareSpectrum, CareStatus, CareSurface} from '@/components/ui/after-care'
import {useSurfaceThemeIssue} from './SurfaceTheme'
import {JourneyStudy} from '@/journey/JourneyStudy'
import {manifest,scenarioFor} from '@/emergency/session'
import {ResponseLayoutPreview} from './ResponseLayoutPreview'
import {CareVehicleContour} from '@/components/ui/vehicle-contour'
import './catalog.css'

const colors=[['background','바탕'],['surface','기본 surface'],['control','Control'],['text','본문'],['muted','보조'],['confirmed','확인됨'],['pending','진행 중'],['attention','주의·실패'],['ivi-surface','차량 상단 bar'],['ivi-muted','통신·외부 온도'],['mode-amber','사고 대응 mode']] as const
export function DesignSystemCatalog() {
  const issue=useSurfaceThemeIssue()
  const [long,setLong]=useState(false)
  const [scenarioId,setScenarioId]=useState('SC01')
  const [sceneId,setSceneId]=useState('connected')
  const [values,setValues]=useState<Record<string,string>>({})
  useEffect(()=>{const css=getComputedStyle(document.documentElement);setValues(Object.fromEntries(colors.map(([name])=>[name,css.getPropertyValue('--ac-'+name).trim()])))},[])
  return <main className="ac-system ac-catalog">
    <header className="ac-catalog-header"><a href="/?study=journey">AFTER / CARE</a><nav aria-label="Design system">{import.meta.env.DEV&&<a href="/?study=flow">단계별 공간 전환 <ArrowRight size={16}/></a>}<a href="/?study=journey">전체 흐름 <ArrowRight size={16}/></a>{import.meta.env.DEV&&<a href="/?study=response-alts&focus=surface">Surface 조절 <ArrowRight size={16}/></a>}</nav></header>
    <div className="ac-catalog-intro"><CareHeading eyebrow="B″ / GLOBAL SYSTEM" title="AFTER / CARE design system">새 화면은 이 catalog의 token과 component를 사용. 필요한 표현은 공용 기준에 먼저 추가.</CareHeading><p>차분한 정보, 명확한 다음 행동.<br/>선택한 B의 공간과 질감을 제품 전체의 규칙으로.</p></div>
    {issue&&<p role="status" className="ac-catalog-issue">{issue}</p>}
    <section className="ac-catalog-section" aria-label="Color tokens"><div className="ac-catalog-section-title"><span>01</span><h2>색의 역할</h2><p>상태는 색·icon·문구로 함께 표현.</p></div><div className="ac-token-grid">{colors.map(([name,label])=><div key={name}><i style={{background:`var(--ac-${name})`}}/><strong>{label}</strong><code>{values[name]}</code><small>--ac-{name}</small></div>)}</div></section>
    <section className="ac-catalog-section" aria-label="Surface components"><div className="ac-catalog-section-title"><span>02</span><h2>빛과 깊이</h2><p>Grain 12% · CA 1px. 글자와 icon은 선명하게.</p></div><div className="ac-material-grid">
      <CareSurface tone="call" aria-label="통화 surface"><div className="ac-catalog-call-label"><span>119 긴급 통화</span><Phone aria-hidden="true"/></div><p className="ac-catalog-number">119</p><h3>통화 연결됨</h3><CareSpectrum/><p className="ac-catalog-material-note">구호 접수 미확인</p></CareSurface>
      <CareSurface tone="safety" aria-label="안내 surface"><span className="ac-eyebrow">움직일 수 있으면</span><h3>가드레일 밖으로<br/>대피하세요</h3><p className="ac-catalog-material-note">안전한 곳에서 기다리세요.</p></CareSurface>
    </div></section>
    <section className="ac-catalog-section" aria-label="Interactive components"><div className="ac-catalog-section-title"><span>03</span><h2>행동과 상태</h2><p>Touch target 최소 48px · Keyboard focus · Reduced motion.</p></div><CareSurface>
      <div className="ac-catalog-statuses"><CareStatus tone="unknown">미확인</CareStatus><CareStatus tone="pending">확인 중</CareStatus><CareStatus tone="confirmed">접수 확인</CareStatus><CareStatus tone="failed">전송 실패</CareStatus><CareStatus tone="skipped">보류함</CareStatus></div>
      <div className="ac-catalog-actions"><CareAction><Mic aria-hidden="true"/>말로 기록하기</CareAction><CareAction secondary>직접 입력</CareAction><CareAction disabled>기록 저장</CareAction></div>
      <label className="ac-catalog-field">기억나는 내용<textarea className="ac-field" placeholder="확실한 내용만 남겨주세요" rows={3}/></label>
    </CareSurface></section>
    <section className="ac-catalog-section"><div className="ac-catalog-section-title"><span>04</span><h2>Typography와 공간</h2></div><CareSurface><CareHeading level={2} eyebrow="Asta · 400 / 600 / 700" title="지금 필요한 행동을, 한눈에.">본문 17px · 보조 15px · label 13px. 한국어 단어를 유지하고 긴 내용은 자연스럽게 이어짐.</CareHeading><p className="ac-catalog-material-note">Card 28px · Control 16px · Gap 16px · 여백 24–32px</p><p className="ac-catalog-material-note">IVI 상단 bar · 2560×72 기준 Asta 26/34 · 좌우 여백 56px · 작은 화면에서는 사고 대응 mode를 다음 행에 표시.</p></CareSurface></section>
    <section className="ac-catalog-section" aria-label="Response layout preview"><div className="ac-catalog-section-title"><span>05</span><h2>Three cells · 실제 내용과 공간</h2><CareAction secondary onClick={()=>setLong(!long)}>{long?'기본 문구 보기':'긴 문구 보기'}</CareAction></div><div className="ac-catalog-scene-controls"><label>Scenario<select aria-label="Scenario" value={scenarioId} onChange={e=>{setScenarioId(e.target.value);setSceneId(scenarioFor(e.target.value).initial)}}>{manifest.scenarios.map(s=><option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}</select></label><label>State<select aria-label="State" value={sceneId} onChange={e=>setSceneId(e.target.value)}>{scenarioFor(scenarioId).states.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label><a href={`/?study=emergency&scenario=${scenarioId}&scene=${sceneId}`}>이 장면 조작하기</a></div><ResponseLayoutPreview long={long} scenarioId={scenarioId} sceneId={sceneId}/></section>
    <section className="ac-catalog-section" aria-label="Vehicle contour preview"><div className="ac-catalog-section-title"><span>06</span><h2>B / Contour · 차량 상태</h2>{import.meta.env.DEV&&<a href="/?study=vehicle">차량 상태 시안 열기</a>}</div>{import.meta.env.DEV&&<nav className="ac-catalog-scene-controls" aria-label="차량 상황 page"><a href="/?study=surroundings&view=front">전방 시점</a><a href="/?study=surroundings&view=current">현재 주변</a><a href="/?study=surroundings&view=replay">사고 재생</a></nav>}<CareSurface><CareVehicleContour state={{direction:null,directionNote:'미확인',hazard:{value:'미확인',tone:'unknown'},trunk:{value:'미확인',tone:'unknown'},mobility:{value:'가능 여부 미확인',tone:'unknown'}}}/></CareSurface></section>
    <section className="ac-catalog-section" aria-label="Journey workspace preview"><div className="ac-catalog-section-title"><span>07</span><h2>전체 여정 · 실제 component</h2><p>시연 상황을 선택해 입력·검토·전송·복귀까지 조작.</p></div><JourneyStudy embedded/></section>
  </main>
}
