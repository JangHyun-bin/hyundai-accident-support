# 공유 계약·기록 신뢰성·검증 재현성 복구 스펙

작성일: 2026-11-12. 상태: **2026-11-13 사용자 실행 지시가 적용된 복구 계약**. 이 문서 자체는 구현·검사 통과·시각 수치의 개별 승인·머지 완료의 증거가 아니다.

- [실행 계획](../plans/2026-11-12-contract-reliability-repair.md)
- [자율 실행·머지 goal query](../plans/2026-11-12-contract-reliability-repair-goal-query.md)
- 기존 제품 목표: [차분 goal](../../../specs/after-care-system/goal.md)

## 1. 목표와 범위

사용자가 요청한 다섯 항목을 하나의 복구 변경으로 완료한다.

1. Android 공유 schema 계약: 시작 실패뿐 아니라 override·effect·복수 action·요청 상태 보존을 복구.
2. 기록 신뢰성: 최초 저장 재시도 URL, 최신 진술 표시·draft 보존, 경위서 문장 제한의 명시적 거절을 복구.
3. 음성 안내: 저장 실패·거절·보류의 실제 상태와 화면·원고·재생 asset을 일치.
4. 검증 재현성: 깨끗한 checkout의 `.audit` 전제 제거, maximum-duration 실패 원인 규명, 원시 증거의 영구 보존.
5. 정본·문서 승계: 누락 visual contract 처리, 현행 안내 갱신, 전역 목표와 현재 완료 상태의 추적 연결.

이 범위의 완료와 과거 전역 디자인 목표 전체의 완료를 구별한다. 전역 영상·사람 청취·실차 검증의 미충족 상태를 사실대로 남기는 것은 이번 문서 정합성 요구다. 이들을 수행했다고 허위로 닫지는 않는다.

### 범위 밖

- Android SC01–SC04 제품 UI 전체 이식, Web 최신 외형의 native 전면 이식.
- 실제 신고·기관 API·차량 신호·STT·AI·기기 간 동기화.
- 디자인 방향 변경, 토큰·preset 재설계, 저장 schema의 불필요한 version bump.
- 조사에서 발견한 legacy 링크·DEV Flow 주행 중 fade·숨긴 영상·preview JSON 타입 문제의 일괄 수정. 이번 변경이 직접 회귀시킨 경우만 복구한다.
- 과거 원본 보드·Figma archive·검수 v1.2의 재작성.

## 2. 근거와 사실의 상태

현재 결함 근거는 앞선 정적 조사와 아래 소스다. 실행자가 이미 보고된 실패를 재확인하기 위해 baseline suite를 다시 돌리지 않는다.

| 대상 | 근거 | 이번 계획 수립 시 상태 |
|---|---|---|
| Android 시작 | `prototype/android/app/src/main/java/com/example/accidentpoc/MainActivity.kt`의 전체 state 순회와 `fact_overrides` 거부 | 현재 SC05의 `arrived`·`handoff`와 불일치하는 정적 예외 경로 |
| 신규 저장 URL | `prototype/web/src/journey/JourneyStudy.tsx`의 `begin` 성공 분기와 전역 `flush` 버튼 | 첫 실패 뒤 재시도 성공에 URL 연결이 없는 정적 경로 |
| 진술 표시 | `VoiceRecordPanel.tsx`의 mount 시 `useState`와 `useJourneyCase.ts`의 최신 aggregate adopt | 동일 case의 새 revision을 editor가 반영하지 않는 정적 경로 |
| 문장 제한 | `case-validation.ts`의 100문장 제한, `ReportPanel.tsx`의 무조건 draft 종료 | 거절 결과를 사용자에게 전달하지 않는 정적 경로 |
| 음성 의미 | `EmergencyStudy.tsx`의 고정 `scene.voice`, `EmergencySurface.tsx`의 저장 실패 제목 | 실제 저장·거절 상태와 다른 원고 선택 |
| 깨끗한 검사 | `tests/stable-voronoi-motion.spec.ts`의 직접 `.audit` write | 출력 부모 디렉터리 미생성 |
| 전체 실행 실패 | [display 기록](../../design-system/pleos-display-and-controls.md)의 마지막 전체 394/395, 단독 1/1 | maximum-duration 원인 미확정. 성공 재실행으로 해결 판정 금지 |
| 승인 문서 | [stable spec](2026-11-12-stable-voronoi-layout-design.md)의 visual-contract 링크 | 링크 대상 없음. 과거 사용자 미commit 문서로 기록됨 |

