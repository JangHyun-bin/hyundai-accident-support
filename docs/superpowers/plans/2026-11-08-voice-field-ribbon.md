# Voice field ribbon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 승인된 ribbon mesh를 119 통화 연결 화면에 반영.

**Architecture:** 승인 시안의 WebGL renderer를 `ribbonMesh.ts`로 옮기고, React `VoiceField`가 animation·visibility·GPU 자원 수명을 소유. `EmergencyStudy`는 구호 연결 상태와 시연 중단 여부만 전달.

**Tech Stack:** 기존 React·TypeScript·WebGL2·Playwright. 새 dependency 없음.

**Spec:** `docs/superpowers/specs/2026-11-08-voice-field-ribbon-design.md`

## Global Constraints

- 폭 `0.22`, 꼬임 `0.45`, 반응 `0.75`, 시점 `[-0.18, 0.6]`.
- `rescue.status === connected`에만 표시. 통화·접수·도착 의미 유지.
- 가상 음성임을 검토 UI에 표시. 실제 audio 수집 없음.
- 시연 중단·가림·비활성 tab·reduced motion에서 반복 렌더링 중단.
- GPU 실패 시 전화 glyph 유지. Unmount 시 animation·GPU 자원 해제.

## Review Focus

- 통화 연결 전에 음성 반응이 나타나지 않는지.
- GL 생성·shader·context loss 실패가 화면을 깨뜨리지 않는지.
- React StrictMode 재실행과 장면 이동에서 GPU 자원이 남지 않는지.
- Pause·가림·reduced motion·visibility 변경 시 반복 작업이 멈추는지.
- Satin을 켰을 때 위치·크기·전화 glyph 의미가 유지되는지.

### Task 1: 통화 시각화와 lifecycle

**Files:**
- Create: `prototype/web/src/emergency/ribbonMesh.ts`, `VoiceField.tsx`
- Modify: `prototype/web/src/emergency/EmergencyStudy.tsx`, `emergency.css`
- Test: `prototype/web/tests/emergency-voice-field.spec.ts`
- Evidence: `prototype/web/evidence/voice-field/`

**Interfaces:**
- `createRibbon(canvas: HTMLCanvasElement)`는 `render(time: number, amplitude: number)`, `dispose()` 제공.
- `VoiceField({ paused }: { paused: boolean })`는 장면 내 전화 glyph와 canvas를 그림.

- [x] 통화 전후 표시, pause/reduced motion, GPU fallback, unmount 자원 해제 test 작성.
- [x] 새 test 실행으로 미구현 RED 확인.
- [x] 승인 renderer를 TypeScript로 옮기고 React lifecycle·기존 상태 전환에 연결.
- [x] `npm run check`, 새 test, 전체 `npm run test:ui -- --workers=2`, manifest 검사 통과.
- [x] Desktop·375px·Satin 화면 evidence 확인, 독립 review 후 필요한 fix.

기존 `design/pleos-split` checkout에서 수행. 사용자가 보고 있는 prototype에 반영하며, 이번에는 commit·push·merge 없이 변경을 검토 가능한 상태로 유지.

## 후속 결정 · 2026-11-08

사용자가 장식성이 과하다고 판단하여 ribbon ring 제거 결정. 본문의 ribbon 구현·검증·capture는 과거 기록. 현재 Web prototype은 큰 solid phone glyph와 기존 통화 문구만 표시.
