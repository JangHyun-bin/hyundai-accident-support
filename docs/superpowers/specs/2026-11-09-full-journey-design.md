# 사고 대응 전체 여정 · 제품 및 UI/UX spec

작성: 2026-11-09. 기준 commit: `70c4946`. 상태: 상세 설계 제안, builder check 반영 완료, 구현 착수 준비. 제품 code 변경 전.

사용자 요청: PDF에서 미반영된 기능을 현재 디자인과 UI/UX에 맞게 해석하고, 높은 품질의 전체 여정을 위한 상세 spec과 plan 작성. 기존 Pleos flat 방향과 단계별 확장 방향은 대화에서 동의받음. 아래 세부 수치·data 구조·prototype 경계는 작성자의 제안이며 실제 차량·기관 연동이 승인되거나 검증됐다는 뜻이 아님.

## 1. 목적과 범위

사고 직후 상황 이해, 안전 확보 안내, 현장 기록, 사고 내용 확인, 보험사 접수 및 후속 처리를 하나의 사고 기록으로 연결. 사용자는 어떤 정보가 확인됐고, 무엇이 남았으며, 지금 무엇을 해야 하는지 구별할 수 있어야 함.

대상은 기존 React Web prototype의 차량 화면과 새 mobile 화면. 차량 + mobile 전체 여정은 앞서 제안한 권장 방향을 기준으로 설계. 실제 Android 이식은 이번 실행 plan에서 제외.

이번 구현에서 가능한 것:

- 실제 button·입력·수정·저장·복원·media 재생·선택·승인 동작.
- 허용된 browser에서 사용자가 시작하는 camera/microphone capture. 실패 시 file 선택·직접 입력 경로.
- 사람이 만든 가상 사고 자료로 재현 가능한 차량 감지·AI 결과·접수 결과·후속 처리 시연.
- 같은 browser/origin에서 차량·mobile 표현을 전환하며 같은 기록 사용.

별도 integration 작업이 필요한 것:

- 차량 sensor·비상등·트렁크·dashcam·후방 차량 알림의 실제 제어 및 수신.
- 실제 기기 간 동기화·인증·push notification.
- STT·AI 분석·경위서 생성·실시간 지도·보험사·정비소·대차 API.
- ElevenLabs JaeGyu의 실제 음성 생성·비용 사용·배포.

연동 전에도 화면의 대기·실패·미확인·정정·재시도 동작까지 구현. 실제 연동 완료를 가장하는 timer나 자동 성공 처리 금지. 검토용 fixture와 외부 event는 제품 화면 밖의 review controls에서 공급.

## 2. 근거와 현재 상태

- 원본: 사용자 제공 `~/Downloads/ 과제테스트_이소희.pdf`, 8 pages. p.3 전체 여정, p.4 디자인, p.5–7 핵심 wireframe 9개.
- 기존 구현: `prototype/web/src/emergency/`, `specs/emergency-experience/scenarios.json`, SC01–SC05·60 scenes.
- 기존 결정: `specs/emergency-experience/visual-language.md`, `docs/superpowers/specs/2026-11-09-complete-scenarios-design.md`.
- 원본 개념 flow: `e2e/00-integrated.mmd`, `e2e/03b-validation.mmd`.
- 현 구현의 입력은 500자 textarea와 범위 선택. Browser TTS만 존재. 별도 voice 시안은 production component가 아님.
- 현재 `/`는 legacy App, `?study=emergency`가 최신 긴급 대응 UI. 기본 route를 이번 준비 작업에서 바꾸지 않음.

PDF의 Driving view는 앱이 제어하지 않는 system UI로 명시됨. 해당 정보를 새로운 system 기능처럼 구현하지 않고, 출처가 있는 차량 정보를 앱의 요약과 상세에서 표현. 과거의 navy palette·호흡 ring·3열 Driving view 배치는 채택하지 않음.

## 3. 접근안과 선택 근거

| 접근 | 장점 | 비용·제약 | 판단 |
|---|---|---|---|
| 차량 화면에 모든 기능 배치 | 현재 앱에서 바로 이어짐 | 촬영·문장 수정이 차량 화면에 집중, 정보 밀도 증가 | 채택하지 않음 |
| 차량과 mobile이 하나의 사고 기록을 역할별로 표현 | 현재 긴급 UI 유지, 현장 기록에 맞는 조작 가능 | mobile shell·동일 기록 복원 필요 | 권장 방향, 이번 spec의 기준 |
| 통합 dashboard에서 모든 기능 선택 | 기능 탐색 용이 | 사고 직후 우선순위 약화, 사용자가 흐름을 조립해야 함 | 검토 catalog에만 적용 |

