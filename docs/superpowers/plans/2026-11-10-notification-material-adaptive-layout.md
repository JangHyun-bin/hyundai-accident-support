# Notification Material & Adaptive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 평시 회색 surface가 필요한 순간에만 유려한 빛으로 반응하며, B / Three cells와 작업 공간이 내용·작업·가용 공간에 적응하는 전역 UI를 React·HTML·영상까지 일관되게 구현.

**Architecture:** Domain의 확정된 변화에서 presentation intent를 도출하고, framework 독립 GSAP controller가 material을 재생. Adaptive solver는 내용 제약 안에서 비율·접점·기울기를 결정하고 공용 layout이 실제 배치와 background 경계를 함께 갱신. React adapter와 offline HTML adapter가 동일 runtime/preset 사용.

**Tech Stack:** React 19 / TypeScript / Vite, GSAP + `@gsap/react`, 기존 Motion 14.9.1와 native WAAPI, SVG/CSS material, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-notification-material-adaptive-layout-design.md`

## Global Constraints

- 현재는 planning only. 기존 paused goal을 재개하거나 제품 code·전달 ZIP을 변경하는 작업은 이 문서 작성에 포함하지 않음.
- 기준 worktree `/Users/janghyunbin/.codex/worktrees/dcbb/hyundai-accident-support`, 기준 commit `866b810`. 실행 시작 시 다시 status와 source drift 확인.
- Adaptive 자동/수동 범위는 미확정. 아래 Task 3–5의 task intent 정책과 editor 범위는 design draft의 제안을 사용하며, 실행 전 사용자 답변 반영 필요.
- 기본 surface `#18181c`, text `#f4f4f8`, gap 16px, radius 28px, main share 0.50, seam 4°, touch 48px 이상.
- Grain 12%, size .8px, clumping 12%, tone 75%, seed 303; CA 1px, angle 0°. C/C_02와 기존 적용 theme 보존.
- 기본 notice 700 + 180 + 540 + 1260 + 1200 = 3880ms. Attention은 pulse 2회로 5680ms. 값은 초기 art direction이며 Task 1에서 실제 비교 후 문서와 preset을 함께 갱신.
- Text·icon은 material filter 밖. Notify pulse 자체는 layout 변경 trigger가 아님.
- Reduced motion: 즉시 정적 강조 1600ms, 이동·pulse 없음. Hidden/offscreen/suspend에서 idle 정착, 지난 event 몰아 재생 없음.
- 통화 연결·자료 전송·보험사 접수·현장 도착 의미 유지. Animation이 domain 결과·실제 전화·전송을 발생시키지 않음.
- 새 dependency는 설치 시 공식 package metadata와 peer 호환을 확인하고 exact version을 package-lock에 고정. Network asset/CDN runtime 금지.
- 기존 dated spec·plan은 일괄 변경하지 않음. 이 문서와 새 결과에서 승계 관계 기록.
- 각 Task의 commit은 승인된 실행 단계에서만 수행. 현재 planning 요청으로 commit·push·PR·merge를 수행하지 않음.

## Review Focus

1. Hydration·case 전환·늦은 request 결과: 지난 통화·접수 notification이 재생되지 않아야 함. Task 2/6/7에서 검증.
2. Notify 중 연속 event·hidden·reduced-motion 변경: 기존 timeline이 남거나 빛이 갑자기 초기화되지 않아야 함. Task 1/2에서 검증.
3. 긴 한국어·200% text·late font·좁은 container: text와 control이 slanted edge를 침범하지 않아야 함. Task 3/4에서 검증.
4. IME·pointerdown·recording 중 priority 변경: 입력 대상이 이동하거나 녹음이 끊기지 않아야 함. Task 4/7에서 검증.
5. 편집 HTML의 file://·malformed preset·media·runtime version: React와 다른 motion이나 asset 누락이 없어야 함. Task 5/8에서 검증.

## 작업 순서와 검토 단위

`1 실제 motion → 2 event 정책 → 3 geometry 제약 → 4 adaptive 전환 → 5 조정 editor → 6 emergency → 7 journey → 8 HTML → 9 E2E·영상`

