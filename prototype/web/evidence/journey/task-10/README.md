# Task 10 통합 검증

2026-11-10. 실제 `?study=journey` route에서 후속 처리 진입, 점검 항목 선택, 긴급 대응 전환·복귀, 검토 저장, 경로 preview, 대차 결과, reload 복원을 검증.

- `mobile-follow-up.png`: 저장·reload 이후 정비소·점검 항목·경로·대차 결과 유지. 본문과 행동의 겹침 없이 세로 scroll로 접근.
- `vehicle-follow-up.png`: 같은 case를 차량 화면으로 전환. 상태와 작업 box 분리, 기존 오른쪽 map slot에 선택한 정비소 표시. 긴 작업은 작업 box 내부 scroll로 접근.

Root가 두 screenshot을 직접 검토. Component의 작은 화면·200% text·조회 실패 근거는 `../task-10-ui/README.md`에 별도 기록.

검증 명령은 `prototype/web`에서 실행.

```sh
npm run test:ui -- tests/journey-follow-up.spec.ts tests/journey-follow-up-ui.spec.ts tests/journey-submission.spec.ts tests/journey-storage.spec.ts --workers=1
npm run check
```

통합 43개 test 통과. Screenshot과 device switch를 추가한 실제 route test도 1개 통과. TypeScript·Vite build 통과. 기존 500 kB 초과 chunk 경고 유지.

Logs: `/tmp/hyundai-task10-final-root.log`, `/tmp/hyundai-task10-visual.log`, `/tmp/hyundai-task10-build-complete.log`.

결과는 case·shop·request identity와 시각으로 검증. 이전 정비소의 늦은 결과는 무시. 경로·대차의 출처와 시각은 각각 보존. 미확인 대차는 새 요청 identity로 다시 확인하며 기관 접수와 독립.

실제 정비소 조회·예약·대차·지도 API·차량 이동은 미검증. 위치·거리·결과는 명시적 합성 fixture이며 실제 서비스 성공의 근거가 아님.