제품 경험은 단계를 안내하되 강제 wizard가 아님. 기록 생략·보류·긴급 대응 복귀 가능. 사진 수나 AI 분석 완료가 구호 접근과 보험사 검토 진입의 필수 조건이 되지 않음.

## 4. 유지할 표현 규칙

### 4.1 차량

- Canvas 2560 × 1440. 상·하단 system bar, 본문 app/map 1:1, 각 1232 × 1152.
- App 내부 상단 상황 box와 하단 대응 box 분리. Gap 24, 외부 radius 32, 내부 card radius 24, padding 세로 24 / 가로 40.
- 기존 Asta와 type scale 유지: Headline 60/48, Action 36/32, Body 28/26, Label 24/20.
- 기존 foreground `#EDEEF2`, surface `#1D1E21`, line `#313236`, secondary text `#A4A8AE`, confirmed `#00E074`, urgent `#FF4C28`을 catalog 정본으로 사용.
- Mint는 확인된 해당 항목의 작은 상태 표시. 화면 전체의 안전·완료를 뜻하지 않음. 빨강은 기존 긴급 결정에만 사용.
- 전화 glyph와 가로 spectrum 유지. Ribbon·glow·metal·추가 반복 장식 없음.
- 주 행동 최대 하나. 긴급 상황에서는 핵심 내용이 scroll 없이 보여야 함. 상세 자료만 독립 영역에서 scroll.
- 기본 1:1 유지. 경위서가 길다는 이유로 지도나 system bar를 임의 제거하지 않음.

### 4.2 Mobile

- 차량 canvas 축소가 아닌 별도 responsive layout. 같은 semantic color·glyph·button 위계 사용.
- 기준 viewport 393 × 852 CSS px, 최소 검증 폭 360. Noto Sans KR 우선, 없으면 system Korean sans. 새 font는 출처·배포 권한 확인 후에만 포함.
- Type token 제안: title 28/36, section 22/30, body 17/26, supporting 15/22, label 13/18. 이는 font-size/line-height 쌍.
- 좌우 padding 20, section gap 24, 내부 gap 12/16, card radius 20, 주 button 높이 56 이상, 조작 target 48 이상.
- 본문은 자연 scroll. 하단 주 행동은 safe-area를 반영하고 keyboard가 본문·입력을 가리지 않도록 배치. 길어진 문구에 고정 높이를 강제하지 않음.
- 한국어는 `word-break: keep-all`, 의미 단위 줄바꿈. 기관 상태의 첫 줄 baseline을 공통 row에 정렬.

### 4.3 공통

- Catalog에 없는 component·semantic token을 개별 화면에서 새로 만들지 않음.
- 확인 / 진행 / 미확인 / 실패 / 생략의 의미를 색과 짧은 문구로 함께 표현. 빈칸을 정상으로 읽히게 만들지 않음.
- Motion은 기존 appear 250ms, crossfade 200ms, exit 150ms 이하 기준 유지. Reduced motion에서는 이동·반복 animation 제거.
- 핵심 정보는 motion 종료를 기다리지 않고 표시. 자료 추가·삭제 시 focus와 읽는 위치 유지.
- 제품 문구는 자연스러운 한국어, 구현 용어·시연 주석은 review UI에 배치. 대화·개발 문서는 전역 terminology 적용.

## 5. 여정과 진입 조건

| 단계 | 차량 역할 | Mobile 역할 | 넘어가는 조건 |
|---|---|---|---|
| 대응 | 상황 요약·기존 SC01–SC05 긴급 동작 | 긴급 상태 확인·안내 | 사용자가 기록 진행을 선택; 안전 확보를 자동 추정하지 않음 |
| 기록 | 확보된 자료 요약·음성 기록·mobile 이어가기 | 촬영·음성 기록·자료 확인 | 기록이 없어도 검토 가능; 없는 자료는 없다고 표시 |
| 확인 | 간결한 도식·경위서 요약·승인 | 자료 대조·문장 정정·전송 항목 선택 | 보낼 내용과 수신처의 명시적 승인 |
| 후속 | 기관별 상태·차량 지원·길 안내 시연 | 접수 상세·공유·정비·대차 검토 | 기관 결과는 명시적 event로만 변경 |

