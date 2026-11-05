# anti-slop 독립 적용 기록

2026-11-05. `A / FocusView`와 비교하는 React prototype이다. 실제 전화·전송·기관 접수 기능은 없다. 이 결과는 해당 도구를 적용한 이번 구현이며, 도구 전체의 성능을 대표하지 않는다.

## Source와 적용 범위

- Repository: [miqdadbadjuber/anti-slop, pinned commit](https://github.com/miqdadbadjuber/anti-slop/tree/9504989f162a92b1996853eccbb3d8a86e73df68)
- Commit: `9504989f162a92b1996853eccbb3d8a86e73df68`
- Cached release: `3.2.26`
- 읽고 적용한 core: `/tmp/accident-design-skills/antislop/SKILL.md`, SHA-256 `30bc532fb59d4c77a301dfdd5ab9f495f098f1085f31e09b3064078ba39a7b01`
- 읽고 적용한 UI supplement: `/tmp/accident-design-skills/antislop-ui/SKILL.md`, SHA-256 `e8cb54f3d436de9253e0e66e0a31b18be80b6054d67b3ad50a4f61fb9f4557f2`
- 함께 읽은 reference: `antislop-ui/references/CORE-WEB-VITALS.md`, `antislop-ui/references/WEB-BASELINE.md`. 측정하지 않은 Web Vitals 수치는 기재하지 않는다.
- Direction: `prototype/web/DESIGN.md`, `FocusView.tsx`, `ScreenParts.tsx`, `cases.ts`, `styles.css`.
- Mode: `during`, 이번 독립 구현 범위의 session override. Global preference 파일은 없었고 새로 만들지 않았다.
- 다른 세 도구의 design guide를 섞지 않았다. 구현은 `src/variants/AntiSlopView.tsx`, `src/variants/antislop.css`에 한정한다.

## Design Read

사고 후 운전자와 탑승자가 다음 행동을 확인하는 화면으로 읽었다. 큰 한국어 문장과 단일 action 면을 중심에 두고, 상황은 조밀한 목록으로 정리한다. **ENERGY 1 / RHYTHM 2 / MOTION 2**. Motion 2는 공통 `Guidance`의 0.2 s 상태 전환에만 해당한다.

화면의 핵심 행동은 기존의 **도움 요청 안내 보기**다. 제목·본문·CTA·이동 전 확인 문구·네 사실·기관별 세 요청 상태를 변경하지 않는다. `Guidance`를 그대로 호출해 `TransitionPanel`, focus 이동, `inert`, reduced motion과 펼침 상태를 공유한다.

## 실제 적용한 결정

| 결정 | 목적과 연결 rule |
| --- | --- |
| 왼쪽 1.8fr action 면, 오른쪽 1fr 상황 목록 | 행동을 먼저 읽고 근거를 옆에서 확인하게 한다. 오른쪽에는 CTA를 두지 않는다. C-3, R-05, R-20. |
| 제목 60 px, 두 줄; CTA 24 px; facts 값 26 px | 제목의 우선순위와 행동의 크기를 분리하고, 사실은 짧게 훑게 한다. Asta는 공통 한국어 direction을 따른다. R-06. |
| Action 면만 solid surface | 다음 행동을 한곳에 묶는다. facts와 요청 상태까지 별도 card로 반복하지 않는다. R-14. |
| Main 44 px gap, fact row 22 px padding, footer 앞 26 px | 행동·상황·기관 상태의 경계를 다르게 읽히게 한다. R-05, R-31. |
| Mint는 CTA와 펼친 안내에, peach는 부상·안전 우선에 사용 | 공통 semantic 의미를 유지한다. 새로운 accent 색은 없다. R-01, R-29. |
| Neutral divider와 일정한 label/value 정렬 | 상황이 네 개의 독립 사실임을 드러낸다. 배경 pattern이나 장식 stripe가 아니다. R-07, R-31. |
| `SafetyGraphic` 생략 | 같은 안전 문장을 반복하는 그림보다 행동·사실에 공간을 준다. 새 asset을 만들지 않는다. R-22, R-23. |
| Priority dot, fact icon, button arrow, movement arrow를 표시하지 않음 | 상태가 아닌 dot을 없애고, 이미 명확한 문구와 중복되는 glyph를 덜어낸다. R-04, R-08, R-09. |
| 펼친 안내의 phone icon 유지 | `119` 안내의 내용을 직접 가리키며, library의 외형을 위한 사용이 아니다. R-04. |
| Cult `HaloBadge` 유지, rim glow 숨김, static surface | 기존 요청 상태 component를 사용하되 기관별 status만 읽히게 한다. R-09, R-13. |
| Action 20 px, CTA 12 px, status 6 px radius | 큰 안내 영역·누르는 control·읽는 상태를 구분한다. R-11. |
| 추가 animation 없음 | 공통 펼침/접힘 전환만 위치 변화를 설명한다. 반복 pulse·glow·floating은 없다. R-19. |

## 의도적으로 적용하지 않은 요구

- **R-27:** skill은 data UI에 empty/loading/error를 모두 요구한다. 이번 비교는 같은 `cases.urgent`와 두 펼침 상태를 고정하므로 새로운 상태·문구·요청 동작을 추가하지 않았다. Production 상태 완성도는 pass로 주장하지 않는다.
- **R-03:** 1440 × 810 차량 화면을 review wrapper에서 축소한다는 공통 조건을 유지했다. 390 × 844 browser에서 wrapper overflow와 동작을 확인했지만, 축소된 화면의 물리적 touch target이나 native Compose layout을 검증한 것은 아니다.
- **R-21:** 공통 dark palette는 비교 조건이다. 별도 light theme나 theme toggle을 추가하지 않았다.
- 새 image, logo, metric, action, navigation, dependency는 만들지 않았다. 사용자 brief가 정한 화면과 content가 R-37의 direction이다.

## 실제 browser 확인

Chrome을 Playwright로 실행했다. URL은 `http://127.0.0.1:5173/?study=tools&view=antislop`이다.

| 확인 | 관찰한 결과 |
| --- | --- |
| `원래 크기` 선택 | Canvas 1440 × 810. Shared header 아래 variant 높이 679 px. |
| Summary screenshot | 제목, 본문, CTA, 네 facts, 기관별 요청 세 개가 보인다. `/tmp/antislop-summary.png`를 열어 확인했다. |
| CTA click | `긴급 도움 요청`, `119`, 기존 위치·부상 확인 문구와 안내 접기 control이 나타난다. heading으로 focus가 이동한다. |
| Expanded screenshot | `/tmp/antislop-expanded.png`를 열어 확인했다. Main·footer 위치와 variant 높이 679 px가 유지된다. |
| 안내 접기 click | Summary로 돌아오고 CTA에 focus가 돌아온다. |
| Keyboard | CTA에서 Enter로 펼침. Heading focus 뒤 Tab으로 안내 접기 도달. Enter로 접고 CTA focus 복귀. |
| Focus 표시 | CTA의 computed outline은 3 px. Raw canvas 기준 CTA 높이 74 px, 안내 접기 최소 높이 48 px. |
| 내용 보존 | `부상 있음`, `고속도로`, `이동 가능`, `조작·경로 미확인` 네 값과 `구호/차량 지원/보험`의 `요청 전`이 전환 전후 동일하다. |
| Clipping | h1/h2/본문/buttons/facts/requests의 bounding box가 canvas 안에 있음을 assert로 확인했다. |
| 390 × 844, reduced motion | Review wrapper 가로 overflow 없음. 펼침·접힘과 focus 복귀 확인. 기관 상태 유지. |
| Runtime | JavaScript page error는 없었다. 별도 console check에서 shared `/favicon.ico` 404를 발견했고 root integration 담당자에게 전달했다. 해결 뒤 재확인 전까지 console 전체 pass로 간주하지 않는다. |
| Build | `npm run check`의 `tsc --noEmit`와 Vite build 통과. |

Text contrast는 browser computed foreground/background에 WCAG sRGB 계산을 적용했다. Solid surface만 사용하므로 gradient 경로 차이는 없다.

| Text 조합 | 측정 ratio |
| --- | --- |
| 제목 / 안내 surface | 13.02:1 |
| 안전 우선 / 안내 surface | 8.08:1 |
| Secondary 안내 / 안내 surface | 6.54:1 |
| `119` / 안내 surface | 11.21:1 |
| Fact label / background | 8.37:1 |
| 부상 있음 / background | 10.35:1 |
| 요청 상태 / status surface | 7.84:1 |
| CTA text / CTA surface | 11.74:1 |

## Delivery Gate 기록

아래 PASS는 이 prototype에 실제 적용·확인한 범위다. R-03과 R-27의 제외를 포함해 전체 production 적합성이나 사용성 점수를 뜻하지 않는다. R-35 console 확인은 shared favicon 처리 후 갱신한다.

### Block 1: Hard Gate

| Rule | 상태와 근거 |
| --- | --- |
| R-02 | PASS: 새 UI copy를 쓰지 않았고 UI 문구에 em dash가 없다. |
| R-03 | 범위 제한: raw canvas 내 clipping 없음, review wrapper 390 px overflow 없음. Native mobile/touch target 검증 제외. |
| R-17 | PASS: 새 수치 없음. 기존 안내의 `119`만 유지. |
| R-18 | PASS: testimonial·인물·avatar 없음. |
| R-23 | PASS: 새 visual asset·navigation 없음. |
| R-24 | PASS: variant가 navigation을 추가하지 않음. |
| R-25 | PASS: 확인한 모든 text color 조합이 4.5:1 이상. 측정값은 위 표에 기록. |
| R-26 | PASS: CTA와 안내 접기를 각각 실제 click, 상태 변화 확인. |
| R-27 | 의도적 제외: 동일 fixture 비교 조건에 따라 empty/loading/error 미구현. |
| R-28 | PASS: FAQ 없음. |
| R-32 | PASS: Enter, Tab, focus 이동·복귀와 visible outline 확인. |
| R-33 | PASS: TSX·CSS source를 직접 작성. Source를 rewrite하는 script 없음. |
| R-34 | PASS: 허용된 단일 dark theme로 두 상태 확인. |
| R-35 | 보류: build·상태 click-through 완료. 통합 시 favicon 요청을 제거하고 모든 도구 화면을 다시 검사했다. Console/page error 없음. |
| R-36 | PASS: 성능·보안·고객·beauty score 주장 없음. |
| R-37 | PASS: 생성 전에 DESIGN.md를 읽고 위 Design Read 선언. |
| R-38 | PASS: 공통 시연 fixture의 내용만 사용. Root wrapper의 시연용 가상 정보 표시 유지. |
| R-39 | PASS: 공유 native button·accessible name·inert·reduced motion 유지. Hover/active와 focus 표시 확인. Disabled state는 이 두 control에 없음. |
| R-40 | PASS: 새 media·third-party script 없음. Web Vitals·Lighthouse 수치는 not measured. |

### Block 2: Purpose-Gate

| Rule | 상태와 근거 |
| --- | --- |
| R-01 | PASS: 공통 semantic palette, 장식 gradient 없음. |
| R-04 | PASS: 전화 내용에 대응하는 phone icon만 variant 본문에 표시. |
| R-06 | PASS: 공통 Asta, 제목/행동/사실의 type 위계는 위 결정 표에 기록. |
| R-07 | PASS: 배경 pattern 없음. Divider는 fact 경계. |
| R-08 | PASS: variant의 button arrow를 숨김. |
| R-09 | PASS: badge는 실제 fixture의 기관별 요청 상태만 표시. Priority는 plain text. |
| R-10 | PASS: translucent/blur surface 없음. |
| R-12 | PASS: variant에 elevation shadow를 추가하지 않음. CTA·badge shadow 제거. |
| R-13 | PASS: badge의 decorative rim glow 숨김. |
| R-14 | PASS: 하나의 action 면, facts는 목록, requests는 footer. |
| R-19 | PASS: 공유 상태 전환만 사용. Reduced motion에서도 두 control 동작 확인. |
| R-22 | PASS: illustration 없음. |

### Block 3: Liveliness

| Item | 상태와 근거 |
| --- | --- |
| Dials 선언 | PASS: ENERGY 1 / RHYTHM 2 / MOTION 2. |
| Dials와 결과 일치 | PASS: calm palette, action 면과 사실 목록의 두 density, 상태 전환만 사용. |
| Focal point | PASS: 단일 mint CTA가 유일한 filled control. 펼침 뒤에는 도움 안내가 같은 자리를 차지. |
| Whitespace | PASS: 넓은 행동 영역, facts 사이 구분, footer 분리를 위해 사용. 첫 screenshot에서 과한 빈 공간을 발견해 제목 두 줄로 조정. |
| Accent | PASS: Mint는 행동·도움 안내, peach는 부상·안전 의미로 제한. |
| Identity motif | PASS: 큰 한국어 안전 문장과 단정한 label/value 정렬을 반복. |
| Design Read 선행 | PASS: source 작성 전에 direction과 dials를 선언. |

### Block 4: Craftsmanship와 Quality Locks

| Item | 상태와 근거 |
| --- | --- |
| C-1 | PASS: 색·layout·type·간격·surface·icon의 이유를 기록. |
| C-2 | PASS: 존재하는 두 control의 결과를 실제 관찰. |
| C-3 | PASS: 행동, 네 사실, 세 기관 상태만 배치. |
| C-4 | 범위 제한: 두 펼침 상태·한 theme·keyboard·390 px wrapper 확인. Production data 상태와 차량 실기는 제외. |
| C-5 | PASS: fixture와 실제 검사 결과를 구분. |
| R-05 | PASS: 두 density와 footer, decorative card grid 없음. |
| R-11 | PASS: 20/12/6 px radius가 서로 다른 역할에 대응. |
| R-15 | PASS: 기존 도움 요청 안내 CTA 유지. |
| R-16 | PASS: marketing buzzword 없음. |
| R-20 | PASS: 안전 우선 문장, 한 행동 면과 상황 목록이라는 구성 이유 명시. 미적 선호는 사용자 판단. |
| R-21 | PASS: 동일 dark theme라는 비교 brief 준수. |
| R-29 | PASS: neutral + mint + peach, 기존 semantic palette. |
| R-30 | PASS: 다른 product의 화면을 참조하거나 복제하지 않음. |
| R-31 | PASS: 주요 결정의 목적을 한 줄씩 기록. |

UI supplement checklist도 같은 근거로 대조했다. Emoji, generic icon, background pattern, filler metric·feed·table·FAQ, endless motion을 추가하지 않았다. Empty/loading/error와 native viewport에 대한 항목은 위의 명시적 scope 제외를 유지한다.

## 남은 검증

Native Kotlin/Compose, 차량 화면의 실제 dp·시야·touch 정확도, driving condition, 사용자 평가, production empty/loading/error, Web Vitals는 확인하지 않았다. 현재 결과에서 anti-slop이 다른 도구보다 우수하다는 결론은 낼 수 없다.

## 통합 재확인

Shared favicon 요청을 제거한 뒤 모든 도구의 두 상태를 실제 Chrome에서 다시 확인했다. Console/page error는 없었다. R-35의 보류는 이 prototype 범위에서 해소되었다. 영구 증거는 [접힘](../../../prototype/web/evidence/tools/antislop-summary.png), [펼침](../../../prototype/web/evidence/tools/antislop-expanded.png)에 보관한다.
