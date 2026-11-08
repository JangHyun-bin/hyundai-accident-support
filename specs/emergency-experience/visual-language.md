# 시각 표현과 interaction 규칙

## 공통 기반

Asta와 Pleos dark basic scale을 사용한다. Browser의 검토 UI는 좁은 폭에서도 조작할 수 있어야 한다. 차량 canvas는 비율을 유지해 축소하며 원래 크기 보기를 제공한다.

### Pleos 1:1 분할 (2026-11-08 사용자 결정)

사고 대응 app은 차량 화면 전체가 아니라 Pleos의 app 창 하나에서 돈다. 디자이너 피드백("화면이 꽉 차야 하나", "차 상태 칸을 유지하면 실제로 어떻게 보이는지 알려줄 수 있다")과 [Pleos 조사](../../docs/research/pleos-foundation.md)를 따랐다.

- 공식 문서가 밝힌 것: system UI(status bar·driving view·GNB)와 app 창의 구분, 창 비율 1:1(app 2개)·2:0(app 1개), 닫을 수 없는 기본 app인 내비. 3rd-party app이 긴급 상황에 전체 화면이나 system popup을 쓸 수 있다는 근거는 없다.
- 가정한 것: Connect-S 17을 2560 × 1440 px로 두고 status bar 72, 창 788(driving view)·840·840 × 1184, 간격 23, GNB 140으로 그린다. 공개 문서 본문에 없는 수치다.
- 배치: driving view │ 사고 대응 app │ 내비. App을 운전자 쪽 창에 둔 것은 project 결정이다. Driving view·내비·status bar·GNB는 맥락을 보여 주는 그림이며 app이 제어하지 않는다.
- 글자: app 안의 글자는 Pleos type scale(Headline 60·56·48, Title 40·36·32, Body 30·28·26, Label 24·20)만 쓴다. Countdown 숫자(88)만 예외다.
- 강조: 빛 번짐은 구호 ring에만 둔다. Button은 그림자·gradient 없는 단색이다. 디자이너 피드백("button gradient나 그림자가 너무 셈")과 Pleos shadow(최대 검정 24%)를 따랐다.

## Indicator 의미

| Symbol / 상태 | 표현 | 뜻하지 않는 것 |
| --- | --- | --- |
| 사람 / attention | 사람 윤곽 + 삼각형 느낌표 + `부상 있음` | 부상 위치·중증도·특정 좌석의 확인 |
| 사람 / unknown | 사람 윤곽 + 물음표 + `응답 미확인` 또는 `응답 없음` | 의식 없음·사망·안전함 |
| 사람 / confirmed | 사람 윤곽 + 확인 표식 + `응답 확인` | 부상 없음·위험 해소 |
| 전화 / unknown | 전화 + 물음표 + `연결 미확인` | 연결 성공·접수 |
| 전화 / confirmed | 전화 + 확인 표식 + `통화 연결됨` | 접수 완료·출동 |
| 차량 지원 / unknown | 차량 + 물음표 + `접수 미확인` | 미접수 확정·재요청 허용 |
| 차량 지원 / confirmed | 차량 + 확인 표식 + `접수 확인` | 현장 도착·안전 확보·보험 처리 완료 |

- 확인 표식은 해당 대상에만 붙인다. 화면 전체에 완료 색이나 완료 문구를 사용하지 않는다.
- Confirmed 장면에서도 사람·차량·전화 본체와 큰 label은 neutral로 유지하고 작은 확인 표식에만 mint를 적용한다. 대상 전체가 안전하다는 의미를 주지 않기 위한 제안이다.
- 색만으로 의미를 표현하지 않는다. 흑백으로 보아도 상태 symbol과 label이 남는다.
- Scene symbol은 정보 종류를 나타내는 도식이다. 실제 도로·좌석·신체 위치를 재현하지 않는다.
- 확인되지 않은 값을 빈칸이나 정상 표시로 대체하지 않는다.

## 화면 역할

2026-11-08 사용자 결정으로 세 칸 구조를 쓴다. 근거는 [설계 문서](../../docs/superpowers/specs/2026-11-08-urgent-three-slot-design.md)에 있다.