현재 긴급 대응은 모든 단계에서 복귀 가능. 새 부상·위험 event는 기록 draft를 보존하고 긴급 대응을 즉시 표시. 이후 복귀 시 마지막 편집 위치와 내용 복원. 이때 녹음 종료·track 해제·Blob 저장은 비동기로 정리하며 긴급 화면을 기다리게 하지 않음. 저장 실패 시 메모리의 draft와 Blob을 유지하고 복귀 시 다시 저장 가능. 일반적인 사용자 화면 전환은 capture 종료·저장 결과 확인 후 진행. 기록 화면 진입 자체가 부상 없음·대피 완료를 뜻하지 않음.

## 6. 화면별 요구 사항

### V1. 차량 상태 요약과 상세

상단 box는 충격 감지·운전자 응답·이동 관련 사실 중 현재 행동에 필요한 2–3개를 요약. 나머지는 `차량 상태 보기`에서 확인. 하단 box는 기존 긴급 동작과 기관별 상태 유지.

상세는 충격 방향·측정 시각·충격 세기·영상 확보 결과를 표시. 항목별 출처와 확인 시각을 함께 확인 가능. `0.6G`만으로 손상·부상·주행 가능을 판정하지 않음. 정보가 없는 경우 `확인되지 않았어요`.

차량 flat 도식은 확인된 방향을 강조. 충격 위치와 차량 손상 위치는 별도 data. 손상 부위는 사용자의 입력 또는 해당 fixture에 근거가 있을 때만 표시. 상충하는 관측은 한 값을 덮어쓰지 않고 상세에서 둘 다 표시.

### V2. 안전 행동과 지도

기존 `self_action`의 지침을 재사용. 새 의료·도로 안전 지침을 이 spec으로 확정하지 않음. 행동 상태는 미확인 / 사용자가 확인 / 차량에서 확인 / 할 수 없음으로 구별.

비상등·트렁크를 누른 사실만으로 차량 제어 완료를 표시하지 않음. 자동 제어·후방 경고 결과는 별도 event가 있어야 확인 상태. 불가능한 행동에서 막히지 않고 도움 요청 경로 유지.

지도는 경로·대피 지점의 출처가 있는 fixture에서만 표시. 거리·안전 여부를 임의 생성하지 않음. 위치 또는 안내 지점이 없으면 관련 정보를 숨기고 위치 미확인을 표시. 현 위치 marker와 사고 도식은 서로 다른 component.

### H1. 다른 화면에서 이어가기

같은 browser의 `device=vehicle|mobile` 전환은 저장된 같은 case를 사용. 화면 전환 중 commit 실패 시 전환 전에 미저장 상태를 알리고, 현재 draft 유지.

별도 휴대폰에서 URL을 열었을 때 원래 기기의 기록이 있는 것처럼 표시하지 않음. 이번 prototype의 기기 간 연결은 review event 시연만 제공. QR code·공유 URL에 개인정보나 기록 본문을 싣지 않음. 실제 pairing과 sync는 후속 integration.

### R1. 자료 목록과 촬영

목록은 확보됨 / 저장 중 / 확보 못함 / 생략을 구별. 기본 촬영 대상은 현장 전체·내 차량·상대 차량·번호판·바닥 흔적·신호등. 여섯 항목 모두 필수는 아님. `3/6`은 사진 파일 수가 아닌 대상별 확보 개수.

한 번에 한 대상을 촬영. 안내 overlay는 framing 보조이며 인식 성공 판정이 아님. 촬영 후 preview에서 사용 / 다시 촬영 선택. 기존 사진을 새 사진이 durable 저장되기 전에 지우지 않음. 갤러리 선택도 같은 확인 흐름.

Camera 거절·미지원에서는 file 선택과 `지금 촬영하기 어려워요` 제공. JPEG/PNG/WebP만 초기 지원, HEIC 등 미지원 형식은 기존 자료를 유지한 채 설명. 파일당 15 MiB, 현재 draft의 photo evidence 최대 12개, 보존 중인 과거 asset까지 포함한 case media 총 150 MiB는 prototype 상한. 제한 초과 시 이유와 선택 가능한 동작 표시, 자동 삭제 없음.