2026-11-12 live GitHub 조회에서 기본 브랜치는 `main`, merge/squash/rebase는 모두 허용, `main` branch protection은 404, 활성 ruleset은 빈 목록이었다. 이는 미래 실행 시 재조회할 환경 정보이지 정책 변경 허가가 아니다.

현재 환경에서 `prototype/web/node_modules`, README의 Android Studio JBR 경로, `~/Library/Android/sdk`는 없고 Google Chrome은 존재했다. 구현 실행 전 도구를 준비해야 한다. 이 계획 작성에서는 설치·빌드·테스트를 수행하지 않았다.

## 3. 공통 불변 조건

- `specs/emergency-experience/scenarios.json` version 0.2와 `glyphs.json`을 공유 입력 정본으로 유지한다. native를 쉽게 만들기 위해 SC05 state·effect·secondary action을 삭제하지 않는다.
- scope 밖 원본 `project.json`, `archive/`, 기존 board assets를 바꾸지 않는다.
- 통화 연결·전송·접수·도착·인계는 별개다. 확인한 접수·사실을 뒤늦은 미확인 결과나 화면 이동으로 낮추지 않는다.
- 조회·중단·재개·결과 수신은 전송 횟수를 늘리지 않는다. 명시적인 재승인 submit만 새 요청을 만든다.
- 승인 당시 scope·기록과 현재 draft를 분리한다. 기존 승인 snapshot·media bytes·request identity를 보존한다.
- 저장 요청과 durable commit 성공을 구분한다. 성공 표시·URL 복원·음성의 보관 주장은 실제 결과에 근거한다.
- editor remount, `key=revision`, 강제 blur, 입력 초기화로 동기화 문제를 숨기지 않는다. IME·caret·focus·미저장 Blob을 보존한다.
- 기존 layout·119 고정 core·material·C/C_02 preset·200% text·차량64/mobile48 touch 기준을 바꾸지 않는다.
- 테스트 삭제·skip·retry 증가·timeout 연장·worker 수 축소만으로 알려진 실패를 숨기지 않는다.
- 코드를 바꾸는 worker는 자기 작업 중 build/lint/test/formatter를 실행하지 않는다. 검증은 구현 통합 후 단일 검증 담당이 수행한다.

## 4. A — Android 공유 계약 복구

### 4.1 지원 경계

제품 UI 범위는 **현재 SC05의 11개 state 전체**다: `initial`, `checking`, `received`, `suspended`, `lookup_failed`, `not_received`, `review`, `sending`, `send_failed`, `arrived`, `handoff`.

SC01–SC04 화면 지원을 새로 주장하지 않는다. JSON parser가 유효한 fact override를 읽는 능력과 제품이 특정 scenario UI를 지원하는 범위도 구분한다.

### 4.2 모델과 로더

- 현재 `Fact`, `Request`, `Transition`, `Scene`, `Scenario`를 필요한 만큼 확장한다. 별도 cross-platform framework는 추가하지 않는다.
- `Transition`은 `id`, `label`, `to` 외에 실제 SC05에서 쓰는 `effect`, `agency`, `secondary`를 보존한다.
- `Scene`은 fact/request overrides와 `panel`을 보존한다. `fact_overrides`는 전부 거부하지 않고 존재하는 fact ID·허용 status·문자열 타입을 검사한다.
- 지원 manifest version, scenario/scene ID, 대상 state, 기관 ID, status·effect 값을 검증한다. 미지원 효과를 조용히 무시하지 않는다.
- 잘못된 입력은 진단 가능한 로딩 오류로 처리한다. 시작 guard를 삭제하고 잘못된 화면을 그리는 방식은 금지한다.

