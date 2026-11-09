# Complete Scenarios Implementation Plan

> 실행: 이 session에서 직접 구현. 사용자 active goal에 따라 code 검증 후 영상 제작.

**Goal:** SC01–SC05 실행형 Web flow와 검증된 전체/확대 영상.
**Architecture:** 기존 manifest renderer 유지, typed session transition module과 local snapshot 보존 추가.
**Tech Stack:** React, TypeScript, Vite, Playwright, FFmpeg. 추가 dependency 없음.
**Spec:** `docs/superpowers/specs/2026-11-09-complete-scenarios-design.md`

## Global constraints
기존 flat style·두 box·24px gap·전화/spectrum 유지. 실제 전송 없음. 영상 설명 문구 복원 금지. 기존 변경 보존, commit/push 없음.

## Review focus
중복 click, 거절 후 reload, 중단 중 접수, storage 손상/차단, 모든 scene의 긴 한국어·mobile overflow.

## Tasks
- [x] `specs/emergency-experience/scenarios.json`: SC02·SC04와 전체 분기 추가. `manifest.test.mjs`에 존재·도달성·승인 전 전송 금지 검사.
- [x] `prototype/web/src/emergency/session.ts`: typed manifest와 create/transition/load/save. 요청 identity, 승인 scope, record, 중단 복원. `tests/emergency-complete.spec.ts`로 실제 UI 검증.
- [x] `EmergencyStudy.tsx`, `emergency.css`: 공유 form/secondary action, 기록·범위·중단 UI, catalog 추가. 기존 renderer/timer/음성 유지.
- [x] Node manifest 검사, TypeScript/build, 전체 emergency UI test. 모든 scene desktop/mobile screenshot, clipping·flat paint·console 확인.
- [x] `scripts/record-emergency-flow.mjs`: 5 scenario와 실패/재시도/중단/재개 포함. 모든 scene coverage assertion. Code가 통과한 뒤 녹화.
- [x] MP4 decode/frame 확인. README·검증 evidence·정책 가정·영상 링크 제공.
