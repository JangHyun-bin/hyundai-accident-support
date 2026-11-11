# Stable Voronoi Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for integration and the user-authorized A/B/C parallel streams. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 실제 Journey 1–7에서 고정된 차량 frame, 안정된 text, 읽고 조작할 수 있는 persistent editor를 제공.

**Architecture:** Host가 환경에서 frame/profile을 결정. Content slot은 endpoint에서 결정하며 surface만 GSAP으로 움직임. Main Journey·Flow preview·Catalog가 같은 contract 사용. A/B/C는 고정 contract 이후 별도 worktree에서 구현하고 integration owner가 FlowBoard를 연결.

**Tech Stack:** 기존 React19·TypeScript·GSAP·Motion·SVG/CSS·Playwright. Dependency 추가 없음.

**Spec:** `docs/superpowers/specs/2026-11-12-stable-voronoi-layout-design.md`. 색·typography는 `2026-11-12-figma-visual-contract.md`, domain은 `2026-11-11-stage-layout-preview-design.md`와 기존 JourneyCase.

## Global Constraints

- Figma 근거는 저장 snapshot2026-11-11T12:47:35Z. Live 대조 아님.
- 기존 미commit `specs/after-care-system/design.md`, `docs/superpowers/specs/2026-11-12-figma-visual-contract.md` 보존.
- Wide 차량은 1:1 panes, 2560×1440·1920×1080·1440×900 기본 text에서 bounded 필수.
- 행동28px·본문18px·보조15px·label14px 하한, text200% 확대 유지. Vehicle64×64px, 실제 mobile48×48px.
- 동일 환경에서 shell/좌우 경계 ≤1 CSS px. Frame별 width/font/줄바꿈 보간 금지.
- 1200ms geometry,1600ms calm,360ms fade 유지. 4000ms 강제 대기 제거. 최신 target으로 현재 위치부터 retarget.
- 위험·통화 facts/action은 fade하거나 기다리지 않음. 실제 editor DOM·draft·selection·media·scroll 유지.
- Storage/schema/승인 payload/retry identity/접수/call semantics와 B″·C/C_02·grain·CA 보존.
- Push/merge/영상/Figma write/실제 외부 API는 제외.

## Review Focus

- 200% text와 짧은 host에서 중요 action과 읽을 영역이 동시에 접근 가능해야 함. Task1·5 환경 matrix.
- 전환 중 typing·IME·위험 event가 겹쳐도 마지막 관찰 가능한 입력과 긴급 action 보존. Task3·5.
- 빠른 retarget·driving·resize·font 준비 후 취소된 완료 callback이 focus를 훔치지 않음. Task4·5.
- Scene 전환·follow-up·calm 복귀가 editor DOM과 replay seek를 초기화하지 않음. Task2·3·5.
- 둥근 경계·focus ring·실제 줄바꿈이 pure polygon 검사만 통과하고 잘리는 경우 방지. Task1·4·5 canvas 및 실제 frame 검증.

## S0 evidence와 결정

Baseline JSON: `/tmp/hyundai-stable-baseline.json`. 1440×900 detect shell940.83px,record1786.19px; 기록 때 overflow stack=true. 1920에서1053.38→1885.66px. 기존 text 최대 rectangle의 불연속은 spec §2.

Actual editor slot probe: `/tmp/hyundai-stable-slot-feasibility.json`. Board width672,height500에서 record slot396×452,119 core188×106. 실제 text 입력·64px action의 가로 overflow 없음. Record 전체 내용988px이므로 내부 scroll 필요. 1920 slot554×632,2560 slot765×992. 이는 실제 DOM의 공간 측정이며 rounded path 안전성 증명은 Task1/4에 별도 존재.

Priority workspace에 board의 약2/3 width와 전체 height를 먼저 예약하는 후보를 기준으로 geometry 탐색. 119 core는 오른쪽 아래 동일 anchor. 비긴급 작은 summary는 남은 영역. 기존 power diagram을 첫 후보로 평가하되 slot에 맞지 않으면 기존 inset/roundedPath로 결정적인 constrained split 사용. 자유로운 shape보다 text/control containment 우선. 면적비 차이는 기록하며 기존 geometry test는 비교용으로 보존.

## Task 1: S0 공용 contract·실패 baseline

