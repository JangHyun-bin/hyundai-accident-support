# 후속 처리 UI 검증

Task 10의 독립 UI 구현 범위. 공통 reducer·storage·실제 journey 진입·결과 identity 검증·지도 연결은 root 담당.

## Component contract

`FollowUpPanel`은 `value: JourneyCase`, `onCommand`를 받음. 선택한 정비소와 후속 상태는 `value.followUp`에서 읽고 기존 `follow-up` command로 변경 intent 전달.

추가 props:

- `directory?: FollowUpDirectory`. 명시적인 외부 조회 결과를 전달. 생략 시 fixture case에만 합성 목록 제공. 실제 case에는 합성 정비소를 채우지 않음.
- `navigation?: ReactNode`. Mobile의 preview·guiding 상태에서만 지도 영역 표시. Vehicle에서는 prop을 생략하고 기존 지도 slot 사용. 위치 출처가 없으면 제공된 JourneyNavigation의 미확인 표현을 유지.
- `onDirtyChange?: (dirty: boolean) => void`. 미저장 점검 항목 또는 검토 화면이 있으면 true. Root의 일반 이동 guard에서 사용. 긴급 복귀 시 입력을 유지하려면 component를 숨긴 상태로 유지.

`follow-up-fixtures.ts`에서 `followUpDirectories`와 관련 type export. 상태는 ready·stale·empty·failed. Directory의 origin과 shop의 position·distanceMeters를 root가 기존 map slot에 연결 가능. 모든 이름·거리·입고 시각은 작성한 합성 fixture이며 실제 정비소 조회 결과가 아님.

## 동작

정비소 선택은 예약 완료를 표시하지 않음. 오래된 입고 안내는 재확인 필요 상태와 출처·시각을 함께 표시. 빈 목록과 조회 실패는 대차 확인을 막지 않음.

점검 항목은 메모리에서 선택하고 검토 화면을 거친 뒤 `repairItems`에 전달. 읽을 수 있는 label 문자열을 저장. 선택 취소는 저장한 항목을 유지. 정비소 조회 결과가 실패·빈 목록으로 바뀌어도 미저장 항목 취소가 가능하며, 목록 복구 시 입력을 유지. 기존 선택을 모두 비울 때도 검토 후 저장 필요. 예상 점검 항목을 확정 견적이나 차량 이동 허용으로 표현하지 않음.

경로는 선택한 정비소가 있을 때 preview와 guiding intent를 구분. 대차는 checking intent만 발생시키며 가능·불가·미확인 결과를 자동으로 만들지 않음. 대차 확인은 정비소 선택 전에도 가능. Command의 now에 요청 시각 전달. 경로·대차 표시는 각각 routeRequest·rentalRequest의 출처와 시각을 사용하며, request가 없으면 metadata를 만들지 않음.

Model the Domain 원칙에 따라 조회 상태는 directory data로, 대차 표현은 `FollowUp.rental`별 표로 관리. 새로운 상태 저장소나 dependency 추가 없음.

## 검증

`prototype/web`에서 실행.

```sh
npm run test:ui -- tests/journey-follow-up-ui.spec.ts --workers=1 --output=/tmp/hyundai-task10-worker
npm run check
```

Browser test 13개 통과(12.2초). 최초 8개 test는 component 부재로 실패한 뒤 구현 후 통과. 선택 항목 모두 해제 test도 실패를 확인하고 fix 후 통과. 최종 shared request type·mobile 지도 slot·조회 중 입력 복구 연결 후 TypeScript 검사와 Vite build 통과. 기존 500 kB 초과 chunk 경고 유지.

Logs:

- `/tmp/hyundai-task10-red.log`
- `/tmp/hyundai-task10-clear-red.log`
- `/tmp/hyundai-task10-final.log`
- `/tmp/hyundai-task10-build-final.log`

Screenshot test는 testInfo.outputPath에 저장. 직접 검토한 대표본만 이 directory에 보존.

직접 검토한 screenshot:

- `mobile-shops.png`: 393px에서 정비소명·거리·입고 안내·선택 행동 구분.
- `mobile-review.png`: 선택한 정비소와 전할 항목, 경로·대차 상태의 정보 위계 확인.
- `mobile-review-200.png`: 360px·200% text에서 가로 넘침 없이 주 행동과 본문 접근 가능.
- `vehicle-stale.png`: 차량 layout에서 분리된 box와 작업 영역 내부 scroll 유지. 위치 미확인 지도 표현 사용.
- `mobile-route-200.png`: 360px·200% text에서 위치 미확인 지도·경로 상태·안내 시작 접근 확인.
- `mobile-unavailable.png`: 조회 실패와 대차 미확인 표현 확인. 다른 후속 확인 동작 접근 유지.

Test는 실제 browser에서 component를 mount하고 controlled state를 제공. 이 범위의 통과는 root reducer의 늦은 결과 거절이나 실제 route 저장·복원을 증명하지 않음. 해당 검증은 Task 10 통합에 필요.

실제 정비소·대차·지도 API, 실제 차량 이동·예약·전송·결제는 미구현·미검증.
