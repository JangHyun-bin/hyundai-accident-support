# Stage Layout Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** localhost 한 화면에서 승인한 stage/layout event 흐름을 조작 가능하게 구현.
**Architecture:** Pure reducer와 layout selector가 상태를 담당. Fixed-seed power diagram이2–4cell을 계산하고 기존 CareSurface를 해당geometry에 배치. DEV-only FlowStudy가 simulation controls와 product preview를 조립.
**Tech Stack:** 기존 React/TypeScript/GSAP/Motion/Lucide/Playwright. 새dependency 없음.
**Spec:** `docs/superpowers/specs/2026-11-11-stage-layout-preview-design.md`

## Global Constraints

- Guideblue/119copper는 scoped theme만 변경.
- Global7/layout5/checklist4 분리,실제 통화·전송 없음.
- Layout1200ms,최소간격4000ms,content360ms,calm1600ms,breath2000+2000ms.
- 기존 dirty worktree 보존. 이 task의 새파일과 main/catalog 진입만 변경. Commit/push하지 않음.

## Review Focus

- 빠른 event와 reset 이후 이전 timer가 새 상태를 덮지 않아야 함.
- 전송 성공 뒤 통화 중이면119가 남아야 함.
- Text 확대와 좁은 viewport에서 controls가 polygon 밖에 숨지 않아야 함.
- Geometry가 변할 때 cell최소면적과 finite좌표 유지.
- Driving/reduced motion 전환 중 pending layout과 animation 정리.

## Task 1: 상태와 geometry

**Files:** Create `prototype/web/src/design-system/flow-study-model.ts`, `flow-geometry.ts`; Test `prototype/web/tests/flow-model.spec.ts`.
**Interfaces:** `FlowState`, `FlowEvent`, `initialFlow`, `flowReducer`, `layoutFor`; `flowCells(layout,width,height)`는polygon/path/bounds/contentRect 반환.

- [x] State/geometry behavior tests 작성,아직없는module로fail확인.
- [x] Reducer·mapping·powerclip·contentfit 구현. 기존roundedPath 사용.
- [x] `npx playwright test tests/flow-model.spec.ts` 통과.

## Task 2: localhost preview와 전환

**Files:** Create `FlowStudy.tsx`, `flow-study.css`, `FlowBoard.tsx`; modify `main.tsx`, `DesignSystemCatalog.tsx`; test `tests/flow-study.spec.ts`.
**Interfaces:** Task1reducer/geometry 소비. `/?study=flow` DEVroute와cataloglink 제공.

- [x] 전체flow·실패·통화hold·driving·reset·responsive UI tests 작성,진입없는상태fail확인.
- [x] 기존VehicleShell/contour/material을 조합. Simulationcontrol은IVI밖,primaryevent는화면안.
- [x] GSAPgeometry/pulse와Motioncontent/calm. Queue는latesttarget만,cleanup은unmount/reset포함.
- [x] `npm run check` 및 focusedPlaywright두파일 통과.
- [x] 기존scene navigation regression 실행. Desktop/mobile·200%text screenshot확인.
- [x] 한 명의fresh reviewer가task소유파일만read-only review. Materialissue fix후해당tests.
- [x] 실행 중 Vite/localhost URL 확인. Browser 자동 열기는 CUA host unavailable로 미완료. 직접 열 수 있는 link·spec·증거·제한사항 전달.
