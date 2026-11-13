# Stage와 layout 연결 preview

> 역사 preview spec이다. Global 7단계·checklist·통화/전송/접수 의미는 후속 설계에서도 참조한다. 아래 면적 목표·fixed seed·최대 내부 rectangle·4000ms 시작 간격은 현행 배치 규칙이 아니다. [Stable layout spec](2026-11-12-stable-voronoi-layout-design.md), [외형 보완](../results/2026-11-12-voronoi-visual-regression.md), [Pleos display·조작 기준](../../design-system/pleos-display-and-controls.md)이 이를 대체한다. 아래 검증은 당시 source의 기록이다.

사용자 승인: 대화에서 제안한 연결표를 짧은 spec으로 확정하고 localhost 한 화면에서 전체 전환 확인 요청. 이 문서는 해당 선택과 preview 범위를 기록함.

## 목적과 범위

DEV route `/?study=flow`에서 실제 event에 따라 사고 진행과 weighted panel 배치가 바뀌는 모습을 조작. 기존 VehicleShell·차량 contour·CareSurface·CareAction·CareSpectrum·grain/CA와 설치된 GSAP/Motion 재사용. 실제 통화·microphone·보험사 API 호출 없음. Study control은 IVI 외부에 두어 제품 화면과 분리.

## Approaches

- 선택안: 7개 global 단계,5개 layout preset,4개 checklist를 분리. Event가 global 상태를 바꾸고 그 상태에서 layout 도출. 기존 Figma 자산을 유지하면서 연결만 명확하게 정의.
- 대안: 단계마다 새로운 배치 생성. 통화 연결만으로 공간이 움직이고 layout variant 증가하므로 이번 preview에서 제외.
- 대안: layout 고정. 단순하지만 사용자가 확인하려는 adaptive 흐름을 보여주지 못하므로 제외.

## 연결표

| Global | Event/상태 | Layout |
|---|---|---|
| 1 감지 | 시작 | detect,Guide59·11941 |
| 2 119 연결 | 연결 확인 | detect 유지,통화 상태·빛만 변경 |
| 3 대피 안내 | 안내 보기 | evacuate,Guide58·record21·11921 |
| 4 안전 확보 | 사용자 안전한 곳 도착 확인 | safe,record37·Guide27·insurer20·11916 |
| 5 기록 | 기록 시작·내용 확인 | safe 유지 |
| 6 보험사 전달 | 보낼 내용 확인 | review,insurer69·record20·11911 |
| 6 보험사 전달 | 전송 시작 | sending,insurer89·11911 |
| 6 보험사 전달 | 전송 실패 | review 복귀,내용 유지·재시도 |
| 7 완료 | 전송 성공 | 통화 중이면 sending 유지. 통화 종료 후 calm |

면적 수치는 Figma annotation의 목표값. Seed와 weight를 사용하는 power diagram으로 배치를 계산하며 rounding/gap 적용 후 정확한 면적비 일치까지 보장하지 않음. 해당 차이는 browser에서 실제 면적과 함께 확인 가능하게 함.

## 상태 규칙

- Checklist4/4 자체로 global stage를 넘기지 않음. `안전한 곳에 도착했어요` 확인 event만 안전 확보로 이동.
- 기록은 내용이 비어 있으면 확인 불가. 전송 실패·재시도·이전 이동에서 내용 보존.
- 전송 성공은 보험사 접수 완료로 표시하지 않음. 접수 확인은 별도 미확인 상태 유지.
- 진행 중 통화는 완료 화면에서도 유지. 전송 성공과 통화 종료가 모두 충족되어야 calm.
- 전송 중 이전 이동·중복 전송 금지. Reset은 남은 simulation timer를 취소하며 초기화.
- Global과 checklist는 별도 상태. Previous는 단계 이동만 되돌리고 사용자가 작성한 내용은 보존.

## Layout와 motion

- 오른쪽 영역에 fixed seed: Guide(300,560),record(980,240),insurer(640,720),119(1010,1000); nominal1236×1184.
- Figma weight 표·변환식 `(0.1+value)*area*.18` 사용. 이 preview의 거리 규칙은 additive squared-distance power diagram으로 결정.
- 2/3/4/3/2 cells. 기존 `roundedPath` 재사용,nominalgap24/radius36. 실제 viewport에 비례해 geometry 축소.
- Text는 polygon과 별도로 가장 큰 내부 rectangle에 배치. 좁은 viewport·확대 text에서는 읽기 가능한 일반 card로 fallback.
- Layout 변화1200ms,ease(.65,0,.35,1),시작 간격 최소4000ms. 빠른 event는 최신 target만 보관. 내용은 geometry 안정 뒤360ms fade.
- Layout이 같으면 geometry 재계산 transition 없음. 색 진입·pulse·잔광은 background만 GSAP으로 변화하고 평시는 neutral surface.
- Calm은 마지막2칸에서 fade/morph1600ms 후2초 들숨·2초 날숨. 실제 multi-cell 흡수 simulation은 이번 범위 밖;4→3→2의 감소는 해당 단계 이동으로 확인.
- Guideblue/violet,119copper. Scoped SurfaceThemeProvider로 적용하고 기존 제품 theme 저장값은 변경하지 않음.
- Driving simulation은 motion을 현재 위치에서 정지하고 비긴급 입력 잠금. 정차 후 최신 target으로 재개. Reduced motion은 즉시 최종 상태,breath·pulse 없음.

## 검증

State tests: checklist완료만으로 진입하지 않음,안전 확인,빈 기록,전송 실패/재시도,진행 중 통화,이전/Reset.
Geometry tests: 모든preset유효polygon,면적합,cell최소10%·priority35% 조건,내부contentrect 및gap.
Browser tests: 전체flow,실패/재시도,통화hold,빠른입력,resettimer,driving,reduced motion,desktop/mobile·200%text,nooverflow/consoleerrors.
TypeScript·build 확인,desktop과mobile screenshot 직접 확인. 새dependency·Git commit/push·Figma변경 없음.

## 구현 확인, 2026-11-11

- 전송 전 보험사 panel에서 실제 기록 excerpt와 전체 내용 dialog 제공. Escape와 닫기 후 원래 button으로 focus 복귀.
- 119 종료 시 call panel과 단계 안내가 함께 종료 상태 표시. 작은 119 cell은 spectrum을 생략해 label·번호·상태를 보존.
- `npm run check` 통과. `flow-model.spec.ts`와 `flow-study.spec.ts` 12개, 기존 `scene-pages.spec.ts` 5개 통과. Desktop·mobile·200% text 직접 확인.
- Localhost URL: `http://localhost:5173/?study=flow`. DEV 전용이므로 production build에는 포함되지 않음.

### 진행 control 접근 보완

진행 영역은 1~7 단계 표시 바로 아래, VehicleShell 앞에 배치. Scroll 중에도 상단에 유지하여 현재 단계 action을 계속 누를 수 있음. 1440×900·1280×720·393×852에서 첫 화면 노출과 7단계 진행 확인.
