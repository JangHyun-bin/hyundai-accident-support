# Cult UI 첫 화면 비교 기록

2026-11-05. 기준: [실행 계획](../superpowers/plans/2026-11-05-cult-design-poc.md)의 Task 1. Web source는 [prototype/web](../../prototype/web/README.md)에 있다.

## 사용자 선택

사용자는 두 안을 확인하고 **A · 행동 중심 (`focus`)**을 선택하였다. 이어 GitHub의 anti-UI-slop 도구를 다양한 관점에서 조사한 뒤 후속 화면을 확장하도록 요청하였다. A의 정보 배치를 출발점으로 유지하고 시각 표현은 확정하지 않는다.

## 구현 범위

| 항목 | 결과 |
| --- | --- |
| 동일 상황의 두 구조 | 부상·고속도로·차량 이동 가능·조작과 경로 미확인을 각각 유지한다. |
| 실제 source | Cult Halo Card·Halo Badge, Motion Primitives TransitionPanel을 사용한다. |
| 안내 전환 | 열기·접기, 구조 전환 중 열림 상태 유지, keyboard focus 이동·복귀를 제공한다. |
| Review 환경 | Localhost에서 직접 실행한다. 전체 축소·원래 크기와 고정된 A/B control을 제공한다. |
| 외부 동작 | 전화·요청·정보 전송을 수행하지 않으며 세 기관의 상태는 요청 전이다. |

## 검증 근거

`npm run check`의 TypeScript·production build, `npm run test:ui`의 네 가지 browser 검사를 통과하였다. 상태 표시·전환·기본 URL 처리의 초기 실패를 확인한 후 구현하였다. Laptop에서 비교 control이 보이지 않는 문제와 안내를 연 뒤 keyboard focus가 이동하지 않는 문제는 각각 실패를 재현한 뒤 fix하였다.

실제 browser에서 두 안의 접힌 상태와 펼친 상태를 확인하였다. Screenshot 수집 중 page error는 없었고 주요 문구가 canvas 아래로 벗어나지 않았다. Mobile 화면은 전체 축소 검토용이다. 접근성 전체 기준이나 실제 차량 사용성을 통과하였다는 의미는 아니다.

- [A 첫 화면](../../prototype/web/evidence/focus.png)
- [B 첫 화면](../../prototype/web/evidence/context.png)
- [실제 전환 동영상](../../prototype/web/evidence/comparison.webm)

후속 작업은 anti-slop 조사에 따른 A의 critique, 선정한 시각 기준의 정리, 세 상태 확장, Compose 한 화면 재현이다. 원본 flow·과거 native PoC·미결정 정책은 변경하지 않았다.

독립 code review에서 현재 Task 1 범위의 Critical·Important·Minor 문제는 발견되지 않았다. Reviewer는 keyboard focus·여러 browser 크기·원래 크기·reduced motion을 직접 확인하였다. 후속 상태·전체 접근성·native 적합성은 해당 판정에 포함하지 않는다.

## Task 3 · Compose 재현 (2026-11-07)

Task 2는 긴급 storyboard로 대체되어 Side Panel을 만들지 않았다. 사용자 승인에 따라 Task 3의 대상을 **SC05 · 접수 미확인의 세 장면 + C · Satin**으로 다시 정했다. 기관별 상태 유지와 상태 전환을 함께 확인할 수 있는 scenario이기 때문이다. 구현과 실행 방법은 [Android PoC](../../prototype/android/README.md)에 있다.

| 항목 | Web preview | Compose |
| --- | --- | --- |
| 장면·문구·상태 | `scenarios.json` | 같은 file을 assets로 읽음. 고정 label 3개는 양쪽 모두 code |
| 배치·크기 | 1440 × 810 CSS px canvas | 1440 dp 폭 emulator에서 같은 수치의 dp |
| 재질 | WebGL 2 GLSL, 강도 slider(기본 70%), render 불가 시 기본 background | AGSL `RuntimeShader`, 70% 고정, Android 13 미만·compile 실패 시 기본 background |
| Icon·font | Lucide, Asta Sans | 같은 Lucide path, Asta Sans |
| 시연 control | 화면 밖 page control, 가상 시연 표시, 일시 중단 | 화면 아래 90 dp strip, 가상 시연 표시. 일시 중단 없음 |
| Focus | 주 행동 뒤 제목, event 뒤 현재 장면 button | 같음(keyboard·rotary 기준). 제목은 live region |
| 음성 안내 | Browser TTS, 실패 시 원고 표시 | 미구현 |
| Motion | 사실 영역 160 ms opacity | 없음. SC05의 사실 값은 변하지 않음 |
| 긴 문구 | Browser 줄바꿈 | 어절 단위, 줄 길이 균형 |

화면 비교: Web [접수 미확인](../../prototype/web/evidence/emergency-satin/SC05-initial.png) · [결과 조회](../../prototype/web/evidence/emergency-satin/SC05-checking.png) · [접수 확인](../../prototype/web/evidence/emergency-satin/SC05-received.png), Compose [접수 미확인](../../prototype/android/evidence/sc05/initial.jpg) · [결과 조회](../../prototype/android/evidence/sc05/checking.jpg) · [접수 확인](../../prototype/android/evidence/sc05/received.jpg), font scale [1.3](../../prototype/android/evidence/sc05/initial-font130.jpg) · [2.0](../../prototype/android/evidence/sc05/initial-font200.jpg).

### 검증

