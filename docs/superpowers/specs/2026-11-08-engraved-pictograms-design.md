# 금속 각인 pictogram 설계

2026-11-08 · 차량 화면 pictogram 재설계 · 승인 시안 [`mockup-v2.html`](2026-11-08-engraved-pictograms/mockup-v2.html) ([image](2026-11-08-engraved-pictograms/mockup-v2.jpg))

## 의도

차량 화면의 pictogram은 지금 Lucide 1.69.0 line icon을 그대로 쓴다. 배경의 C · Satin은 빛과 결이 있는 금속 재질인데, 그 위의 symbol은 2 px 선 하나라서 혼자 평평하고 흔해 보인다. 사용자는 이 icon들이 "너무 단순하고 agent가 만든 것 같고, 다른 요소는 화려한데 pictogram만 미니멀하다"고 평가했다. 원하는 수준은 "고민을 많이 한 것처럼 보이는, Apple스러운" pictogram이다.

네 방향(A 정밀 symbol · B Glass · C 조형 object · D 금속 각인, [비교 image](2026-11-08-engraved-pictograms/directions.jpg)) 중 사용자는 **D · 금속 각인**을 골랐다. Pictogram을 Satin과 같은 금속판에 깎아 넣은 것처럼 만들어 배경과 같은 재질 언어를 갖게 한다. 이후 D 방식의 전체 glyph 초안(v2)을 보고 "좋아 이렇게 가자"로 승인했다.

## 목표

- 차량 화면 안의 모든 pictogram을 새 glyph set과 금속 각인 재질로 바꾼다. 큰 cue뿐 아니라 사실 줄 icon, 상태 표식, 주 행동 button icon, 요청 footer의 상태 표식까지 포함한다.
- 형태부터 새로 그린다. Lucide에 효과만 입히지 않는다.
- Web은 세 scenario(SC01 · SC03 · SC05)의 모든 장면, Compose는 이미 옮긴 SC05의 세 장면에 적용한다.

## 비목표

- 검토 UI의 icon은 바꾸지 않는다. 차량 화면 밖의 header, 장면 선택, 외부 event, 일시 중단, 음성, spec 보기, 전체 화면 button이 해당한다.
- 새 상태 tone을 만들지 않는다. 상태는 `scenarios.json`의 `neutral` · `unknown` · `confirmed` · `attention` 네 가지 그대로다.
- Motion을 추가하지 않는다.
- Pleos 실차 display의 시인성은 검증하지 않는다.

## 실패로 보는 것

- Lucide 형태에 그림자만 얹은 것처럼 보이는 결과.
- 실제 차량·좌석·신체를 묘사한 것처럼 보이는 형태. Spec은 symbol을 정보 종류를 나타내는 도식으로 정한다.
- 대상 본체에 mint나 완료 색을 칠하거나, 색만으로 상태를 구별하는 것.
- 작은 크기에서 각인이 탁해져 읽히지 않는 것. v1 초안에서 실제로 일어났고 v2에서 얕은 깊이와 밝은 면으로 고쳤다.
- Shader를 쓸 수 없는 기기에서 icon이 사라지거나 깨지는 것.

## 제약

- [`visual-language.md`](../../../specs/emergency-experience/visual-language.md)의 indicator 규칙을 지킨다.
  - Glyph 본체는 모든 tone에서 같은 금속이다. 승인 시안의 `사람 · 주의`도 본체는 금속이고 badge만 warning이다.
  - 확인 표식에만 mint를 쓰고, 주의 표식만 기존 warning 색을 쓴다.
  - 큰 label의 색 규칙은 바꾸지 않는다. Attention 장면의 `부상 있음`은 지금처럼 warning, confirmed 장면의 label은 neutral이다. Pictogram 범위 밖이기 때문이다(내 판단).
  - 흑백으로 보아도 상태 symbol과 label이 남아야 한다.
- 반복 점멸과 장식 entrance는 쓰지 않는다. 빛은 위에서 오는 방향으로 고정하며 움직이지 않는다.
- Icon grid는 Pleos의 48 dp다.
- Icon은 `기존 flat` / `C · Satin` 전환과 무관하게 같다. [`emergency-satin.spec.ts`](../../../prototype/web/tests/emergency-satin.spec.ts)는 표면을 전환해도 글자·색·크기가 같은지 검사한다.
- Compose의 minSdk는 28이다. Icon 렌더는 `RuntimeShader`(API 33+)에 의존하지 않는다. Satin이 꺼진 기기에서도 icon은 같은 모습이어야 한다.