**Files:** Create `src/design-system/flow-contract.ts`, `tests/stable-voronoi-layout.spec.ts`, 이 plan. Frontend 기준 경로는 `prototype/web/`.

**Interfaces:** `FlowFrame`은 host mode/device/width/height/contentHeight/headerHeight/metrics/revision/reason. `FlowPlan`은 endpoint layout/board size와 stable CellId별 shape·slot·variant·visibility·scroll. `FlowShapeFrame`은 shape만 보간하며 content는 포함하지 않음. 실제 선언이 정본.

- [x] 실제 Journey에서 height 증가를 측정하고 failing browser test 작성.
- [x] `npx playwright test tests/stable-voronoi-layout.spec.ts --workers=1` 실행. Shell variance assertion 실패 확인: `/tmp/hyundai-stable-red.log`.
- [x] 실제 editor와119 core 공존 가능한 slot 측정. Font/touch 축소 없음.
- [x] 계약 TypeScript 선언과 worker fixture 입력 확정. S0에서는 runtime 분기를 추가하지 않음.
- [x] Plan/contract/baseline test만 local commit. 사용자 문서는 stage하지 않음.

## Task 2: A — bounded shell·scene

**Files:** Modify `src/components/ui/after-care-layout.tsx`, `src/design-system/layout.css`, `src/design-system/SurroundingsStudy.tsx`, `surroundings-study.css`. Create `src/design-system/use-bounded-frame.ts`, `tests/bounded-frame.spec.ts`.

**Interfaces:** `VehicleShell({presentation?:'bounded',header?:ReactNode,previewHeight?:number,...existing})`; context `FlowFrameContext`. `SurroundingsScene({bounded?:boolean,...existing})`. Pure `resolveFlowFrame(input:FlowFrameInput):FlowFrame`, hook `useBoundedFrame(ref,device,previewHeight)` in owned module. Profile uses environment only. `header` is reserved status/progress/action row; simulation outside. Optional `previewHeight` is host height, not content-derived. Context provider and children identity persist across modes.

- [x] Write/run failing frame tests: environment-selected profile, 3line+control minimum, 1440/1920/2560 wide, vehicle/mobile touch distinction,200% document exception without stage input.
- [x] Implement measured font metric/host sizing and reserved rows. Width split1:1; height from host; `min-height:0` chain. Reserve urgent row independent of current alert.
- [x] Scene opt-in bounded fit and internal detail scroll. Keep standalone view and replay lifetime.
- [x] Test same host with long mock content and all scene modes; check `tsc --noEmit`. Expected: no shell size change, no scene loss.
- [x] Commit owned files only; report port/cache/output and tests.

## Task 3: C — real content·scroll·focus

**Files:** Modify `src/journey/JourneyFlow.tsx`, `journey-flow.css`, `JourneyStudy.tsx`; necessary editor wrappers explicitly list before editing. Test `tests/journey-stable-editor.spec.ts`.

**Interfaces:** Task2 shell props; FlowBoard adds `device?:Device`, unchanged renderCell API. `FlowFrameContext` supplies mode. `journey-flow-workspace` stable DOM, one bounded body scroll. FlowBoard owns shape/content presentation; C owns focus and semantic workspace. Selector `.fs-cell-body` is slot; `.journey-workspace-scroll` is active editor body. Fixed 119 core wrapper `.fs-call-core`, decorative number/spectrum separate.

- [x] Write/run failing draft/selection/scroll tests for BACK/risk/context and no document scroll on step changes.
- [x] Move progress/action/risk into shell header, simulation outside. Preserve minimum header text/action access; no sticky overlap.
- [x] Add internal scrolling and stable title/actions as real editor structure permits. No clone/reparent/remount on profile/stage.
- [x] Retain focus in active input; focus visible heading only after genuine task change. Scroll own body only. Preserve observable IME value before urgent hide; no new domain state.
- [x] Narrow context switch retains scene instance and critical call/actions. Scene toggle cannot trigger record save/remount.
- [x] Run owned regression and existing representative/voice/review tests, `tsc --noEmit`; commit owned changes.

## Task 4: B and integration — content-first geometry·renderer

