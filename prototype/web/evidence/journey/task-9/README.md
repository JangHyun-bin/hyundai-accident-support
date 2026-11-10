# 승인한 내용과 기관별 결과 보존

보험사·차량 지원·상대방 공유의 수신처와 선택 범위를 각각 유지하는 검토 화면 구현 완료. 선택하지 않은 자료는 snapshot에 포함하지 않음.

검증 명령은 `prototype/web`에서 실행.

```sh
npm run test:ui -- tests/journey-submission.spec.ts tests/journey-report.spec.ts tests/journey-save-recovery.spec.ts tests/journey-reconstruction.spec.ts tests/emergency-complete.spec.ts --workers=1 --output=/tmp/hyundai-task9-final-tests
npm run check
```

통합 58개 통과. 이후 추가한 선택 제외·과거 접수 보존 domain test와 screenshot output 분리 검사 3개 통과. TypeScript 검사와 Vite build 통과. 기존 500 kB 초과 chunk 경고 유지.

확인한 동작:

- 수신처·목적·선택 범위와 실제 보낼 내용을 승인 전에 표시. 도식은 편집 불가능한 동일 geometry로 표시.
- 선택한 자료의 실제 Blob과 경위서 근거 구간을 열 수 있는지 승인 전에 검사.
- 확인이 필요한 진술·도식·경위서는 포함할 때만 승인을 차단. 사진만 선택 가능.
- 진술 text만 선택하면 원본 audio와 연결 ID는 보내지 않음. 경위서는 근거 자료를 함께 선택하거나 근거를 제외하고 재확인 필요.
- 저장 성공 후 승인 요청을 표시. 저장 실패 때 요청을 추가하지 않으며 선택한 내용은 화면에 보존.
- 중복 승인·reload로 새 요청 증가 없음. 저장 도중 긴급 event가 도착해도 대응 화면과 최신 입력 유지.
- 미확인 결과는 재전송 불가. 명시적 실패·미접수 후 새 범위를 선택하고 다시 승인 가능.
- 과거 요청의 늦은 결과는 현재 요청을 바꾸지 않음. 이미 확인된 구호 접수는 재통화 연결 상태로 퇴행하지 않음.
- 내부 ID를 접수번호로 표시하지 않음. 번호 없는 접수와 기관 번호가 있는 접수 구분.
- 상대방 공유 결과는 별도 이력으로 보존. 보험사 상태와 승인 snapshot 유지.
- 승인 이력을 닫으면 해당 media 재생 중지. Keyboard focus는 전송 검토 heading으로 이동.

직접 검토한 screenshot:

- `mobile-selection.png`: 초기 자동 선택 없는 자료 목록, unavailable 자료 구분, 수신처와 목적 표시.
- `mobile-preview.png`: 선택한 자료만 표시하고 별도 승인 동작 제공.
- `mobile-receipt-200.png`: 360px·200% text에서 대상 선택을 세로로 배치. 단어 잘림과 가로 넘침 없음.

Screenshot test의 이후 실행은 test output directory에 저장해 위 검토 기록을 덮지 않음. Task 8의 기록도 보존.
실제 기관 전송·공유 API는 미사용. 접수와 공유 결과는 명시적 review event로만 제공. 실기·실제 기관 연동은 Not verified.
