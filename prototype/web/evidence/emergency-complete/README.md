# SC01–SC05 전체 Web flow 검증 · 2026-11-09

승인된 상단 상황 / 하단 대응의 독립 rounded box, gap 24px, flat pictogram, 큰 phone와 가로 spectrum 유지. 5개 scenario, 60개 장면 구현. 영상은 이 code를 검증한 뒤 같은 UI를 직접 조작해 제작.

## 구현과 근거

| 요구 | 구현 | 검증 |
| --- | --- | --- |
| SC01 부상·이동 가능·운전자/경로 미확인 | 취소·재연결·실패·끊김, 무응답 통화·접수·인계, 기록 | 기존 urgent/call tests + complete의 SC01 무응답 경로 |
| SC02 이동 불가·차량 지원·기록 | 승인 전 전송 없음, 실패 후 재확인, 대기 중 기록, 기존 접수 조회·도착 | complete의 SC02 연결 경로·reload·요청 수 보존 |
| SC03 무응답·위험 정보 | 위험 갱신 중 countdown 유지, 응답 전 통화·인계, 늦은 응답 | complete의 SC03 경로 + timer regression |
| SC04 거절·보류·재개 | 기록 정정, 수신처·목적·선택 항목, 다른 지원 확인, 재승인 | complete의 거절→reload→보류→재승인→실패→재승인→접수 |
| SC05 중단·복원·중복 방지 | 기존 요청 identity와 승인 snapshot 보존, 미접수 확인 후만 재요청 | 중단 중 접수→reload→재개, 조회 실패/미확인/미접수·재승인 tests |
| 접수·도착·인계 독립 | 같은 기관의 접수 확인만 갱신, 구호 인계는 차량 도착 전에 가능 | 독립 인계→중단→reload·재개 test |
| 입력·저장 실패 | 비어 있는 기록/전송 범위 차단, 500자 제한, storage 검증·차단 경고 | invalid storage·차단·중복 click tests |
| 승인 snapshot | 전송한 범위와 기록 보존, 새 draft의 승인 여부 분리 | SC02 기록 편집 후 acceptedScope 보존 |
| Design 일관성 | 공유 workflow component와 catalog, 상태별 의미·기관 row 정렬 | flat/type scale/contrast/glyph tests |
| 전체 장면 배치 | desktop/mobile 각각 60개 screenshot | palette·overflow·영역 겹침·target 크기·console/network 검사 |
| Motion | 기존 view transition·countdown·press, reduced motion 유지 | motion/call symbol tests |

## 실행한 검사

- `npm run check`: TypeScript와 Vite build 통과. Bundle 542.21 kB / gzip 163.04 kB; Vite의 500 kB 안내 warning 유지.
- `node --test specs/emergency-experience/manifest.test.mjs`: 12/12 통과. 전체 전이·source·도달성·기관 상태 검사.
- `npm run test:ui -- --workers=2`: 88/88 통과. [전체 log](ui-tests.txt).
- 마지막 문서 pictogram 적용 후 `emergency-glyphs`, `glyphs-data`, `emergency-visual`: 19/19 재검증 통과. [Log](glyph-visual-tests.txt).
- `git diff --check`, recording script의 `node --check` 통과.
- 5개 contact sheet를 직접 시각 검수. 최종 SC04 전송 범위 화면을 원본 크기로 재검수.

[SC01](contact-SC01.png) · [SC02](contact-SC02.png) · [SC03](contact-SC03.png) · [SC04](contact-SC04.png) · [SC05](contact-SC05.png)

[Desktop screenshots](desktop/) · [Mobile screenshots](mobile/) · [Source hashes](source-sha256.json)

## 실행과 상태 복원

`prototype/web`에서 `npm run dev` 실행 후 `http://127.0.0.1:5173/?study=emergency` 접속. `?study=emergency-catalog`은 현재 component catalog.

화면 button은 session 상태를 변경. `외부 결과 시연`은 기관 결과를 가상 입력. 상단 scenario/장면 선택은 검토 fixture를 새로 시작하므로 저장된 작업 복원용 control이 아님. 동일 URL reload 또는 scene을 지정하지 않은 scenario URL은 localStorage snapshot 복원. 실제 `나중에 이어하기`는 외부 요청을 취소하지 않음.

정책 가정은 [설계 문서](../../../../docs/superpowers/specs/2026-11-09-complete-scenarios-design.md). 실제 기관 연동·차량 신호·Android 이식·운전 중 이해도 평가는 이번 범위 밖. 저장은 같은 browser에 한정.

## Review에서 해소한 문제

1. SC01 자동 연결 뒤 무응답이 계속되면 외부 결과를 받을 수 없던 경로에 실패·재시도·통화·접수·인계를 추가.
2. 기록 편집이 기존 요청의 승인 snapshot을 지우던 문제를 draft 승인 여부 분리로 fix.
3. 구호 인계가 차량 지원 도착에 종속되던 문제를 독립 event·fact로 fix. 확인된 인계를 미확인이라고 안내하던 문구도 정리.
4. 같은 장면의 위험 정보 갱신이 countdown을 다시 시작하거나 timer를 멈추던 문제를 fix.
5. 전송 범위·기록 입력 화면에서 기관 상태와 하단 card가 겹치던 높이 문제를 전체 장면 검사로 fix.
6. Scene animation 전에 reload하면 마지막 선택이 사라지던 문제를 행동 수락 즉시 저장하도록 fix.


## 최종 영상

- 전체 화면: `/Users/janghyunbin/Downloads/emergency-flow-2026-11-09-complete.mp4` · 2560×1440 · 12,451,465 bytes.
- 사고 대응 확대: `/Users/janghyunbin/Downloads/emergency-flow-2026-11-09-complete-app.mp4` · 1232×1152 · 10,508,606 bytes.
- 두 파일 모두 343.24초, H.264, 25 fps, 무음.
- 60/60 scene 방문, 99개 사용자 조작·외부 결과·입력 기록. [Timeline/coverage JSON](recording.json).
- FFmpeg 전체 decode 두 파일 모두 exit 0. Intro/outro·실제 기록 저장·전송 범위·중단 중 인계/접수·전체 통화 화면을 추출해 시각 확인. [최종 video frames](video-frames/).
- 삭제했던 영상 설명 문구와 ribbon ring을 복원하지 않음. 첫 녹화의 scenario/scene 동명 control 충돌은 selector를 scenario 영역으로 한정해 fix하고 전체 재녹화.
