import type { ReactNode } from 'react'
import { Fan, House, LayoutGrid, Music, Navigation, Phone } from 'lucide-react'

// Pleos Connect-S 17 의 1:1 분할을 가정한 차량 화면. 공식 문서는 system UI 와 창 비율(1:1·2:0)만 밝히고 px 은 밝히지 않는다.
// 차량 공통 정보는 상·하단, 본문은 사고 대응 / 내비 두 창. 이 pixel 배치와 상단 차량 상태 요약은 project 제안이다.
export const DISPLAY = { width: 2560, height: 1440 }

export function PleosDisplay({ scale, children, navigation }: { scale: number; children: ReactNode; navigation?: ReactNode }) {
  return <div className="pleos-display" style={{ transform: `scale(${scale})` }}>
    <div className="pleos-status" data-pleos="status-bar" aria-hidden="true"><span className="pleos-vehicle-status" data-pleos="vehicle-status"><strong>P</strong><span><b>0</b> km/h</span></span><span>오후 9:12</span><span><span>5G</span><span>18°C</span></span></div>
    {children}
    <section className="pleos-window pleos-navigation" data-pleos="navigation" aria-hidden={navigation === undefined ? true : undefined}>
      {navigation ?? <svg viewBox="0 0 840 1184" width="1232" height="1152" preserveAspectRatio="xMidYMid slice">
        <path d="M0 300 L840 372" stroke="#23262B" strokeWidth="26" fill="none" />
        <path d="M0 860 C300 800 520 940 840 880" stroke="#23262B" strokeWidth="20" fill="none" />
        <path d="M410 1184 C440 900 360 560 480 0" stroke="#2C3036" strokeWidth="96" fill="none" />
        <path d="M410 1184 C440 900 360 560 480 0" stroke="#3E434A" strokeWidth="3" strokeDasharray="24 30" fill="none" />
        <circle cx="414" cy="900" r="52" fill="rgba(0,130,255,.18)" />
        <circle cx="414" cy="900" r="20" fill="#0082FF" stroke="#fff" strokeWidth="5" />
      </svg>}
    </section>
    <div className="pleos-gnb" data-pleos="gnb" aria-hidden="true">
      <span><Fan size={36} />22.5°</span>
      <nav><House size={40} /><Navigation size={40} /><span className="is-active"><i className="pleos-app-mark" /></span><Music size={40} /><Phone size={40} /><LayoutGrid size={40} /></nav>
      <span><Fan size={36} />22.5°</span>
    </div>
  </div>
}