추천 실행은 이 순서의 sequential 작업. 앞 단계의 시각·interface 결정이 다음 단계에 직접 영향을 줌. 전역 적용 전 Task 1에서 한 block, Task 4에서 실제 Three cells를 확인 가능한 상태로 제공.

Task 3의 순수 geometry 검증은 Task 2와 기술적으로 병행 가능하지만, 같은 shared layout 파일에 여러 구현자가 동시에 쓰지 않도록 ownership 분리 필요. 현재 별도 실행 방식은 선택되지 않은 상태.

## 파일별 책임

모든 아래 `src/`, `tests/`, `scripts/` 경로는 `prototype/web/` 기준.

| 파일 | 책임 |
|---|---|
| `src/design-system/motion/notification-types.ts` | Notice·preset·controller 공용 type |
| `src/design-system/motion/material-timeline.ts` | GSAP envelope·중단·seek·정리 |
| `src/design-system/motion/notification-policy.ts` | Dedup·우선순위·queue·case/context 수명 |
| `src/design-system/motion/NotificationProvider.tsx` | 한 화면의 coordinator, surface 등록 |
| `src/design-system/motion/useSurfaceNotification.ts` | React DOM binding과 cleanup |
| `src/design-system/adaptive-layout.ts` | Layout intent와 minimums로 feasible target 계산 |
| `src/design-system/layout-measure.ts` | Slot/text/control bounds 읽기, safe-zone 검증 |
| `src/design-system/layout-transition.ts` | 실제 grid 비율·공유 geometry의 전환 |
| `src/design-system/split-geometry.ts` | 기존 geometry 확장, gap/radius/tilt/junction |
| `src/design-system/interaction-presets.ts` | JSON validation·저장·import/export |
| `src/design-system/InteractionTheme.tsx` | 적용 motion/layout 설정 provider |
| `src/design-system/InteractionStudy.tsx` + `.css` | 실제 component로 motion·layout 비교/editor |
| `src/emergency/presentation-policy.ts` | Emergency 상태 ID → notice/layout intent |
| `src/journey/presentation-policy.ts` | Journey의 현재 결과·commit → presentation |
| `src/handoff/interaction-runtime.ts` | Offline DOM adapter; 같은 pure runtime 사용 |
| `scripts/export-editable-html.mjs` | 21개 화면과 local runtime/assets의 재현 가능한 export |
| `scripts/record-interaction-study.mjs` | Controlled replay·대표 장면 영상과 metadata |

기존 `CareSurface`, `ResponseLayout`, `TaskLayout`, `SurfaceEffectsLayer`, catalog, main router, emergency/journey 화면은 각 Task에서 연결. Domain reducer 재작성은 범위 밖.

---

### Task 1: 한 block에서 완성도 있는 빛의 lifecycle 구현

**Files:** Create `src/design-system/motion/notification-types.ts`, `material-timeline.ts`, `src/design-system/InteractionStudy.tsx`, `interaction-study.css`; Modify `src/main.tsx`, `src/components/ui/surface-effects.tsx`, `surface-effects.css`, `prototype/web/package.json`, `package-lock.json`; Test `tests/material-motion.spec.ts`.

**Interfaces:**
- `SurfaceNotice = {id:string; caseId:string; contextKey:string; surfaceId:string; level:'notice'|'attention'; material:'call'|'safety'; gain:number; occurredAt:number; expiresAt:number}`.
- `MotionPreset = {enterMs:number; chromaDelayMs:number; settleMs:number; riseMs:number; fallMs:number; exitMs:number; peak:number; shadePx:number}`.
- `MaterialSnapshot = {phase:'idle'|'entering'|'pulsing'|'exiting'; elapsedMs:number; exposure:number; chroma:number; shadeX:number}`.
- `createMaterialTimeline(root:HTMLElement, preset:MotionPreset, onComplete:()=>void): MaterialController`.
- `MaterialController`: `play(level,gain=1)`, `dismiss()`, `seek(ms)`, `setReducedMotion(reduce)`, `snapshot():MaterialSnapshot`, `dispose()`.

