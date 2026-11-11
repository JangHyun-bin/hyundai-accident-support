# AFTER / CARE · Notification material과 adaptive layout

작성일: 2026-11-10. 기준 source: `866b810`. 상태: build 준비용 design draft, 제품 미적용.

이번 요청은 E2E build 계획 작성. 기존 paused goal의 실행·영상 생성·push·merge 재개를 뜻하지 않음.

## 1. 원하는 경험과 결정 상태

사용자가 정한 방향:

- 평시에는 static 회색 surface. Notify 목적일 때 색이 들어오고 dimming·pulse가 나타나는 구조.
- 표면 안쪽의 빛이 올라오고 머물고 천천히 식는, 유려하고 절제된 motion.
- GSAP Timeline + 기존 Motion + SVG/CSS material 채택.
- 기존 B / Three cells의 Voronoi-like component에 adaptive layout adjustment 필요.
- 단일 화면 장식이 아닌 전역 design system. 기존 편집용 HTML 전달 방식도 지원.

작성자 제안이며 아직 사용자가 개별 승인하지 않은 값:

- 아래 timing·envelope·비율 범위·notification 횟수.
- Adaptive를 내용·상황에 대한 자동 적응과 designer editor 조정으로 함께 구성하는 안.
- 제품 사용자의 직접 drag resizing은 이번 범위 밖. Designer의 조정 동작은 별도 study/editor에서 제공.

Adaptive의 자동·수동 범위에 관한 질문은 대화에서 전달한 상태. 답변 전까지 아래 adaptive 정책은 제안으로 취급. Motion core와 layout measurement 설계는 이 선택과 독립적으로 진행 가능.

## 2. 현재 구현에서 출발

| 현재 정본 | 확인한 동작 | 이번 변경의 연결점 |
|---|---|---|
| `prototype/web/src/design-system/surfaces.ts` | Gradient·shade·grain·CA 값, C/C_02 storage validation | Material 색과 attention 재생 상태를 분리 |
| `SurfaceTheme.tsx` | 적용 theme와 editor draft 별도 보관 | Motion/layout preset도 별도 저장, 기존 data 보존 |
| `components/ui/after-care.tsx` | `CareSurface`가 call/safety material을 상시 표시 | 기본 회색, event에 의한 일시적 색 노출 |
| `components/ui/surface-effects.tsx` | Seeded grain, luminance weighting, SVG dispersion | 기존 finish 유지, frame마다 texture 재생성 방지 |
| `components/ui/after-care-layout.tsx` | ResizeObserver로 slot을 측정하고 background shape 계산 | 내용 측정·제약·조정·경계 갱신을 공용화 |
| `design-system/split-geometry.ts` | 공유 polygon, normal gap, rounded corner, 불가능할 때 rectangle fallback | 비율·접점·기울기를 명시적으로 제어 |
| `design-system/layout.css` | 60rem부터 50:50 두 column | 기본 50:50과 제한된 adaptive 비율 |
| `design-system/motion.ts` | 실제 주요 상태 전환은 native WAAPI 240ms fade/3px 이동 | 기존 동작과 새 GSAP surface 속성의 ownership 분리 |
| `package.json` | Motion 14.9.1 설치, GSAP 미설치 | 설치 시 GSAP 호환 release를 확인하고 exact lock |

현재 geometry는 수학적인 Voronoi diagram이 아님. 내용과 공유 접점에 맞춰 그리는 polygon 계열이며, 선택된 외형을 유지하기에 적합.

## 3. 검토한 접근

| 접근 | 장점 | 비용·제약 | 결정 |
|---|---|---|---|
| Motion만 사용 | 추가 dependency 최소 | HTML export에도 동일한 controller 계약 별도 확보 필요 | 가능한 대안으로 기록 |
| GSAP surface timeline + 기존 UI motion + 기존 material | 색·빛·shade의 비대칭 timing, 중단·재생·seek, React/HTML 공용 controller | 속성 ownership과 lifecycle 정리 필요 | 사용자 선택 |
| WebGL material과 전체 layout engine 재작성 | 복잡한 광학 효과 확장 가능 | 현재 material 교체, context 수명·fallback·성능 부담 | 이번 범위에 도입하지 않음 |