### 4.3 세션·전이

장면은 화면 projection이고 세션이 누적 사실의 정본이다. 세션에는 최소 sceneId, 기관별 requests, fact overrides, scope·기록 draft와 승인 snapshot, requestId·submissions, suspendedFrom을 둔다.

- `prototype/web/src/emergency/session.ts`의 SC05 의미를 기준으로 순수 전이를 작성한다.
- `receive`, `not_received`, `handoff`, `suspend`, `resume`, `submit`을 소비한다. 같은 scene으로 돌아오는 effect도 적용한다.
- 목적지 override는 기존 세션에 병합한다. 알려진 `received`를 `unknown/checking`으로 낮추지 않는다.
- 중단 중 접수·인계 결과를 수신해도 중단 화면은 유지하고 세션 상태만 갱신한다. 재개 시 누적 상태에 맞는 화면으로 간다.
- 초기 SC05 fixture는 기존 요청 identity·전송 횟수 1을 가진다. 조회·재개로 새 identity를 만들지 않는다.
- 미접수·전송 실패 확인 뒤 review에서 명시적 승인한 경우만 새 요청 identity와 승인 snapshot을 만든다. 중복 click은 한 submit으로 처리한다.
- 회전·activity recreation에서 전체 세션과 재질 선택을 복원한다. `rememberSaveable`에 실제 세션을 보존하며 sceneId만 저장하지 않는다. Back 종료 뒤의 영속 저장·실제 외부 요청 복구는 새로 구현하지 않고 한계를 명시한다.

### 4.4 UI

- primary·secondary action을 서로 다른 layout 위치에 배치한다. 동일 `Box` 좌표에 중첩하지 않는다.
- `review`의 scope panel에서 범위를 바꾸고 명시적으로 승인할 수 있어야 한다. 빈 scope 또는 선택한 사고 기록이 비어 있으면 전송을 막고 이유를 표시한다.
- receipt·resume 정보와 외부 결과 control을 현재 세션에서 계산한다.
- 11개 장면 선택 control은 좁은 검토 영역에서도 scroll/줄 배치로 접근 가능해야 한다. 시연 도구를 제품 영역과 구분한다.
- focus 이동·TalkBack 상태 알림·한국어 줄바꿈·font scale을 보존한다.
- API28–32의 Satin 미지원은 정상 fallback이다. 상위 API의 shader 성공·오류 경로와 하위 API fallback 기대값을 구분한다.

### 4.5 수용 기준

| ID | 관찰 가능한 결과 |
|---|---|
| A01 | 실제 공유 JSON으로 앱을 시작하고 SC05 11개 state를 모두 열 수 있다. |
| A02 | 조회→미확인/실패→재조회에서 기관별 상태·requestId·전송 횟수가 유지된다. |
| A03 | 중단→접수·인계 수신→재개에서 결과가 보존되며 재전송하지 않는다. |
| A04 | 접수 뒤 이동·재생성·늦은 미확인 결과가 접수·인계를 되돌리지 않는다. 도착과 인계를 서로 발명하지 않는다. |
| A05 | 미접수→scope 수정→승인→전송 실패→재승인에서 snapshot·횟수가 정확하고 취소·빈 범위·중복 click이 불필요한 전송을 만들지 않는다. |
| A06 | 복수 action을 각각 조작할 수 있고 font100/200%에서 주요 행동·시연 control에 접근 가능하다. |
| A07 | activity recreation 후 전체 상태·scope·승인 snapshot·재질을 보존한다. |
| A08 | 유효 override를 읽고 잘못된 참조·effect·version을 명시적으로 거절한다. 과거 SC03 override 일괄 거절 검사는 새 계약으로 교체한다. |
| A09 | API35 실제 emulator에서 지원 shader와 동작을, API28 실제 emulator에서 정상 fallback과 핵심 동작을 검증한다. APK build만으로 대체하지 않는다. |

