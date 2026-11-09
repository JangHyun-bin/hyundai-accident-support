# 전체 여정 영상 검증

2026-11-10. 제품 source commit `f66bd9d0d20aee1c05b80427127f2f7bf69bebdc`. 이후 Task 12 commit은 recorder와 문서·검증 자료만 추가.

## 결과

- 영상: `/Users/janghyunbin/Downloads/journey-flow-2026-11-10-v3.mp4`
- 형식: H.264, 2560 × 1440, 30 fps, 무음, 175.666667초.
- SHA-256: `8754d036b7b2cdf1a60e1e33cc9d0fd4f3346b91f6f8c498c7a47e1bc06a4b29`
- [Timeline과 action·coverage](timeline.json): 47개 checkpoint, 8개 fixture, V1/V2/H1/R1/R2/R3/C1/C2/S1/S2/F1 모두 포함.
- [전체 decode와 metadata 검사](video-verification.log) exit 0. FFprobe stream 한 개, audio 없음. Timeline 순서·case 동일성·resume scene·요청 이력 보존 검사 통과.
- [전체 regression](regression.log): 226/226 통과. [Manifest](manifest.log): 12/12 통과. [TypeScript·Vite build](build.log): 통과, 기존 500kB 초과 chunk 경고 유지.

## 직접 검토

47개 실제 영상 frame을 추출한 [1](contact-1.png), [2](contact-2.png), [3](contact-3.png), [4](contact-4.png)를 모두 확인. Voice review, 경위서 근거 drawer, [중단 후 재개](resumed.png)는 개별 크기로 추가 확인.

차량의 상황/대응 box와 지도 분리, mobile 전환 후 gray padding 없음, 입력·근거·승인·접수·공유·후속 처리의 내용 변화 확인. 자료 없음과 미확인은 성공으로 바뀌지 않음. 중단 중 받은 접수 결과를 보존하고, 재개 시 접수 확인 제목과 같은 요청 이력 표시. 재생 가능한 실제 browser footage이며 장면을 합성해 성공 상태를 만들지 않음.

V1 영상은 live viewport resize로 생긴 mobile 여백 때문에 채택하지 않음. V2 영상은 SC05 resume 후 제목이 중단 상태로 남는 실제 bug를 발견해 채택하지 않음. 두 파일 모두 Downloads에 보존.

## 영상 검토에서 발견한 fix

SC05 resume의 `suspended` 값만 바뀌고 scene cursor가 그대로 남던 문제와 차량 surface 전체가 `inert`가 되던 문제 fix. 기존 transition에서 cursor·suspendedFrom만 채택하고 기관별 상태·submission은 유지. [RED 3개](resume-red.log)에서 실제 heading 부재와 클릭 불가 재현. [Targeted GREEN 23개](resume-green.log)와 전체 regression으로 toolbar·차량·mobile, reload·재중단·재개·중복 요청 방지 검증.

차량 시각 test는 async navigation 전에 row를 측정해 두 test 실패. 세 row를 기다린 뒤 같은 baseline을 측정하도록 fix 후 시각 test 5/5 및 전체 226/226 통과. 검사 기준을 낮추지 않음.

## 재현

`prototype/web`에서 dev server가 실행 중일 때 새 절대 경로 사용.

```sh
node scripts/record-journey-flow.mjs /absolute/path/new-journey-flow.mp4
ffprobe -v error -show_streams -show_format /absolute/path/new-journey-flow.mp4
ffmpeg -v error -xerror -i /absolute/path/new-journey-flow.mp4 -f null -
```

기존 MP4를 output으로 넣는 거절 동작과 해당 파일 SHA-256 불변 확인. Vehicle/mobile native viewport를 같은 임시 browser profile에서 따로 녹화하며 실제 IndexedDB 복원을 사용. Browser 준비·재시작 구간만 제외. 제품 입력은 실제 UI, 외부 결과는 review control을 통해 입력. 숨긴 review control 실행은 JSON에 기록.

## 경계

전체 fixture 진입 coverage는 모든 가능한 transition 조합의 영상 coverage를 의미하지 않음. 권한 거절·quota 실패·과거 요청 callback은 test로 검증. 실제 전화·기관 전송·유료 API·기기 sync·예약·push·merge·Funnel 갱신 미실행. 상세 제약과 media 출처는 [전체 여정 안내](../README.md) 참조.