### R2. 말로 기록

상태: ready / requesting-permission / listening / review / saving / saved / error. 큰 `말로 기록하기`가 진입 행동. 직접 입력은 보조.

Listening은 실제 microphone amplitude 기반 가로 spectrum, 녹음 시간, `말하기 마치기`. 무음에 반응을 꾸며내지 않음. 통화 spectrum의 fixture mode와 녹음 spectrum의 실제 mode를 구별. Browser가 지원하는 MIME을 검사하고 최대 120초에서 녹음 종료 후 review로 이동. 자동 저장·전송은 하지 않음.

STT 결과는 draft. 확정되지 않은 결과를 저장된 진술로 다루지 않음. 이 plan의 기본 mode에서는 외부 STT 호출 없음. Fixture mode는 준비된 audio와 해당 transcript를 함께 사용. 실제 녹음 mode에서 STT가 없으면 `음성은 남겼어요. 내용을 직접 입력할 수 있어요`와 playback·직접 입력 제공. 실제 녹음에 fixture transcript를 붙이지 않음.

Review에서 재생·정정·추가로 말하기·저장 가능. 추가 녹음은 기존 진술을 보존. 입력 5,000자, 기존 500자 기록 가져오기는 잘림 없이 보존. TTS 재생은 microphone 사용 전에 정지. 완료·취소·오류·pagehide에서 media tracks 해제.

### R3. Dashcam

Front/rear 각각 availability·확보 시각·기간·출처 표시. 저장 중 / 확보됨 / 실패 / 제공 없음 구별. Sample 20초 clip은 repo 안의 합성 또는 배포 권한 확인된 자료만 사용.

Playback·timeline·충돌 시점 marker·근거 구간 선택. 영상이 없는 속도·제동·충격 data는 임의 생성하지 않음. Seek 실패·decode 실패·한쪽 영상 없음에서도 다른 자료와 기록 유지. 실제 dashcam 자동 저장은 시연 event로만 표현.

### C1. 사고 도식

Flat SVG로 차선·내 차·상대 차·진행 방향·접촉 위치 표현. 좌표는 0–1의 정규화 값, 초기 prototype은 직선 도로·차량 2대까지만 지원. 곡선·교차로·다중 차량은 지원 범위를 알리고 도식 생략·직접 진술 가능. 해당 한계를 구현 시 `shortcut:` 주석으로 남김.

AI fixture 제안과 사용자의 정정을 별도 revision으로 보존. `진행 방향`, `차량 위치`, `접촉 위치`를 선택해 수정. Pointer drag와 동일한 결과의 방향 button·keyboard 제공. Undo는 저장 전 편집에 적용. 원본 확인과 정정본 비교 가능.

추정·사용자 정정 상태를 표시. 도식 확정으로 과실이나 실제 충돌 사실을 판정하지 않음. 도식 없이도 경위서 확인 가능.

### C2. 근거가 연결된 경위서

문장 단위로 내용·종류(자료 관측 / 사용자 진술 / 추정 / 미확인)·근거 ID·확인 상태 유지. 영상 근거에는 시작/끝 시각, 사진에는 해당 asset ID 연결.

문장을 선택하면 근거 drawer에서 자료 확인. 삭제되거나 재생 불가한 자료는 `근거를 열 수 없어요`로 표시하고 확인 상태 무효화. 추정은 사용자 확인 후에도 관측 사실로 자동 승격하지 않음.

정정 시 원문과 현재 revision을 보존하고 해당 문장의 확인을 해제. 도식·진술·근거 변경은 경위서의 확인 상태와 아직 전송하지 않은 승인을 무효화. 새 생성 결과가 늦게 도착해도 사용자의 편집을 덮지 않음. 적용 전 비교·교체 선택 필요.

이번 구현의 생성 결과는 fixture 또는 사용자가 입력한 내용. 실제 AI 연동 없음. 자료·진술이 없으면 경위서를 자동 채우지 않고 직접 작성 가능. 관련 사고 유형은 선택 설명이며 과실 비율·법적 판단 기능 제외.

### S1. 보험사 전송 검토

수신처·목적·자료별 전송 범위·실제 보낼 내용 preview. 초기 선택은 기록·자료를 자동 포함하지 않고 사용자가 선택. 기존 SC04의 보류·거절·재승인 원칙 유지.