## 5. B — 기록 신뢰성 복구

### 5.1 최초 durable commit과 URL

첫 저장 성공의 공통 경로에서 현재 case ID를 URL에 연결한다. `begin` 첫 시도만이 아니라 전역 재시도·다른 정상 저장 경로도 동일한 성공 계약을 소비한다.

- 실패한 case ID를 저장된 것처럼 URL에 먼저 publish하지 않는다.
- 현재 열려 있는 case의 commit만 URL을 바꾼다. 이전 case의 늦은 응답은 새 case를 덮지 않는다.
- fixture·device·study와 무관한 query를 불필요하게 초기화하지 않는다.
- 기존 case에서 새 case 시작이 실패한 경우에도 재시도 성공 후 새 case ID로 복원한다.

### 5.2 최신 진술과 미저장 draft

동기화 기준은 단순 aggregate revision이 아니라 **case ID와 실제 statement의 identity·revision**이다. 차량 event나 다른 필드 commit 때문에 타이핑을 초기화하지 않는다.

- clean editor는 최신 durable statement를 adopt하면 text·phase·editing·저장 상태를 함께 갱신한다.
- dirty text, pending audio, permission 대기, 녹음·저장 중 상태를 최신 props로 덮지 않는다.
- 충돌 후 명시적 최신 불러오기는 이전 text·pending Blob을 recovery로 보존하고 최신 진술을 실제 editor에 표시한다. 화면 밖 recovery와 화면 안 최신값을 구분한다.
- 숨겨진 editor와 실제 DOM value/IME 상태도 같은 정책을 따른다. 전환·재생성으로 draft를 없애지 않는다.
- 다른 observation 저장이나 동일 statement의 무관한 재렌더는 caret·selection을 유지한다.
- 별도 영구 DB schema나 일반화된 draft framework는 추가하지 않는다. 기존 recovery 계약을 확장한다.

### 5.3 경위서 문장 제한

- 100문장 상한을 UI와 domain이 공유하는 값으로 정의한다. validator의 독립 숫자 복제를 없앤다.
- 상한에 도달하면 문장 추가 불가와 한도를 읽을 수 있게 표시한다. 기존 100개 문장 수정·삭제는 가능하다.
- draft 작성 중 최신 aggregate가 바뀌어 추가가 거절되는 경우, 거절 결과를 editor로 전달하고 draft·입력 focus를 보존한다.
- 성공·입력 거절·저장 실패를 구분한다. `onCommand` 호출 직후 무조건 draft를 닫지 않는다.
- 저장 함수가 invalid reducer no-op를 저장 성공처럼 반환하는 경로를 해당 command 계약에서 제거한다. 필요 이상의 모든 command bus 재설계는 하지 않는다.
- consumer가 결과를 받도록 바꾸면 제품·catalog·test harness의 모든 호출부를 함께 이관한다.

### 5.4 수용 기준

| ID | 관찰 가능한 결과 |
|---|---|
| B01 | 최초 commit 실패→같은 화면에서 재시도 성공→device 전환 없이 reload하면 같은 case와 실제 입력을 연다. |
| B02 | 이전 case가 있거나 늦은 commit이 도착해도 URL은 현재 성공한 case를 가리킨다. 실패 중 성공 표시는 없다. |
| B03 | 두 탭 A/B의 진술 충돌 뒤 최신 불러오기에서 editor·전송 검토는 최신 진술을 표시하고 옛 draft는 recovery에서 확인된다. |
| B04 | dirty text·pending audio·IME 입력은 무관한 저장/위험 event로 손실되지 않는다. clean statement 변경만 자동 반영된다. |
| B05 | 99→100번째는 저장되고 101번째는 명시적으로 거절된다. 100번째 수정·삭제 후 다시 추가할 수 있다. |
| B06 | 한도 변화·quota·conflict 등 저장 실패 뒤 draft가 남고 성공으로 안내하지 않는다. |
| B07 | 승인 snapshot·기존 media bytes·late-result routing·revision 충돌 방어가 유지된다. |

