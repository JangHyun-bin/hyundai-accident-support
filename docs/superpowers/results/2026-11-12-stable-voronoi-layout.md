# Stable Voronoi layout 검증 결과

> 역사 결과다. 아래 389/389와 gate 완료는 당시 source에 한정한다. 후속 [외형 보완](2026-11-12-voronoi-visual-regression.md)과 [display 기준](../../design-system/pleos-display-and-controls.md)을 함께 읽는다. 현재 branch 통과로 승계하지 않으며 PR #11 판정·남은 전역 목표는 [완료 추적](../../../specs/after-care-system/completion.md)에서 구분한다.

## 적용 범위

실제 Journey 1–7, Flow preview, Catalog가 `FlowFrame`과 `FlowPlan`을 공유하도록 통합. 정상 차량 환경에서 외곽 크기는 host가 결정하며, 내용 길이는 profile 선택에 영향을 주지 않음. Editor의 직사각형 slot을 먼저 예약하고 rounded surface를 그 바깥에 배치하는 방식.

Figma 근거는 저장 snapshot `2026-11-11T12:47:35Z`. Live Figma 대조나 편집 없음. 기존 `specs/after-care-system/design.md`와 미commit visual-contract 문서는 사용자 작업으로 보존하며 이번 commit에서 제외.

최신 사용자 지시 `왠만하면 push merge까지 해줘요~`에 따라 초기 local-only 범위에 branch push·PR·조건 충족 후 merge 추가. 실제 차량·119·보험사 API, 영상 제작, Figma write는 제외 유지.

## 구현과 tradeoff

- `VehicleShell`: 같은 환경에서 status/header/urgent/dock 공간을 예약하고 좌우 1:1 pane의 높이를 고정. 입력 길이·단계별 overflow 측정으로 전체 layout을 바꾸는 경로 제거.
- `FlowBoard`: 매 frame React content 재생성과 최대 rectangle 탐색 제거. GSAP은 shape/material만 갱신. Content width·variant 변경은 비긴급 content의 opacity 0 시점에 한 번 commit. 4000ms 대기 제거, 현재 shape에서 최신 target으로 retarget.
- 실제 기록·사진·검토·전송 editor: DOM을 유지하며 title/필수 action을 고정하고 body에 scroll 소유권 부여. Draft·selection·media·replay state 보존.
- 119 core는 고정 anchor와 opacity 1 유지. 장식 숫자·spectrum은 surface가 축소되기 전에 별도로 fade. 위험 action은 domain event 즉시 표시.
- 초기 source summary slot에 target editor가 먼저 나타나지 않도록 full-slot commit과 표시 시점 연결. 대표 Journey의 상위 3px 이동·fade 제거.
- 실제 OS reduced-motion 변경을 구독. Motion 중 설정 변경·환경 revision은 유효한 endpoint로 commit.
- IME는 마지막 DOM 관찰값을 위험 전환 전에 기존 draft에 반영. Browser 내부의 아직 노출되지 않은 후보는 복원한다고 주장하지 않음.
- B″ material·grain·미세한 CA·C/C_02 preset·기존 notification 유지. 추가 dependency 없음.

원래 power diagram 후보는 실제 editor slot을 수용하지 못하는 경우가 있어 기존 `inset`/`roundedPath`를 이용한 constrained split 사용. 672×410 예시에서 primary inset 면적은 약61.3–61.6%. Safe의 두 summary는8.11/8.44%,119는11.24%. 작은 summary의 기존10% 선호보다 실제 editor와 통화 상태의 읽기 공간을 우선. 기존 power-diagram test는 보존.

## 환경 matrix

같은 browser context에서 단계1–5와 긴 기록을 조작. Text 100/200%, 16개 환경 모두 horizontal overflow·page error·touch 하한 미달 없음. 실제 body는 최소3줄 공간 충족. Document profile의 자연스러운 높이 증가는 승인된 접근성 예외이며 bounded 통과로 계산하지 않음.

| Device / viewport | 100% profile | 200% profile | 100% bounded shell 높이 변화 |
|---|---|---|---|
| Vehicle2560×1440 | wide | document | 0px |
| Vehicle1920×1080 | wide | document | 0px |
| Vehicle1440×900 | wide | document | 0px |
| Vehicle1280×720 | document | document | 해당 없음 |
| Vehicle960×900 | document | document | 해당 없음 |
| Vehicle393×852 | document | document | 해당 없음 |
| Mobile393×852 | document | document | 해당 없음 |
| Mobile360×800 | document | document | 해당 없음 |

Mobile393×852 기본 text는 예약된 필수 공간 기준에서4px가 부족하여 document 선택. Font/touch 축소나 내용 숨김으로 bounded에 강제 편입하지 않음. 더 큰 narrow/mobile 환경은 별도 persistent editor test와 resolver test에서 검증.

1440의 차량 scene에서 part buttons가 차체를 가리던 문제는 예약 nav row로 이동하여 해결. 전체 차체 높이120px 이상과 hit probe 확인. Replay의 play control은64px row에 유지하며 timeline·복귀 control은 해당 footer 내부에서 scroll 접근.

## 실제 normal-motion 측정

1440×900 실제 Journey, normal motion에서 시작·중간·완료를 rAF 측정. 동일 환경/content revision 안에서 shell·scene·board 경계, 통화 anchor, font size/line height/letter spacing/줄 수 확인. 숨겨진 endpoint의 정당한 width commit은 별도 revision으로 구분.

