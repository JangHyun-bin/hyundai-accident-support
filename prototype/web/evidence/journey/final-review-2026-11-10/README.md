# 전체 여정 최종 review와 검증

2026-11-10. 기존 12개 Task 이후 독립 review에서 발견한 Important 6건을 root가 한 번의 fix pass로 처리. 제품 code 변경 뒤 최종 regression과 영상 재검증을 진행하는 기록.

## 독립 review와 fix

`journey_final_review`가 `563445d..5c46df2` 전체 변경, spec, plan, 판단 기록을 읽고 실제 browser에서 재현. Critical 0건, Important 6건, Minor 1건. [발견 내용](independent-findings.txt)과 [media·충돌 재현](before-media-conflict.txt), [draft·삭제 재현](before-drafts.txt), [위험·인계 재현](before-state.txt) 보존.

| Finding | 사용자에게 달라지는 동작 | 검증 |
| --- | --- | --- |
| F1 충돌 복구 | 연속 충돌의 임시 기록을 누적 보존. 경위서·도식·점검 선택을 읽고 개별 복원 가능. 전체 JSON과 media 사본 내려받기 제공 | 두 차례 충돌, JSON 내용, 개별 복원, 승인 snapshot 불변과 재확인 |
| F2 미저장 종료 | 사진·도식 draft, 대기·실패한 저장, 복구 사본이 있으면 browser 이탈 경고 | 실제 reload 취소 후 draft 유지, 저장 후 경고 해제, editor 종료 뒤 quota 실패 보호 |
| F3 WebM 검토 | 실제 MediaRecorder가 만든 native duration Infinity audio를 decode한 길이로 검증 | 실제 WebM 검토·승인, 유효 구간 허용, 범위 초과 거절 |
| F4 위험 표시 | 현재 위험 observation을 차량·mobile 대응 화면에 명시 | 두 화면의 alert와 원래 경위서 복귀 확인 |
| F5 구호 인계 | SC05 인계 결과를 observation으로 보존하고 차량 사실 표시에 반영 | source·확인 상태 검증, 기관 요청·submission 불변 |
| F6 자료 삭제 | 참조 없는 사진의 Blob 제거. 과거 경위서·승인·공유가 참조하면 보존 사실 안내 | 실제 IndexedDB bytes 제거, 세 종류 이력의 원본 보존 |

[RED](red.txt)에서 원인에 맞는 12개 실패 확인. [Targeted GREEN](targeted-green.txt) 40개 통과. 이후 추가한 share·report 이력 보존 검사도 전체 regression 대상. 재검토 agent를 반복 호출하지 않고 RED→GREEN과 전체 suite로 fix 검증.

## 실제 화면 확인

[393px 복구 화면](recovery-393.png), [360px·200% text](recovery-360-200.png), [mobile 위험 표시](risk-mobile.png), [차량 위험 표시](risk-vehicle.png)를 직접 확인. 복구 문장과 행동의 전체 label 노출, 가로 overflow 없음. 위험 정보는 기관별 접수 상태와 별도 표시. [Browser probe](browser-probe.txt)는 실제 WebM 열기 성공과 충돌 text 접근, 360px에서 scrollWidth 360을 기록.

## 완료 조건의 근거

| Task | 현재 구현과 요구 조건을 확인하는 근거 |
| --- | --- |
| 1 | JourneyCatalog·JourneyLayout·semantic tokens. journey-design과 emergency-flat의 대표 화면, 긴 문구, 200% text, 두 차량 크기, reduced motion. 기존 task-1 시각 기록 |
| 2 | case·case-validation·journey-fixtures. journey-domain의 legacy 승인·기관 identity·알 수 없는 command·상충 observation·긴급 전환과 시각 guard |
| 3 | case-store. journey-storage의 atomic transaction, reload, 동시 편집, quota, cross-case 차단, Blob 불변성, 12장·15MiB·150MiB 한도, 명시적 import와 삭제. F6의 실제 미참조 Blob 제거 |
| 4 | JourneyStudy·VehiclePanel·EmergencySurface. journey-vehicle과 기존 emergency tests의 출처·미확인·지도 부재·device 전환·긴급 event 보존. F4 위험 가시성 |
| 5 | EvidencePanel·capture. journey-evidence의 MIME·decode·camera frame·권한 거절·복수 사진·교체·skip·실패 복구, F2 종료 경고 |
| 6 | VoiceRecordPanel·voice-capture. journey-voice의 실제 MediaRecorder·level·120초 제한·track 종료·STT 부재·5000자·저장 실패·긴급 중단·sample provenance. F3 실제 WebM 승인 |
| 7 | ClipPlayer·DiagramEditor와 합성 media. journey-reconstruction의 영상 누락·decode·seek, drag와 keyboard 좌표·undo·정정 후 확인 해제·지원 도로 제한. F2 도식 보호 |
| 8 | ReportPanel·evidence-media. journey-report의 근거 drawer·focus·정정·원문·늦은 결과·broken reference·불변 snapshot. F1 충돌 후 경위서 복원 |
| 9 | SubmissionPanel·makeSubmission·makeShare. journey-submission의 recipient·선택·실제 payload·중복 승인·commit 실패·늦은 결과·기관 독립성·접수번호·별도 공유 |
| 10 | FollowUpPanel과 후속 command. journey-follow-up 및 UI tests의 조회 실패·오래된 정보·정비 항목 검토·경로·대차 provenance·긴급 복귀·reload |
| 11 | journey-flow·journey-visual과 전체 기존 emergency·glyph tests. V1–F1 실제 조작, SC02·SC03·SC05 연결, 권한·저장 실패, keyboard·focus·긴 문구·contrast·200% text |
| 12 | record-journey-flow.mjs. 최종 code에서 차량·mobile 실제 browser footage, 47 checkpoint, 8 fixture, 11 feature. 기존 output 거절과 V3 검증 기록은 과거 evidence에 보존 |