## 6. C — 실제 상태 기반 음성 안내

### 6.1 단일 안내 선택 계약

`scene.voice`는 기본 원고다. 실제 Session과 storage 결과를 입력으로 받는 순수 guidance resolver를 두고 **화면의 보관·전송 설명과 음성 원고가 같은 의미를 소비**하게 한다.

resolver 입력은 Session, 현재 scene, 실제 persistence 가능 여부다. 출력은 선택 원고와 재생 context key다. 원고는 정확한 문자열로 기존 `guidanceAsset` 조회와 연결한다.

- `record_saved`이지만 storage 실패: 이 기기에 저장하지 못했고 현재 화면에만 입력이 남는다는 원고.
- SC04 `support/paused`에서 insurance가 `declined`: 거절/미전송 유지. `deferred`로 설명하지 않는다.
- 동일 장면의 insurance가 `deferred`: 보류로 설명한다. `not_sent`, `sent`, `received`, `failed`도 각각 실제 상태와 모순되지 않아야 한다.
- 보관 여부가 불확실한 상태에서 “기기에 보관돼요”를 확정하지 않는다.
- 새 storage 경고가 119의 긴급 행동을 숨기거나 자동 연결 timing을 늦추지 않는다.
- 같은 scene에서도 persistence·기관 상태가 바뀌면 context key가 바뀌고 기존 Audio를 취소한다. 수동 재생도 최신 원고를 사용한다.
- Web의 안내 녹음과 사용자의 진술 녹음은 다른 subsystem이다. C는 `VoiceRecordPanel`을 수정하지 않는다.

### 6.2 원고·asset

- 재사용 가능한 기존 정확한 원고·JaeGyu asset을 우선 쓴다. 의미를 바꾸는 단어 교체만 하고 과거 MP3를 연결하지 않는다.
- runtime 조건별 원고는 제안 경로 `prototype/web/src/audio/emergency-guidance.json`에 모으고 generator·lookup·검증이 같은 집합을 소비하게 한다. 기존 60개 scene과 journey 원고도 계속 포함한다.
- 신규 원고는 동일 voice/model/settings로 실제 MP3와 sidecar를 생성하고 scriptHash·audioHash·duration·source를 남긴다. 기존 asset을 hash가 같은 것처럼 덮어쓰지 않는다.
- 새 외부 과금은 goal query의 명시적 상한 안에서만 허용한다. 자격·할당량·권한이 없으면 필요한 asset 완료를 거짓 처리하지 않고 merge를 차단한다.
- 실제 파일 누락·재생 실패는 기존 error UI와 정확한 원고를 제공한다. 의도적으로 필요한 asset을 생략해 feature 완료로 삼지 않는다.
- 선택되지 않는 과거 asset 삭제는 사용처 확인 후 이번 변경으로 실제 불필요해진 것만 수행한다. 역사 자료는 별도 보존한다.

### 6.3 수용 기준

| ID | 관찰 가능한 결과 |
|---|---|
| C01 | 저장 차단 상태의 기록 저장 뒤 화면과 실제 선택·재생 원고 모두 저장 성공을 주장하지 않는다. |
| C02 | SC04 거절→다른 지원→중단에서 거절이 유지되고 보류라고 재생하지 않는다. |
| C03 | 보류 경로는 보류로, 같은 scene의 나머지 허용 상태는 해당 사실과 일치하게 안내한다. |
| C04 | 같은 scene에서 저장/기관 상태가 변하면 이전 재생을 중단하고 새 원고를 선택한다. scene·pagehide·hidden 취소도 유지된다. |
| C05 | 모든 도달 가능한 guidance 원고가 실제 asset·일치하는 hash·유효 duration을 가진다. 신규 파일을 decode하고 실제 browser에서 재생한다. |
| C06 | 안내 변경은 requestId·승인·전송 횟수·countdown을 바꾸지 않으며, 사람 청취를 하지 않았다면 했다고 기록하지 않는다. |

