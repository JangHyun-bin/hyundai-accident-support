# Voronoi 형태·외곽 정렬 regression 복구

사용자 screenshot에서 정상 차량 profile의 Voronoi가 직사각형 column으로 보이고, 왼쪽 차량 panel의 아래 경계가 오른쪽과 어긋나는 문제 확인.

- 원인: 기존 power diagram은 고정 workspace를 포함하지 못해 항상 fallback 사용. Fallback의 경사 폭은 2–6px에 불과했음.
- 원인: 왼쪽 설명문이 35px을 차지하고, 오른쪽 material은 board 바깥 경계에서도 8px inset 적용. Wrapper 크기만 비교하던 검사에서 놓친 시각적 차이.
- Fix: 정상 차량 profile에 대각선 분할과 둥근 접합점 복구. Primary workspace는 모든 단계에서 동일한 `60% board width - 48px` 유지. 이전 66%에서 확보한 여유 공간을 shape 경계에 사용. Typography와 119 core 위치·폭·높이는 유지.
- Fix: 사각형과 오각형을 동일한 5개 vertex로 표현해 중간 frame과 빠른 retarget의 대응 유지. 내부 공유 경계에만 inset 적용.
- Fix: 설명문을 VehicleShell 밖의 기존 시연 도구 영역으로 이동. 좌우 panel의 실제 보이는 위·아래·폭 정렬.

검증:

- 새 regression 2개가 기존 code에서 실패한 뒤 통과. 형태 검사와 실제 material 외곽 검사 추가.
- 관련 test 24개 통과. TypeScript·production build 통과.
- 실제 normal motion 741 frames, moving 591 frames. Text·control의 rounded surface 이탈 0건, 동일 text의 typography·줄바꿈·slot width 변경 0건. Page error 0건.
- Geometry 34,704 samples와 interruption 31,752 samples에서 고정 119 core containment 유지.
- 첫 전체 검사 390/391 통과. 남은 resize test는 기록→검토에서도 119 shape 자체가 변형된다고 가정해 실패. 전환 중 119가 고정되는 새 배치에 맞춰 전체 cell의 path를 관찰하도록 fix. 중간 frame 10개 이상과 DOM·draft·core containment 조건 유지, interruption 4개 재검증 통과.
- 2048px 초기·대피·기록 화면, 1440px 검토 화면을 직접 시각 확인. Local audit: `prototype/web/.audit/voronoi-appearance/`.
- 최종 전체 suite: **391/391 통과** (3.5분). 첫 실행의 resize 검사 실패를 보완한 뒤 전체 재실행 결과.

좁은 환경과 200% text의 document profile은 기존 접근성 정책 유지. 실차 hardware는 미검증. 기존 bundle 크기 경고는 이번 범위 밖.