승인은 현재 report revision, 선택된 evidence revision, recipient에 묶인 snapshot. 이후 편집은 새 draft에만 반영. 이미 보낸 snapshot은 변경하지 않음. 재승인 없이 새 내용을 보내지 않음.

승인 최소 조건은 수신처·목적·최소 하나의 전송 항목이 있고, 선택한 자료가 열리며, 포함한 진술·도식·경위서가 현재 revision으로 검토된 상태. 선택하지 않은 미완료 항목은 제출을 막지 않음. 경위서를 포함하면 모든 포함 문장을 검토해야 하며 끊어진 근거는 해소하거나 해당 문장/근거를 제외하고 재검토. `미확인` 문장도 사용자가 그 표현을 검토했다면 포함 가능하지만 사실 확인으로 승격하지 않음. 사진만 선택하는 등 경위서 없는 제출도 허용. 이 승인은 자료 전송의 조건이며 기존 119 통화 연결을 막지 않음.

전송 / 접수 / 담당 안내 / 현장 도착은 각각 별도 결과. 미확인은 실패와 다르며 재전송 근거가 아님. 전송 실패·명시적 미접수일 때만 범위를 다시 확인한 뒤 새 승인 가능. Double click과 reload는 요청 수를 늘리지 않음.

### S2. 접수 결과와 상대방 공유

접수 결과는 기관명·기관 발급 접수번호·접수 시각·다음 확인을 표시. 내부 request ID를 접수번호로 보여주지 않음. 접수 event에 번호가 없으면 `접수번호 확인 중`. 하나의 기관 접수를 전체 완료로 표현하지 않음.

상대방 요약은 별도 recipient와 별도 선택 범위. 부상·개인 연락처·위치·원본 영상 등을 자동 복제하지 않음. 실제 공유 API는 이번 범위 밖. Preview와 승인·공유 결과 event까지 시연하고, download 또는 sheet 열림만으로 전달 완료를 표시하지 않음.

공유는 기관 Submission과 별도 `ShareRecord` 이력으로 관리. 공유 ID·수신처·승인 snapshot·pending/confirmed/failed/unknown 상태를 가지며 `activeSubmissionIds`나 `emergency.requests`를 갱신하지 않음. 공유 결과에는 caseId/shareId를 요구. 공유 전후 보험사 현재 요청과 승인 내용은 그대로 유지.

### F1. 정비·길 안내·대차

필요할 때 여는 후속 선택. 정비소 목록의 이름·거리·입고 가능 시각은 출처와 갱신 시각이 있는 fixture. 조회 실패·정보 오래됨·결과 없음 상태 제공.

예상 수리 항목은 사용자 또는 fixture의 출처를 표시하고 확정 견적·주행 가능 판단으로 표현하지 않음. 정비소에 보낼 항목은 별도 검토. `안내 시작`은 경로 시연 event이며 실제 차량 이동 허용을 뜻하지 않음.

대차는 신청 검토 / 자격 확인 필요 / 가능 확인 / 불가 확인을 구별. 보험 가입 사실만으로 대차 가능을 추정하지 않음. 실제 예약·배차·결제 없음.

## 7. State와 저장 책임

### 7.1 기존과 새 여정의 경계

새 route `?study=journey&device=vehicle|mobile`와 catalog 확장으로 개발. 기존 emergency route·SC fixture·기존 localStorage key는 그대로 유지해 회귀 검증 기준으로 사용.

새 여정은 `JourneyCase` 하나가 현재 상태의 정본. 기존 `Session`을 `emergency` 필드에 포함하되 모든 edge를 기존 `transition`에 그대로 보내지 않음. 새 여정의 진술·경위서는 아래 domain 항목이 정본이며 legacy `record/savedRecord/approvedRecord`는 가져온 과거 기록으로만 보존, 새 전송 자료로 사용하지 않음.

책임 경계:

