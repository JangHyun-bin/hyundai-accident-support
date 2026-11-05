# Source와 project 변경

확인일: 2026-11-05. Source는 실제로 `src/components/ui/`에 포함하여 사용한다. 수신 URL·응답 SHA-256·원본 source SHA-256은 [manifest](third-party/source-manifest.json)에 기록하였다. 설치된 dependency의 정확한 version은 `package-lock.json`에 고정하였다.

| Source | 사용과 변경 | License |
| --- | --- | --- |
| [Cult UI Halo Card](https://www.cult-ui.com/docs/components/halo-card) | 핵심 안내 surface. `animated` prop을 추가하여 지속적인 장식 animation을 중단할 수 있게 하였다. 기본값은 upstream과 같은 동작이다. 사용 화면의 padding·radius·색은 CSS로 조정한다. | [MIT](third-party/cult-ui-LICENSE.md) |
| [Cult UI Halo Badge](https://www.cult-ui.com/docs/components/halo-badge) | 기관별 요청 상태. 동일한 `animated` prop을 추가하고 text 크기를 확대하였다. Pulse와 상호작용은 끈다. | [MIT](third-party/cult-ui-LICENSE.md) |
| [Motion Primitives TransitionPanel](https://github.com/ibelick/motion-primitives/blob/main/components/core/transition-panel.tsx) | 원본 source를 사용한다. 호출부에서 200 ms·8 px 전환과 reduced motion을 지정한다. | [MIT](third-party/motion-primitives-LICENCE.md) |
| [shadcn badge](https://ui.shadcn.com/r/styles/new-york-v4/badge.json) | Halo Badge의 variant 기반. `cn`을 local helper로, `radix-ui`의 Slot을 `@radix-ui/react-slot`으로 연결하였다. | [MIT](third-party/shadcn-ui-LICENSE.md) |
| [Asta Sans](https://github.com/42dot/Asta-Sans) | 기존 Android PoC의 Regular·SemiBold·Bold asset을 재사용한다. | [OFL](third-party/asta-sans-OFL.txt) |

Cult의 기본 gradient·surface 표현은 첫 비교본에 남아 있다. 이를 Pleos의 공식 표현이나 제품의 확정 design으로 표시하지 않는다. Project CSS의 graphite·mint·warning 색, 크기와 여백은 검토용 제안이다. SVG 차량 그림과 장식은 이 PoC에서 작성한 그림이며 차량 sensor 결과를 시각화한 것이 아니다.

`Side Panel`은 아직 포함하지 않았다. 계획상 선택된 화면의 후속 상태 확장 단계에서 검토한다. `AFTER / CARE`는 review page의 작업 표기이며 확정한 app 이름이 아니다.