- [ ] **1. 상태 경계 검증 작성:** `tests/material-motion.spec.ts`에 `idle is neutral`, `phase envelope is deterministic`, `retarget starts from current values`, `reduced motion switches while playing`, `dispose cancels callbacks` 작성. 초기 idle에서는 exposure/chroma/shadeX=0, normal notice 3880ms 후 idle, reduced에서는 pulse 없이 1600ms 후 idle assertion. `seek(1420)`에서 pulse peak, `seek(2680)`에서 exit 시작.
- [ ] **2. 실패 확인:** `npx playwright test tests/material-motion.spec.ts` 실행. Study/controller 부재로 실패하는 assertion 확인.
- [ ] **3. Dependency와 runtime 구현:** GSAP/React peer metadata 확인 후 exact install. Classic DOM controller에 timing 구현, React adapter에서 cleanup. Material layer 아래 neutral base, text/icon 밖에서 exposure/chroma/shade만 변경. Grain texture는 transition 동안 고정하고 resize settle에서만 재생성. 임의 per-frame React state 사용 금지.
- [ ] **4. 비교 화면 연결:** DEV `/?study=interaction`에서 실제 `CareSurface` 한 개에 play·interrupt·replay·seek·reduced-motion 조작 제공. 같은 값에서 blue/copper 비교. Study seek는 화면 값만 이동시키고 완료 callback·queue 소비를 실행하지 않음. 이 단계에서는 제품 default를 바꾸지 않음.
- [ ] **5. 검증:** 위 spec + `npx playwright test tests/optical-materials.spec.ts` + `npm run check`. 실제 속도 영상과 0/120/700/880/1420/2680/3880ms screenshot으로 art direction 확인. Timing을 바꾸면 spec·preset·test 기대값 함께 갱신.
- [ ] **6. Commit:** 이번 Task 파일만 stage. `feat(motion): add notification material timeline study`.

### Task 2: Notification 수명과 React lifecycle 연결

**Files:** Create `src/design-system/motion/notification-policy.ts`, `NotificationProvider.tsx`, `useSurfaceNotification.ts`; Modify `InteractionStudy.tsx`; Test `tests/notification-policy.spec.ts`, `tests/material-motion.spec.ts`.

**Interfaces:**
- Consumes Task 1의 `SurfaceNotice`, `MaterialController`.
- `NoticeState = {caseId:string; contextKey:string; active:SurfaceNotice|null; queued:SurfaceNotice|null; seenIds:ReadonlySet<string>; visible:boolean}`.
- `NoticeEvent = {type:'notify';notice:SurfaceNotice} | {type:'complete';id:string} | {type:'context';caseId:string;contextKey:string} | {type:'visibility';visible:boolean} | {type:'invalidate';ids:readonly string[]}`.
- `reduceNotices(state:NoticeState,event:NoticeEvent,now:number):NoticeState`.
- Provider API `notify(notice)`, `invalidate(ids)`, `setContext(caseId,contextKey)`; hook `useSurfaceNotification(surfaceId:string):RefObject<HTMLDivElement|null>`.

- [ ] **1. 실패 test 작성:** 같은 ID 2회, lower priority 중 attention, active 중 같은 surface 새 event, queue 3초 만료, 다른 case/context, 현재 결과와 달라진 ID invalidate, hidden 후 복귀를 순수 reducer와 browser에서 검증. Queue 길이 ≤1, 한 context active ≤1, case 전환 시 seen/active/queue 초기화, hidden 전 event 복귀 재생 없음.
- [ ] **2. 실패 확인:** `npx playwright test tests/notification-policy.spec.ts tests/material-motion.spec.ts`.
- [ ] **3. Policy/controller 연결:** Provider scope는 JourneyStudy의 case 단위 한 제품 화면. 현재 hidden으로 유지하는 record/review/follow-up은 active stage일 때만 surface 등록. Standalone EmergencyStudy와 catalog preview는 독립 scope. 같은 surface retarget은 현재 값 연속, 다른 surface는 이전 material을 최대 240ms에 exit시킨 뒤 재생. Seen IDs는 같은 case의 stage 이동 동안 유지. Async 완료는 notice ID가 일치할 때만 다음 event로 이동. Cleanup에서 GSAP·observer·listener 모두 해제.
- [ ] **4. 검증:** 위 test 통과. Hidden stage에 결과가 도착해도 hidden surface controller가 시작하지 않는지 확인. StrictMode mount/unmount 20회 후 timeline/controller 수가 처음 수준으로 복귀. Idle에서 자체 RAF·반복 timer·grain 생성이 남지 않는지 instrumentation 확인.
- [ ] **5. Commit:** `feat(motion): coordinate scoped notification lifecycles`.

