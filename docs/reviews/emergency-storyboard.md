# 긴급 상황 storyboard 검토 기록

2026-11-05. 사용자가 상황 spec + storyboard 방식을 선택하였다. 기존 네 도구 비교안의 긴 문장 중심 구성을 문제로 보고, 상태 indicator·짧은 label·직접 행동·미확인의 구별을 검토하는 새 prototype을 만들었다.

## 결과와 재현

- [실행 화면](http://127.0.0.1:5173/?study=emergency)
- [경험 spec](../../specs/emergency-experience/principles.md), [실행 manifest](../../specs/emergency-experience/scenarios.json), [시각 규칙](../../specs/emergency-experience/visual-language.md), [검증·사용자 평가 절차](../../specs/emergency-experience/acceptance.md)
- 구현: `prototype/web/src/emergency/EmergencyStudy.tsx`, `emergency.css`. 기존 React/Vite·Lucide·Motion Primitives를 사용하고 dependency를 추가하지 않았다.
- 이전 네 skill 적용안은 [별도 기록](design-tools/README.md)과 `?study=tools`에 보존한다. 최종안이나 도구별 우열로 해석하지 않는다.

## 포함한 장면

| Scenario | 첫 장면 | 다음 장면 | 확인·결과 장면 |
| --- | --- | --- | --- |
| SC01 · 부상 있음 | [구호 우선](../../prototype/web/evidence/emergency/SC01-initial.png) | [연결 미확인](../../prototype/web/evidence/emergency/SC01-contact_unknown.png) | [통화 연결·접수 미확인](../../prototype/web/evidence/emergency/SC01-connected.png) |
| SC03 · 응답 미확인 | [응답 확인](../../prototype/web/evidence/emergency/SC03-initial.png) | [응답 없음](../../prototype/web/evidence/emergency/SC03-unanswered.png) | [응답 확인됨](../../prototype/web/evidence/emergency/SC03-responded.png) |
| SC05 · 접수 미확인 | [차량 지원 미확인](../../prototype/web/evidence/emergency/SC05-initial.png) | [결과 조회](../../prototype/web/evidence/emergency/SC05-checking.png) | [차량 지원 접수 확인](../../prototype/web/evidence/emergency/SC05-received.png) |

표의 열은 storyboard의 비교 장면이며 모든 상황이 같은 순서로 진행된다는 뜻은 아니다. 예를 들어 SC03은 첫 장면에서 바로 응답할 수도 있다. 실제 전이는 manifest의 `actions`, `events`에 기록하였다.

## 확인한 동작

- SC01의 주 행동은 도움 요청 시연이다. 통화 연결 event 이후에도 접수 미확인과 운전자·경로 미확인이 남는다.
- SC03에서 응답이 없다는 사실만 갱신한다. 뒤늦게 응답할 수 있고, 응답 확인으로 부상·의식을 정상 판정하지 않는다.
- SC05의 상태 조회는 재전송이 아니다. 차량 지원이 접수되어도 구호·보험·도착·인계의 별도 상태를 유지한다.
- 일시 중단·재개는 같은 가상 장면과 상태를 유지한다. Production persistence나 외부 요청 취소 기능을 구현한 것은 아니다.
- 음성은 사용자가 선택할 때만 browser TTS를 호출한다. 장면 변경·시연 중단·pagehide에 취소하고, 오래된 callback이 새 재생 상태를 바꾸지 않게 한다. 재생 불가 시 원고를 표시한다.
- 외부 결과 시연은 차량 화면 밖에 배치한다. 실제 통화·network·기관 전송·자동 timer는 없다.

## 검증 결과

| 검사 | 결과 |
| --- | --- |
| `node --test specs/emergency-experience/manifest.test.mjs` | 3/3 통과. Graph source ID·전이·미확인·기관별 접수 조건 확인. |
| `npm run check` | TypeScript와 Vite build 통과. |
| `npm run test:ui` | 14/14 통과. 기존 7개와 새 storyboard 7개. |
| 실제 Chrome capture | 새 9장면·기존 도구 8상태. 새 canvas의 주요 내용 clipping, application console/page error 없음. |
| 375px review UI | 가로 overflow 없음. 고정 차량 canvas를 축소한 결과이며 native mobile 검증이 아님. |
| `git diff --check` | 공백 오류 없음. |

[Browser 기록](../../prototype/web/evidence/emergency/browser-check.json), [검토 화면](../../prototype/web/evidence/emergency/review.png), [좁은 browser](../../prototype/web/evidence/emergency/mobile-review.png).

## 독립 review와 fix

gpt-6-astra가 source와 실제 Chrome 동작을 독립 review했다. Critical finding은 없었다. 외부 event 이후 keyboard focus가 사라지는 문제와 잘못된 scenario URL이 이전 scene을 재사용하는 문제를 발견하였다. 두 regression test의 실패를 확인한 뒤 fix했고 전체 14개 검사가 통과하였다. 초기 조건 summary에는 `시작 상황`을 붙여 현재 상태와 구별하였다.

개발 중에는 TransitionPanel의 exit 과정에서 이전 facts가 잠깐 중복 노출되는 문제도 발견했다. Exit 중인 FactsPanel을 즉시 제거하여 현재 정보만 남겼다. 핵심 indicator·문구·행동은 animation을 기다리지 않는다.

## 미검증과 후속 결정

실제 음성 출력 품질·소음 환경, 차량 hardware·시야·touch·font scale, 안전 안내 적합성, 사용자 이해도는 확인하지 않았다. TTS 검사는 browser API 경계의 controlled stub으로 lifecycle·실패·취소·stale callback을 확인한 것이며 실제 audio를 들은 검사가 아니다.

D01–D05는 미결정으로 보존했다. 이 시연만으로 실제 자동 연락·이동 안내·기관 재시도·구호 인계·지원 종료 정책을 확정할 수 없다. 다음 판단 자료는 [이해도 평가](../../specs/emergency-experience/acceptance.md)에 따른 관찰이며, 현재 UI가 더 빠르게 이해된다는 결과를 만들어 넣지 않았다.