**B files:** `src/design-system/flow-plan.ts`, narrowly necessary `flow-geometry.ts` exports, `tests/flow-plan.spec.ts`. No FlowBoard edit.
**Integration files:** `FlowBoard.tsx`, `flow-study.css`, `FlowStudy.tsx`, `DesignSystemCatalog.tsx`, common contract, `tests/stable-voronoi-motion.spec.ts`.

**Interfaces:** B `createFlowPlan(layout:FlowLayout,width:number,height:number,frame:FlowFrame):FlowPlan`; `flowShapes(plan):FlowShapeFrame`; `sampleFlowShapes(from:FlowShapeFrame,to:FlowShapeFrame,progress:number):FlowShapeFrame`. Shapes in board CSS px, path local to own bounds. Stable all4cell keys, null absent shape. Slot rect board CSS px. Critical slot unchanged within environment. Root mutates shape DOM and content translate with one GSAP owner; React content not regenerated every frame.

- [x] B write/run failing deterministic endpoint and rounded containment tests; initial power candidate versus usable slot evidence; document chosen area ratios.
- [x] B implement pure endpoint plan with content first, actual rounded boundary check, stable topology/safe intermediate shapes and interrupted paths. Wide Voronoi; narrow/mobile rectangular workspace. No perframe maximum-content optimizer.
- [x] B run dense path/retarget samples and geometry regression; commit owned changes.
- [x] Integration write/run normal-motion failure test requiring≥10intermediate RAF frames and ≤1px boundaries/font/linebreak stability.
- [x] Replace weight React updates/overflow-stack observer/4000ms queue. Freeze content slot/variant during transition; translate if safe. Otherwise opacity0 commit once for noncritical content. Emergency core always visible and fixed. Generation ignores stale callbacks; resize/font/reduced-motion commit valid final plan.
- [x] Connect A/B/C; preview and Catalog use same bounded host. Production route and standalone old shell callers unchanged.
- [x] Preserve readout with actual area ratios. Retire obsolete content-driven fallback assertions with equivalent reachability/readability checks.
- [x] Run focused state/geometry/browser tests; commit integration.

## Task 5: S3/S4 verification·independent review

**Files:** Relevant tests above, append-only result document `docs/superpowers/results/2026-11-12-stable-voronoi-layout.md`; metrics/screenshot/trace in ignored audit directory.

- [x] Matrix: vehicle2560×1440,1920×1080,1440×900,1280×720,960×900,393×852; actual mobile393×852,360×800. Text100/200%, profile/reason recorded.
- [x] Real normal-motion detect/evacuate/safe/review/sending/calm and rapid reverse: ≥10actual RAF samples each. Heights/anchors≤1px, stable line counts/fonts, actual rounded path text/control/focus-ring containment. Save JSON and screenshot strip; inspect images.
- [x] Actual voice listening/review/add, photo, long Korean/report/recipient/payload,textarea resize, keyboard/IME,failed retry/BACK/risk/call hold,scene front/replay seek,follow-up/calm return.
- [x] Font delay/resize/reduced toggle/driving pause and resume; no stale callbacks or scroll changes. Browser trace for shape/style/layout/paint. No unsupported hardware FPS claim.
- [x] `npx tsc --noEmit`, `npm run check`, `npx playwright test --workers=4` redirected logs. Expected all pass; inspect test coverage before treating green as completion.
- [x] Fresh independent whole-change review against spec and evidence; close important findings with reproducing regression and verification.
- [x] Requirement-by-requirement completion audit. Local commits only, existing user files unchanged, localhost5173 remains. Record URL, evidence, limitations.

## Execution tracking

User explicitly authorized continuous execution and3parallel streams; no extra plan approval stop. S0 serial, A/B/C separate worktrees with isolated Vite cache/ports/test outputs, root integration serial. Progress ledger `.superpowers/sdd/2026-11-12-stable-voronoi-layout/progress.md`. Fresh review after a stream releases a slot.

## 2026-11-12 실행 결과와 전달 범위 변경

전체 gate 완료. 최종 TypeScript·production build·389/389 tests 통과. 독립 review의5finding closure 완료. 상세 evidence는 `../results/2026-11-12-stable-voronoi-layout.md`에 기록.

최신 사용자 요청에 따라 초기 local-only 조건을 변경하여 branch push·PR·검증 조건 충족 후 merge까지 진행. 기존 사용자 미commit 문서2개는 계속 제외하며 localhost5173 유지.
