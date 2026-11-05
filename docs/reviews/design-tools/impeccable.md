# Impeccable 적용 기록

2026-11-05. 기존 A에 Impeccable의 `typeset`, `layout`, `polish` playbook을 독립 적용하였다. 다른 세 skill의 guide는 이 variant에 적용하지 않았다.

- Source: [pbakaus/impeccable](https://github.com/pbakaus/impeccable/tree/c8891a9ae865d6ee311836ae5199bfce0fe115b1), skill 4.8.0, Apache-2.0.
- `SKILL.md` SHA256: `fab04b31f946573b00a8559db1fc070f8ea5825254d491c2b13156e5661a86d7`.
- 읽은 reference: `typeset.md`, `layout.md`, `polish.md`, `craft-floor.md`.
- 실제 runtime: `<skill-dir>/scripts/impeccable context --target src/FocusView.tsx`. 기존 구현을 권위로 삼아 좁은 범위의 refinement가 가능하다는 결과를 받았다. Global hook이나 live Apply를 설치하지 않았다.

## 시각 판단과 적용

기존 A는 같은 설명을 반복하는 방패·orbit와 gradient card에 많은 공간을 배정했다. 제목의 `-.052em` tracking과 여러 작은 보조 font가 hierarchy를 복잡하게 만들었다. Operate mode로 판단하고 Asta·palette·내용을 유지했다.

- 왼쪽 큰 제목, 오른쪽 행동 안내, 아래 가로 사실 목록으로 읽는 순서를 정했다.
- Card와 그림 대신 section 간 간격과 divider를 사용했다.
- 제목 64px, 본문 26px, 행동 24px, 보조 18px의 역할을 정했다. Tracking은 `-.035em`으로 제한했다.
- `안전·구호 우선`은 제목 위 장식 label 대신 확인된 상황의 의미 표식으로 옮겼다.
- Cult HaloBadge는 실제 source를 유지하면서 rim과 그림자를 제거했다. Motion Primitives TransitionPanel은 공유 Guidance에 남겼다.
- Korean의 짧은 지시문은 영문 장문용 45–75ch measure를 기계적으로 따르지 않았다. 실제 문구와 1440px canvas에서 줄바꿈을 확인했다.

## 실제 검사

`impeccable detect --json src/variants/ImpeccableView.tsx src/variants/impeccable.css 'http://127.0.0.1:5173/?study=tools&view=impeccable' --viewport 1600x1100`을 실행했다. Source에서는 finding이 없었고, URL에서 `body`의 mint `dark-glow` warning 하나가 반환되어 exit 2였다. 같은 화면의 computed body shadow는 `none`, 보이는 app element의 box-shadow 목록은 빈 배열이었다. 공유 stylesheet에 남은 다른 variant의 선언을 실제 표시와 구분하였다. Detector 전체 clean이라고 주장하지 않는다.

실제 screenshot에서 status badge가 CSS selector 때문에 가려진 문제를 발견하고 fix하였다. 이후 test에 세 badge의 visibility를 추가하였다. 접힘·펼침, focus, pair comparison의 상태 동기화, 중복 ID와 작은 browser를 Playwright로 확인하였다.

[접힘](../../../prototype/web/evidence/tools/impeccable-summary.png), [펼침](../../../prototype/web/evidence/tools/impeccable-expanded.png).

이 기록은 guide 적용과 검사 결과다. 도구의 미적 우수성이나 긴급 상황에서의 이해도를 입증하지 않는다. 이후 사용자 지적에 따라 별도의 [긴급 상황 spec](../../../specs/emergency-experience/principles.md)을 만들었다.