## 7. E — 깨끗한 검증과 실패 규명

### 7.1 출력 경로

- `stable-voronoi-motion.spec.ts`의 직접 `.audit` write를 Playwright `testInfo.outputPath`·attachment로 통합한다. 사람이 먼저 디렉터리를 만들 필요가 없어야 한다.
- diagnostic 출력은 worker/test별 격리한다. 기본 `test-results`를 여러 Playwright process가 공유하지 않는다.
- 테스트를 통과시키기 위한 영구 `.audit` 디렉터리·빈 marker 파일은 추가하지 않는다.

### 7.2 maximum-duration 실패

마지막 전체 실패는 사실로 취급한다. 단독 성공은 해결 증거가 아니다. 다음 경계를 기존 로그·trace·코드와 필요한 계측으로 분석한다.

1. `page.clock`의 Date/timer와 실제 AudioContext·MediaRecorder encoder의 서로 다른 시간.
2. stream 준비·최초 유효 audio data·권한·React listening effect 설치 시점.
3. 120초 전환과 `active.stop()`·`finished`·중복 finish의 경쟁.
4. pagehide/visibility·cleanup·test 병렬 부하에 의한 상태 변화.
5. Blob의 실제 bytes·decode·duration과 save action의 enabled 조건.

이 항목들은 **가설 목록**이며 원인으로 확정하지 않는다. E가 원인·실패 상태·기대 순서를 기록하고, 제품 원인이면 B에게 소스 수정을 넘긴다. 테스트 원인이면 E가 readiness와 시간 제어를 고친다. 임의 sleep 증가·fake 녹음·skip·재시도 통과는 해결책이 아니다.

### 7.3 검증 운용

- 구현 통합 후 기존 coverage를 먼저 확인해 필요한 consumer-visible regression만 추가/갱신한다.
- targeted gate를 한 번 실행한 후 최종 전체 gate를 한 번 실행한다. 수정 뒤 새 실패가 있으면 artifact를 분석해 수정하고 영향 gate를 다시 실행한다. 같은 source를 반복 실행해 green을 골라 쓰지 않는다.
- 최종 Web full suite는 기존 병렬성을 유지한다. clean 환경 검사만 선택 실행으로 별도 증명할 수 있으나 full gate를 workers=1로 대체하지 않는다.
- maximum-duration은 실제 MediaRecorder bytes·review 진입·모든 track 종료·자동 저장 안 함을 검사한다. encoder를 빈 mock으로 바꾸지 않는다.
- root 보드 감사, manifest, build, Web full suite, Android build·instrumentation의 명령·개수·실패를 각각 기록한다. 과거 통과 개수 395에 새 결과를 억지로 맞추지 않는다.

### 7.4 영구 증거 계약

미래 실행 산출물은 `evidence/contract-reliability-repair/`에 보존한다. 아래 경로는 산출물 계약이며 현재 존재·통과를 주장하지 않는다.

| 산출물 | 필수 내용 |
|---|---|
| `run.json` | UTC 시간, OS/arch/toolchain, tested commit·기준 branch, 명령·exit status·결과 수, 시연 환경·미검증 범위 |
| `source-sha256.json` | 검사 대상 제품 소스·테스트·설정·공유 JSON·음성/media 자산의 경로·SHA-256. 증거 자체는 재귀 hash하지 않음 |
| `requirements.json` | 이 스펙의 모든 A/B/C/E/D ID별 status·검사·evidence 경로 |
| `failure-analysis.md` | maximum-duration의 관찰·원인·수정·과거 실패와의 관계·새 regression 근거 |
| `web/` | targeted/full 원문 결과 `.txt`, 실패 trace(발생 시), normal-motion 원시 frame JSON·대표 screenshot·음성 재생 기록 |
| `android/` | API별 환경·instrumentation XML/결과·실제 screenshot·activity recreation 기록 |
| `audio/` | 신규 원고/asset 지문·decode 결과·권한/과금 사용량 합계(비밀 제외) |