## Glyph set

초안은 100 unit 좌표로 그렸다. 최종본은 48 grid에 맞춘다.

공통 문법:
- 선이 아니라 면으로 그린다.
- 부분 사이는 일정한 폭의 channel로 끊는다(유리·등, 맥박선, 두 사람 사이).
- 모서리 반경은 계열 안에서 통일한다.

| Glyph | 쓰는 곳 | v2 초안 형태 |
| --- | --- | --- |
| vehicle | cue `vehicle`, 사실 `arrival` | 정면 차량. 유리·전조등·grille은 구멍, 바퀴는 몸체와 떨어짐, 사이드 미러는 작은 돌출 |
| person | cue `person`, 사실 `driver` · `consciousness` | 원형 머리와 둥근 어깨. 특정 탑승자나 신체 부위를 뜻하지 않음 |
| phone | cue `phone`, 주 행동 `request_help` | 수화기 |
| route | 사실 `route`, 주 행동 `check_status` 등 | 시작 ring에서 굽은 길이 도착 pin으로 이어짐 |
| heart-pulse | 사실 `injury` | 하트를 맥박선 channel이 가로질러 나눔 |
| handoff | 사실 `handoff` | 두 사람. 앞사람 둘레를 channel로 끊어 뒷사람과 구별 |
| check | 주 행동 `respond` | 굵은 check |
| arrow-right | 주 행동 button 끝 | 굵은 화살표 |

화면에 그리는 사실은 각 scenario의 `presentation.visible_facts`뿐이다(SC01 `driver` · `route`, SC03 `injury` · `consciousness`, SC05 `arrival` · `handoff`). `road` · `mobility` · `response`는 data에만 있고 화면에 나오지 않으므로 이번에는 glyph를 만들지 않는다. 화면에 나오게 될 때 같은 문법으로 추가한다(내 판단).

### 상태 표식

| Tone | 표식 | 색 |
| --- | --- | --- |
| `confirmed` | 원판 + check | mint 법랑, 기호는 `#172A24` |
| `unknown` | 원판 + `?` 각인 | 금속 |
| `neutral` | 원판 + 빈 ring 각인 | 금속 |
| `attention` | 둥근 삼각형 + `!` | warning 법랑 |

v2 시안의 `확인 중 · …` 표식은 쓰지 않는다. Data에 확인 중을 뜻하는 tone이 없고, `접수 확인 중`은 `unknown` tone이다. 그 자리는 지금 `Circle`로 그리는 `neutral`(`요청 전`)의 빈 ring이 대신한다.

## 재질

[`mockup-v2.html`](2026-11-08-engraved-pictograms/mockup-v2.html)의 값이 기준이다.

- **Plate**
  - 비스듬한 금속 gradient(`#4C5255` → `#363B3E` → `#2B3033` → `#3D4346`)를 쓰고, 그 위에 결을 표현하는 1–2 px 반복 줄무늬를 얹는다.
  - 윗면 가장자리에 1 px 밝은 선, 아랫면 가장자리에 1 px 어두운 선을 넣는다.
  - 아래로 부드러운 drop shadow를 준다.
- **각인 면**
  - 아래로 갈수록 밝아지는 gradient를 쓴다. 깎인 홈의 아래쪽 벽이 위에서 오는 빛을 받기 때문이다.
  - 위쪽 안에는 inner shadow, glyph 아래 바깥에는 가는 밝은 lip을 넣는다.
- **크기별 깊이**
  - 큰 cue는 깊게 깎는다(`fCut`).
  - 작은 icon은 얕게 깎고 면을 밝게 한다(`fCutSm` + `gCutSm`). 대비가 깊이보다 우선이다.
- **주 행동 button**
  - Mint 판 위라서 깎지 않는다. `primaryForeground` 단색의 면 glyph로 그린다.
- **배치**
  - 큰 cue의 plate는 지금 cue tile의 자리와 크기(268 dp)를 이어받는다.
  - 상태 badge는 지금처럼 tile의 오른쪽 아래에 겹친다.
  - 사실 줄 icon은 작은 plate 안에 둔다.
