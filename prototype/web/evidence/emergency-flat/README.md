# Pleos flat 화면 검증 · 2026-11-08

사용자 요청: 사고 대응 화면을 Pleos design system 기준의 flat pictogram으로 전환하고 기관 상태의 단어 중간 줄바꿈·열별 높이 차이 해소.

- `SC01-connected.png`: 큰 전화·가로 spectrum, 같은 높이의 기관명과 첫 상태 줄, 별도 둘째 줄의 `접수 미확인`.
- `SC01-initial.png`: flat countdown·구호 결정 button·glyph.
- `SC05-initial.png`: 차량 지원 접수 미확인과 기관별 독립 상태.
- `mobile-review.png`: 375px browser 검토 화면. 차량 canvas는 기존 비율로 축소.

Chrome 검증: emergency flat·glyph·urgent 35/35, flow·motion·call symbol·glyph data 21/21, manifest 11/11. TypeScript·Vite build 통과. 모든 12개 장면의 flat paint, 기관명·상태 시작 위치·열 높이 일치, 상태 text 잘림 없음 확인. Glyph·상태 표식은 기존 rendered-pixel 검사에서 3:1 이상 통과. 구호 button text는 4.5:1 이상 통과.

[Pleos Iconography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/contents-creation/iconography)·[Typography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/typography)·[Colors](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/colors) 재확인. 기존 48×48 project glyph를 단색으로 표시하며 공식 icon asset이라는 뜻은 아님. 공개 수치가 없는 spacing·radius·창 pixel 크기는 기존 project 결정 유지.

Android 미반영. 실제 차량의 물리 크기·시야각·반사광·주행 중 이해도와 공식 Pleos 적합성은 미검증. Spectrum은 실제 audio 입력이 없는 시연.