### Task 3: 내용이 들어가는 adaptive geometry 계산

**Files:** Create `src/design-system/adaptive-layout.ts`, `layout-measure.ts`; Modify `split-geometry.ts`; Test `tests/adaptive-geometry.spec.ts`, `tests/design-system-layout.spec.ts`.

**Interfaces:**
- `LayoutIntent = 'balanced'|'call'|'workspace'|'navigation'`.
- `LayoutPreset = {mainShare:number;gap:number;radius:number;tiltDeg:number;junctionBias:number;adaptive:boolean}`.
- `LayoutRequest = {kind:'response'|'task';width:number;rootFontPx:number;intent:LayoutIntent;minimums:{main:number;context:number};preset:LayoutPreset;interactionLocked:boolean;previous:LayoutSolution|null}`.
- `LayoutSolution = {mode:'columns'|'rectangles'|'stack';mainShare:number;gap:number;radius:number;tiltDeg:number;junctionBias:number;clamped:boolean}`.
- `resolveLayout(input:LayoutRequest):LayoutSolution`; `measureLayout(root:HTMLElement):LayoutMeasurements`; `validateContentBounds(root:HTMLElement,shapes:ResponseShapes):string[]`.
- 기존 `responseShapes(width,slots,gap=16,options?)`에 `options:{radius?:number;tiltDeg?:number;junctionBias?:number}` 추가. 생략하면 기존 B geometry 유지.

- [ ] **1. 실패 test 작성:** balanced 0.50, call 0.56, workspace 0.58, navigation 0.44 후보; feasible interval을 벗어난 요청 clamp; 60rem 미만 stack; gap 12/16/24와 radius 20/28/40; seam 0/4/8°; junction bias 경계; 폭 0과 degenerate edge에서 NaN/Infinity path 없음. 인접 cell overlap 없음과 shared normal gap을 검사.
- [ ] **2. 실패 확인:** `npx playwright test tests/adaptive-geometry.spec.ts`.
- [ ] **3. Pure solver 구현:** Available width에서 gap과 minimums를 뺀 feasible share interval 계산. Empty interval이면 stack. Intent 적용 전 interaction lock 확인. Shape safe-zone이 불가능하면 bias/tilt 축소 후 rectangle fallback. Visible content를 삭제하거나 text size를 줄여 fit하지 않음.
- [ ] **4. 측정 구현:** Slot과 text Range/control rect 읽기를 batch. 측정 결과는 0.5px 미만 차이를 안정화해 반복 계산 방지. Background absolute layer write가 slot measurement를 바꾸지 않도록 분리. Late font와 내용 변경을 명시적으로 다시 측정.
- [ ] **5. 검증:** 위 spec + 기존 `tests/design-system-layout.spec.ts`. Long Korean·200% text·late font에서 text/control rect가 shape 안에 들어오는지 확인. 결과가 불가능한 경우 명시한 fallback으로 읽기 순서 유지.
- [ ] **6. Commit:** `feat(layout): resolve adaptive cell geometry within content bounds`.

### Task 4: 실제 공간과 공유 경계를 함께 부드럽게 조정

**Files:** Create `src/design-system/layout-transition.ts`; Modify `src/components/ui/after-care-layout.tsx`, `src/design-system/layout.css`, `InteractionStudy.tsx`; Test `tests/adaptive-layout.spec.ts`, `tests/design-system-layout.spec.ts`.

