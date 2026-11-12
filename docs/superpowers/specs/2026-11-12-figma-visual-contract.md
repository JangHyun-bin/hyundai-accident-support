# Figma 시각 계약 — 현행 구현 기준과 원문 미확보 기록

기록일: 2026-11-13. **과거 사용자 승인 원문을 복원한 문서가 아니다.** 이전 stable spec이 이 경로를 “승인된 시각 기준”으로 참조했지만 원문은 현재 checkout과 보존된 전체 Git 이력에서 발견되지 않았다. 이 문서는 그 누락을 명시하고 추적 가능한 현행 기준을 연결한다. 아래 수치를 사용자에게 새로 승인받았다고 주장하지 않는다.

## 출처·적용 순서

1. [현재 display와 조작 기준](../../design-system/pleos-display-and-controls.md): 최신 wide display 경계·외부 시연 control.
2. [Stable layout spec](2026-11-12-stable-voronoi-layout-design.md): 고정 content slot·긴급 core·document profile·입력 보존.
3. [Stage/layout spec](2026-11-11-stage-layout-preview-design.md): 대표 7단계와 통화·전송·접수의 분리.
4. [현재 token](../../../prototype/web/src/design-system/tokens.css), [surface 의미 매핑](../../../prototype/web/src/design-system/surfaces.ts), [flow plan](../../../prototype/web/src/design-system/flow-plan.ts): 현재 코드에서 직접 관찰 가능한 값.
5. [Figma 분석](../../design-system/figma-design-system-analysis.md)과 [저장 snapshot](../../design-system/figma-design-system.snapshot.json): 2026-11-11의 design metadata. Live 대조·완전한 `.fig` 복원본이 아니다.

근거가 충돌하면 사용자 명시 결정·날짜가 있는 후속 계약과 현재 구현 관찰을 구분해 기록한다. 이 재구성 문서 자체를 새로운 승인 근거로 순환 참조하지 않는다.

## 현재 구현에서 확인한 기준

| 영역 | 현재 기준 | 근거·한계 |
|---|---|---|
| 글꼴 | local Asta 400/600/700 | `tokens.css`와 `public/fonts/`. 실제 차량 물리 크기 인증 아님 |
| 기본 typography | body 1.125rem, supporting .9375rem, label .875rem | 기본 16px rem에서 18/15/14 CSS px. 1800·2400px rem profile과 사용자 text 확대를 보존 |
| touch·focus | vehicle64, 명시적 mobile48 CSS px; focus4px·offset4px | 화면 폭만으로 vehicle target을 mobile 크기로 줄이지 않음. CSS px를 물리 mm/dp로 등치하지 않음 |
| 상태 | confirmed·unknown·attention을 문구·icon·색으로 함께 표현 | 통화·접수·도착·인계는 다른 사실. 전체 녹색 완료로 안전을 확정하지 않음 |
| semantic surface | call은 copper, safety/guide는 blue-violet | v1 저장 slot 값은 유지하고 `semanticSurfaces()`가 render에서 call/safety를 교환. 저장 preset을 재작성하는 migration 아님 |
| material | studio finish grain12%, grainSize .8px, clumping12%, tone75%, seed303, CA1px | `applyStudioFinish()`. text/icon은 material filter와 분리. C/C_02 보존 |
| wide display | 최대 폭2560, 높이 width×9/16, 좌우 product/scene pane | status/dock 포함 전체 display 기준. 작은 환경·200% text의 document 예외는 별도 |
| 시연 도구 | 단계·이전/다음·설정은 display 아래 sibling | 여정 내용 길이·설정 열림이 display 높이를 바꾸지 않음 |
| 작업 공간 | content-first 직사각형 slot, 그 주변 polygon material 이동 | 매 frame 최대 text rectangle 재탐색·글자 stretch 없음. 모든 polygon을 수학적 Voronoi 결과라고 주장하지 않음 |
| input·긴급성 | DOM·draft·caret·scroll 유지, 119 core 고정·즉시 접근 | IME 내부의 아직 DOM에 노출되지 않은 후보를 복원한다고 주장하지 않음 |
| motion | 공용 feedback160/state240/layout360ms; Flow morph1200/calm1600/fade360ms | reduced motion을 존중. 서로 다른 역할의 duration을 하나의 animation 수치로 합치지 않음 |

## 역사 기준과 승계

- [전역 design](../../../specs/after-care-system/design.md)의 초기 body17/label13/touch48·blue call/copper guide 설명은 과거 전역화 시점의 기록이다. 위 최신 token·semantic mapping·bounded frame 기준이 해당 항목을 승계한다.
- [긴급 시각 언어](../../../specs/emergency-experience/visual-language.md)의 2026-11-08 고정 canvas·flat 두 box·browser TTS 설명은 해당 시점의 역사다. 현재 runtime은 공용 surface·responsive flow·사전 생성 안내 MP3를 사용한다.
- 원래 승인 문서 원문이 이후 확보되면 source revision과 충돌 범위를 비교해 추가 정정한다. 현재 문서를 원문으로 대체 표기하지 않는다.

## 검증 상태

이 문서는 source와 보존 문서의 provenance 정리다. 새 디자인 승인, 현재 전체 suite 통과, 사람 이해도·음색 평가, 실차·AAOS·GPU·야간 가독성·물리 touch 적합성을 증명하지 않는다. Repair 실행·결과와 전역 목표의 미충족 항목은 [실행 계획](../plans/2026-11-12-contract-reliability-repair.md)과 향후 `specs/after-care-system/completion.md`에서 구분한다.
