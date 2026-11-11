# B″ rounded split study

비교 질문: 기존 B″에 부드러운 사선 경계를 적용할 때, 오른쪽만 나눌지 중앙의 세 card까지 연결할지 판단.

- 선택안 B: `http://127.0.0.1:5173/?study=response-alts&focus=split`
- 함께 보기: `http://127.0.0.1:5173/?study=response-alts&focus=split&variant=both`
- A: `variant=A` — 기존 1:1 배치 유지, map과 대피 안내의 공유 경계만 4° 기울임.
- B: `variant=B` — 중앙 접점을 오른쪽으로 옮겨 통화·map·대피 안내를 세 cell로 연결.

`prototype/web`에서 `npm run dev`로 실행. Development route에만 표시. 제품 flow 적용과 commit·push·merge는 수행하지 않음.

## 같은 조건으로 비교

두 안 모두 저장된 surface draft의 색과 shade를 읽고, grain 12%·CA 1px를 memory에서 적용. C·C_02를 포함한 preset과 draft는 쓰지 않음. 저장된 값이 없으면 기존 B″ 색 사용.

공유 경계의 각 면을 normal 방향으로 8px씩 이동해 직선 구간에 16px gap 확보. Corner는 radius 28px의 tangent curve로 연결. Shape 안의 material을 먼저 clip하고 CA를 합성해 바깥 fringe 유지. 글자와 icon은 수평이며 effect 대상에서 제외.

1440×860 artboard를 비교 공간에 맞춰 축소. 좁은 화면은 두 artboard를 세로 배치. Mobile product layout을 제안하는 화면은 아님. A·B button과 좌우 방향키로 전환하며 URL에 반영. 녹음 button은 안내만 표시.

## 확인

Isolated headless Chrome에서 desktop 1600px와 mobile 393px 확인. A·B·함께 보기, URL reload, 방향키, 녹음 stub, 잘못된 variant의 fallback, 저장된 draft·preset 불변성 확인. Text range의 네 꼭짓점이 각 rounded path 안에 있는지 확인. ResizeObserver의 scale 반영 후 가로 overflow 없음. 결과는 `verification.json`.

`npm run check`와 `git diff --check` 통과. 기존 500kB bundle warning 유지. 전체 제품 UI suite는 이번 독립 시안 작업에서 재실행하지 않음.

Capture는 test context에 C·C_02 이름과 이전에 확인한 shade 값을 넣어 생성. 사용자의 실제 browser storage에 쓰지 않음. `A-board.png`, `B-board.png`에서는 비교용 floating bar만 숨김.

실제 Chrome tab 자동 열기는 browser access host 연결 실패로 수행하지 못함. 현재 차량 실기 검증 없음.

## 선택 기록 — 2026-11-10

사용자 선택: **B / Three cells**. 통화·map·대피 안내가 중앙 접점에서 맞물리는 구성을 다음 작업의 기준으로 확정. Variant를 지정하지 않거나 잘못 지정한 경우 B를 표시. A·함께 보기는 비교 근거로 유지.

공통 grain 12%·CA 1px와 기존 색·shade 유지. 제품 flow 반영은 이번 선택 범위에 포함하지 않음.
