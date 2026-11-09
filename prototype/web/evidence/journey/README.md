# 사고 대응 전체 여정

차량 대응에서 mobile 현장 기록, 사고 내용 확인, 보험사 접수, 후속 처리까지 연결한 local prototype.

## 실행

`prototype/web`에서 `npm run dev` 실행 후 아래 route 사용.

- 전체 여정: `http://127.0.0.1:5173/?study=journey`
- Mobile 시작: `http://127.0.0.1:5173/?study=journey&device=mobile`
- 표현 기준: `http://127.0.0.1:5173/?study=journey-catalog`
- 기존 SC01–SC05: `http://127.0.0.1:5173/?study=emergency`

Review shell에서 상황을 선택하고 **이 상황으로 시작** 실행. 차량·mobile 전환은 같은 browser의 같은 case를 표시. 다른 기기로 보내거나 실제 sync하지 않음. 외부 결과는 review shell에서 명시적으로 입력.

## 구현과 검증

| Task | 결과와 근거 |
| --- | --- |
| 1 | [공통 catalog와 대표 화면](task-1/) |
| 2·3 | `case.ts`, `case-validation.ts`, `case-store.ts`. Domain·storage test에서 revision, atomic commit, Blob 불변성, quota·충돌·손상 복원 검증 |
| 4 | [차량 상태와 mobile 연결](task-4/) |
| 5·6 | 현장 사진과 음성 기록. `journey-evidence`, `journey-voice`, `journey-save-recovery`에서 권한·입력·저장·긴급 중단 검증 |
| 7 | [영상과 도식](task-7/) |
| 8 | [경위서와 근거 확인](task-8/) |
| 9 | [승인 snapshot과 독립 접수·공유](task-9/) |
| 10 | [후속 처리 통합](task-10/), [작은 화면과 실패 상태](task-10-ui/) |
| 11 | [전체 flow·시각·접근성 검증](task-11-2026-11-10/README.md). 당시 221개 test, manifest 12개, build 통과. 최신 regression은 [최종 review](final-review-2026-11-10/README.md)의 241개 |
| 12 | [최종 V4 영상과 coverage 검증](final-review-2026-11-10/README.md). 175.7초, 47개 checkpoint, 전체 decode 통과. [이전 V3 기록](task-12-2026-11-10/README.md) 보존 |

## 영상 재생성

Chrome, FFmpeg, FFprobe와 실행 중인 local dev server 필요. `prototype/web`에서 실행.

```sh
node scripts/record-journey-flow.mjs /absolute/path/journey-flow.mp4
```

새 절대 경로 사용. 기존 MP4나 같은 이름의 JSON이 있으면 시작 전에 거절. 기본 무음. 결과는 2560×1440 H.264 MP4와 장면별 timeline·coverage JSON.

차량 2560×1440과 mobile 393×852를 각각의 native viewport로 녹화. 같은 임시 browser profile을 다시 열어 실제 IndexedDB 기록을 복원. 다른 context로 임의 case를 주입하지 않음. Mobile footage는 비율을 유지해 가운데 배치. 초기 browser 준비와 device preview 전환의 재시작 구간만 제외.

제품 button으로 입력·검토·승인 진행. 외부 결과와 기기 보기·전역 이동은 기존 review control의 handler를 실행. 영상에서는 review shell을 숨기며, 해당 action은 JSON의 `hiddenByRecordingLayout`에 기록. App state를 직접 바꾸거나 편집으로 성공 결과를 만들지 않음.

최종 영상은 `/Users/janghyunbin/Downloads/journey-flow-2026-11-10-v4.mp4`. 독립 review의 Important 6건을 fix한 code에서 재녹화. [최종 장면별 coverage와 검증 근거](final-review-2026-11-10/README.md) 제공. [이전 V3 기록](task-12-2026-11-10/README.md)은 보존.

## 시연 경계와 남은 제약

- 사진·영상은 직접 작성한 [합성 media](../../public/journey-samples/SOURCES.md). 음성 입력은 [offline sample](../../public/journey-samples/SOURCES-VOICE.md). 실제 사고나 사용자 개인정보 없음.
- 이 영상의 음성 sample은 JaeGyu 제품 TTS가 아님. ElevenLabs 생성·credit 사용 없음. 실제 microphone 입력에는 sample 문장을 넣지 않으며 STT 미연동 시 playback과 직접 입력 제공.
- 통화 연결·접수·현장 도착은 별개 상태. 기관 접수번호는 명시적 외부 결과에 있을 때만 표시. 전송 전에는 수신처·목적·선택한 실제 내용을 검토.
- 실제 전화·기관 전송·외부 upload·유료 API·기기 간 sync·정비 예약은 수행하지 않음. 실제 기기·기관·지도 연동은 Not verified.
- 권한 거절·quota 실패·과거 요청의 늦은 callback은 test로 검증. 영상에 모든 가능한 실패 조합이 포함된 것은 아님. Fixture 진입 수와 모든 transition coverage를 같은 수치로 표현하지 않음.
- Browser 저장소의 외부 손상으로 Blob이 사라진 case는 복원하지 않음. 원문과 승인 기록은 자동 삭제하지 않지만 부분 복원 UI는 제공하지 않음.
- 기존 500kB 초과 bundle 경고 유지. 실사용 성능·이해도 평가·공식 Pleos 적합성 검증은 미수행.
- 충돌한 임시 기록은 누적 보존하며 개별 복원과 사본 내려받기 제공. Browser 강제 종료 전에는 복원하거나 사본을 보관해야 함.
- 차량 상세 뒤에서 숨겨진 dashcam이 계속 재생되는 Minor 1건은 남음. 현재 sample은 무음.
- Legacy import와 전체 case 삭제는 storage API와 test로 제공하며 별도 관리 UI는 없음.
- Local commit만 수행. Push·merge·Funnel 갱신 없음.