Library 추가만으로 시각 품질을 완료했다고 보지 않음. 동일 component에서 실제 속도로 본 결과로 timing을 결정.

## 4. Material과 motion의 계약

### 평시

- 기본 surface `#18181c`. Text `#f4f4f8`, muted `#b6b6bf` 유지.
- Material geometry와 미세 grain은 유지할 수 있으나 gradient 색·moving shade·빛의 pulse는 없음.
- Idle 상태에 반복 timeline·RAF·texture 생성 없음.
- Tone은 사용 가능한 색 계열, notification은 지금 빛을 켤 이유. Tone 설정 자체로 animation을 시작하지 않음.

### 초기 art direction 값

| 단계 | 제안 값 | 보이는 변화 |
|---|---|---|
| Enter | 700ms | 회색의 명도가 먼저 오르고, 120ms 뒤부터 채도 진입 |
| Settle | 180ms | 낮은 빛의 세기로 잠시 머묾 |
| Pulse rise | 540ms | Envelope 0.55 → 1 |
| Pulse fall | 1260ms | Envelope 1 → 0.55 |
| Exit | 1200ms | 채도는 앞 600ms에 빠지고, 명도는 끝까지 부드럽게 회색에 정착 |
| Layout settle | 560ms | 공유 경계와 실제 cell 크기를 같은 시간축으로 조정 |

Enter의 envelope 도착값은 0.55. Pulse의 rise/fall을 별도 tween으로 정의해 비대칭 호흡 구현. 기본 notice는 1회, attention은 2회 후 회색으로 복귀. Unresolved 상태의 의미는 계속 남는 문구·icon으로 유지. 사용자 재시도나 새 결과만 새 notification 생성.

- Peak 밝기·색 reveal은 최대 material 1.0. 과노출된 흰 flash 없음.
- Shade 이동은 최대 2 CSS px, 확대·blur 반경은 고정. Text·icon·전체 card를 pulse시키지 않음.
- Grain은 기존 기본값 12%, size .8px, clumping 12%, tone 75%, seed 303. CA 기본값 1px, angle 0°. C/C_02와 사용자 저장값을 덮어쓰지 않음.
- 동일 phase를 `seek()`로 재현 가능. 실제 재생 속도와 screenshot의 정지 phase를 둘 다 검토.
- 짧은 UI 반응은 기존 160/240ms 계열 유지. GSAP은 material 변수와 adaptive layout 변수만 소유. Motion/WAAPI는 같은 속성을 동시에 변경하지 않음.

### Notification 정책

`idle → entering → pulsing → exiting → idle`의 presentation 상태. Domain 상태와 별개이며 animation 완료가 통화·저장·전송의 성공을 만들지 않음.

- Event 식별은 case ID + semantic 변화 ID. Countdown tick·audio spectrum·keystroke·단순 render는 notification이 아님.
- 첫 hydration과 재방문은 현재 상태를 조용히 표시. 사용자가 새로 시작한 실제 전환 또는 명시적 study replay에서만 재생.
- 동일 event는 중복 재생하지 않음. 같은 surface에 새 event가 오면 현재 시각 값에서 이어받음.
- 한 화면에서 강한 pulse는 하나. Attention이 일반 notice보다 우선. 다른 surface의 기존 pulse는 최대 240ms exit로 보낸 뒤 새 pulse 시작. 같은 surface는 현재 값에서 retarget.
- 대기 queue 최대 1개, 최신 event로 병합. 3초가 지났거나 현재 domain 상태와 맞지 않는 대기 event는 폐기.
- 다른 case, 종료한 stage, 새 request ID로 바뀌면 이전 결과와 queued event 폐기. Seen ID는 같은 case의 stage 이동 동안 유지하고 case 교체 때만 초기화.
- Offscreen·hidden tab·중단 상태에서는 재생 정지 후 회색 정착. 복귀 시 지난 notification을 몰아서 재생하지 않음.
- Reduced motion에서는 이동·pulse 없이 즉시 정적 강조를 1600ms 표시한 뒤 회색으로 복귀. 선호 변경은 실행 중 timeline에도 즉시 적용.

### Coordinator의 위치와 event 처리