테스트 outputPath의 자료를 검증 담당이 이 보존 위치로 복사한다. `.audit`·`/tmp`·개인 Downloads만 가리키지 않는다. 로그는 root `.gitignore`의 `*.log` 규칙에 걸리지 않도록 `.txt`로 보존한다. 긴 frame 자료는 무손실 압축 가능하나 요약만 남기지 않는다. screenshot만으로 timing을 주장하지 않는다.

테스트용 합성 입력만 사용하고 토큰·개인 경로·실제 사고 기록을 제거한다. 원문 로그를 손대지 않고 남겨야 하는 경우 먼저 안전한 환경으로 실행한다. 민감한 원문이 생겼으면 공개 업로드하지 말고 누락 이유와 비밀이 없는 동등 증거를 남긴다.

검사 실행 commit 뒤 증거·문서만 추가 commit하는 경우 tested commit과 최종 HEAD를 모두 명시한다. 최종 제품·검사·설정·자산 지문이 검증 당시와 같음을 증명한다. 제품 입력 변경이 있으면 해당 gate를 무효화하고 다시 검증한다. 증거 커밋을 실행하지 않은 tested commit으로 위장하지 않는다.

### 7.5 수용 기준

| ID | 관찰 가능한 결과 |
|---|---|
| E01 | `.audit` 없는 설치 환경에서 normal-motion 검사가 출력 경로 오류 없이 실행되고 실제 frame attachment를 남긴다. |
| E02 | maximum-duration 원인과 causal fix가 기록되고 targeted 및 병렬 full suite에서 실제 녹음 계약을 통과한다. 원인 미확정+단독 성공으로 닫지 않는다. |
| E03 | 기존 root·manifest·Web build/full·Android 요구 gate가 모두 통과하며 skip·retry·timeout으로 범위를 숨기지 않는다. |
| E04 | 원시 증거를 tracked 경로 또는 PR에 연결된 영구 artifact로 독립 열람 가능하다. 개인 임시 경로는 유일한 근거가 아니다. |
| E05 | 최종 코드/자산 지문·review 대상·merge 대상의 관계와 모든 요구 ID의 결과가 추적된다. |

## 8. D — 정본과 문서 승계

### 8.1 누락 visual contract

1. 현재 checkout·사용자 제공 파일·Git에 실제로 남은 이력에서 원문 복원 가능성을 확인한다. 과거 대화만으로 사용자 승인 수치를 만들어내지 않는다.
2. 원문을 찾으면 source revision·작성/승인 근거·후속 대체 범위를 기록해 복원한다.
3. 찾지 못하면 같은 링크 대상 경로에 **복원본이 아닌 현행 구현 기준 문서**를 작성한다. 상단에 원문 미확보·사용자 세부 승인 미확인을 표시하고, stable spec·display 문서·현재 token/source에서 직접 확인한 규칙별 출처를 남긴다.
4. 새 문서에 근거 없는 “승인된 정본”이라는 지위를 주지 않는다. 이를 가리키는 현재 문서에는 명시적 정정/승계 안내를 추가한다. 과거 승인 문구를 조용히 역사에서 지우지 않는다.
5. 충돌하는 근거를 코드에 유리하게 임의 선택하지 않는다. 최신 명시 결정→날짜가 있는 후속 spec→현행 구현 관찰을 구분하고 미확정 사항은 그대로 표시한다.

### 8.2 현재 문서

다음 문서의 현재 설명과 역사 기록을 분리한다.