각 test의 assertion은 구현과 연결된 동작을 검증. 이 표의 검증 범위는 모든 입력 조합이나 실기 안정성의 증명이 아님. 세부 test 명령·결과와 최종 영상 정보는 아래 최종 실행 기록에 추가.

## 남은 제약

- Deferred minor. 차량 상세를 열면 숨겨진 dashcam이 계속 재생됨. 현재 sample은 무음. 재생·자원 문제이며 별도 개선 대상으로 남김.
- 충돌 사본은 메모리에 보존. 사용자가 복원하거나 내려받기 전 강제 browser 종료·OS 종료는 보호하지 못함. 정상 이탈은 경고 제공.
- 외부 IndexedDB 손상으로 승인 media가 사라진 case는 fail-closed. 원문을 자동 삭제하지 않지만 부분 복구 UI는 없음.
- Legacy import와 전체 case 삭제는 검증한 storage API. 별도 사용자 관리 UI는 없음.
- 실제 camera·microphone, 차량 화면·audio focus, non-Chrome lifecycle, 기관·지도 연동, 실제 기기 sync는 Not verified.
- 실제 전화·기관 전송·upload·유료 API·예약·push·merge·public preview·Funnel 갱신은 goal에서 제외. 기존 안전 문구 재사용, 새로운 의료·법률 판단 없음.
- 공식 Pleos 적합성, 공개 음성 사용권, 실사용 성능 검증 미수행. 기존 500kB 초과 bundle 경고 유지.

## 최종 실행 기록

제품 source commit `7748808d8ffb0c79f7492d6d46d8e5e296ba2e8d`.

- [전체 regression](regression.txt) 241/241 통과, 5.8분, exit 0.
- [Manifest](manifest.txt) 12/12 통과, exit 0.
- [TypeScript·Vite build](build.txt) 통과, exit 0. 기존 bundle 경고 유지.
- 기존 emergency manifest와 emergency.css는 base 이후 변경 없음. 새 기능은 journey route에 연결.
- 기존 SC04 screenshot 14개는 test가 재생성한 뒤 HEAD의 역사적 원본으로 복원.

```sh
# repository root
node --test specs/emergency-experience/manifest.test.mjs
# prototype/web
npm run check
npm run test:ui -- tests/journey-*.spec.ts tests/emergency-*.spec.ts tests/glyphs-data.spec.ts --workers=1 --output=/tmp/hyundai-final-suite
```

## 최종 영상

- `/Users/janghyunbin/Downloads/journey-flow-2026-11-10-v4.mp4`
- H.264, 2560×1440, 30fps, 무음, 175.666667초.
- SHA-256 `c58dfaa4de053cd442d17d5bc61c8c094b7bc930dd91de7749d129317148c958`.
- [Timeline](timeline.json)의 sourceCommit은 위 제품 commit과 일치. 47개 checkpoint, 8개 fixture, V1–F1의 11개 feature 포함.
- [녹화](recording.txt)와 [전체 decode·상태 검증](video-verification.txt) 모두 exit 0. Runtime pageerror 0개.
- 실제 영상의 모든 checkpoint를 추출한 [1](contact-1.png), [2](contact-2.png), [3](contact-3.png), [4](contact-4.png)를 직접 확인.
- [음성 검토](voice-review.png), [문장 근거](report-evidence.png), [중단 후 재개](resumed-without-resending.png)는 개별 크기로 추가 확인. 잘린 mobile footage나 가짜 접수 완료 없음.

Vehicle/mobile native viewport를 각각 녹화하고 비율을 보존해 배치. 같은 임시 browser profile을 다시 열어 실제 저장 기록 복원. Browser 준비·재시작 시간만 제외. 제품 행동과 외부 결과의 구분은 timeline에 기록. V1–V3 파일과 과거 검증 문서는 보존.

12개 Task와 spec의 완료 조건을 현재 code·전체 tests·독립 review·직접 시각 검토·최종 영상에 대조. Goal 범위의 미완료 항목 없음. 위의 실기·실서비스 제외 조건과 Deferred minor는 완료 주장에 포함하지 않음. [실행 ledger와 판단 원문](execution-ledger.md)에 전체 결정과 검증 이력 보존.
