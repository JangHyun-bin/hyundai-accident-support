# AFTER / CARE 전역 design system

승인 근거: B″ surface·solid 119·flat icon과 B / Three cells 선택. 사용자가 승인한 전체 범위는 `goal.md`, 화면·상태 목록은 `inventory.md`.

## 원칙과 기준값

- 사고 후 사용자의 다음 행동이 첫 정보. 확인된 사실과 미확인을 구별하며 통화 연결·접수·도착을 서로 다른 상태로 표현.
- Font: repo의 local Asta 400/600/700. 가독성을 위한 일반 본문 17px, 보조 15px, label 13px, section 22px, title 28–48px, 통화 숫자 96–120px. Mobile은 rem으로 text 확대 허용.
- 바탕 `#09090c`, 기본 surface `#18181c`, control `#303037`, 본문 `#f4f4f8`, 보조 `#b6b6bf`, line `#37373f`. Confirmed `#a7e3bf`, pending `#e8d797`, attention/failed `#ffb39c`. 색과 icon·문구를 함께 사용.
- Voice surface는 승인된 blue 계열, guidance는 copper 계열. Unknown map은 위치를 암시하는 점 없이 중립 surface. Form·목록·기록은 평평한 중립 surface.
- Spacing: 4/8/12/16/24/32/40/48/64. Card gap 16px, 주요 영역 여백 24–32px, 외곽 radius 32px, card radius 28px, control 16px, touch target 최소 48px.
- Material 기본: grain 12%, size .8px, clumping 12%, tone 75%, seed 303; CA 1px, angle 0°. Text·icon은 filter 밖. Source shape를 먼저 clip하고 filter output의 fringe는 보존.
- Motion: 빠른 feedback 160ms, 상태 전환 240ms, layout 전환 360ms. `cubic-bezier(.22,1,.36,1)`. Reduced motion에서 지속 animation과 이동 제거. Critical 상태는 animation이 끝나기 전에 접근 가능.

## Layout 체계

1. Response / Three cells: 차량 요약과 요청 현황을 기준점으로 두고, 통화·map·안내가 공유 접점에서 연결. 경계 4°, normal gap 16px, corner 28px. 접점 이동은 폭에 비례하되 최대 48px. 글자는 수평, slanted edge의 안쪽에 64px 여유 확보.
2. Task / Workspace: 기록·검토·전송·차량 상세의 긴 내용은 중립 작업 surface에 배치. 차량에서는 맥락과 map을 함께 보이며, 내용 길이에 따라 자연스럽게 늘거나 명시적 content scrolling 사용.
3. Compact / Mobile: 한 column의 자연스러운 읽기 순서. 실제 viewport와 200% text에 대응. 차량 화면을 통째로 축소해 mobile 제품 UI를 대신하지 않음.

기하학은 background shape만 제어하며 내용은 일반 document flow에 유지. ResizeObserver는 layout 결과를 읽어 shared boundary를 갱신. 미확인·오류·긴 문구가 shape 밖으로 밀리지 않도록 실제 text bounds 검증.

## 공용 구조

- `src/design-system/tokens.css`: 시각·motion token 정본.
- `src/design-system/surfaces.ts`: 기존 surface type·validation·preset read/write와 승인된 기본 finish. 기존 import 경로는 호환 re-export로 유지.
- `src/design-system/SurfaceTheme.tsx`: 제품에 적용된 theme의 read/validate/save와 React context. 기존 editor draft와 다른 storage key 사용. Preview provider로 catalog/editor/제품의 동일 component에 다른 preset 주입.
- `src/components/ui/after-care.tsx`: Surface, Button, Status, Heading, Spectrum, input 기본 표현. 기존 domain status는 adapter로 전달.
- `src/components/ui/after-care-layout.tsx`: responsive VehicleShell, ResponseLayout, TaskLayout. Product와 catalog가 이 구현을 공유.
- `src/design-system/DesignSystemCatalog.tsx`: token, component 상태, layout 및 실제 emergency/journey component preview.
- `src/emergency/EmergencySurface.tsx`, `src/journey/JourneyLayout.tsx`: domain state·event를 공용 UI에 연결. 저장·승인·외부 결과 reducer는 기존 구현 유지.

Catalog가 별도의 mock component 모음이 되는 접근은 제외. 기존 전체 frontend 위에 CSS skin만 덧붙이는 접근도 제외. 공용 primitive와 layout으로 단계별 이동하는 방식 채택.

## Preset과 제품 적용

`response-surface-study-v1`의 C·C_02와 draft는 기존 의미 그대로 유지. 승인된 제품 theme는 `after-care-theme-v1`에 따로 저장. Editor의 명시적 적용 동작으로만 제품 theme 변경. 같은 tab 및 다른 tab의 적용 결과를 제품·catalog가 구독. 잘못된 storage는 덮어쓰지 않으며 오류와 복구 선택 표시.

## 범위와 검증

현재 functional 제품은 전체 journey와 emergency 검토 환경. Root는 전체 journey로 연결. 기존 focus/context·tools·response alternative는 과거 design 증거로 분리 보존. Catalog와 editor도 전역 공용 구현을 사용.

5 scenario·60 state, 8 journey fixture와 기록·영상·diagram·경위서·전송·후속 처리 전체 분기 적용. 기존 domain 검증에 새 design system/preset/layout/voice 검증 추가. Desktop 1440/1600/2560, mobile 360/393, 200% text, keyboard, reduced motion, contrast, overflow, 실제 browser screenshot, rendering 측정.

재규 음성은 provider의 실제 생성 결과와 원고 hash를 manifest로 연결. API key는 frontend·repository에 포함하지 않음. 재생 실패·취소·화면 전환 시 겹침 방지. Code 검증 후 전체 흐름 및 주요 분기 영상을 생성하고 source commit·timeline·오디오 provenance 기록.

결과의 판단 근거: catalog와 제품의 공용 import, 전 상태 inventory의 실행 결과, 사용자 조작 E2E, screenshot·영상, PR의 diff와 required checks. 녹색 test만으로 시각 품질 완료를 주장하지 않음.