1. ① 감지: 맨 위의 작은 상황 줄. 금속 cue glyph, `감지 · cue label`(Title 32), 미확인 사실 chip. `음성 안내 듣기` button은 이 줄 오른쪽 끝에 둔다. App 이름·logo·header는 두지 않는다.
2. ② 차량: 가운데 큰 영역. 차가 다음에 할 일 한 문장과 필요한 승인 button. 그 아래에 세 기관의 상태를 둔다.
3. ③ 나: 아래에 따로 띄운 card. 행동 glyph(`self_action.id` → `glyphs.json`의 `self`)와 존댓말 명령 한 문장(3 어절 이하, `~세요`)이다. 조건이 있으면 문장 위에 작게(`움직일 수 있으면`), 다음 행동은 `→` 뒤에 작게 둔다. 자동 연결 장면에서는 `응답할 수 있어요` button이다.
4. 검토 UI: scenario·장면·외부 event·전체 spec·3초 보기. 차량 화면 밖에 배치하며 실제 제품 기능과 구별한다.

세 칸은 정보 순서를 정하는 틀이다. 화면에 `감지`·`차량`·`나` 같은 칸 이름표를 달지 않는다(2026-11-08 사용자 결정). 누가 하는지는 위치·모양·문장이 보여 준다.

같은 이유로 화면을 설명하는 글은 두지 않는다(2026-11-08 사용자 결정). App 이름(`사고 대응`)과 장소 꼬리표(`고속도로`), 문장 앞 말머리(`지금 할 일`), 설계 규칙을 옮긴 주석(`연결 · 접수 · 도착은 별도 확인`), 주변 창 설명(`Driving view · system UI`)이 여기에 해당한다. 확인 범위는 기관별 상태 label(`연결 미확인`·`접수 확인`)이 이미 보여 준다. `presentation.context_label`은 Android preview가 읽으므로 data에는 남긴다.

### 창 배치 (2026-11-08 사용자 결정)

Header를 뺀 뒤 화면이 비어 보인다는 피드백("sparse하다, 구조화된 정렬로 맞춰야 한다")을 따랐다.

- 바깥 여백은 좌우 40, 위아래 32다. 가로 배치는 모두 같은 3단 grid(간격 16)에 맞춘다. ①의 cue 줄은 1–2단, `음성 안내 듣기`는 3단이다. 사실 chip은 한 단에 하나, 승인 button은 1–2단·`취소`는 3단, button이 하나면 1–3단이다. 기관 상태는 세 단에 하나씩 둔다.
- ①은 창 위에, 기관 상태와 ③은 창 아래에 붙인다. ②가 그 사이를 채우고 ring(280)·제목·button을 가운데 세로로 쌓는다.
- Ring이 없는 settled 장면(구호 연결 안 함·차량 지원 접수 미확인·접수 확인)은 ②가 제목과 button만 가져 여백이 크다. 채울 그림은 아직 정하지 않았다.

### 긴박도 색

| 단계 | 쓰는 곳 | 색 |
| --- | --- | --- |
| 결정 필요 (`phase: decide`) | 구호 countdown ring·숫자·`지금 연결` button. `[data-urgent]` 하나로 묶는다 | 빨강 `#FF4C28` (Pleos `informative_negative`) |
| 진행 중 (`phase: progress`) | 연결 중·확인 중인 ②의 표시 | 호박 `#FFB340` |
| 대기·확인됨 (`phase: settled`) | 그 외. 확인 표식만 mint | neutral |

- 빨강은 생명과 관련된 결정에만 쓴다. 차량 지원·보험의 승인 button은 neutral 주 button이다.
- `지금 연결`의 글자는 어두운 색(`#131417`)이다. 흰 글자는 빨강 위에서 4.5:1에 못 미친다.
- 화면 전체를 경보색으로 칠하지 않는다. 초록 "완료" 화면을 두지 않는다.

## Motion·음성·입력

- 2026-11-08 사용자 결정으로 app 전체에 같은 motion 규칙을 둔다("전환이나 button 누르는 거나 모든 것에 motion이 필요하다"). 정보가 늦게 보이면 안 된다는 원칙은 유지한다.
  - 장면·상황 전환은 React `<ViewTransition>`으로 블록(① 상황 줄, ring, ② 문장, button 줄, 기관 상태, ③ card)마다 제자리에서 바꾼다. 같은 ring은 빨간 countdown에서 호박색 연결 중으로 이어진다. 검토 UI와 주변 창은 즉시 바뀐다.
  - 새 정보는 0.25초 안에 다 보인다(crossfade 200ms, 나타남 250ms, 사라짐 150ms). 블록 위치·크기 변화는 Motion `spring(0.3, 0.1)`을 CSS `linear()`로 풀어 쓴다(`src/emergency/motion.ts`).
  - Button은 누르는 동안 0.97배로 눌린다(120ms). Hover 색 변화는 mouse가 있을 때만 쓴다.
  - Countdown 숫자는 NumberFlow로 굴러 바뀐다.
  - 하나씩 늦게 띄우기(stagger)와 반복 점멸은 쓰지 않는다.
  - `prefers-reduced-motion`에서는 위치·크기 이동과 눌림을 빼고 120ms fade만 남긴다.