- `./gradlew assembleDebug` 통과. App과 test가 같은 Compose 1.9.4를 사용한다(BOM 2025.10.01).
- `accident-support-poc` emulator에서 `connectedDebugAndroidTest` 15/15 통과. Font scale 1.3·2.0과 animation 꺼짐 상태에서도 15/15 통과.
- 처음 구현에서 하단 안내가 "확/인"처럼 낱말 중간에서 줄바꿈되었다. 검사의 실패를 확인한 후 Korean locale의 phrase line break로 fix했다.
- 독립 review에서 가상 시연 표시 누락, 상태 문구의 부분 일치 비교, focus 이동 누락을 발견했다. 각 검사의 실패를 확인한 후 fix했다. 상태 비교와 focus 검사는 해당 code를 일부러 망가뜨렸을 때 실패하는 것도 확인했다.
- Font scale 2.0에서 시연 control이 커지며 차량 화면을 밀어내는 문제를 화면으로 확인하고, 시연 control이 font scale을 따르지 않도록 fix했다.
- 직접 확인: 세 장면의 clipping 없음, font scale 2.0까지 주요 행동·상태 표시 유지. Android Back은 activity를 종료하며 다시 열면 초기 장면으로 시작한다.
- 두 화면 모두 SC05에서 눈에 띄는 motion이 없어 동영상 대신 같은 장면의 정지 화면으로 비교했다.

### 남은 차이와 미검증

Web과의 차이는 위 표의 음성 안내(원고 fallback 포함)·일시 중단·강도 조절·motion이다. 진행 상태 보존(D04), `fact_overrides`를 쓰는 SC01·SC03의 이식, 실제 Pleos display·AAOS UX restriction·차량 audio focus, 사용자 이해도는 확인하지 않았다. 전체 Compose E2E의 범위는 별도로 정한다.

## 금속 각인 pictogram (2026-11-08)

사용자가 기존 Lucide icon이 단순하고 Satin 재질과 어울리지 않는다고 판단하여, 네 방향 중 **D · 금속 각인**을 선택하였다. 설계는 [design 문서](../superpowers/specs/2026-11-08-engraved-pictograms-design.md)에 있다.

### 범위

- 차량 화면의 cue glyph, 사실 항목 glyph, 주 행동 button glyph, 상태 표식(확인·미확인·요청 전·주의)을 교체하였다. 정의는 web과 Compose가 함께 읽는 [`glyphs.json`](../../specs/emergency-experience/glyphs.json) 하나에 있다.
- Web은 inline SVG와 SVG filter로, Compose는 `Path.op`와 Canvas 효과로 같은 값을 그린다. Web filter는 Skia와 결과를 맞추기 위해 sRGB에서 섞는다.
- 주의 상태의 `부상 있음` 문구는 경고색을 유지하고 glyph만 금속으로 바꾸었다. 검토 UI(장면 목록·event button)와 음성 안내 button은 Lucide를 유지한다.

### 대비 측정

WCAG 1.4.11 비텍스트 대비를 rendered pixel로 측정하였다. 같은 영역을 평소 render와 측정용 render(면·기호는 흰색, plate·원판은 검은색)로 두 번 찍고, 1 px anti-aliasing은 8 이웃 검사로 제외하였다. 안쪽 그림자 띠와 lip은 포함한다. 면의 가장 어두운 pixel과 6 CSS px 안 plate의 가장 밝은 pixel을 짝지어 비율을 계산한다. Web은 Chrome deviceScaleFactor 3에서 측정한다.

| 대상 | 최소 비율 |
| --- | --- |
| Cue glyph (차량·사람·전화) | 3.26 · 3.46 · 3.46 |
| 사실 glyph (6종) | 3.64 ~ 4.25 |
| 상태 표식 (주의·확인·미확인·요청 전) | 6.99 · 9.68 · 11.02 · 11.02 |

전체 값은 [`contrast-check.json`](../../prototype/web/evidence/emergency-glyphs/contrast-check.json)에 있다. 처음 시안 값으로는 cue가 0.40:1이었고, 사용자가 가독성을 우선하기로 결정하여 그림자를 약하게, 면을 밝게 조정하였다. Compose는 cue 차량 glyph에 같은 정의의 3:1 검사를 둔다.

### Evidence

- Web(C · Satin): [SC01 초기](../../prototype/web/evidence/emergency-glyphs/SC01-initial.png) · [SC01 흑백](../../prototype/web/evidence/emergency-glyphs/SC01-initial-grayscale.png) · [SC03 응답 확인](../../prototype/web/evidence/emergency-glyphs/SC03-responded.png) · [SC05 접수 미확인](../../prototype/web/evidence/emergency-glyphs/SC05-initial.png) 외 9개 장면 전체가 같은 folder에 있다. 흑백 image에서 주의 삼각형과 원판 표식이 모양으로 구별된다.
- Compose: [접수 미확인](../../prototype/android/evidence/sc05/initial.jpg) · [결과 조회](../../prototype/android/evidence/sc05/checking.jpg) · [접수 확인](../../prototype/android/evidence/sc05/received.jpg), font scale [1.3](../../prototype/android/evidence/sc05/initial-font130.jpg) · [2.0](../../prototype/android/evidence/sc05/initial-font200.jpg).

### 검증

- Web: `npm run check`, Playwright 전체 통과. Glyph data 검사(모든 fact·cue·action·tone의 glyph 존재, 숨긴 fact의 glyph 없음, 색 없이 구별되는 표식, path 형식), 9개 장면의 mapping 검사, 좁은 화면에서 plate 안에 glyph 유지, 대비 3:1 검사를 추가하였다.
- Compose: `connectedDebugAndroidTest` 21/21 통과, font scale 2.0에서도 21/21 통과. Font scale 2.0 화면에서 사실 값 문구가 잘리지 않는다.

### 남은 한계

대비는 Chrome과 emulator의 render 결과만 측정하였다. 실제 차량 display의 시야각·밝기·반사와 주행 중 시인성은 검증하지 않았다. 각인 깊이는 가독성을 위해 시안보다 얕다.
