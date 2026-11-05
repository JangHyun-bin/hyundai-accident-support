# 통합 flow 검수본 v1.2 Implementation Plan

> For agentic workers: implement the approved review in this session. Preserve the source diagram and verify all references before publishing.

**Goal:** 기존 48개 node·70개 connector를 보존하고 node별 분류, 5개 scenario, 보완 근거와 미결정 사항을 제공한다.

**Architecture:** 검토 data를 `assets/flow-review-v1.2.json`에 저장하고 Markdown 검수본을 생성한다. 기존 editor에는 검수 표시와 선택 node의 검토 결과만 추가한다. 검토 기준과 다른 문구·연결은 재검토 대상으로 표시한다.

**Tech Stack:** 기존 Python·JavaScript·SVG·CSS. 신규 dependency 없음.

**Spec:** 사용자가 승인한 통합 flow 검수본 v1.2와 다섯 scenario 검토. 제품 prototype과 실제 연계 구현은 후속 단계다.

## Global Constraints

- `project.json`의 문구·ID·위치·연결과 원본 archive를 변경하지 않는다.
- 유지 / 보완 필요 / 결정 필요를 구분한다. 유지는 현장 안전 검증 통과를 의미하지 않는다.
- 기존 연결, 제안 연결, 미결정 조건을 혼합하지 않는다.
- Scenario 결과는 정적 논리 검토다. 실제 차량·기관·사용자 시험으로 표현하지 않는다.
- 검수본과 변경은 현재 GitHub private repository에 반영한다.

## Review Focus

- 실제 native endpoint와 graph source가 일치하는지 확인한다.
- 존재하지 않는 경로를 기존 동작처럼 서술하지 않는다.
- 무응답·차량 이동 보류·접수 미확인·거절·중단 후 재개를 확인한다.
- 미결정 사항을 구현된 조건처럼 단정하지 않는다.
- 기준 이후 문구·연결 변경 시 이전 검토 분류를 그대로 표시하지 않는다.

## Tasks

- [x] 전체 문구와 native endpoint 대조.
- [x] `test-review.mjs`: node·경로·결정 참조, 원본 불변, 검수 기준 변경 검출에 대한 실패 확인.
- [x] 검토 data: 48개 node, 보완 항목, 결정 사항, 다섯 scenario 작성.
- [x] `editor/review.mjs`, 기존 inspector·SVG 표시·catalog에 검토 분류 통합.
- [x] `build-review.py`: 동일 data에서 Markdown 검수본 생성.
- [x] 전체 검사와 문체·구조 검사, 실제 browser에서 표시·선택·변경 기준 확인.
- [x] 검수본·근거를 commit·push하고 remote content 확인.

검증 결과: `node check.mjs`, `node test-model.mjs`, `node test-review.mjs`, `python3 test-server.py` 통과. 문체·문서 참조 검사 통과. 원본 project SHA-256 불변 확인. Browser에서 분류 48개, 표시 전환, 문구 변경 시 분류 중단, undo 복원, semantic ID 검색, G2 직접 연결과 390 px 화면을 확인하였다.
