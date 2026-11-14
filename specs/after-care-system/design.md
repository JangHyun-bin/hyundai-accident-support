# 차분 전역 design system

2026-11-13 현행화. B″ surface·solid119·flat icon과 B/Three cells의 선택은 과거 결정 기록이다. 사용자 목표는 [goal](goal.md), 구현·과거 증거·미완료 범위는 [completion](completion.md)에서 추적한다. 이 문서가 개별 수치의 사용자 승인이나 실차 적합성을 새로 주장하지 않는다.

## 정본과 승계

- 현재 token: `prototype/web/src/design-system/tokens.css`.
- Layout·입력 보존: [stable spec](../../docs/superpowers/specs/2026-11-12-stable-voronoi-layout-design.md).
- 실제 display·외부 조작기: [Pleos display 기준](../../docs/design-system/pleos-display-and-controls.md).
- 색·font·touch·material 출처: [현행 시각 기준](../../docs/superpowers/specs/2026-11-12-figma-visual-contract.md). 원래 승인 원문을 확보하지 못한 재구성이다.
- 전체 상태 정본: `specs/emergency-experience/scenarios.json`, `journey-fixtures.json`, JourneyCase 도메인.

초기 design의 body17/label13·일괄touch48, blue call/copper guidance, 내용에 따른 외곽 자연 확장 설명은 아래 최신 token·semantic mapping·bounded/document 정책으로 승계된다. 이 정정은 코드의 token·preset 값을 변경하는 migration이 아니다.

## 원칙과 현재 기준

- 다음 행동을 먼저 제시하고 확인·미확인·실패를 문구·icon·색으로 함께 표현한다. 통화 연결·전송·접수·도착·인계는 별개다.
- Local Asta400/600/700. 기본 body1.125rem·supporting .9375rem·label .875rem, 1800/2400px의 이산 rem profile과 사용자200% 확대를 유지한다. 일반 기준은18/15/14 CSS px이며 공식 물리 크기 token으로 해석하지 않는다.
- background `#09090c`, surface `#18181c`, control `#303037`, text `#f4f4f8`, muted `#b6b6bf`, line `#37373f`; confirmed `#a7e3bf`, pending `#f2a541`, attention `#ffb39c`. 실제 값은 token source가 정본이다.
- Render semantic call은 copper, safety/guide는 blue-violet. `response-surface-study-v1`의 과거 call/safety slot 값은 그대로 보관하고 `semanticSurfaces()`에서 역할을 연결한다.
- Space4/8/12/16/24/32/40/48/56/64, shell32·card28·control16px radius. Vehicle64·명시적 mobile48 CSS px target, focus4px·offset4px.
- Studio finish는 grain12%, size .8px, clumping12%, tone75%, seed303; CA1px·angle0. Text/icon을 material filter 밖에 유지하고 source shape clip과 fringe를 구분한다.
- 공용 feedback160/state240/layout360ms. Flow material morph1200/calm1600/fade360ms는 별도 계층이다. Reduced motion과 숨겨진 spectrum 정지를 유지하며 critical 정보는 animation 완료를 기다리지 않는다.

## Layout 체계

1. **Response / Three cells:** 상황·기관 상태·차량 행동·사용자 행동을 공용 component로 구성한다. 이전 고정1232×1152 flat canvas의 pixel 규칙과 현재 responsive document flow를 혼동하지 않는다.
2. **Task / Workspace:** 기록·영상·도식·경위서·승인·상세의 실제 editor를 유지한다. 정상 wide 환경은 content-first slot과 내부 body scroll, 좁거나 큰 text 환경은 document profile을 사용한다.
3. **대표 Flow:** 환경에서 host 높이/profile을 결정하고 editor slot을 먼저 예약한다. Surface만 움직이고 content width·variant는 필요한 경계에서 전환한다. 모든 shape를 수학적 Voronoi라고 주장하지 않는다.
4. **Vehicle display:** 최대2560×1440·16:9 안에는 status·작업 pane·dock만 포함한다. 단계·이전/다음·시연 설정은 display 밖 sibling이며 열림 여부가 display 크기를 바꾸지 않는다. Mobile/200% text에16:9를 강제하지 않는다.

DOM·draft·caret·scroll·미디어·IME의 마지막 관찰값을 보존하고119 core를 고정한다. 매 frame text 최대 rectangle 선택·글자 stretch·4000ms 강제 대기·content 위 sticky action으로 가리는 방식을 사용하지 않는다. OS IME 내부의 아직 노출되지 않은 후보 복원을 보장하지 않는다.

## 공용 구현과 preset

- `src/components/ui/after-care.tsx`, `after-care-layout.tsx`: 실제 제품·catalog가 공유하는 Surface/Action/Status/Spectrum·VehicleShell/TaskLayout/ResponseLayout.
- `src/design-system/DesignSystemCatalog.tsx`: 별도 mock이 아닌 실제 component preview.
- `src/design-system/SurfaceTheme.tsx`, `surfaces.ts`: validate·preset·제품 theme·같은 tab custom event/다른 tab storage event.
- `src/emergency/EmergencySurface.tsx`, `src/journey/JourneyLayout.tsx`, `JourneyFlow.tsx`: 도메인을 공용 UI에 연결한다.

위 `src/`는 `prototype/web/src/` 기준이다. 단순 CSS skin이나 두 번째 component convention을 추가하지 않는다.

C·C_02와 draft는 기존 storage에 보존한다. 제품 적용은 별도 `after-care-theme-v1`에 명시적으로 저장한다. 오류 preset은 조용히 덮어쓰지 않고 오류·복구 선택을 제공한다. 이번 repair는 저장 key/schema나 preset을 재설계하지 않는다.

## 안내·입력·시연 경계

안내는 JaeGyu 사전 생성 MP3와 원고/hash metadata를 사용한다. 기본 scene 원고 외 실제 persistence·기관 상태를 반영한 resolver가 필요하다. API key는 repo/frontend에 넣지 않는다. 파일 부재는 정확한 원고·오류로 표시하되 필수 asset 없는 feature를 완료라고 하지 않는다.

사용자 마이크 녹음·실제 amplitude meter와 안내/통화 시연 spectrum은 다르다. 실제 STT·119 audio·기관 전송·차량 센서는 구현하지 않는다. 승인 snapshot·request identity·미확인/접수 semantics·IndexedDB 원자 저장은 presentation보다 우선한다.

## 검증과 완료

기본 route는 전체 Journey, Emergency는5 scenario·60 state, Journey는8 fixture다. Catalog·editor·제품의 실제 import와 상태 전이를 대조한다. 긴 한국어·vehicle/mobile·200% text·keyboard·reduced motion·정상/실패/중단/복구를 실제 browser에서 확인한다.

과거 PASS·자동 전사·desktop rendering 수치를 현재 full gate·사람 청취·실차60fps로 승계하지 않는다. 전역 공통 음성 포함 최종 영상·사람 음성 평가·실차/AAOS 검증과 이번 repair의32개 수용 기준은 [completion](completion.md)에서 별개로 기록한다.