- 현재 scene의 연결·취소·응답·재연결·도착·인계 등 기존 긴급 edge는 검증 후 `transition`을 호출해 scene/fact 변화만 재사용. 반환된 legacy 요청·기록·승인 필드는 그대로 채택하지 않음. Countdown의 cancel/expire는 현재 scene의 auto_contact 대상과 일치할 때만 별도 command로 허용.
- Record 진입·`save_record`·record return은 새 record stage와 원래 returnStage가 처리. Legacy 기록 승인 guard로 새 진술을 판정하지 않음.
- `submit`, `receive`, `not_received` 및 destination의 request_overrides는 새 요청 command가 소유. Payload 승인·제출과 기관 결과 처리에서만 현재 기관 상태를 변경. Scene navigation만으로 접수나 전송 상태가 바뀌지 않음.
- `suspend/resume`은 새 여정의 stage·returnStage와 요청 보존이 처리. 기존 SC05의 조회/미접수 의미는 유지하되 legacy 전역 requestId로 새 요청을 식별하지 않음.

한 case의 scenarioId는 진입 시의 긴급 대응 맥락이며 후속 단계 때문에 SC01에서 SC04로 바꾸지 않음. Scene cursor는 긴급 화면의 위치, stage는 전체 업무의 위치. 보험사 검토와 후속 처리는 scenario와 무관한 새 stage에서 진입. 기관별 상태는 어느 stage에서든 표시. 현재 scene에 해당 외부 결과 edge가 있으면 cursor도 갱신하고, 없으면 기관 상태만 갱신하며 새 scene을 꾸며 만들지 않음.

Observation이 차량·운전자 사실의 정본. 기존 fact id와 연결되는 항목에는 `legacyFactId`를 둠. 하나의 reducer event가 observation을 갱신하고 `emergency.facts` 표시를 projection으로 재계산. 기존 scene의 fact_overrides는 fixture 출처 observation으로 변환. 같은 의미의 상충 observation은 `정보 확인 필요`로 요약하고 상세에서 둘 다 보존; 낮은 확실성의 새 값으로 기존 확인 사실을 조용히 덮지 않음.

`기존 기록 가져오기`는 명시적으로 수행. 검증된 v1 Session을 읽어 새 case를 생성하고 기존 savedRecord를 첫 진술로 복사. 기존 key와 값은 쓰거나 삭제하지 않음. 다른 route와 자동 양방향 sync 없음. 같은 case의 실제 사용은 journey route 안에서 계속 진행.

이미 요청한 기관은 기관별 `imported` submission reference를 생성하고 원래 상태를 유지. 그 reference는 새 제출이 아니며 요청 횟수를 늘리지 않음. 기존 저장에 확인되지 않는 payload·기관 접수번호는 null과 `과거 전송 내용 확인 불가`로 보존. Legacy 단일 requestId는 원본 metadata로만 저장하고 기관별 현재 ID로 재사용하지 않음. `not_sent/deferred/declined`에는 새 active reference를 만들지 않음. SC05의 구호 received·차량 unknown은 각각 다른 imported reference를 가짐. 이후 시연 결과는 새 reference ID로 대상 기관을 정확히 지정. Received는 재전송하지 않고, unknown은 조회만 하며, failed/not_received 결과 후 새 승인을 받아야 새 submission 생성.

### 7.2 필요한 domain 항목

| 항목 | 필수 내용 |
|---|---|
| JourneyCase | schemaVersion=1, id, revision, createdAt, updatedAt, emergency Session, stage, returnStage, activeSubmissionIds(기관별 id 또는 null) |
| Observation | id, kind, value, source(device/user/fixture), observedAt 또는 null, confirmation, supersedes 또는 null, legacyFactId 또는 null |
| SafetyAction | id, 상태, 확인 출처·시각. 요청과 완료를 별개로 보존 |
| Evidence | id, kind(photo/audio/video), revision, origin(sample/user), assetId, availability, captureTarget, metadata |
| Statement | id, text, audioEvidenceIds, revision, confirmedRevision 또는 null |
| Diagram | revision, origin, 차량 위치·방향, contact 또는 null, confirmedRevision 또는 null |
| Report | revision, paragraph 목록, 각 근거 참조와 확인 상태, basedOnRevision |
| Submission | id, kind(new/imported/contact), agency, recipient 또는 null, approvedAt 또는 null, immutable payload snapshot(imported/contact는 null 허용), status, externalReceipt 또는 null |
| ShareRecord | id, recipient, approvedAt, immutable payload snapshot, status(pending/confirmed/failed/unknown). 기관 요청과 별도 이력 |
| FollowUp | 선택 항목과 별도 결과, 출처·갱신 시각 |