- `JourneyStudy`의 case 단위 coordinator 하나가 실제 notify를 소유. Record/review/follow-up이 `hidden` 상태로 mount되어 있는 현재 구조를 고려해 활성 stage의 surface만 등록. Hidden component의 effect가 pulse를 시작하지 않음.
- Standalone `EmergencyStudy`는 독립 coordinator, catalog는 preview별 독립 coordinator. Offline HTML도 같은 policy를 DOM adapter로 연결.
- Same event: 무시. 같은 surface의 새 event: 현재 값에서 교체. 다른 surface의 높은 priority: 기존 surface를 240ms 이내로 exit 후 전환. 낮거나 같은 priority: 최신 유효 event 하나만 queue.
- 성공 저장은 실제 `CommitResult.ok`에 연결한 presentation event. `caseId + operationId + generation`으로 어느 사용자 작업의 결과인지 식별. Optimistic value diff나 일반 `saveState` 변경만으로 성공을 추론하지 않음. No-op flush·hydrate·자동 재저장은 성공 notice에서 제외.

## 5. Adaptive layout: 공간이 바뀌는 이유

### 세 입력을 구분

1. **Container:** 가용 너비·높이, text 확대, mobile keyboard, font 로딩.
2. **Content:** 제목·설명·CTA·목록이 차지하는 최소 읽기 공간.
3. **Task:** 지금 통화·기록·검토·경로 중 무엇을 수행하는지.

Notify pulse 자체는 layout 변경 trigger가 아님. Task 전환과 실질적 내용 변화에서 한 번 재배치하고, 배치가 정착한 상태에서 빛을 사용.

### 제안한 조정 범위

| 값 | 기본 | Designer 범위 | Runtime 제약 |
|---|---|---|---|
| Main column share | 0.50 | 0.42–0.58 | 두 column의 내용 최소 너비를 우선 |
| Normal gap | 16px | 12–24px | 인접 cell 모두 동일 경계 기준 |
| Corner radius | 28px | 20–40px | 짧은 edge 길이에 따라 clamp |
| Seam tilt | 4° | 0–8° | Safe content 영역 침범 시 축소 |
| Junction vertical bias | 0 | -0.08–0.08 | 전체 material 높이에 대한 비율, 내용 침범 시 축소 |

Task별 기본 제안: balanced 0.50, 통화 중심 0.56, 작업 공간 중심 0.58, 경로 중심 0.44. 값은 사용자 선택 전 art direction 후보. 중요도가 높다는 이유만으로 모든 block을 자동 확대하지 않음.

### 반드시 유지할 조건

- 현재 B / Three cells의 topology 유지. Response는 세 material cell, Task는 workspace와 context, Compact는 읽기 순서대로 stack.
- Geometry는 하나의 shared boundary model에서 생성. 인접 block을 개별적으로 확대하거나 path를 별도로 맞추지 않음.
- Text는 수평이며 normal document flow 사용. Text scaling·skew·DOM reorder 없음.
- 최소 본문 여백 24px, 주요 control 48px 이상. 현재 slanted edge의 64px 내부 여유를 출발점으로 실제 text/control bounds 검증.
- Requested 비율이 내용을 담지 못하면 feasible 비율로 clamp. 여전히 불가능하면 rectangle 또는 stack으로 전환. 문구 자르기로 모양을 유지하지 않음.
- 60rem 미만은 stack. 200% text 확대에서는 실제 rem threshold와 내용 측정을 따름.
- 입력·IME composition·pointerdown 중에는 task priority에 의한 재배치를 보류. 실제 viewport resize와 overflow 해소는 계속 작동.
- Slot 측정은 한 frame에서 묶고, background path write는 측정 대상의 크기를 바꾸지 않게 수행. ResizeObserver feedback loop와 frame마다 React state 갱신 방지.
- Pulse 중 새 layout target이 들어와도 material의 밝기를 0으로 되돌리지 않음. Layout은 현재 값에서 새 target으로 연결.
- Topology가 바뀌는 stack/columns 전환은 새로운 정상 배치에 정착. 서로 다른 polygon point 수를 강제로 morph하지 않음.
- 양 끝의 shape가 유효해도 한국어 줄바꿈으로 중간 slot 높이가 달라질 수 있음. 전환 중 content bounds가 invalid해지면 해당 morph를 종료하고 안전한 최종 rectangle/stack으로 정착. 같은 intent에 대한 observer 재측정은 morph를 재시작하지 않음.
- 본문 min-width는 현재 font·줄바꿈·control 측정에서 결정. Min-height는 현재 response primary 380px(두 column 400px), guidance 240px(두 column 310px), navigation 280px를 하한으로 사용하되 내용이 길면 확대. Task workspace는 두 column 440px를 출발점으로 내용/scroll 영역 확보.

