# Source와 project 변경

원본 수신 확인일: 2026-11-05. 아래 외부 source 표는 **이전 A/B 비교 화면의 출처**다. 수신 URL·응답 SHA-256·원본 source SHA-256은 [manifest](third-party/source-manifest.json)에 보존했고 dependency version은 `package-lock.json`에 고정했다.

| Source | 사용과 변경 | License |
| --- | --- | --- |
| [Cult UI Halo Card](https://www.cult-ui.com/docs/components/halo-card) | 이전 A/B 비교의 안내 surface. `animated` prop을 추가해 장식 animation을 중단할 수 있게 했으며 padding·radius·색은 project CSS로 조정했다. 현재 기본 Journey의 핵심 surface라는 뜻은 아니다. | [MIT](third-party/cult-ui-LICENSE.md) |
| [Cult UI Halo Badge](https://www.cult-ui.com/docs/components/halo-badge) | 이전 비교의 기관별 상태. 같은 `animated` prop과 확대 text를 적용했다. | [MIT](third-party/cult-ui-LICENSE.md) |
| [Motion Primitives TransitionPanel](https://github.com/ibelick/motion-primitives/blob/main/components/core/transition-panel.tsx) | 원본 source를 사용한다. 호출부에서 200 ms·8 px 전환과 reduced motion을 지정한다. | [MIT](third-party/motion-primitives-LICENCE.md) |
| [shadcn badge](https://ui.shadcn.com/r/styles/new-york-v4/badge.json) | Halo Badge의 variant 기반. `cn`을 local helper로, `radix-ui`의 Slot을 `@radix-ui/react-slot`으로 연결하였다. | [MIT](third-party/shadcn-ui-LICENSE.md) |
| [Asta Sans](https://github.com/42dot/Asta-Sans) | 기존 Android PoC의 Regular·SemiBold·Bold asset을 재사용한다. | [OFL](third-party/asta-sans-OFL.txt) |

Cult의 기본 gradient·surface 표현은 첫 비교본에 남아 있다. 이를 Pleos의 공식 표현이나 제품의 확정 design으로 표시하지 않는다. Project CSS의 graphite·mint·warning 색, 크기와 여백은 검토용 제안이다. SVG 차량 그림과 장식은 이 PoC에서 작성한 그림이며 차량 sensor 결과를 시각화한 것이 아니다.

`Side Panel`은 아직 포함하지 않았다. 계획상 선택된 화면의 후속 상태 확장 단계에서 검토한다. 앱 이름은 `차분`이다.

## 현재 공용 구현 · 2026-11-13 정정

기본 Journey·Emergency·catalog는 project의 `CareSurface`·action·status·layout을 공유한다. 정본은 `src/components/ui/after-care.tsx`, `after-care-layout.tsx`, `src/design-system/tokens.css`, `surfaces.ts`, `FlowBoard.tsx`다. 기존 Halo 계열은 역사 비교안으로 보존하며 Pleos 공식 component를 구현했다고 주장하지 않는다.

현재 palette role은 저장 slot을 보존한 채 `semanticSurfaces()`에서 연결한다. 자세한 기준·승인 원문 미확보 상태는 [현행 시각 기준](../../docs/superpowers/specs/2026-11-12-figma-visual-contract.md)을 따른다.

안내 MP3는 ElevenLabs JaeGyu/eleven_v4 생성물이며 provider·원고·hash·duration을 asset metadata에 기록한다. 사용자 진술 sample WAV는 별도 출처와 공개 배포 권리 검토가 있다. [음성 선택·실행 상태](../../specs/emergency-experience/voice-selection.md)를 참고한다.

복사 source의 MIT가 전체 dependency의 license를 대체하지 않는다. Asta OFL·GSAP 별도 license와 각 transitive dependency 조건, 배포물 notice 포함 여부는 별도로 확인해야 한다. 이 문서는 법적 적합성 인증이 아니다.