전화·요청의 현재 상태는 `emergency.requests`가 정본. `activeSubmissionIds`는 기관별 현재 요청 identity. Submission은 보낸 내용과 개별 요청의 이력이며 현재 상태를 UI에서 별도로 추정하지 않음. 관련 event가 하나의 reducer에서 둘을 함께 갱신. 외부 결과는 caseId·agency·submissionId가 맞는 경우에만 적용. 과거 요청의 늦은 결과는 이력에 남기되 현재 요청 상태를 덮지 않음. 접수 확인은 같은 요청의 늦은 unknown/failed 결과로 퇴행하지 않음.

119 연결은 payload 전송 승인과 독립인 contact attempt. 최초 연결을 시작할 때 rescue reference를 만들되 kind는 `contact`, payload/approvedAt은 null. 통화 성공·실패·접수 결과는 그 reference에 연결. Reconnect는 새 contact reference로 구분하며 과거 통화의 늦은 결과는 현재 통화를 덮지 않음. `new` kind는 승인된 자료 제출만 의미.

### 7.3 저장

IndexedDB `after-care-journey-v1`에 `cases`, `assets`, `meta` store. Case와 연결된 Blob 저장·변경은 같은 readwrite transaction에서 commit. Durable commit 전에 저장 완료 표시 금지. localStorage에 media·base64 저장 금지.

Asset ID는 불변 Blob 하나를 가리킴. 교체·재녹음은 항상 새 assetId를 생성하며 기존 ID에 대한 overwrite는 storage에서 거절. 과거 report revision·Submission·ShareRecord가 참조하는 asset은 보존. UI의 자료 교체는 새 asset 참조를 가진 evidence revision을 추가하는 동작이며 과거 snapshot의 실제 파일을 바꾸지 않음.

`revision`을 optimistic concurrency 기준으로 사용. 두 tab이 같은 revision을 수정하면 먼저 commit된 값만 승인, 늦은 tab의 draft는 보존한 채 최신 상태를 불러오도록 안내. 자동 overwrite·자동 내용 merge 없음.

저장 차단·quota 초과 시 메모리의 draft 유지, `이 기기에 저장하지 못했어요` 표시. 복원을 보장하지 않음. 실제 전송 연동이 없는 현재 prototype에서도 저장되지 않은 승인 snapshot으로 전송 시연을 시작하지 않음.

한 tab 안의 저장은 controller가 순서대로 수행. 비동기 capture가 완료되면 녹음 시작 때의 case snapshot을 저장하지 않고, 최신 case에 자료 추가 command를 적용. 따라서 저장 중 들어온 긴급 event나 이후 편집이 늦은 Blob 저장으로 되돌아가지 않음. 다른 tab과의 revision 충돌은 별도 사용자 확인 경로이며 자동 merge하지 않음.

삭제는 draft 자료에서만 가능. 과거 report·전송·공유 snapshot이 참조하는 asset은 해당 case를 삭제하기 전까지 보존하고, draft에서 빼는 동작과 원본 삭제를 구분해 안내. 어떤 보존 이력에서도 참조하지 않는 asset만 명시적 자료 삭제 transaction에서 제거 가능. Case 전체 삭제는 명시적 확인 후 관련 case/assets만 삭제. 다른 사고·legacy 저장은 유지. 앱 시작 때 unrelated browser storage를 청소하지 않음.

복원 시 schema·필수 field·참조·길이·유효 MIME을 검증. 손상 snapshot은 사용하지 않고 복구 불가를 알리되 원본을 자동 삭제하지 않음. URL에는 case ID와 표시 mode만 포함하고 본문·음성·개인정보를 넣지 않음.

## 8. Review와 prototype 경계

- 시연 mode는 review shell에서 지속 표시. 사용자 입력 media와 합성 fixture를 섞어 실제 분석 결과처럼 표시하지 않음.
- Fixture에는 PDF 수치를 실측값으로 복사하지 않음. 합성 data임을 metadata와 review shell에 기록.
- Fixtures는 결과 없음·부분 자료·실패·늦은 결과·상충하는 자료를 포함. 정상 경로만 시연하지 않음.
- 실제 microphone/camera는 사용자가 해당 동작을 시작할 때만 권한 요청. Public Funnel을 열었다는 이유로 권한을 요청하지 않음.
- API key를 frontend·static build에 포함하지 않음. 실제 업로드·서버 전송은 추가 integration 범위.
- 공유 영상의 제품 화면에는 이전에 삭제 요청한 설명 문구를 다시 넣지 않음. 시연 경계는 review shell과 영상의 별도 설명 파일에 남김.