- Countdown은 구호 자동 연결에만 쓴다. 10초(`auto_contact.seconds`)이며 ring과 숫자만 움직인다. `prefers-reduced-motion`에서는 ring이 1초 단위로 끊어 갱신된다. `취소` button 외의 click은 취소가 아니다(2026-11-08 사용자 결정).
- 음성 원고는 각 장면의 `voice`에 저장한다. Browser TTS는 사용자가 `음성 안내 듣기`를 선택할 때와 countdown이 시작될 때 실행한다. Countdown 시작에는 짧은 경고음도 낸다. 상태 변경·중단·page 종료 시 기존 음성을 취소한다. 지원하지 않거나 재생에 실패하면 원고를 화면에 보여준다.
- 음성만으로 진행하거나 확인 응답을 추정하지 않는다. 실제 차량 audio focus·소음·음성 인식은 이번 범위 밖이다.
- 주 행동 이후 해당 장면 제목으로 focus를 옮긴다. 검토자가 장면을 선택하면 focus는 검토 control에 유지한다.
- 외부 시연 event로 기존 button이 사라지면 현재 장면 선택 button으로 focus를 옮긴다.
- 요청 결과는 검토자의 명시적 외부 event로만 확인 상태가 된다. 실제 통화·network·기관 전송은 없다.

## 시연 경계

화면 바깥에 `가상 scenario · 실제 전화·전송 없음`을 항상 표시한다. 전체 spec에는 `simulation_only: true`와 각 값의 fixture 출처를 기록한다. 새로고침은 URL의 장면 fixture를 다시 불러오며 실제 요청 상태 저장을 의미하지 않는다.

## C · Satin surface preview

2026-11-06에 사용자가 C · Satin metal을 선택했고, 실제 긴급 상황 storyboard 위에서 보는 preview 진행을 요청했다.

- `?study=emergency&material=satin`에서 연다. 기존 `?study=emergency`는 flat으로 시작한다.
- Material은 장식 배경이다. 상황 spec, indicator, 상태 색, 문구, action, transition을 바꾸지 않는다. 상태가 바뀌어도 배경의 색이나 highlight로 성공·안전을 나타내지 않는다.
- Pleos 1:1 분할 이후 재질은 사고 대응 app 창(840 × 1184) 안에만 깐다.
- C의 sparse Gabor 결과 anisotropic sheen을 유지하되 긴급 화면에 맞게 어둡게 조정한다. 왼쪽 indicator 주변에 빛을 두고, 오른쪽 행동 영역과 하단 지원 현황에서는 밝기를 낮춘다.
- Surface는 pointer와 accessibility tree에 참여하지 않는다. Text·indicator·button은 원래 HTML/SVG layer에 남는다.
- 재질 전환과 표면 강도 변경은 장면·기관 상태·시연 일시 중단 여부를 변경하지 않는다. 기본 강도는 70%이며 확정된 차량 design token이 아닌 비교 시작값이다.
- 자동 animation과 반복 render는 없다. 장면이 바뀌어도 같은 배경을 유지한다. WebGL 2 실패·context loss 시 기본 배경을 사용하며 안내·행동을 막지 않는다.
- 최대 강도의 실제 shader pixel을 대상으로 한 보수적 배경 contrast 계산에서 보조 글자색 `#a9b0b2`와의 최소 비율은 약 4.73:1이었다. 이는 전체 UI의 accessibility 인증이나 실제 차량 시인성 검증이 아니다. 측정은 `prototype/web/evidence/emergency-satin/contrast-check.json`에 기록했다.
- 금속 각인 pictogram은 면과 주변 plate의 대비를 그림자 띠까지 포함한 rendered pixel로 측정했다. 최소 비율은 cue 차량 glyph의 약 3.26:1이고, 상태 표식은 6.99:1 이상이었다. Pleos 1:1 분할 뒤 실제 크기에서 다시 잰 최소값은 사실 chip `현장 도착` glyph의 약 3.15:1, ③ card glyph는 3.47:1 이상, 상태 표식은 7.04:1 이상이다. 시안보다 깊이를 줄이고 가독성을 우선했다(2026-11-08 사용자 결정). 측정은 `prototype/web/evidence/emergency-glyphs/contrast-check.json`에 기록했다.