- root·Web·Android README: 실제 root route, 실행 전제, 현재 native 지원, 실제 입력과 합성 연계, 저장 범위·복구, 안내 MP3, 실제 recorder 출력.
- `prototype/web/SOURCES.md`: 현재 `CareSurface` 계층과 역사 Halo 비교안, 복사 source·license.
- `specs/after-care-system/design.md`: 최신 typography·touch·semantic palette·bounded/document 결정과 superseded 범위.
- `specs/after-care-system/inventory.md`: 과거 PASS와 현재 실행 결과·source 지문을 분리. 전체 state 수와 asset 수를 실제 데이터에서 갱신.
- `specs/emergency-experience/voice-selection.md`, `visual-language.md`: static MP3·runtime 상태별 선택, 과거 미연결/TTS 설명의 적용 시점.
- 관련 plan/result: 과거 원문을 남기고 상태 정정·후속 문서를 연결. 사람 청취 체크와 증거의 불일치를 해소.
- 과거 Satin 검사 링크: 현재 파일인 것처럼 대체하지 않고 역사 링크/삭제 사실을 명시하거나 실제 보존 revision으로 연결.

### 8.3 완료 추적

`specs/after-care-system/completion.md`를 만들고 원래 goal의 5개 목표·진행 방식·완료 기준 각각을 현재 source·실행 증거·영상·PR과 매핑한다.

- 이번 repair 완료 표와 전역 목표 완료 표를 따로 둔다.
- 상태는 verified / implemented-unverified / unmet / blocked / historical로 구분한다. 단순 파일 존재를 verified로 삼지 않는다.
- 미실시 사람 청취·실차 검증, 부재한 과거 영상, 미완료 전역 영상은 정확히 남긴다.
- 실제 완료하지 않은 목표를 완료로 바꾸지 않는다. 이 구분을 명시한 repair의 정상 merge는 가능하지만 “전역 목표 전체 완료”라고 전달하지 않는다.

### 8.4 수용 기준

| ID | 관찰 가능한 결과 |
|---|---|
| D01 | visual-contract 링크가 유효하고 원문 복원/현행 재구성의 출처·승인 상태가 명확하다. |
| D02 | README·design·음성 문서가 현재 route·layout·native 지원·저장·재생·녹화 script를 정확히 설명한다. |
| D03 | 과거 PASS·미착수 문구·청취 체크의 적용 시점과 정정이 추적되고 최신 검사 결과와 혼동되지 않는다. |
| D04 | 원래 전역 goal의 모든 항목에 현재 상태·근거·미충족 이유가 연결되며 repair 결과와 구별된다. |
| D05 | 이번 추가/변경 문서의 로컬 링크가 유효하고 역사 링크의 부재를 숨기지 않는다. |

## 9. 완료·머지 gate

이번 repair 완료는 A01–A09, B01–B07, C01–C06, E01–E05, D01–D05의 **32개 요구**를 모두 충족했을 때다. 원래 전역 목표의 unmet 항목은 D04에 정확하게 기록하되 repair 요구를 미완료로 남겨 merge하지 않는다.

- 독립 reviewer가 실제 변경·스펙·원시 증거를 검토한다. 해결되지 않은 blocker/major/high 또는 P1/P2 correctness·data-loss finding은 merge 차단이다.
- 도구 부재·Android 실행 불가·필수 음성 asset 생성 권한 부재·required check 실패·base 충돌은 완료로 간주하지 않는다.
- integration owner 하나만 commit·push·PR·merge한다. 작업 branch에서 PR을 만들고 main 직접 push·force push·보호 우회를 금지한다.
- 실행 시 GitHub 정책을 다시 확인한다. 현재 보호가 없더라도 위 로컬/실행 gate를 생략하지 않는다.
- 최종 PR HEAD와 base를 확인하고 지원되는 expected-head 보호를 걸어 squash merge한다. 서버 정책이 squash를 금지하면 허용된 일반 merge로만 변경하고 이유를 남긴다.
- base/head가 바뀌거나 제품 지문이 바뀌면 기존 merge 승인·관련 검증을 무효화한다. 규칙·review 권한을 우회하지 않는다.
- 상세 절차·명령·파일 소유권과 결과 보고는 실행 계획을 따른다.