### Designer가 만질 부분

Motion preview에서 enter·rise·fall·exit·peak·shade drift 조정. Layout preview에서 비율·접점·기울기·gap·radius를 숫자/slider로 조정. 자동 적응을 포함한다면 입력 내용·task 변경에 따른 실제 결과를 바로 확인.

Keyboard로 동일 값을 변경 가능. Applied 값과 draft를 구분하고 reset·export·import 제공. 이 editor는 제품 사용 flow에 나타나지 않음. 직접 경계 drag는 숫자 조정과 동일한 제약 함수를 사용.

## 6. Runtime 구조

- `motion/notification-policy.ts`: 중복·우선순위·유효성·수명 판단. DOM/GSAP 의존 없음.
- `motion/material-timeline.ts`: GSAP을 사용하는 DOM controller. React·offline HTML 공용.
- `motion/NotificationProvider.tsx`: case/context별 단일 coordinator, 활성 surface 등록, priority와 queue 소유.
- `motion/useSurfaceNotification.ts`: React lifecycle adapter. Unmount와 case 전환에서 정리.
- `adaptive-layout.ts`: 내용 제약을 만족하는 비율·접점·mode 계산. Domain import 없음.
- `layout-transition.ts`: CSS grid 비율·geometry 갱신을 한 controller로 관리. Material timeline과 분리된 channel.
- `presentation-policy.ts`: 실제 emergency/journey 변화에서 notice와 layout intent를 도출. 문구 문자열 비교가 아닌 ID/status 기반.
- `InteractionTheme.tsx`와 validation: versioned motion/layout preset. Material의 기존 storage와 독립.

React `CareSurface`와 `ResponseLayout`/`TaskLayout`은 이 contract를 사용. Framework 독립 runtime은 HTML bundle에도 그대로 포함.

## 7. E2E 적용 장면

| 변화 | Notify 대상·색 역할 | Layout intent |
|---|---|---|
| 통화 대기 → 연결 | Primary, call palette | 통화 중심; countdown tick은 제외 |
| 새 행동 안내·위험 관찰 | Guidance, safety palette | 내용 확보; 중요 event라도 입력 위치는 갑자기 이동하지 않음 |
| 말로 기록하기 진입 | 지속 pulse 없음; 기존 spectrum이 발화 반응 담당 | Workspace 확대 |
| 기록 검토·저장 완료 | 확인된 저장 결과에 1회 notice | 검토에 필요한 내용 공간 |
| 사진·영상·도식·경위서 검토 | 선택 조작마다 pulse하지 않음; 실제 결과·실패만 notify | 내용 최소 너비·높이 우선 |
| 보험사 전송 결과 | 현재 request ID에 대응하는 실제 fixture/domain 결과만 notify | Review/workspace 안정 유지 |
| 경로·대차 결과 | 해당 context 또는 workspace의 결과 영역 | 경로 중심 또는 작업 중심 |
| 실패·중단·복귀 | 실패 attention; 복귀에서는 지난 pulse 재생 없음 | 기존 읽기·focus 순서 복원 |

### Surface와 palette 연결 제안

`CareSurface`의 평시 `tone`과 일시적 `notificationPalette`를 분리. Task workspace는 평시에 plain이며 notification 동안만 material layer를 노출. Map 자체의 위치·선·text는 filter 밖에 유지.

| Event | Surface ID | Palette | Priority / gain |
|---|---|---|---|
| 통화 연결 | `response-primary` | call | notice / 1.0 |
| 새 행동 안내·위험·통화 실패 | `response-guidance` | safety | attention / 1.0 |
| 확인된 voice/photo/report 저장 | `task-workspace` | call | notice / 0.24 |
| 저장 실패·현재 보험사 요청 실패 | `task-workspace` | safety | attention / 0.36 |
| 현재 보험사 접수 확인·대차 결과 도착 | `task-workspace` | call | notice / 0.24 |
| 현재 경로 안내 결과 | `task-navigation`, 없으면 `task-workspace` | call | notice / 0.24 |

