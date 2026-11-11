# Interaction Study · 2026-11-10

## 범위

사용자가 요청한 localhost 한 화면의 interaction study 구현. 전역 E2E 계획 전체 실행은 아님. 기존 paused goal과 별개이며 commit·push·merge 없음.

- URL: `http://localhost:5173/?study=interaction`
- 기존 `CareSurface`, `ResponseLayout`, material, Asta font 재사용.
- GSAP 3.15.1 exact dependency. DEV route lazy import이며 제품 route의 기본 화면은 유지.
- 회색 idle, 색 진입·비대칭 pulse·잔광·복귀, pause/seek/0.25×/0.5×/1× 지원.
- 통화·긴 안내·기록 preview, 비율·접점·기울기·gap·radius 조절.
- Study preset local storage `after-care-interaction-study-v1`, JSON import/export. 기존 C/C_02와 적용 theme storage는 변경하지 않음.
- Microphone·전화·외부 전송은 실행하지 않음. 기록 화면의 입력은 study 동안만 유지.

## 검증

- `npm run check`: 통과. 기존 500 kB 초과 production chunk warning 유지, 이번 결과 736.92 kB.
- `npx playwright test tests/design-system-layout.spec.ts tests/optical-materials.spec.ts --workers=2`: 13 passed.
- 실제 browser의 full lifecycle, peak seek, live tuning, reduced motion, preset reload, 기존 material storage 보존, invalid import 확인.
- 1440/1100/960/393/360px와 200% text에서 수평 overflow 없음. Browser pageerror 없음.
- Desktop idle/blue peak/copper pulse screenshot을 직접 확인.
- 임시 검증 script: `/tmp/interaction-study-check.mjs`, `/tmp/interaction-behavior-check.mjs`.
- 이번 검증은 motion study의 동작과 기존 shared component 회귀 범위. 전체 journey/60-state rollout, target vehicle GPU 성능, 최종 영상은 아직 미실행.

## 다음 판단

실제 속도로 본 빛의 세기·진입/잔광 timing과 cell의 공간 이동을 사용자와 조정. 확정한 값과 adaptive 정책을 원래 build 계획에 반영한 뒤 전역 적용.
