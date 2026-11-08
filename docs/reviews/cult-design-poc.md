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

## 긴급 화면 세 칸 구조 (2026-11-08)

사용자는 지금 화면이 실제 사고 상황에 비해 너무 차분하다고 판단했다. 운전자는 읽고 생각할 시간이 없으므로 화면이 바로 지시해야 한다. 설계는 [design 문서](../superpowers/specs/2026-11-08-urgent-three-slot-design.md)에 있다.

### 사용자 결정

- 모든 장면은 세 칸이다: ① 차가 감지한 것 / ② 차가 할 일 / ③ 운전자가 지금 할 일.
- ③에 안전 안내를 넣는다. 근거는 한국도로공사 「비트박스」 행동요령이고, 승인 전 시안이다.
- 차의 행동은 승인해야 진행한다. 응답이 없으면 **구호만** 10초 countdown 뒤 자동으로 연결한다. 차량 지원과 보험은 자동으로 진행하지 않는다.
- 시각은 B · 어둠 속 한 점이다. 빨강은 구호 결정 묶음 하나에만 쓴다. 진행 중은 호박, 그 외는 neutral이다. 초록 "완료" 화면은 없다.
- 성공 기준: 처음 보는 사람이 3초 보고 "지금 할 일"을 말한다.

### 사용자 대신 내린 결정

- 연결이 시작된 뒤에는 차량 화면에서 멈출 수 없다. 자동 연결 뒤 운전자가 응답해도 연결은 계속된다. 혼란한 운전자가 구호를 끊는 위험을 더 크게 보았다. 실제로 괜찮은 운전자가 통화를 피할 수 없다는 비용이 있다.
- 자동 연결 장면의 ③은 `응답할 수 있어요` button 하나다.
- `3초 보기`는 검토 UI를 모두 숨기는 발표 mode다. Countdown을 처음부터 시작하고, 가린 동안 멈춘다.
- ③ 문구는 조건(작게) / 지금 할 행동(3 어절 이하) / 다음 행동으로 나눈다.

### Evidence

- 12개 장면: [SC01 연결 대기](../../prototype/web/evidence/emergency-urgent/SC01-initial.png) · [SC01 자동 연결](../../prototype/web/evidence/emergency-urgent/SC01-auto_contact.png) · [SC03 응답 대기](../../prototype/web/evidence/emergency-urgent/SC03-initial.png) · [SC05 접수 미확인](../../prototype/web/evidence/emergency-urgent/SC05-initial.png). 나머지도 같은 folder에 있다.
- [흑백 countdown 화면](../../prototype/web/evidence/emergency-urgent/SC03-initial-grayscale.png): 빨강이 없어도 숫자·ring·문구로 결정 장면이 구별된다.
- 시안: [B · 어둠 속 한 점](../superpowers/specs/2026-11-08-urgent-three-slot/urgency-directions.png).

### 검증

- Manifest 검사 10개를 통과했다. 새 검사는 다음을 확인한다.
  - Countdown은 구호 `요청 전`에서만 있고, 만료·취소가 구호만 바꾼다.
  - 연결이 시작된 구호는 `요청 전`으로 돌아가지 않는다.
  - ③은 3 어절 이하이고, `의식 없음` 문구가 없다.
- Web: `npm run check`와 Playwright 53개를 통과했다. 새 검사는 다음을 확인한다.
  - 모든 장면의 세 칸과 세 기관, 빨강이 결정 묶음 밖에 없음, 375 px 축소.
  - Countdown 만료·즉시 연결·취소, 다른 곳을 눌러도 취소되지 않음, 일시 중단·재진입, 오래된 timer, 늦은 응답.
  - 음성 한 번 재생과 차단 시 원고 표시, 3초 보기.
- Compose: SC05 test의 기대 제목만 새 문구로 바꾸었다. `connectedDebugAndroidTest` 21/21을 통과했다. Compose 화면은 아직 이전 배치다.

### 최종 review 반영

Branch 전체를 새 reviewer가 검토했다. Critical은 없었고, 아래를 test로 재현한 뒤 고쳤다.

- `3초 보기`나 장면 재진입 때 이전 초 숫자가 잠깐 보이고 ring이 다시 차올랐다. 원인은 둘이었다. 초 reset을 effect에서 해서 첫 frame이 늦었고, 클릭 직전 tick의 갱신이 React 큐에 남아 reset 뒤에 다시 적용됐다. 이제 남은 초에 어느 장면 진입에서 센 값인지 꼬리표를 달고, 진입마다 ring을 새로 그린다.
- 3초 뒤 화면을 가려도 음성이 계속 나왔다. 가리면 음성을 멈춘다.
- SC01 자동 연결 뒤 `통화 연결 확인` event가 응답한 장면으로 넘어가 `응답할 수 있어요`가 사라졌다. 이 event를 없앴다. SC03과 같이 운전자가 응답한 뒤에만 다음 장면으로 간다.
- ① 제목이 살구색이어서 빨강 옆에 두 번째 강조색이 생겼다. ① 제목은 neutral로 둔다. 작은 주의 표식(삼각형)의 색은 남겼다.
- `원래 크기`를 켠 채 `3초 보기`를 열면 화면이 잘려 ③이 안 보였다. 3초 보기 중에는 항상 화면에 맞춘다.
- Countdown이 끝날 때 `취소`에 있던 focus가 page 밖으로 사라졌다. 이제 새 장면 제목으로 옮긴다.
- 문구 `응답이 없으면 10초 후 자동 연결`이 줄어드는 숫자와 맞지 않았다. 문구에서 초를 빼고 `응답이 없으면 자동 연결`로 둔다. 문구에 남은 초를 넣으면 live region이 매초 읽게 된다.

### 남은 한계

- 3초 이해도 평가는 하지 않았다. 도구만 준비했다.
- 안전 안내 문구는 승인 전이다. 출처가 뉴스 기사이므로 한국도로공사 공식 자료로 다시 확인해야 한다.
- 첫 page load에서는 browser가 음성을 막는다. 그래서 원고만 표시된다. 경고음도 사용자 조작 전에는 나지 않는다.
- Compose 세 칸 배치, 실제 차량 소리·비상등 연동, D02 운영 정책은 다루지 않았다.
