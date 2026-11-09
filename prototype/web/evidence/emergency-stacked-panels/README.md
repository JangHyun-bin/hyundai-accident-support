# App 내부 두 rounded box · 2026-11-08

사용자가 지목한 두 image에 맞춰 상단 충돌·차량 사실·음성 button 영역과 하단 통화·기관 상태·대피 안내 영역을 분리. 투명한 app wrapper, 독립적인 배경 두 개, 24px gap, 각 radius 32. 상단 divider 제거.

`connected-app.png`, `initial-app.png`에서 두 box의 네 모서리·사이 여백 확인. 기존 바깥 사고 대응/내비 1:1 창 배치는 유지.

TypeScript·build 및 layout·flat·motion tests 38/38 통과. 모든 12개 장면에서 두 box의 폭·간격·radius와 하단 주요 내용의 bounds 검증. Countdown ring 256px·요소 간격 24px로 안내와 button 표시 영역 확보.

Android·실차 미검증. 이전 emergency-two-panels 기록은 바깥 창 분할에 대한 기록이며 이번 clarification과 구별.
