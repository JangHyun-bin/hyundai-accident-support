# B″ · 119 숫자 표현만 비교

사용자 요청: 현재 plain B″를 유지하고 119의 dot 디자인만 여러 안으로 비교.

Preview: `http://127.0.0.1:5173/?study=response-alts&focus=numeral`.

- `numeral=dot`: 기존 5×7 round dot. 기본값이며 기존 화면에도 그대로 사용.
- `numeral=micro`: Asta 숫자 윤곽 안에 더 작은 dot을 배치.
- `numeral=capsule`: 기존 격자의 dot을 짧은 세로 capsule로 변형.
- `numeral=solid`: 같은 SVG 영역에 Asta 실선 숫자.

상단 sample 또는 하단 선택 button으로 전환. 숫자는 항상 같은 위치·SVG 영역·흰색 사용. B″의 card·gradient·문구·spectrum·phone icon에는 변경 없음. 시안 선택은 URL에만 반영하며 기존 plain B″의 기본 숫자는 변경하지 않음.

`npm run check` 통과. `node evidence/response-numerals/verify.mjs`로 네 안의 desktop 1600px / mobile 393px, URL reload, 가로 overflow·browser error 확인. 숫자 SVG를 제외한 DOM 내용·computed style·상대 위치와 크기를 원래 B″와 대조해 동일함 확인. 좌표는 SVG 경계의 부동소수점 오차를 고려하여 0.1px 단위로 비교.

제품 flow 적용·실차에서의 dot 가독성 검증은 제외.

## Solid 글자 비율 fix

Pleos의 [공식 Typography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/typography)에서 System UI font가 Asta Sans임을 재확인. 현재 local Asta font를 그대로 사용.

Solid가 납작해 보였던 원인은 SVG `textLength="174"`와 `lengthAdjust="spacingAndGlyphs"`의 가로 늘림. Browser에서 원래 폭 132.668 대비 174로 약 31.2% 늘어났음을 측정. 공통 text에서 두 속성을 제거하여 Solid와 같은 윤곽을 쓰는 Micro-dot의 원래 글자 비율 복원. 숫자 영역과 나머지 화면은 유지.

TypeScript·build 및 기존 desktop/mobile 검증 통과. 원래 font 폭과 rendered glyph 폭을 비교하는 regression 검사 추가. `*-1600.png`, `*-393.png`와 overview는 fix 후 다시 capture. 실차 검증은 수행하지 않음.
