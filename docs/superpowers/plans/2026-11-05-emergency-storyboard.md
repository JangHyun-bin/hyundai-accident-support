# Emergency Storyboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상황 spec을 직접 읽는 시각 중심 storyboard와 검증 기록을 만든다.

**Architecture:** JSON manifest에 SC01·SC03·SC05의 사실·장면·전이·source node·미결정 사항을 보관한다. 기존 React prototype의 별도 query route에서 manifest를 render하며, 시연 event는 제품 화면 밖에서 공급한다. 기존 네 tool 비교안을 보존한다.

**Tech Stack:** 기존 React, TypeScript, Vite, Lucide, Motion Primitives, Node test runner, Playwright. 새 dependency 없음.

**Spec:** `specs/emergency-experience/principles.md`, `visual-language.md`, `acceptance.md`.

## Global Constraints

- 최종 제품은 Kotlin + Compose이다. 이번 결과는 시연용 web prototype이다.
- 1440 × 810 CSS px, Asta, 기존 dark semantic palette를 사용한다.
- 실제 통화·전송·timeout에 따른 자동 연락·차량 이동 지시를 만들지 않는다.
- 응답 없음 ≠ 의식 없음. 차량 이동 가능 ≠ 이동 허용. 연결·전송 ≠ 접수.
- D01–D05를 이번 디자인으로 확정하지 않는다.
- 이전 미완성 비교안 변경을 보존하고 함께 검증·기록한다.

## Review Focus

1. 잘못된 URL의 scene이 다른 scenario에 붙지 않게 한다.
2. Scene 변경·시연 중단 시 이전 음성 안내가 계속 나오지 않게 한다.
3. 전환 중 오래된 button이 작동하거나 focus가 사라지지 않게 한다.
4. 기관별 확인을 전체 완료로 오해하게 만드는 상태를 만들지 않는다.
5. 작은 browser에서 control과 긴 label이 잘리지 않게 한다.

### Task 1: Manifest와 실행 검사

**Files:** `specs/emergency-experience/scenarios.json`, `manifest.test.mjs`와 세 spec 문서.

**Interfaces:** Root `version`, `simulation_only`, `scenarios[]`. Scenario는 `id`, `title`, `summary`, `source_nodes[]`, `open_decisions[]`, `initial`, `facts[]`, `requests[]`, `states[]`를 갖는다. State는 `id`, `label`, `title`, `instruction`, `voice`, `cue{symbol,status,label,detail}`, `request_overrides{}`, `fact_overrides{}`, `actions[{id,label,to}]`, `events[{id,label,to}]`, `deferred[]`를 갖는다. `to`는 같은 scenario 안의 state ID이다. 초기 상태·무응답·연결·접수를 고정 fixture로 정의한다.

- [ ] `node:test`로 연결·source ID·의미상의 불변 조건 검사를 작성하고 manifest 부재로 실패하는 것을 확인한다.
- [ ] Manifest를 작성한다. SC01은 구호 우선/연결 미확인/통화 연결의 3장면, SC03은 응답 대기/응답 없음/응답 확인의 3장면, SC05는 접수 미확인/조회 중/차량 지원 접수 확인의 3장면이다.
- [ ] `node --test specs/emergency-experience/manifest.test.mjs`를 실행한다. Expected: 모든 검사 통과.
- [ ] Spec과 manifest를 commit한다.

### Task 2: Storyboard·검토 control·증거

**Files:** `prototype/web/src/emergency/{EmergencyStudy.tsx,emergency.css}`, `src/main.tsx`, `tests/emergency.spec.ts`, `index.html`, README와 review 기록.

**Interfaces:** `?study=emergency&scenario=SC01&scene=initial` route. Manifest 직접 import. 현재 사실·요청은 scenario 값에 해당 state override를 적용한다. App action은 명시된 다음 scene으로 전환한다. Reviewer event는 화면 밖 button으로 전환한다. 중단은 같은 scene을 유지하는 review pause이며 D04의 production 저장 구현이 아니다.

- [ ] Playwright 검사: 세 scenario와 모든 상태, 무응답·접수 불변 조건, URL fallback, 중단/재개, focus, 음성 중단/fallback, 작은 browser. 초기 실패 확인.
- [ ] 시각 indicator 중심 화면, scenario·scene 선택, spec 보기, 음성 미리 듣기, 중단·재개를 구현한다. 보조 사실만 TransitionPanel로 160ms, reduced motion 0ms 전환한다.
- [ ] `npm run check`, `npm run test:ui` 실행. Expected: 기존 7개와 새 검사가 모두 통과.
- [ ] 실제 Chrome에서 9장면을 capture하고 시각적으로 확인한다. 원래 크기·축소 화면에서 clipping을 검사한다.
- [ ] 사용한 도구와 spec·제약을 README/review에 기록하고 이전 네 도구 비교안도 보존한다.
- [ ] 최종 독립 review 후 필요한 fix를 검증하고 commit·기존 prototype branch push를 진행한다.
