# Voice field 반영 검증

2026-11-08 승인된 A ribbon mesh를 SC01 통화 연결 장면에 반영한 기록.

- `connected-flat.png`: 840×1184 app 창, 기본 배경.
- `connected-satin.png`: 같은 장면, Satin 배경.
- `pleos-connected.png`: 2560×1440 Pleos 전체 화면 가정.
- `mobile-review.png`: 375px browser의 검토 UI. 가로 overflow 없음.

정지 화면은 reduced motion 상태에서 촬영. 실제 Chrome에서 canvas pixel 변화·시연 중단·재개·reduced motion·비활성 tab·3초 보기 가림·연결 끊김·GPU 실패·자원 해제를 별도로 검사.

## 결과

- `npm run check`: 통과. Vite minified chunk가 500 kB를 넘는다는 warning 존재(514.49 kB, gzip 162.51 kB).
- `npm run test:ui -- --workers=2 --reporter=line`: 75/75 통과. 최종 GPU program 해제 fix 이후 전체 suite 재실행 통과.
- `node --test specs/emergency-experience/manifest.test.mjs`: 11/11 통과.
- Flat·Satin screenshot 촬영 중 WebGL 오류 0, browser runtime 오류 0.
- 최초 통합 test 5개는 미구현 상태에서 실패한 뒤 통과. Shader 실패·hidden/covered 검사 2개는 추가 guard.
- 장면을 떠난 뒤 CURRENT_PROGRAM이 남는 문제는 별도 assertion으로 실패를 재현하고 `useProgram(null)`로 fix. GPU resource 삭제 호출과 animation 중단도 확인.
- 독립 source review에서 위 해제 문제 외 추가 Critical/Important 없음.

## Not verified

실제 상대 음성, 실제 통화 연결, Android 반영, 차량 GPU 성능, Pleos 적합성, 사용자 이해도 평가, StrictMode runtime 실행. StrictMode 재진입 경로는 source review만 수행.

가상 audio envelope이며 실제 audio를 수집하지 않음. 통화 연결은 접수·도착 확인을 의미하지 않음.

## 후속 결정 · 2026-11-08

사용자가 장식성이 과하다고 판단하여 ribbon ring 제거 결정. 본문의 ribbon 구현·검증·capture는 과거 기록. 현재 Web prototype은 큰 solid phone glyph와 기존 통화 문구만 표시.
