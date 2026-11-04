# 전체 FigJam 이관 계획

## 범위
두 page, 모든 object ID·text·위치·style·연결 endpoint·image 보존. 기존 HTML은 유지한다.

- [x] 공식 API 전체 tree와 comments 확보.
- [x] 원본 image bytes와 page SVG를 내려받고 SHA-256 기록.
- [x] 전체 tree를 누락 없이 project.json에 보존하고 ID·text·endpoint·assets 대조.
- [x] 공통 CSS로 editor·catalog 작성. 기존 HTML의 동작을 재사용.
- [x] Import validation, text round-trip, 이동·연결, undo/redo, 저장·다시 열기 확인.
- [x] Local Git baseline 및 실행 안내 작성.

검증 우선 항목: 알 수 없는 object type 보존, 음수 좌표, 연결되지 않은 endpoint, 취소·잘못된 import, 저장 실패 시 편집 유지.

JSON file chooser의 자동 검증은 Chrome extension의 file URL 접근 권한 때문에 수행하지 못했다. Model validation과 server 저장 거부·충돌 검증은 통과했다.
