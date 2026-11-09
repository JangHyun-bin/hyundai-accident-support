# Task 1 · 대표 화면 검토

2026-11-10. 고정 fixture preview, 실제 감지·녹음·전송 기능 아님.

- vehicle.png: 차량의 상단 상황 / 하단 대응 box와 app/map 1:1 유지. 충격 방향·세기·영상 출처를 분리하고 이동 가능·손상을 미확인으로 표시. Confirmed 색은 작은 check에만 사용.
- voice.png: 진술 본문을 중심으로 재생·정정·저장의 순서를 배치. Mobile 393px에서 주 행동과 보조 행동을 명확히 구분.
- report.png: 관측과 사용자 진술을 분리하고 각 근거를 바로 아래 배치. 검토 완료와 확인 필요를 문장별로 구분.

세 screenshot을 직접 확인. 기존 flat paint·큰 여백·단순한 동작 위계를 유지해 후속 구현 기준으로 채택. 사용자 지시에 따라 별도 승인 대기 없이 진행.

검증: 새 design tests 4/4, 기존 emergency-flat tests 2/2, TypeScript+Vite build 통과. 360/393px, 200% text, reduced motion, 차량 전체/축소 검증 포함. 기존 build의 500 kB chunk 경고 유지. 기존 baseline manifest 12/12.

아직 capture·state·저장·기관 연동 없음. Task 2 이후 기능을 연결하며 같은 component/token을 사용.