`gain`은 공용 envelope에 곱하는 surface별 최대 노출 비율. Workspaces는 사용 중인 내용의 안정성을 위해 얕게 반응. 통화 실패의 retry action은 primary에 즉시 표시하며 guidance가 주의 환기를 담당. 대차 결과 도착의 blue는 수신 사실을 알리며 eligible/unknown의 의미는 기존 문구·icon이 담당. 현재 stage에서 표시하지 않는 결과는 domain에 보존하되 hidden surface를 재생하지 않음.

Success, sent, received, unknown은 기존 의미 유지. Pulse가 끝났다는 이유로 접수 완료를 표시하지 않음. 재규 음성·수신 결과·자료 저장은 기존 flow 사용. 기존 사고 domain schema 변경 불필요.

## 8. Offline HTML과 영상

- 이미 전달한 21-screen ZIP은 보존. 새 결과는 다른 directory/version으로 출력.
- 실제 공용 component에서 생성한 편집 가능한 HTML, 공용 CSS, font/media, pinned GSAP runtime bundle 포함. CDN·localhost·ES module fetch에 의존하지 않는 classic script로 file:// 지원.
- Designer replay/seek·layout adjustment는 preview shell에 제공. 실제 호출·저장·보험사 전송으로 오해할 동작은 연결하지 않음.
- Material·motion·layout preset은 함께 export 가능. HTML을 고친 결과가 React 원본에 자동 동기화되지는 않으므로 handoff 안내에 반영 지점 명시.
- 영상은 code 검증 이후 생성. 대표 성공 여정, 실패·중단·복귀, 긴 문구·resize·입력 중 notify, motion 전용 짧은 loop를 포함.
- 녹화는 real-time 재생. 정지 phase는 screenshot용. Audio playhead와 sync는 source manifest에 기록. 동작 가능성을 영상으로만 증명하지 않음.

## 9. 품질 기준

- 기존 5 scenario/60 state와 8 journey fixture의 상태 의미·입력·저장·복귀 회귀 검증 유지.
- Layout viewport: 360/393/960/1030/1100/1440/1600/2560px. 긴 한국어, 200% text, late font, focus, IME, request race 포함.
- 정지 phase: 0/120/700/880/1420/2680/3880ms. 기본 notice 1회 total 3880ms. Attention 2회 total 5680ms.
- 모든 phase에서 text/control이 safe content 영역 안에 있고 normal gap의 목표값을 유지. Round junction에서는 기존 rounding에 따른 여유를 별도 허용하되 겹침 없음.
- Performance 목표는 검증 전 가설: 60Hz 환경의 10초 interaction에서 frame interval p95 ≤20ms, 33.3ms 초과 frame ≤5%, 자체 motion으로 발생한 50ms 초과 long task 없음. 장비·browser·DPR·viewport·cold/warm 구분 기록.
- 목표 미달 시 물리 device 성능을 주장하지 않음. 우선 texture freeze/cache·layer 수·측정 횟수 최적화. Material 표현 변경은 시각 비교 후 결정.
- Offline HTML 21개에서 runtime error·missing asset·수평 overflow 없음. Runtime bundle과 실제 제품의 preset 값 일치.
- Art review: 회색의 정적 안정감, 비대칭 pulse, 끊김 없는 중단/복귀, 공간 조정과 빛의 타이밍, text 선명도, 반복 피로도. Test 통과와 시각 품질 판단을 별도 기록.

## 10. 참고·승계

- 기존 디자인: `specs/after-care-system/design.md`와 `inventory.md`.
- Timeline: https://gsap.com/docs/v3/GSAP/Timeline/
- React lifecycle: https://gsap.com/resources/React/
- Motion values: https://motion.dev/docs/react-motion-value
- 기존 dated spec은 과거 결정의 증거로 유지. 새 적용이 승인되면 현재 정본을 가리키는 연결 문서 추가.
