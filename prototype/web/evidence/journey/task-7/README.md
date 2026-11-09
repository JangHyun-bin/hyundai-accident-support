# Task 7 영상과 사고 도식 검증

`tests/journey-reconstruction.spec.ts`의 13개 검사 통과. 실제 Chrome에서 component를 표시한 검사와 `?study=journey` 전체 경로 검사 포함.

- 도식의 button·keyboard·pointer 이동 결과 동일. 좌표 0–1 유지, 진행 방향·접촉 위치 정정 가능.
- Undo가 저장 전 상태를 복원. 저장 전에는 부모 callback을 호출하지 않으며, 정정 저장은 사용자 정정과 새 revision을 전달하고 기존 확인을 해제.
- 같은 도식의 새 object가 전달돼도 미저장 draft 유지. Reload 후 보존된 history를 원본으로 표시.
- 지원하지 않는 도로에는 사고 그림을 만들지 않음.
- 후방 영상 없음·decode 실패·잘못된 근거 구간에도 사용 가능한 영상 재생 유지.
- 실제 decode한 duration으로 구간을 검증. 지정한 구간 끝에서 정지. 제공된 eventTime만 충돌 marker로 표시.
- 화면을 벗어나면 재생 정지. 복귀 시 자동 재생 없이 위치 유지.
- 360px와 200% text에서 가로 overflow 없음. `mobile-reconstruction.png`를 직접 검토해 도식·조작·영상의 정렬과 가독성 확인.
- 실제 journey에서 시연 자료 확보, 전방 영상 재생, 도식 정정, 위험 event, 내용 확인 복귀, 저장, reload, 원본 확인을 순서대로 검증.

첫 검사에서 미구현 화면 확인 실패. 후속 검사에서 undo가 변경 후 상태를 보관하는 문제를 발견해 fix. React의 deferred state updater 안에서 mutable ref를 읽지 않고 이전 snapshot을 먼저 복사하도록 변경.

영상은 [출처 문서](../../../public/journey-samples/SOURCES.md)의 자체 합성 자료. 두 영상 모두 ffprobe로 H.264, 960 × 540, 24 fps, 20.000초 확인. ffmpeg 전체 decode 오류 없음. TypeScript와 production build 통과. 기존 500 kB 초과 bundle warning 유지.

실제 dashcam 연결·영상 분석·과실 판단은 미구현이며 이번 범위 밖. 도식은 직선 도로와 두 차량만 지원. 원본 복원은 부모가 보존한 history를 optional `original` prop으로 제공해야 함.
