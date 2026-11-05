# Cult UI 첫 화면 비교 기록

2026-11-05. 기준: [실행 계획](../superpowers/plans/2026-11-05-cult-design-poc.md)의 Task 1. Web source는 [prototype/web](../../prototype/web/README.md)에 있다.

## 사용자 선택

사용자는 두 안을 확인하고 **A · 행동 중심 (`focus`)**을 선택하였다. 이어 GitHub의 anti-UI-slop 도구를 다양한 관점에서 조사한 뒤 후속 화면을 확장하도록 요청하였다. A의 정보 배치를 출발점으로 유지하고 시각 표현은 확정하지 않는다.

## 구현 범위

| 항목 | 결과 |
| --- | --- |
| 동일 상황의 두 구조 | 부상·고속도로·차량 이동 가능·조작과 경로 미확인을 각각 유지한다. |
| 실제 source | Cult Halo Card·Halo Badge, Motion Primitives TransitionPanel을 사용한다. |
| 안내 전환 | 열기·접기, 구조 전환 중 열림 상태 유지, keyboard focus 이동·복귀를 제공한다. |
| Review 환경 | Localhost에서 직접 실행한다. 전체 축소·원래 크기와 고정된 A/B control을 제공한다. |
| 외부 동작 | 전화·요청·정보 전송을 수행하지 않으며 세 기관의 상태는 요청 전이다. |

## 검증 근거

`npm run check`의 TypeScript·production build, `npm run test:ui`의 네 가지 browser 검사를 통과하였다. 상태 표시·전환·기본 URL 처리의 초기 실패를 확인한 후 구현하였다. Laptop에서 비교 control이 보이지 않는 문제와 안내를 연 뒤 keyboard focus가 이동하지 않는 문제는 각각 실패를 재현한 뒤 fix하였다.

실제 browser에서 두 안의 접힌 상태와 펼친 상태를 확인하였다. Screenshot 수집 중 page error는 없었고 주요 문구가 canvas 아래로 벗어나지 않았다. Mobile 화면은 전체 축소 검토용이다. 접근성 전체 기준이나 실제 차량 사용성을 통과하였다는 의미는 아니다.

- [A 첫 화면](../../prototype/web/evidence/focus.png)
- [B 첫 화면](../../prototype/web/evidence/context.png)
- [실제 전환 동영상](../../prototype/web/evidence/comparison.webm)

후속 작업은 anti-slop 조사에 따른 A의 critique, 선정한 시각 기준의 정리, 세 상태 확장, Compose 한 화면 재현이다. 원본 flow·과거 native PoC·미결정 정책은 변경하지 않았다.

독립 code review에서 현재 Task 1 범위의 Critical·Important·Minor 문제는 발견되지 않았다. Reviewer는 keyboard focus·여러 browser 크기·원래 크기·reduced motion을 직접 확인하였다. 후속 상태·전체 접근성·native 적합성은 해당 판정에 포함하지 않는다.
