# AFTER / CARE Global Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 승인된 B를 전역 design system으로 구현하고 전체 scenario·음성·E2E 영상·PR 완성.

**Architecture:** 기존 domain reducer와 persistence를 유지하며 공용 token·primitive·responsive layout으로 frontend 이동. Catalog와 editor는 제품 component를 직접 사용. Surface draft와 적용 theme는 별도로 보관.

**Tech Stack:** 기존 React 19, TypeScript, Vite, Tailwind 4, Lucide, Playwright, local Asta, SVG/Canvas, ElevenLabs, ffmpeg.

**Spec:** `specs/after-care-system/goal.md`, `design.md`, `inventory.md`.

## Global Constraints

- Grain 12%, CA 1px; C·C_02와 기존 사용자 변경 보존.
- Shape gap 16px, radius 28px, slope 4°, text 안전 여백 64px. 반응형 content flow 유지.
- 5 emergency scenario·60 state, 8 journey fixture 모두 추적·검증.
- 통화·접수·도착 구별, 미확인 정보의 사실화 금지, 전송 전 명시적 내용 확인 유지.
- Code 검증 이후 영상 제작. 작업 branch checkpoint·최종 PR 준비, merge는 별도 지시.

## Review Focus

- 잘못된 preset/theme storage와 다른 tab의 적용: 기존 C·C_02를 덮어쓰지 않고 적용 상태 동기화.
- 긴 한국어·200% text·좁은 viewport: text 잘림 없이 실제 touch target 48px 확보.
- 전송 중 취소·오래된 기관 결과·reload: 기존 요청 식별·승인·복구 의미 유지.
- 음성 재생 중 상태 전환·network 실패: 겹친 안내나 이전 장면 음성 잔류 방지.
- Effect resize와 hidden panel: 무한 재생성·긴 main-thread 작업·지속 animation 누수 방지.

---

### Task 1: 전역 token·surface theme·공용 primitive

**Files:** Create `prototype/web/src/design-system/{tokens.css,surfaces.ts,SurfaceTheme.tsx}`, `src/components/ui/after-care.tsx`, `src/design-system/DesignSystemCatalog.tsx`; modify `src/journey/response-surfaces.ts`, `src/main.tsx`; test `tests/design-system.spec.ts`.

**Interfaces:** `SurfaceThemeProvider({value?,children})`, `useSurfaceTheme(): SurfacePair`, `readAppliedTheme()`, `applySurfaceTheme(pair)`. UI exports `CareSurface({tone,children,...})`, `CareAction`, `CareStatus`, `CareHeading`, `CareSpectrum`.

- [x] Scenario inventory와 원래 goal의 대응 관계 확인, 현재 시안 checkpoint 보관.
- [x] Write/run failing browser tests: catalog exists; theme apply updates a second tab; C·C_02 raw storage unchanged; invalid applied theme falls back with visible error and is not overwritten.
- [x] Implement token CSS, validated theme store/context, material primitive and catalog previews using the same exports.
- [x] Run `npm run check` and `npx playwright test tests/design-system.spec.ts --workers=2`. Expected: PASS. Inspect catalog screenshot.
- [x] Commit foundation checkpoint.

### Task 2: Responsive B layout·Surface editor

**Files:** Create `src/components/ui/after-care-layout.tsx`, `src/design-system/split-geometry.ts`, `src/design-system/layout.css`; modify `src/journey/ResponseSurfaceStudy.tsx`, `src/journey/ResponseSplitStudy.tsx`; test `tests/design-system-layout.spec.ts`.

**Interfaces:** `ResponseLayout({summary,primary,requests,navigation,guidance,action})`; `TaskLayout({summary,navigation,children,action})`; `VehicleShell({children})`. Context에서 surface theme 사용.

- [x] Write/run failing behavior tests: long text at multiple viewport sizes stays within safe area; mobile natural flow; same tokens and actual B layout in editor/catalog; explicit apply preserves draft presets.
- [x] Extract rounded geometry; use intrinsic layout + measured background shape; implement responsive shell and workspace.
- [x] Replace fixed editor context and selected B preview with shared layout; expose apply action with storage errors.
- [x] Run layout tests and capture desktop/mobile/reduced-motion. Expected: no overflow, clipped text, duplicate filter IDs or observer loop errors.
- [x] Commit layout checkpoint.

### Task 3: Emergency 전체 상태 적용

