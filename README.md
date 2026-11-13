# 사고 후 대응 지원 · Local 작업 공간

Figma 없이 원본 아이디어와 E2E flow를 확인·편집·저장하는 작업 공간이다. 현재 정본은 `project.json`이다.

## 현재 앱과 정본

- Web 기본 진입은 전체 여정 `/` 또는 `?study=journey`다. `?study=emergency`는 공유 JSON의 긴급 상황 storyboard이며 [실행·저장·시연 경계](prototype/web/README.md)를 따른다.
- 공용 디자인 시스템은 catalog·제품이 같은 구현을 사용한다. 최신 display·조작 기준은 [Pleos display 문서](docs/design-system/pleos-display-and-controls.md), 누락 원문의 출처 정리는 [현행 시각 기준](docs/superpowers/specs/2026-11-12-figma-visual-contract.md)을 따른다. 후자는 사용자 승인 원문을 복원한 문서가 아니다.
- [계약·신뢰성 복구 계획](docs/superpowers/plans/2026-11-12-contract-reliability-repair.md)은 Android·기록·안내·검증·문서 승계를 다룬다. 과거 PASS와 현재 실행 결과, 전체 디자인·영상 목표의 완료 여부를 구별한다.
- PR #11의 [당시 미완료 항목과 한정 merge 예외](specs/after-care-system/completion.md#6-pr-11-한정-merge-예외)는 역사 기록으로 보존한다. 이후 [repo 정리 검증](evidence/repository-cleanup/README.md)은 새 음성4개·전체447/447·대용량 trace 보관을 별도로 기록한다. 제품화 완료를 뜻하지 않는다.
- 아래 Python editor는 원본 board 편집용이다. React 앱과 다른 실행 경로이며 `project.json` 저장은 Web 사고 기록 저장과 무관하다.

## Local board 열기

저장소 루트에서 `Open Local Board.command`를 실행하고 **http://127.0.0.1:8765** 를 연다. Python 3.9 이상과 Node.js 22 이상이 필요하다. 추가 package 설치와 Figma sign-in은 필요하지 않다.

```sh
# README.md와 serve.py가 있는 저장소 루트에서 실행한다.
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
| 과거 version history | 미확보. 이관 당시 credential에 `file_versions:read` 권한이 없었음 |
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

## 통합 flow 검수본 v1.2

[검수본](docs/reviews/flow-review-v1.2.md)에 48개 node의 분류, 8개 보완 항목, 5개 미결정 사항과 5개 scenario의 정적 검토를 기록하였다. 분류는 유지 8개·보완 필요 27개·결정 필요 13개다. 원래 문구·ID·위치·연결은 유지하였다. 개정안과 미확정 권고안은 현재 diagram에 적용하지 않았다.

Editor의 **검수 표시**로 분류를 표시하고 node를 선택하면 근거를 확인할 수 있다. 검색은 `G2`, `E6` 등의 semantic ID도 지원한다. 검수본의 node link는 해당 위치를 확대한다. 문구·연결이 검토 기준과 달라지면 이전 분류의 표시를 중단하고 재검토 필요를 표시한다. 위치 변경은 문구·연결 검토에 영향을 주지 않는다.

`assets/flow-review-v1.2.json`은 검토 data다. `python3 build-review.py`로 검수본을 재생성한다. 검토 기준 이후의 내용을 개정할 때에는 기존 검수본을 보존하고 새 기준에 대한 검토를 진행한다. 검토 기준과 경로의 대조는 `node test-review.mjs`로 확인한다.

## 차량 UI 조사와 다음 단계

[Pleos foundation](docs/research/pleos-foundation.md), [AAOS 기준](docs/research/aaos-foundation.md), [component 후보](docs/research/component-shortlist.md)를 조사하였다. [Design 방향](docs/research/design-direction.md)은 사고 직후 안내와 기관별 진행 상태를 확인할 HTML prototype의 범위를 제안한다. 검토 시점은 2026-11-05이며 실제 차량·기관 연계 검증은 포함하지 않는다.

사용자가 선택한 후속 방향은 **실제 Cult UI source로 React design을 검증한 후 Kotlin + Compose로 구현**하는 것이다. [실행 계획](docs/superpowers/plans/2026-11-05-cult-design-poc.md)에 따라 [첫 화면 두 안](prototype/web/README.md)을 구현하였다. 사용자는 A · 행동 중심을 선택하였으며, 이후 anti-slop 도구를 조사하고 네 독립 적용안을 비교하였다. [비교 기록](docs/reviews/cult-design-poc.md)에 범위·선택·검증 근거를 기록하였다.

[Anti-UI-slop 조사](docs/research/anti-slop-stack.md)에는 design critique·art direction·reference 추출·component·browser 검증·Compose token 공유의 후보와 적용 범위를 정리하였다. [보완 source 조사](docs/research/anti-slop-tools-scout.md)는 추출·검증 도구의 실제 구현과 license를 확인한 기록이다.

현재 Web 기본 검토 대상은 **전체 여정**이며 [상황 spec](specs/emergency-experience/principles.md)의 SC01–SC05 60개 장면도 `?study=emergency`에서 제공한다. 차량 지원·기록·전송 승인·거절·보류·중단·복원은 local 상태이며 실제 기관 연계가 아니다. [기존 검증 기록](prototype/web/evidence/emergency-complete/README.md)은 해당 시점의 증거로 보존한다. 현재 실행 방법은 [Web README](prototype/web/README.md), 선행 네 도구 적용안은 [역사 기록](docs/reviews/design-tools/README.md)을 따른다. 긴급 상황 이해도와 실차 검증은 미실시다.

Native에는 Kotlin + Compose SC05 PoC가 있다. 과거 세 장면·C Satin 재현과 21개 검사 결과는 당시의 기록이며 현재 공유 manifest 호환성의 증거가 아니다. 현행 구현·실행 범위는 [Android README](prototype/android/README.md), 복구 수용 기준은 [계약 스펙](docs/superpowers/specs/2026-11-12-contract-reliability-repair-design.md)을 따른다.

## Git과 확인

이 directory는 [GitHub public repository](https://github.com/JangHyun-bin/hyundai-accident-support)의 `main`과 연결되어 있다. Editor에서 저장한 뒤 변경을 확인하고 의미 있는 단위로 commit·push한다. Editor의 저장은 local `project.json`에 반영되며 GitHub에 자동 전송되지는 않는다.

```sh
git diff --stat
git diff -- project.json
git add project.json
git commit -m "docs: refine accident support flow"
git push
```

```sh
node check.mjs
node test-model.mjs
node test-review.mjs
python3 test-server.py
```

공식 API는 [전체 file JSON과 SVG·image를 제공](https://developers.figma.com/docs/rest-api/file-endpoints/)한다. `.jam`은 Figma의 [local copy](https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files) 형식이며 comments와 version history는 포함하지 않는다.

실제 차량·긴급 기관·보험사 연계, 사고 대응 문구와 정보 처리 기준은 기존 제안의 검증 과제로 유지한다.