**Interfaces:**
- Consumes Task 3의 solver·measurements·geometry.
- `createLayoutTransition(root:HTMLElement,onSettled:()=>void):LayoutController`.
- `LayoutController`: `setTarget(target:LayoutSolution,{animate:boolean}):void`, `setInteractionLocked(locked:boolean):void`, `dispose():void`.
- `ResponseLayout`/`TaskLayout` props에 `layoutIntent?:LayoutIntent` 추가, 기본 balanced. 기존 slot과 DOM 순서 유지.

- [ ] **1. 실패 E2E 작성:** balanced→call→workspace, 560ms 전환 중 resize, 연속 target 교체, focus/IME/pointerdown 상태, 60rem 경계 이동. 0/25/50/75/100%에서 gap·text/control 포함·finite path 검증. Text subtree에 scale/skew transform 없음. 입력 value·selection·focus 보존. Notify pulse만 재생할 때 slot bounds 불변. 양 끝은 valid지만 중간 줄바꿈이 invalid한 fixture에서 fallback 1회 후 정착하고 morph 재시작 없음.
- [ ] **2. 실패 확인:** `npx playwright test tests/adaptive-layout.spec.ts`.
- [ ] **3. Controller와 공용 layout 연결:** GSAP이 제한된 grid 비율 변수를 보간. Slot 측정 후 같은 shared geometry로 모든 material path 갱신. Material exposure는 별도 controller가 소유. 매 frame React setState 대신 DOM geometry write 사용. 한 frame당 측정 batch 1회, background write가 ResizeObserver loop를 만들지 않음.
- [ ] **4. 중단·fallback 처리:** Priority-only 변화는 IME/input focus/pointerdown 중 보류하고 latest target 하나만 보관. Viewport와 overflow 대응은 보류하지 않음. Stack/columns topology 전환은 즉시 정상 배치로 변경하며 text를 왜곡하지 않음. 전환 중 줄바꿈·font·content 변경으로 safe bounds가 깨지면 morph 종료 후 안전한 최종 rectangle/stack으로 정착. Observer에 의한 동일 target 재측정으로 재시작하지 않음. Reduced motion에서 layout은 최종 상태로 즉시 적용.
- [ ] **5. 검증:** 위 test + 기존 layout/emergency/journey design specs. Single block 다음으로 실제 Three cells와 Task workspace를 study에서 비교. Geometry settle 중 grain 재생성 횟수는 시작/종료 수준으로 제한, 중간 frame마다 생성하지 않음.
- [ ] **6. Commit:** `feat(layout): animate shared cell adjustments without distorting content`.

### Task 5: Motion·layout을 조정하고 저장하는 공용 editor

**Files:** Create `src/design-system/interaction-presets.ts`, `InteractionTheme.tsx`; Modify `InteractionStudy.tsx`, `interaction-study.css`, `ResponseSurfaceStudy.tsx`, `DesignSystemCatalog.tsx`, `main.tsx`; Test `tests/interaction-presets.spec.ts`.

**Interfaces:**
- `InteractionPreset = {version:1;name:string;motion:MotionPreset;layout:LayoutPreset}`.
- `readInteractionPreset(value:unknown):InteractionPreset`는 유효하지 않으면 설명 가능한 error.
- `applyInteractionPreset(value:unknown):{ok:boolean;error:string}`; `useInteractionTheme():InteractionPreset`.
- Storage: `after-care-interaction-draft-v1`, `after-care-interaction-applied-v1`. 기존 material storage key는 그대로 유지.