## 9. 품질 기준과 완료 조건

1. SC01–SC05 기존 test와 manifest 검증 통과. 기존 경로의 승인·미확인·중복 방지 의미 보존.
2. 차량 상태 출처·미확인·상충 값이 관측 범위를 넘는 판단으로 표현되지 않음.
3. Capture 실패·저장 실패·STT 미지원·근거 누락·접수 미확인에서 기록 손실과 가짜 완료 없음.
4. Keyboard·touch로 같은 기록 정정 가능. Focus가 사라지거나 overlay 뒤로 이동하지 않음.
5. 차량 2560×1440과 1440×900 browser 축소, mobile 393×852와 360×800, 긴 문구·keyboard·200% text 조건 검토.
6. 제품 surface의 가로 overflow·단어 중간 줄바꿈·기관 상태 baseline 불일치 없음. 표준 text 4.5:1, 큰 text·조작 경계 3:1 대비 검증.
7. 새 component는 catalog의 token만 사용. Raw photo/video 색상은 off-system paint 검사에서 제외.
8. 기기 간 시연과 실제 sync가 구분되고, 새 기기에서 존재하지 않는 기록을 복원했다고 표시하지 않음.
9. 모든 전송 검토가 recipient·목적·실제 payload와 일치. 과거 snapshot은 새 편집으로 변경되지 않음.
10. 대표 화면의 사람 검토 후 전체 여정 영상 제작. 자동 screenshot 검사는 UI 품질 승인 자체가 아님.

## 10. 실행 순서와 추적표

| 순서 | 산출물 | 요구 사항 | 착수·종료 기준 |
|---|---|---|---|
| P0 | Catalog와 대표 3개 화면의 fixture preview | §4, V1, R2, C2 | 제품 state 연결 전 정보량·위계 확인 |
| P1 | Case 저장·복원·기존 Session 연결 | §7 | transaction·revision·v1 import 검증 |
| P2 | 차량 상태·안전 행동·지도·mobile shell | V1,V2,H1 | 출처·미확인·인계 시연 검증 |
| P3 | 촬영·음성·dashcam·자료 목록 | R1–R3 | 실제 입력과 fixture 경계·실패 복구 검증 |
| P4 | 도식 편집·근거·경위서 | C1,C2 | 정정·누락·늦은 결과·승인 무효화 검증 |
| P5 | 전송 검토·접수·공유·후속 처리 | S1,S2,F1 | Snapshot·기관 상태·중복 방지 검증 |
| P6 | SC 통합·전체 여정·영상 | §5,§8,§9 | 회귀·시각 검토·coverage 후 녹화 |

외부 연동은 위 UI/state를 검증한 뒤 별도 spec에서 service contract·인증·비용·실기 검증을 결정. 이번 plan의 완료를 실제 긴급 서비스 출시로 해석하지 않음.

## 11. 남은 확인과 구현자 재량

착수 시 P0에서 사용자와 확인할 항목은 차량 상태의 정보량, mobile의 조작 밀도, 경위서의 근거 표현. 별도 디자인 전체 재선택 없이 대표 화면에서 확인.

구현자 재량: component의 세부 내부 구성, 동일 token 안의 정렬, native API feature detection, test helper 이름. 재량 아님: 기존 긴급 상태 의미 변경, 실제 기관 호출, 자동 승인, 실제 기기 sync 주장, 자료의 외부 업로드, 미지원 사고 도식의 사실 생성.

실기에서 확인할 항목: 실제 차량 화면 가독성·audio focus·소음 환경 STT·기기 인계·지도 정확도·기관 결과 계약. 현재 모두 Not verified.

## 12. Builder check 반영

독립 reviewer가 발견한 5개 사항 반영: legacy transition의 제한적 위임, scenario cursor와 전체 stage 분리, 기관별 현재 요청 ID와 imported reference, 선택 자료별 승인 최소 조건, 긴급 전환과 media 저장의 비동기 분리. 후속 검토의 2개 사항도 반영: 기관 요청과 상대방 공유 이력 분리, asset ID별 Blob 불변성. 제품 code는 아직 변경하지 않음.

실행 plan: [전체 여정 implementation plan](../plans/2026-11-09-full-journey.md).
