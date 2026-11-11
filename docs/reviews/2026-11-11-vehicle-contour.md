# B / Contour 구현 확인

- 사용자 선택: B / Contour. 공용 `CareVehicleContour`를 catalog와 기존 `VehiclePanel`에 연결.
- DEV preview: `/?study=vehicle`. 왼쪽 차량 상태와 오른쪽 기존 material/Three cells를 함께 비교. 예시 상태 control은 실제 journey/storage와 분리.
- SVG의 8방위 표시, HTML callout, 작은 폭에서 일반 text 흐름으로 전환. 차체에 grain·CA 없음.
- 실제 root 전체 layout 교체, 전역 notification rollout, commit/push/merge는 진행하지 않음.

## 검증
- `npm run check`: PASS. 기존 500 kB chunk 경고 유지; 이번 build main JS 744.61 kB.
- `npx playwright test tests/vehicle-contour.spec.ts tests/journey-vehicle.spec.ts tests/design-system-layout.spec.ts --workers=2`: 21 PASS.
- 8방위, 360/393/1440/1920px, 200% text에서 callout 겹침·가로 overflow 없음.
- 기존 journey의 방향 미확인/충돌, 기기·사용자 확인, 긴급 복귀 동작 유지.
- Read-only review에서 SC02의 attention mobility가 unknown으로 바뀌는 defect 발견. Regression test가 실패하는 것 확인 후 adapter fix. `이동 불가` 원문과 주의 tone 유지; 최종 suite PASS.
- Public Cloudflare preview: HTTP 200, component render, 전체 미확인에서 impact marker 0개, reduced-motion 상태 전환, pageerror 0개 확인.
- Desktop/mobile screenshot 시각 확인. 200% mobile의 orientation 단어 분리를 방지하도록 header를 세로 배치.
- `git diff --check`: PASS.

## Review artifact
- `/tmp/vehicle-contour-final.png`: 전체 차량 화면.
- `/tmp/vehicle-contour-mobile.png`: mobile 차량 component.
- Concept 이미지와 실제 SVG는 별도 artifact. 실제 구현은 repository의 editable SVG/React.

## 추가 요청 — 부위별 상세 interaction

- Preview의 `움직일 수 있으면` 문구 제거.
- 충격 방향·비상등·트렁크 label을 48px 이상 button으로 전환. 선택하면 차체가 왼쪽으로 이동하고 상세 영역 표시.
- 기존 Motion 사용: 차체 680ms 이동, 상세 160ms 뒤 진입. Reduced motion은 위치와 내용을 즉시 전환.
- 상세 tab으로 항목 전환. 전체 보기·Escape로 원래 구도와 최초 button focus 복원. 닫히는 상세 영역은 즉시 inert 처리.
- 좁은 화면과 큰 글자는 설명을 차량 아래의 일반 text 흐름으로 배치. 상세는 상태 변경을 즉시 반영하며 미확인·확인 중·사용자 확인을 구분.
- 관련 vehicle/journey test 15 PASS. 등장 timing 조정 후 `vehicle-contour.spec.ts` 7 PASS 재확인. TypeScript/build PASS; 기존 bundle 크기 경고 유지.
- Desktop/mobile 실제 screenshot 확인. 200% text, keyboard, 상태 갱신, 차체와 설명 겹침 없음 확인.
- `/tmp/vehicle-contour-interactive-final.png`: 상세를 연 최종 차량 component.