- [ ] **1. 실패 test 작성:** preset import/export round trip, 잘못된 version·NaN·음수시간·범위 초과·storage quota 실패; C/C_02 byte 동일 유지; draft 변경으로 product 미변경; explicit apply 후 같은/다른 tab 갱신; reset이 저장된 library를 삭제하지 않음.
- [ ] **2. 실패 확인:** `npx playwright test tests/interaction-presets.spec.ts`.
- [ ] **3. 검증·provider 구현:** Timing range enter 300–1200, delay 0–250이며 delay<enter, settle 0–400, rise 300–900, fall 700–2000, exit 600–1800ms. Peak .4–1, shade 0–2px. Layout은 spec 범위. Corrupt storage를 자동 덮어쓰지 않음.
- [ ] **4. Editor 완성:** 실제 component에서 play/stop/replay/seek, 기본·긴 문구, viewport, task intent, before/after 동시 비교. 비율·기울기·접점·gap·radius 입력. 자동 적응 선택은 사용자 답변 반영. Boundary drag를 포함할 경우 keyboard numeric input과 동일 solver 사용. Editor controls는 product flow 밖에 배치.
- [ ] **5. 검증:** 위 spec과 기존 material/editor tests. Export JSON을 다른 browser context에 import해 동일 시각 phase·geometry 재현 확인.
- [ ] **6. Commit:** `feat(design): add shared motion and adaptive layout presets`.

### Task 6: Emergency의 실제 상태 변화에 연결

**Files:** Create `src/emergency/presentation-policy.ts`; Modify `src/emergency/EmergencySurface.tsx`, `EmergencyStudy.tsx`, `src/components/ui/after-care.tsx`, `after-care.css`, `src/design-system/ResponseLayoutPreview.tsx`; Test `tests/emergency-notification.spec.ts`, 기존 emergency specs.

**Interfaces:**
- `PresentationDelta = {notices:SurfaceNotice[];invalidatedIds:string[];layoutIntent:LayoutIntent}`를 `src/design-system/motion/notification-types.ts`에 추가.
- `deriveEmergencyPresentation(previous:Session|null,next:Session,context:{caseId:string;origin:'hydrate'|'transition';now:number}):PresentationDelta`.
- `CareSurface`에 `surfaceId?:string`, `notificationPalette?:'call'|'safety'` 추가. `tone`은 평시 surface 역할; 일시적 palette와 gain은 spec §7 mapping으로 결정. Default idle 회색. Study의 material 편집에는 명시적 preview 조명 옵션 사용.

- [ ] **1. 실패 test 작성:** manifest의 전체 state가 유효한 mapping을 갖는지; 연결 event 1회; countdown 매 tick은 0회; 같은 scene rerender 0회; hydrate connected 0회; 새 위험 attention; 실패→재시도 중 이전 notice 제거; animation 전 critical action 사용 가능.
- [ ] **2. 실패 확인:** `npx playwright test tests/emergency-notification.spec.ts`.
- [ ] **3. Adapter와 default 연결:** Title 문자열이 아닌 manifest scenario/scene ID와 status 변화 사용. 기존 unknown/callConnected 표현의 의미 유지. Domain reducer·deadline timer·audio를 timeline callback으로 옮기지 않음. Catalog 임의 장면 표시는 static이며 replay는 명시적으로 제공.
- [ ] **4. 검증:** `npx playwright test tests/emergency-notification.spec.ts tests/design-system-emergency.spec.ts tests/emergency-motion.spec.ts tests/emergency-complete.spec.ts`. 평시 회색·enter·peak·return screenshot. 기존 colored baseline은 승인된 새 default에 한해 근거와 함께 갱신.
- [ ] **5. Commit:** `feat(emergency): drive attention surfaces from semantic transitions`.

### Task 7: 전체 journey와 비동기 결과를 연결

**Files:** Create `src/journey/presentation-policy.ts`; Modify `JourneyStudy.tsx`, `JourneyLayout.tsx`, 필요한 경우 `VoiceRecordPanel.tsx`, `EvidencePanel.tsx`, `JourneyReviewPanel.tsx`, `FollowUpPanel.tsx`의 결과 callback; Test `tests/journey-notification.spec.ts`, `tests/journey-adaptive.spec.ts`.

