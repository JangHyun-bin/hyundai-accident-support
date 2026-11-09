# 경위서와 근거 검토

Task 8에서 실제 journey route에 문장별 정정·확인, 원문 비교, 근거 drawer, 새 초안 비교·교체 연결 완료.

검증 명령은 `prototype/web`에서 실행.

```sh
npm run test:ui -- tests/journey-report.spec.ts tests/journey-reconstruction.spec.ts tests/journey-domain.spec.ts tests/journey-media-domain.spec.ts tests/journey-save-recovery.spec.ts --workers=1
npm run check
```

첫 명령 53개 통과. TypeScript 검사와 Vite build 통과. 기존 500 kB 초과 chunk 경고 유지.
Screenshot test의 device 전환 후 tab 선택을 보완하고 해당 test 재실행 통과. Browser media 중지 검사의 element type도 명시적으로 좁혀 build 확인.

확인한 동작:

- 문장 정정 시 해당 확인 해제. 자료·진술·도식·observation 변경 시 경위서 재확인 필요.
- 사용자 정정본과 원문 보존. 늦게 도착한 초안은 비교 후 명시적으로 교체.
- 빈 case는 직접 작성 가능. 실제 입력에 가상 관측 문장 생성 없음.
- 사진·음성·영상의 실제 저장 Blob 열람. 영상은 연결된 구간 표시, 음성은 지정된 구간에서 재생 중지.
- 손상된 영상 열람 실패 시 문장 확인 해제. 해당 근거를 제외한 뒤 다시 확인 가능.
- 근거 drawer는 Escape로 닫고 trigger에 focus 복귀. 긴급 event에서는 drawer 종료와 media 중지.
- 미저장 정정은 일반 이동을 막고 긴급 복귀 시 유지. Reload 후 저장한 정정본과 원문 복원.
- 추정·미확인 종류는 사용자가 확인해도 유지.

직접 확인한 screenshot:

- `mobile-report.png`: 393px에서 문장 종류·확인 상태·본문·행동의 위계 확인. 자료 tab 세 칸 정렬.
- `mobile-evidence-drawer.png`: video와 근거 구간, 출처, 닫기 동작 노출 확인.
- `mobile-report-200.png`: 360px·200% text에서 가로 넘침 없이 세로 접근 가능.
- `vehicle-report.png`: 차량 상태와 작업 box 분리 유지. 긴 경위서는 작업 영역 안에서 scroll하며 지도 영역 유지.

외부 STT·AI·보험사 연동은 미사용. 준비된 합성 영상과 현재 사용자 진술만 시연 초안에 사용.
실제 기기·실제 기관 연동은 Not verified. Asset 유실 시 case 전체 복원 정책은 Task 11의 저장 복구 audit 대상.
