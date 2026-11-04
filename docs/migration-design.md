# Figma 독립 작업 환경

사용자가 승인한 방향: 전체 FigJam 내용을 local file과 Git으로 관리한다. 기존 내용은 삭제하거나 다시 해석하지 않는다.

- `archive/figma/document.json`: 공식 API의 전체 tree와 원래 속성. 읽기 전용 기준점.
- `assets/`: 원본 image bytes와 전체 page SVG. 외부 URL에 의존하지 않는다.
- `project.json`: page, object, endpoint, 위치·형태·text·style·원본 속성을 보존하는 편집 정본.
- Browser editor: 두 page 탐색, 검색, 선택, text·위치·크기·색·연결 편집, 추가·삭제, undo/redo, JSON 저장·다시 열기.
- 원본 page SVG를 그대로 쓰는 방안은 정확한 초기 모습을 보존한다. 모든 모양을 새 renderer로 그리는 방안은 기존 낙서와 세부 형태가 달라진다. 따라서 원본 SVG와 명시적인 편집 overlay를 함께 사용한다.
- 편집한 text와 경로는 local renderer로 다시 배치하므로 Figma와 font·연결 우회가 달라질 수 있다. 원래 SVG와 raw tree는 남긴다.
- Local Git baseline을 만들며 remote push는 하지 않는다. Credential은 repository에 넣지 않는다.
- Comments는 별도 archive. Version history는 API 권한 범위를 별도 기록하며 현재 상태 보존과 구분한다.
