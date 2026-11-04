# 사고 후 대응 지원 · Local 작업 공간

Figma 없이 원본 아이디어와 E2E flow를 확인·편집·저장하는 작업 공간이다. 현재 정본은 `project.json`이다.

## 열기

`Open Local Board.command`를 실행하고 **http://127.0.0.1:8765** 를 연다. Python 3.9 이상과 Node.js 22 이상이 필요하다. 추가 package 설치와 Figma sign-in은 필요하지 않다.

```sh
cd ~/Documents/cha-bun-flow
python3 serve.py
```

## 편집과 저장

1. 위의 page 선택으로 원본·논의·기존 시안과 통합 E2E를 오간다.
2. 왼쪽 검색은 두 page 전체의 문구·이름·ID를 찾는다. 결과를 누르면 해당 object를 확대한다.
3. 도형이나 선을 선택하고 오른쪽에서 문구·위치·크기·색·endpoint를 바꾼 뒤 **변경 적용**을 누른다. 도형은 끌어서 옮길 수 있다. Section을 옮기면 그 안의 object도 이동한다.
4. **연결하기**를 누르고 출발·도착 도형을 선택한다. 움직인 object의 연결선은 local 경로로 다시 그린다.
5. **저장하기** 또는 ⌘/Ctrl+S로 `project.json`을 저장한다. 저장 전 변경은 browser memory에만 있다. 기존 file은 `.history/`에 남는다. 다른 창의 변경이 감지되면 덮어쓰지 않는다.
6. JSON 내려받기는 별도 복사본이다. JSON을 다른 환경에서 열려면 이 directory의 `assets/`와 `editor/`도 함께 옮긴다. SVG 내보내기는 해당 page의 현재 모습을 image와 함께 담는다.

Undo/redo는 최대 25개 변경을 보관하며 page를 새로 열면 사라진다. 저장 이력은 `.history/`와 Git에서 확인한다. 연결된 외부 Figma node link는 원래 참고자료로 보존하며 local 문구 검색으로도 찾을 수 있다.

## 보존 범위

| 항목 | 확보한 내용 |
| --- | --- |
| 현재 board | 두 page, 826개 object, 234개 connector |
| 본문·속성 | 모든 ID, text, 계층, 위치·크기, 원본 속성, endpoint |
| Image | 원본 bytes 18개와 SHA-256 |
| 원형 | 공식 API의 전체 JSON, 두 page SVG, 복제 section SVG |
| Comments | API 응답 0개 |
| 과거 version history | 미확보. 현재 credential에 `file_versions:read` 권한이 없음 |
| `.jam` | Save local copy를 실행했으나 내려받은 file은 검증하지 못함 |

통합 page의 140개 object는 모두 원본 SVG 조각으로 표시한다. 원본 page는 686개 중 576개에 원본 SVG 조각을 대응했다. 복제 section의 110개는 API SVG의 node ID가 없어 raw geometry와 text로 다시 표시한다. 해당 section의 정확한 원형은 `assets/duplicate-26-549.svg`에 별도로 보존한다. 모든 826개 object의 원본 속성과 text는 JSON 대조를 통과했다.

이 editor는 Figma의 모든 기능을 구현하지 않는다. Text·색·모양을 바꾼 object는 local renderer가 다시 그린다. Font, 줄 나눔, 특수 모양, connector의 우회 경로가 Figma와 달라질 수 있다. 낙서 vector는 하나의 object로 이동·크기 변경·삭제할 수 있으며 개별 pen point 편집은 제공하지 않는다. 실시간 동시 편집은 제공하지 않는다.

## file 역할

- `project.json`: 앞으로 편집하는 전체 board 정본. 원본 속성은 각 object의 `raw`에 보존한다.
- `archive/figma/document.json`: 이관 당시 공식 API 전체 응답. 과거 증거로 유지한다.
- `archive/coverage.json`: object 대응 범위와 asset hashes, 미확보 항목.
- `assets/`: 원본 images와 SVG, editor가 사용하는 SVG 조각.
- `editor/`, `serve.py`: 추가 dependency 없는 local editor와 저장 기능.
- `e2e/`: 이전 단계의 Mermaid, 검증 기록과 실제 FigJam 화면. 새 변경의 정본은 `project.json`이다.
- `cha-bun-flow.html`: 초기 검토 시안. 기존 file을 보존한다.

`build-project.py`는 archive에서 최초 project를 만든다. 기존 `project.json`이 있으면 덮어쓰지 않는다. `--refresh-derived`는 SVG 조각과 coverage만 다시 만든다. Archive에 대응하는 source에서만 실행한다.

## Git과 확인

이 directory를 local Git repository로 관리한다. Remote는 설정하지 않는다. 저장하기한 뒤 변경을 확인하고 의미 있는 단위로 commit한다.

```sh
git diff --stat
git diff -- project.json
git add project.json
git commit -m "docs: refine accident support flow"
```

```sh
node check.mjs
node test-model.mjs
python3 test-server.py
```

공식 API는 [전체 file JSON과 SVG·image를 제공](https://developers.figma.com/docs/rest-api/file-endpoints/)한다. `.jam`은 Figma의 [local copy](https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files) 형식이며 comments와 version history는 포함하지 않는다.

실제 차량·긴급 기관·보험사 연계, 사고 대응 문구와 정보 처리 기준은 기존 제안의 검증 과제로 유지한다.