**Interfaces:**
- `JourneyPresentationContext = {origin:'hydrate'|'transition';now:number;saveOutcome?:{ok:boolean;caseId:string;operationId:string;generation:number;kind:'voice'|'photo'|'report'}}`.
- `deriveJourneyPresentation(previous:JourneyCase|null,next:JourneyCase,context:JourneyPresentationContext):PresentationDelta`.
- 저장 완료 notice는 실제 `CommitResult.ok`와 현재 case ID 일치 조건으로만 발생. 사용자 작업 시작 시 operationId/generation을 부여해 await 결과와 연결. No-op flush·hydrate·자동 재저장 제외. Request 결과는 기존 `activeSubmissionIds`/routeRequest/rentalRequest의 identity 계약 사용.

- [ ] **1. 실패 E2E 작성:** response→vehicle→voice→photo→clip→diagram→report→보험사 검토/결과→follow-up. 실제 성공 저장 1회, failed commit 성공 notice 0회, typing 0회, recording 중 layout focus 유지, 현재 request와 다른 늦은 결과 0회, 다른 case와 suspend/resume 후 과거 pulse 0회.
- [ ] **2. 실패 확인:** `npx playwright test tests/journey-notification.spec.ts tests/journey-adaptive.spec.ts`.
- [ ] **3. Adapter 연결:** Spec §7의 surface ID/palette/gain mapping 그대로 연결. Workspace의 평시 tone은 plain, 일시적 notification material은 gain 0.24(실패 0.36). 한 번 반응하고 회색 복귀. Hidden stage에는 재생하지 않음. Record/review는 workspace intent, 실제 route preview는 navigation intent. 직전 상태 비교만으로 optimistic 저장 성공을 추론하지 않음. 신규 notification의 consumed ID를 사고 record에 영구 저장하지 않음.
- [ ] **4. 검증:** 위 specs + 기존 `journey-flow`, `journey-save-recovery`, `journey-storage`, `journey-submission`, `journey-voice`, `journey-follow-up` specs. Scene·stage가 바뀌어도 진행 중 audio/media·입력 보호가 유지되는지 확인.
- [ ] **5. Commit:** `feat(journey): integrate notification materials and adaptive workspaces`.

### Task 8: 편집 가능한 offline HTML에도 동일 runtime 전달

**Files:** Create `src/handoff/interaction-runtime.ts`, `scripts/export-editable-html.mjs`, `scripts/build-handoff-runtime.mjs`, `tests/html-handoff.spec.ts`; Modify `package.json`; Reference `/tmp/after-care-html-export.mjs`의 현재 21-screen export. 기존 Downloads 파일은 수정하지 않음.

**Interfaces:**
- `mountHandoff(root:HTMLElement,preset:InteractionPreset):{replay(surfaceId:string,level:'notice'|'attention'):void;seek(ms:number):void;setLayout(intent:LayoutIntent):void;dispose():void}`.
- `npm run export:html -- --out <new-directory>`: 실제 화면 DOM·CSS·font·media + classic IIFE runtime + preset JSON + README + manifest 출력.
- Manifest: source commit, dirty 여부, runtime/preset SHA-256, screen IDs, asset 경로/hash. Case data는 synthetic fixture만 사용.

- [ ] **1. 실패 검증 작성:** file://에서 network offline 21개 화면 열기; runtime/assets/font/media 로딩; replay/seek; 393/1440px; 공용 theme·preset 변경 반영; React와 HTML 동일 phase snapshot의 material 값/geometry 비교. API key/localhost/CDN 참조 scan.
- [ ] **2. 실패 확인:** Export command와 bundle 부재를 확인. Test가 제품 server로 우회하지 않도록 file:// URL assertion.
- [ ] **3. Export 정식화:** 임시 exporter의 hard-coded machine path를 제거하고 repo 상대 경로/명시적 out 사용. GSAP을 local classic bundle에 포함하고 package license notice 동봉. Browser fetch로 preset JSON을 읽지 말고 inline JSON 또는 classic configuration script 사용. 실제 mutable editing HTML 유지, minified runtime만 별도 파일.
- [ ] **4. 검증:** `npm run export:html -- --out /tmp/after-care-notification-handoff`, `npx playwright test tests/html-handoff.spec.ts`. Guidance·voice·clip 실제 playback 확인. 기존 전달 ZIP 불변 hash 확인. README에 편집 위치·정적 모형의 기능 범위·원본 반영 방법 기록.
- [ ] **5. Commit:** `feat(handoff): export editable screens with shared interaction runtime`.

