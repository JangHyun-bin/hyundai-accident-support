import { HaloCard } from './components/ui/halo-card'
import { HaloBadge } from './components/ui/halo-badge'

export function Catalog() {
  return <section className="catalog"><p className="eyebrow">Design foundation / 01</p><h1>화면의 공통 기준</h1><p>새 화면은 여기 있는 값과 component만 사용해요. 필요한 항목은 여기에 먼저 추가해요.</p>
    <div className="swatches">{['background', 'surface', 'card', 'foreground', 'muted-foreground', 'primary', 'warning'].map(name => <div key={name}><span style={{ background: `var(--${name})` }} /><code>{name}</code></div>)}</div>
    <HaloCard animated={false} padding="lg" className="catalog-card"><p className="eyebrow">Cult UI · Halo Card</p><h2>사람의 안전이 먼저예요.</h2><p>짧은 안내와 명확한 다음 행동. Asta Sans / 48·26·22·18 CSS px.</p><button className="primary-action" type="button">주요 행동 예시</button><HaloBadge animated={false} interactive={false} variant="secondary" className="request-badge">요청 전</HaloBadge></HaloCard>
    <p>Graphite surface · 24 px card radius · 16 px button radius · 200 ms transition.<br />검토용 project 값이며 Pleos의 확정 token이 아니에요.</p></section>
}