- **대비: 가독성이 시안보다 우선한다**(사용자 결정, 2026-11-08).
  - 기준은 WCAG 1.4.11 non-text contrast 3:1이며, render된 pixel로 측정한다.
    - 각인 면에서 가장 어두운 pixel을, 그 glyph를 둘러싼 plate에서 가장 밝은 pixel과 비교한다.
    - 윗부분 그림자 띠도 측정에 포함한다. 가장자리 anti-aliasing 1 px만 제외한다.
  - v2 시안의 큰 cue는 이 기준에 못 미친다. 윗부분 그림자 띠가 약 1.1:1이고, `#8F979A`를 plate의 밝은 쪽 `#4C5255`와 비교하면 약 2.7:1이다.
  - 그래서 각인 면의 윗색을 밝히고(`#8F979A` → `#9AA2A5` 정도) 안쪽 그림자를 약하게 한다. 깊이감은 시안보다 약간 얕아져도 된다.
  - 작은 icon(`gCutSm`)은 지금 값으로 통과한다.
  - 상태 표식의 기호와 원판 사이도 3:1 이상이어야 한다.
  - 측정 방법과 값을 기록한다.

## 구현 방향

아래 내용은 사용자가 정한 것이 아니라 내 판단이다. Builder가 바꿀 수 있지만, 바꾸면 이유를 기록한다.

- **Glyph 정본은 한 곳에 둔다**: `specs/emergency-experience/glyphs.json`. Glyph마다 채우기 전용 path(evenodd)를 둔다.
  - 초안의 stroke(경로 선)와 mask(맥박선, 두 사람 channel)는 외곽선으로 바꿔 넣는다. 두 renderer가 path를 채우기만 하면 같은 모양이 나오게 하기 위해서다.
  - Web은 `scenarios.json`처럼 import한다. Android는 이미 이 directory를 assets로 포함하므로 같은 file을 읽는다.
- **Web**: inline SVG component를 쓰고, 각인은 시안의 SVG filter를 사용한다. 차량 화면 안에서는 `lucide-react`를 import하지 않는다. 검토 UI가 계속 쓰므로 dependency는 남긴다.
- **Compose**: `PathParser`로 path를 만들고 Canvas에 그린다.
  - Glyph로 clip한 뒤 안쪽 그림자는 `BlurMaskFilter`(API 28 이상 hardware 가속 지원)로 그린다.
  - 면은 vertical gradient brush로 채우고, 밝은 lip을 더한다.
  - Lucide를 더 이상 쓰지 않게 되면 `prototype/android/third-party/lucide/`와 README의 출처 문장을 정리한다.
- **작업 branch**: `design/sc05-refine`(문구 두 줄 제거 commit `c2de71f`, 아직 push 안 함) 위에서 이어간다.

## 검증

- **Web Playwright**
  - 모든 scenario · 장면에서 차량 화면 안에 Lucide SVG가 없다.
  - `visible_facts`의 모든 사실 id가 자기 glyph를 가진다. 물음표 fallback이 없다.
  - 상태 tone마다 표식 모양이 다르다.
  - 기존 satin 검사가 통과한다.
- **Compose instrumented test**
  - SC05 세 장면에서 glyph와 상태 표식이 tone대로 그려진다.
  - 기존 16개 검사가 통과한다.
- **시각 증거**
  - Web 9개 장면의 screenshot을 남긴다.
  - Compose `evidence/sc05/` 9장(font scale 1.0 · 1.3 · 2.0)을 다시 촬영한다.
  - 흑백으로 바꾼 screenshot 한 장으로 상태가 모양만으로 구별되는지 보인다.
- **대비 측정값**을 문서에 남긴다.

## Builder에게 맡기는 것

- 48 grid 위의 최종 좌표와 반경, plate 크기, gradient의 정확한 값.
- Test의 세부 구성, README와 review 문서 갱신 범위.

## 후속 결정 · 2026-11-08

사용자가 Pleos design system에 맞춘 flat pictogram으로 전환 지시. Web에서 금속 plate·각인 filter·gradient·Satin 선택 제거. 기존 48×48 path와 상태 의미는 유지. 본문의 각인 설계·검증은 과거 기록이며 Android에는 이번 변경 미반영.
