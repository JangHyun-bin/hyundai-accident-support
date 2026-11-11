# B / Contour 차량 상태

사용자 선택: bird’s-eye 비교 board의 B / Contour. 얇은 이중 윤곽, 반투명 graphite 면, 고정된 정면 상방 시점으로 내 차량 상태를 표현.

## Approaches
- A / Satin: 입체감과 실물감이 강함. 이번 선택에서 제외.
- **B / Contour: 선택됨.** 부위와 상태의 관계를 정밀하게 표현하며 오른쪽 material과 시각적 균형 유지.
- C / Cells: 차량 주위의 상태 cell. 오른쪽 Three cells와 함께 쓰면 정보 밀도가 높아 제외.

## 범위와 기준
- 공용 React/SVG component를 catalog, 전용 좌우 preview, 기존 차량 상세에 사용. 제품 전체 layout 교체는 이번 범위 밖.
- Asta, 기존 color/type/spacing/radius token 사용. 새 dependency 없음. 차체에는 grain·CA를 적용하지 않아 윤곽을 선명하게 유지.
- 충격 방향 8방위. 확인된 방향만 해당 윤곽을 강조. 미확인·지원하지 않는 방향·상충하는 정보는 특정 부위 강조 없음.
- 비상등·트렁크는 기존 safetyActions를 사용. 사용자 확인, 차량 확인, 예시 자료를 구별. 요청 중은 완료로 표시하지 않음.
- 충격 방향으로 손상·주행 가능 여부를 추론하지 않음. 차량 이동 정보는 별도 확인 상태로 표시.
- 작은 화면에서는 callout을 SVG 밖의 일반 text 흐름으로 이동. Text는 SVG 안에 넣지 않음.
- Preview의 예시 상태는 별도 control로 조작. Journey의 실제 상태와 storage를 변경하지 않음.

## 검증
확인/미확인/정보 충돌, 기존 차량 상세 동작, 360/393/1440/1920px, 200% text, reduced motion, browser 오류, type/build 확인. 사용자가 선택한 시안의 시각적 정합성은 screenshot으로 확인.
