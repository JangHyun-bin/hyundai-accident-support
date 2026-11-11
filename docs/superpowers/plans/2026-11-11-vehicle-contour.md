# Vehicle Contour Implementation Plan

> **For agentic workers:** Execute sequentially in the existing feature worktree. Preserve unrelated interaction-study changes.

**Goal:** 선택한 B / Contour를 공용 component로 구현하고 localhost에서 전체 화면과 함께 확인.

**Architecture:** UI는 typed view model만 소비. Journey adapter가 기존 observation/safetyActions의 확인·충돌 상태를 해석. DEV preview는 같은 adapter와 UI를 예시 case로 사용.

**Tech Stack:** React, TypeScript, SVG, 기존 CSS token, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-vehicle-contour-design.md`

## Global Constraints
새 dependency 없음. Asta와 기존 token 사용. 확인되지 않은 부위 강조 없음. 기존 theme/preset/storage 보존. Commit/push/merge는 이번 작업 범위 밖.

## Review Focus
방향 충돌, 사용자 확인과 기기 확인 구별, 요청 중 상태, 좁은 폭의 label 겹침, 여러 SVG instance의 gradient ID 충돌.

## Tasks
- [x] `components/ui/vehicle-contour.tsx`와 CSS: 고정 bird’s-eye SVG, 8방위 marker, HTML callout, compact text 흐름.
- [x] `journey/vehicle-state.ts`: 확인된 방향과 safety action adapter. 기존 `VehiclePanel.tsx`에서 공용 component 사용.
- [x] `design-system/VehicleContourStudy.tsx`와 CSS, DEV route `?study=vehicle`, catalog에서 공용 component와 preview 연결.
- [x] 의미 있는 Playwright 확인: 미확인/충돌에서 부위 강조 없음, 확인 후 정확한 상태, 기존 journey 상태 반영, responsive overflow 없음.
- [x] `npm run check`, 관련 browser test, desktop/mobile screenshot 확인. Localhost 열기와 결과 기록.