**Files:** Modify `src/emergency/{EmergencySurface.tsx,EmergencyStudy.tsx,PleosDisplay.tsx,WorkflowPanel.tsx,emergency.css}`, `src/journey/{JourneyStudy.tsx,VehiclePanel.tsx}`; test `tests/design-system-emergency.spec.ts` and existing emergency tests.

**Interfaces:** 기존 `EmergencySurface` event contract 유지. `ResponseLayout`에 domain copy·facts·actions·requests·navigation을 전달.

- [x] Add behavioral coverage for 60 manifest states, call/receipt/arrival distinction, unknown map, long scope/record panels, cancel/retry/late response.
- [x] Implement shared response composition and data-backed navigation, preserving reducer, focus and countdown semantics.
- [x] Move emergency catalog to shared design catalog. Existing direct scene URLs remain reviewable.
- [x] Run manifest validation + emergency suites + desktop/mobile screenshots. Expected: all 60 states mapped and verified.
- [x] Update inventory evidence and commit.

### Task 4: 전체 journey·root·catalog 이동

**Files:** Modify `src/journey/{JourneyLayout.tsx,JourneyCatalog.tsx,JourneyStudy.tsx,VehiclePanel.tsx,VoiceRecordPanel.tsx,EvidencePanel.tsx,JourneyReviewPanel.tsx,SubmissionPanel.tsx,FollowUpPanel.tsx}` and associated styles; `src/main.tsx`; tests `tests/journey-*.spec.ts`.

**Interfaces:** 기존 journey action/status/heading API를 공용 primitive adapter로 유지. Root는 JourneyStudy. 과거 비교 route는 archive entry로 보존.

- [x] Add assertions for catalog/product shared components, default full journey, mobile 200% and all 8 fixture transitions.
- [x] Migrate vehicle state, voice/photo input, review/diagram/report, approval/submission, follow-up onto TaskLayout and common tokens.
- [x] Replace duplicate per-page presentation constants with system references while preserving meaningful domain differences.
- [x] Run journey suites. Inspect representative screenshots and exceptional states. Expected: no persistence/consent/focus regression.
- [x] Update inventory and commit.

### Task 5: 공통 motion·재규 음성

**Files:** Create `src/design-system/motion.ts`, `src/audio/{manifest.ts,useGuidanceAudio.ts}`, `scripts/generate-guidance-audio.mjs`, `public/guidance-audio/`; modify emergency/journey voice playback and spectrum; tests `tests/guidance-audio.spec.ts`.

**Interfaces:** `useGuidanceAudio({text,key})` exposes state/play/stop; manifest maps script hash to voice/model/path/duration. Static assets only in client.

- [x] Verify paid voice access and current supported model with primary provider evidence. Existing key remains outside repo.
- [x] Test playback cancellation, missing asset, retry, scene switch and reduced motion before integration.
- [x] Generate deduplicated approved Korean scene scripts with JaeGyu, record provenance/duration, listen to representative generated speech.
- [x] Connect shared motion and audio to all flow states; synchronize phase/spectrum without misleading audio claims.
- [x] Run audio+motion suites and rendering measurements; commit asset/code checkpoint.

2026-11-13 증거 정정: Task 5의 `listen to representative generated speech` 완료 체크는 사람 청취 완료 근거가 아니다. 보존된 `evidence/design-system/audio-verification.json`과 inventory는 자동 전사·decode·browser 재생만 기록하고 사람 청취는 미실시라고 명시한다. 생성·연결과 사람 청취를 분리하며, Task 6 및 전역 goal의 실제 충족 상태는 `specs/after-care-system/completion.md`에서 추적한다.

### Task 6: 전체 범위 검증·영상·PR

**Files:** Update `scripts/record-journey-flow.mjs`, `scripts/record-emergency-flow.mjs`; create `evidence/design-system/` reports and `specs/after-care-system/completion.md`.

**Interfaces:** 영상 metadata에는 source commit, fixture/scene timeline, voice provenance와 검증 결과 포함.

- [ ] Run `npm run check`, complete Playwright suite, manifest tests, preset compatibility checks, token drift audit and performance measurements. Expected: no unresolved functional failures.
- [ ] Visually inspect full catalog, all representative screen roles, long-copy/mobile/error states. Fix material issues and rerun affected checks.
- [ ] Record one full journey with JaeGyu and main exception branches. Inspect resulting video frames, transitions and audible timing.
- [ ] Fresh-context whole-branch review; resolve significant findings and verify.
- [ ] Checkpoint commit·push, prepare PR with actual scope/evidence. Do not merge without instruction.
- [ ] Audit every goal requirement against authoritative files/tests/runtime/artifacts/PR; only then mark goal complete.
