# Pleos display와 여정 조작 기준

## Display 근거

- [Pleos 공식 Display Layout](https://document.pleos.ai/en/docs/connect/guide/docs-design/getting-started/layout)의 diagram에서 **Connect Standard (16:9)** 확인. Connect Wide는 별도 규격이므로 모든 Pleos display에 16:9를 적용하지 않음.
- [Pleos 공식 Vehicle SDK sample](https://github.com/Pleos-Playground/pleos-sample-vehicle-app#screenshots)의 `Pleos_Connect_v2.1` AVD capture 기준은 **2560×1440**. 이 repository의 Figma 기준과 일치.
- 기준 영역은 status bar·앱 영역·하단 dock을 포함한 전체 display. 각 앱 window가 16:9라는 뜻은 아님.

## 구현 기준

- 대표 여정의 wide vehicle frame은 최대 폭 2560 CSS px, 높이 `width × 9 / 16`. 폭 2560에서 2560×1440, 폭 1920에서 1920×1080.
- 높이는 여정 단계·본문 길이·시연 설정 열림 여부에 따라 변하지 않음. 좌우 panel은 같은 content row 사용.
- 16:9 안에는 차량 status bar·실제 작업 화면·하단 dock만 포함. 단계 목록·이전/다음·시연 설정·시연 설명은 display 아래 sibling 영역에 배치하며 display 높이 계산에서 제외.
- 실제 작업 화면은 status bar와 dock 사이의 남은 높이를 전부 사용. Demo header용 빈 row를 남기지 않음. 제품의 위험 알림은 display 안에 유지.
- 좁은 화면, mobile, 확대된 글자가 들어가지 않는 환경은 기존 responsive/document layout 유지. 접근성을 위해 이 환경에 16:9를 강제하지 않음.
- Catalog의 명시적 `previewHeight`는 환경 검증용 override 유지.

## 조작 위치

대표 여정의 display 아래 `여정 조작` 영역에 이전·다음·시연 설정 배치. 다음 동작은 버튼 아래 문구로 표시. 폭 2560 기준 display는 y=0–1440, 조작 영역은 y=1440 아래에서 시작.

| 상태 | 다음 동작 |
|---|---|
| 119 연결 전 | 연결 요청 |
| 연결 확인 중 | 시연 결과로 통화 연결 확인 |
| 통화 연결 | 대피 안내 |
| 대피 안내 | 사용자가 안전한 곳 도착 확인 |
| 안전 확보 | 기록 시작 |
| 기록 | 저장된 내용이 있을 때 확인 화면으로 이동 |
| 보험사 검토 | 수신처·보낼 범위 확인, 명시적 승인 뒤 전송 시작 |
| 전송 중 | 시연 결과로 전송 완료, 접수는 별도 미확인 유지 |
| 완료 | 후속 처리 |

상황 선택·기기 전환·sample·외부 결과·통화 종료·전송 실패·화면 바로가기는 같은 영역의 `시연 설정`에서 조작. 설정 panel은 외부 조작기 아래 overlay로 열어 display와 Voronoi geometry 유지. 외부 조작기로 기록·검토 단계에 진입하면 해당 입력 제목을 보이게 하며, background 결과 수신은 기존 입력 focus·scroll 유지.

기록 저장, 전송 승인, 차량 부위 선택, 재생 조작은 해당 내용과 함께 유지. 다음 버튼이 저장·승인·접수 확인을 자동으로 대신하지 않음.

완료 화면에서 이전을 누르면 전송 내역 확인 화면으로 이동. 이 화면의 다음은 완료 화면으로 복귀하며 새 전송을 만들지 않음.

## 검증 — 2026-11-12

- `npm run check`: TypeScript·production build 통과. 기존 bundle 크기 advisory 유지.
- Playwright 전체 **395/395 통과**. 저장·승인·재시도, 7단계 전환, IME, 200% text, resize 중 Voronoi와 editor 보존 포함.
- 실제 bounding box: 2560×1440, 1920×1080, 1440×810. 시연 설정 overlay를 열어도 frame 크기 유지.

실차 display, OS window inset, 물리적 touch 크기와 native SDK 연동은 별도 검증 대상.

## Display 경계 fix 검증 — 2026-11-12

- 실제 display만 2560×1440, 1920×1080, 1440×810인지 검증. 단계 목록·조작기·시연 설명은 display 밖에 존재하며, status bar와 dock 사이에는 작업 화면만 배치.
- `npm run check` 통과. Display·editor·확대 글자·focus 회귀 검사 통과.
- 전체 실행은 394/395 통과. 기존 `journey-voice.spec.ts`의 maximum-duration test 1개에서 저장 버튼을 찾지 못함. 같은 source로 단독 재실행 시 1/1 통과. 음성 test의 전체 실행 실패 원인은 확정하지 않음.
- 2560×1440 및 1440×810 capture 육안 확인. 실차·native SDK 검증은 미실시.