### Task 9: E2E·성능·영상·전달 근거 완성

**Files:** Create `scripts/record-interaction-study.mjs`, `tests/interaction-performance.spec.ts`, `evidence/notification-layout/manifest.json`; Modify 기존 `scripts/record-journey-flow.mjs`, `record-emergency-flow.mjs`의 필요한 playback 선택 부분만. 새 검증 결과 문서 `docs/reviews/2026-11-10-notification-layout.md`.

**Interfaces:** 앞 Task들의 실제 product/study routes와 public controls 사용. Test 전용으로 product state를 성공으로 조작하는 우회 금지.

- [ ] **1. 전체 검증:** `npm run check`, `npx playwright test`, repo root에서 `node --test specs/emergency-experience/manifest.test.mjs`. 기존 기능과 새 motion/layout 모두 통과. 현재 suite 수는 실행 결과에서 기록하며 과거 수를 그대로 완료 근거로 사용하지 않음.
- [ ] **2. 성능 측정:** 60Hz reference에서 10초 interaction. Device/browser/DPR/viewport/cold-warm과 frame histogram 기록. 목표 p95≤20ms, >33.3ms ≤5%, motion 기인 >50ms long task 0. Target vehicle GPU 검증은 별도 Not verified. Idle에서 texture 생성·자체 frame loop가 사라지는지 확인.
- [ ] **3. 시각 검증:** 360/393/960/1030/1100/1440/1600/2560px, 200% text, keyboard, IME, reduced motion. 단일 block→Three cells→실제 journey 순서로 실제 속도 검토. 기하학·timing·noise·읽기 안정성의 관찰 기록.
- [ ] **4. 영상 생성:** Code 검증 후 성공 여정, 실패/복귀, adaptive stress, 12–20초 material loop 생성. Loop는 검토용 영상이며 제품 idle에서 반복하지 않음. 실시간 재생이며 seek freeze는 별도 still 자료. 출력 MP4를 ffprobe와 실제 재생으로 확인. 재규 audio는 재생한 clip·시간을 manifest에 기록.
- [ ] **5. Handoff 생성:** 새로운 version directory와 ZIP에 21개 HTML, common runtime, preset, README, preview, 검증 요약 포함. ZIP integrity와 screen count 확인. 원본 UI 변경 내용을 HTML에 재반영한 후 최종 hash 기록.
- [ ] **6. 결과 감사:** Source commit과 dirty 여부, package/runtime version, test 결과, 미검증 환경을 manifest에 연결. 실제 결과가 없는 항목을 완료로 표기하지 않음. 승인된 실행 방식의 최종 review 수행. Push·PR·merge는 그 시점의 사용자 지시 범위에서 별도 진행.
- [ ] **7. Commit:** `test(design): verify notification and adaptive layout end to end`.

## 완료 기준과 계획 검토

- [ ] 제품 default 회색, 의미 있는 event에만 유려한 색·pulse·복귀.
- [ ] 기본 B 형태를 유지하며 내용·화면·작업에 맞는 공간 조정. 입력 중 안정성과 fallback 확인.
- [ ] Motion/layout/material preset과 editor가 제품·catalog·HTML에서 동일하게 작동.
- [ ] 실제 사용자 조작 flow, 실패·중단·복귀, offline HTML, real-time 영상 검증 근거 존재.
- [ ] Adaptive 자동/수동 범위에 대한 사용자 답변을 spec/Task 3–5에 반영.

문서 자체 검토: 각 spec의 요구는 Task 1–9에 연결. Review Focus의 다섯 실패 조건은 해당 Task의 test에 배치. Controller·preset·intent 이름은 Interfaces에서 공유. 실행하지 않은 test와 생성하지 않은 영상은 모두 미완료 checkbox 유지.
