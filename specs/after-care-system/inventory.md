# 전역 design system 적용 inventory

정본: `specs/emergency-experience/scenarios.json`, `journey-fixtures.json`, `prototype/web/src/main.tsx`.

## Emergency — 5 scenario / 60 state

| Scenario | State | Title | Verification |
|---|---|---|---|
| SC01 | `initial` | 119에 연결합니다 | pending |
| SC01 | `cancelled` | 구호 연결 안 함 | pending |
| SC01 | `auto_contact` | 119 연결 중 | pending |
| SC01 | `contact_unknown` | 119 연결 중 | pending |
| SC01 | `connected` | 119 통화 연결됨 | pending |
| SC01 | `call_failed` | 119 연결을 다시 시도하세요 | pending |
| SC01 | `received` | 구호 접수가 확인됐어요 | pending |
| SC01 | `arrived` | 구호가 현장에 도착했어요 | pending |
| SC01 | `handoff` | 구호 인계가 확인됐어요 | pending |
| SC01 | `record` | 기억나는 내용을 남겨주세요 | pending |
| SC01 | `record_saved` | 사고 기록을 저장했어요 | pending |
| SC01 | `auto_connected` | 119 통화 연결됨 | pending |
| SC01 | `auto_failed` | 119 연결을 다시 시도하세요 | pending |
| SC01 | `auto_received` | 구호 접수가 확인됐어요 | pending |
| SC01 | `auto_handoff` | 구호 인계가 확인됐어요 | pending |
| SC02 | `initial` | 차량 지원이 필요해요 | pending |
| SC02 | `review` | 요청할 내용을 확인하세요 | pending |
| SC02 | `sending` | 차량 지원 요청을 보내고 있어요 | pending |
| SC02 | `failed` | 요청을 보내지 못했어요 | pending |
| SC02 | `waiting` | 차량 지원 접수를 기다려요 | pending |
| SC02 | `checking` | 기존 요청을 확인하고 있어요 | pending |
| SC02 | `record` | 기억나는 내용을 남겨주세요 | pending |
| SC02 | `record_saved` | 사고 기록을 저장했어요 | pending |
| SC02 | `received` | 차량 지원 접수가 확인됐어요 | pending |
| SC02 | `arrived` | 차량 지원이 도착했어요 | pending |
| SC03 | `initial` | 119에 연결합니다 | pending |
| SC03 | `unanswered` | 119 연결 중 | pending |
| SC03 | `contact_unknown` | 119 연결 중 | pending |
| SC03 | `responded` | 구호 연결 안 함 | pending |
| SC03 | `connected` | 119 통화 연결됨 | pending |
| SC03 | `call_failed` | 119 연결을 다시 시도하세요 | pending |
| SC03 | `received` | 구호 접수가 확인됐어요 | pending |
| SC03 | `handoff` | 구호 인계가 확인됐어요 | pending |
| SC03 | `unanswered_connected` | 119 통화 연결됨 | pending |
| SC03 | `unanswered_received` | 구호 접수가 확인됐어요 | pending |
| SC03 | `unanswered_failed` | 119 연결을 다시 시도하세요 | pending |
| SC03 | `unanswered_handoff` | 구호 인계가 확인됐어요 | pending |
| SC04 | `initial` | 전송할 기록을 확인하세요 | pending |
| SC04 | `record` | 사고 기록을 고쳐주세요 | pending |
| SC04 | `review` | 보험사에 보낼 내용을 확인하세요 | pending |
| SC04 | `deferred` | 전송을 보류했어요 | pending |
| SC04 | `declined` | 보험사에 보내지 않았어요 | pending |
| SC04 | `sending` | 보험사에 기록을 보내고 있어요 | pending |
| SC04 | `failed` | 기록을 보내지 못했어요 | pending |
| SC04 | `sent` | 기록을 보냈어요 | pending |
| SC04 | `checking` | 보험 접수를 확인하고 있어요 | pending |
| SC04 | `received` | 보험 접수가 확인됐어요 | pending |
| SC04 | `support` | 다른 지원은 계속 진행돼요 | pending |
| SC04 | `paused` | 남은 일을 보관했어요 | pending |
| SC05 | `initial` | 차량 지원 접수 미확인 | pending |
| SC05 | `checking` | 차량 지원 접수 확인 중 | pending |
| SC05 | `received` | 차량 지원 접수 확인 | pending |
| SC05 | `suspended` | 여기서 잠시 멈췄어요 | pending |
| SC05 | `lookup_failed` | 접수 결과를 확인하지 못했어요 | pending |
| SC05 | `not_received` | 차량 지원이 접수되지 않았어요 | pending |
| SC05 | `review` | 다시 요청할 내용을 확인하세요 | pending |
| SC05 | `sending` | 차량 지원을 다시 요청하고 있어요 | pending |
| SC05 | `send_failed` | 요청을 보내지 못했어요 | pending |
| SC05 | `arrived` | 차량 지원이 현장에 도착했어요 | pending |
| SC05 | `handoff` | 구호 인계가 확인됐어요 | pending |

## Journey — 8 fixture

| Fixture | 범위 | Verification |
|---|---|---|
| `complete-journey` | V1, V2, H1, R1, R2, R3, C1, C2, S1, S2, F1 | pending |
| `unanswered` | V1, V2 | pending |
| `immobile` | V1, V2, S1, F1 | pending |
| `no-evidence` | R1, R2, R3, C1, C2, S1 | pending |
| `partial-evidence` | R1, R3, C2 | pending |
| `insurance-declined` | S1, S2, F1 | pending |
| `suspended-receipt` | H1, S1, S2 | pending |
| `late-result` | S1, S2 | pending |

## Functional routes / 공용 적용 대상

- `/`와 `?study=journey`: emergency response, 차량 상태, voice/photo 기록, 영상·사고 diagram·경위서 검토, 전송 범위·승인·결과, 상대방 공유, 정비소·대차 후속 처리.
- `?study=emergency`: 60 state를 개별 진입·조작할 수 있는 검토 환경.
- `?study=journey-catalog`, `?study=emergency-catalog`: 전역 catalog의 실제 component·상태 preview로 연결.
- `?study=response-alts&focus=surface`: 전역 surface 조절과 실제 B layout preview.
- `?study=response-alts`, numeral/split, `?study=tools`, legacy focus/context, `public/studies/*`: 과거 비교안 증거. 제품 기본 진입과 분리해 보존.

## 공통 검증

- Desktop 1440·1600·2560, mobile 360·393, 200% text, 긴 문구, keyboard, reduced motion, content overflow.
- 통화 연결 / 접수 / 현장 도착 구분, unknown / failed / retry / cancel / return.
- Local draft·preset·기록 보존, 충돌·quota·복구, 오래된 외부 응답, 명시적 전송 승인.
- Rendering 비용·grain 생성 횟수, API asset 오류와 음성 재생 중단.
- 최종 전체 영상과 주요 분기 영상에 scenario·source commit·timeline 근거 연결.
