# 두 rounded box · 2026-11-08

사용자 선택: 왼쪽 사고 대응 / 오른쪽 내비, 같은 크기의 독립적인 두 rounded box. 차량 공통 상태·공조/app 전환은 상·하단에 별도 배치.

전체 2560×1440. 본문 창 각각 1232×1152, 좌우·중앙 여백 32, radius 32. 상단 bar와 본문 간격 24, 본문과 하단 bar 간격 32. 차량 P·속도는 상단 요약이며 실제 차량 신호가 아님.

Emergency layout·상태·motion 관련 tests 38/38, TypeScript·Vite build 통과. 두 창의 폭·높이 일치, 간격·radius, 공통 bar와의 분리, 모든 장면의 기관별 row 정렬 검증. 녹화 script는 실제 app bounds를 읽어 title card와 crop에 사용.

`connected.png`는 현재 Web layout. 기존 emergency-flat capture는 이전 3분할 배치 기록. Android 미반영, 실차 layout 적합성 미검증.