| 전환 | 실제 frame 수 | Moving frame 수 | 서로 다른 geometry 수 | Rounded text/control 침범 | Visible 동일 DOM의 typography 변경 |
|---|---:|---:|---:|---:|---:|
| detect→evacuate |126|114|73|0|0|
| evacuate→safe |123|116|74|0|0|
| safe→review |127|115|74|0|0|
| review→sending |125|115|74|0|0|
| sending→calm |145|140|1|0|0|

Calm은 sending과 같은 endpoint geometry 위에서 fade/breath를 실행하는 정의이므로 geometry1개. 움직이는 geometry가 검증됐다고 계산하지 않음. 다른4개 전환은 각각 최소10개 실제 중간 shape 조건 충족. 같은 환경의 고정 경계/anchor 오차 ≤1 CSS px, 통화 core의 opacity1 확인.

추가 evidence:

- Rounded endpoint42개, text fragment650개, control130개, focused ring12개에서 surface 침범 미검출.
- Focus scrollport padding9px 적용 후1440 textarea와 review button의8px ring 잘림0.
- Rapid NEXT/BACK:42 rAF,25개 changing path, 요청 전후 같은 browser frame에서 geometry reset 차이0px.
- Driving pause/resume:14개 paused frame, 가시 content의 opacity1·inert 해제 및 재개 확인.
- 1440→1920 resize 중 실제 textarea DOM·값·scene 유지, 새 endpoint containment 확인.
- 실제 Asta TTF 요청 지연 후 native loading/loadingdone, 최신 plan commit 확인. Synthetic font event로 대체하지 않음.
- IME 위험 진입5건과 직접 긴급 진입5건: 신규/기존 경위서 문장 및 수신처3종의 같은 DOM·관찰값·selection `[3,8,backward]` 보존.
- 전체 Journey walkthrough에서 기록·사진·검토·승인·전송 실패/retry·BACK·위험 복귀·통화 유지/종료·접수·후속 처리·scene/replay 보존 확인.

## 독립 review closure

| Finding | 조치 | 독립 재검증 |
|---|---|---|
| Target editor가 source summary slot에서 조기 표시 | Compact slot에서는 editor를 숨기고 full commit 후 표시 | 5→6 첫100ms editor hidden |
| 상위 stage animation이 전체 화면을3px 이동·.72 opacity로 fade | 대표 Journey의 상위 motion ref 분리 | 46 rAF에서 이동0px·opacity1 |
| Report/recipient IME 관찰값 손실 | Review handle에서 기존 draft 동기 보존 | 같은 DOM·값·selection, 위험 action 즉시 표시 |
| 기록 방법 전환 후 focus가 BODY로 이동 | 전환 후 visible 선택 button에 focus 복귀 | 사진 tab button focus 유지 |
| 실행 중 OS reduced-motion 변경 미반영 | 공용 reactive preference 구독 | quiet=true, moving=false, 최종 plan 즉시 commit |

추가 중요 finding 없음. 독립 reviewer는 product 파일을 변경하지 않음. Root temporal audit에서 별도로 찾은 119 장식 침범과 calm 뒤 surface 잔류도 regression과 screenshot으로 확인 후 fix.

## 실행 근거

- `npm run check`: TypeScript·production build 통과. 최종 bundle 약890kB의 기존 계열 size advisory는 유지.
- Focused closure25/25, fixture/환경/interruption/기존 contour31/31 통과.
- 첫 전체 suite375/385. 실패8건은 fixture가 optimized React를 직접 import하여 중복 instance 생성,1건은 profile 확정 전 control 열거,1건은 viewport 변경 직후 비동기 geometry 측정. 정상 Vite fixture module과 환경 확정 후 측정으로 교체. 읽기·touch·containment assertion 유지.
- `npx playwright test --workers=4 --reporter=line`: 최종 **389/389 통과**, 3.0분. Log `/tmp/hyundai-stable-full-suite-final.log`.

Local evidence 위치: `prototype/web/.audit/stable-voronoi/`의 `summary.json`, 단계별 frame JSON/PNG, `screenshot-strip.html`, `runtime-trace.zip`, `browser-performance.json`. 임시 audit file은 commit 대상에서 제외. 환경 matrix는 `/tmp/hyundai-stable-final-matrix-runtime.json`, focus 결과는 `/tmp/hyundai-stable-B-dom-focus-metrics.json`.

Browser trace에는 audit DOM 측정과 scene/material callback도 포함. 관찰된 합계는 Layout130.122ms, UpdateLayoutTree1096.353ms, Paint128.938ms, RAF callback1744.504ms. 구간별 호출이 서로 포함될 수 있어 합산한 총비용으로 해석하지 않음. Geometry만의 독립 성능이나 실차60fps 증거가 아님.

## 미검증·잔여 위험

실제 차량 hardware/GPU, native IME 내부 후보, 실제 기관 연동, live Figma 정합성은 미검증. 작은 화면은 document profile이므로 page scroll 사용. 본 검증은 Chrome browser와 합성 fixture에 대한 결과.

Preview: `http://localhost:5173/`, `http://localhost:5173/?study=flow`, `http://localhost:5173/?study=design-system`.

## S0–S4 gate

S0 contract/실패 baseline, S1 A/B/C 별도 worktree, S2 공용 renderer 통합, S3 actual frame 검증, S4 전체 regression·independent review 모두 충족. 최종 product integration commit `50de12c`. 기존 사용자 문서2개 제외 확인.
