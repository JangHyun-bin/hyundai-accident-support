# Task 4 차량 상태와 같은 기기의 화면 전환

`?study=journey&fixture=partial-evidence`에서 시작한 case를 사용. 차량 자료는 명시적인 review event로 공급하며 실제 차량 연결은 없음.

- `response-vehicle.png`: 기존 긴급 대응의 두 box, 주 행동 typography, 독립적인 위치 미확인 영역 확인.
- `status-vehicle.png`: 확인한 충격 방향만 flat 도식에 표시. 손상이나 주행 가능 여부는 도식에서 추론하지 않음. 상세 내용은 scroll하고 복귀 행동은 아래에 유지.
- `status-mobile.png`: 393px에서 같은 case의 관측·안전 행동 표시. 별도 browser에는 기록을 전달하지 않음.

화면을 직접 검토해 review CSS가 제품 button의 글자 크기를 덮는 문제 발견·fix. 상충하는 충격 방향은 양쪽 관측을 표시하고 방향 강조 제거. 실제 차량 센서와 기기 간 sync는 Not verified.

검증 결과: 전체 관련 검사 74개 통과. 추가 typography·상충 관측을 포함한 차량 검사 7개 통과. Manifest 12개 통과. TypeScript와 build 통과 여부는 Task 4 commit의 진행 기록에 보관.
