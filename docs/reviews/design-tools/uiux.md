# UI UX Pro Max 적용 기록

## 범위와 source

2026-11-05, 선택된 `FocusView`의 action-first 방향을 독립 화면에 적용했다. 공통 `cases.urgent`, Asta, semantic dark palette, 문구, 기관별 상태, `Guidance` interaction은 유지한다. 다른 design tool의 규칙은 적용하지 않았다.

- Skill: `/Users/janghyunbin/.agents/skills/ui-ux-pro-max/SKILL.md`
- SHA256: `8b827fe03b349aeea99a7d6cf4ccd892e6065b672859fdb11e13a1919453eddc`
- Search script: `/Users/janghyunbin/.agents/skills/ui-ux-pro-max/scripts/search.py`
- 실제 command와 stdout: [uiux-search-output.txt](./uiux-search-output.txt)
- 구현: [UiUxView.tsx](../../../prototype/web/src/variants/UiUxView.tsx), [uiux.css](../../../prototype/web/src/variants/uiux.css)

## 실제 search와 판단

모든 command는 Python standard library만 사용해 local dataset을 조회했다. 아래는 생성된 결과의 적합성을 확인한 뒤 내린 판단이다. Raw evidence는 적용할 design system의 정본이 아니다.

| Query / mode | 관찰한 결과 | 적용 판단 |
| --- | --- | --- |
| `emergency assistance accessible dark` / `--design-system -p 'Safety Response' -f markdown --density 5` | `Accessible & Ethical` style. 큰 글자, focus, semantic controls. 함께 나온 pattern은 `Trust & Authority + Conversion`, CTA는 Contact Sales / Get Quote였다. | Style과 accessibility guidance만 채택. Sales pattern은 사고 대응 업무와 맞지 않아 제외. |
| `emergency response interface` / 같은 design-system options | Narrower retry에서도 같은 style과 sales pattern이 나왔다. | Pattern에 관한 verified match는 얻지 못했다. Style과 공통 brief를 근거로 layout을 직접 판단했다. |
| `primary action hierarchy` / `--domain ux -n 3` | 상위 결과가 Web Breadcrumbs였다. Heading Hierarchy와 Font Size Scale도 반환했다. | Primary CTA에 관한 verified match로 보지 않았다. |
| `button primary CTA` / `--domain ux -n 3` | Retry가 Mobile Back Button 하나를 반환했다. | 역시 off-topic. 이 결과를 쓰지 않고 skill Quick Reference의 `primary-action`과 `visual-hierarchy`를 적용했다. |
| `dark mode contrast` / `--domain style -n 2` | `dark-mode-oled`, active. High contrast, low white emission, visible focus, reduced motion. | Dark surface와 text hierarchy의 근거. Neon·glow 권고는 semantic palette와 사고 직후 맥락에 맞지 않아 제외. |
| `accessible semantic components` / `--stack react` | 상위 결과 `Use semantic HTML`. Accessible queries, colocated files도 반환했다. | Native button과 기존 `Guidance`를 재사용. 새 state나 click handler를 만들지 않았다. |

## 화면에 적용한 판단

왼쪽 큰 제목과 한 개의 mint CTA가 먼저 읽힌다. 오른쪽 facts는 네 개의 행으로 정렬해 확인한 내용과 미확인 내용을 함께 보게 한다. 기관별 요청 상태는 화면 아래 공통 strip에 둔다. 제목·행동·사실·요청 상태를 각각 다른 크기와 공간으로 구별하며, 색만으로 의미를 전달하지 않는다.

| Skill rule | 적용 |
| --- | --- |
| `primary-action`, `visual-hierarchy`, `content-priority` | 64px 제목, 24px 본문과 CTA, 76px CTA 높이. 행동 안내가 DOM과 시각 순서 모두 앞선다. |
| `color-semantic`, `color-accessible-pairs` | 기존 CSS tokens만 사용. 부상과 우선 안내는 warning, 실행 가능한 CTA는 primary. |
| Accessible & Ethical의 complex shadows·3D effects 금지 | 설명 그림, glow, 그림자 없이 제목과 단순한 guidance surface에 공간을 배정했다. |
| `spacing-scale`, `weight-hierarchy` | 주요 공간은 16/24/28/32/48px. Asta 400/600으로 title·body를 구분한다. |
| `focus-states`, `keyboard-nav`, `heading-hierarchy` | 기존 button semantics와 focus 이동을 유지. 3px focus outline, h1 다음 h2. 펼침 heading의 focus도 표시한다. |
| `state-clarity`, `reduced-motion` | Hover는 색만 바꾸고 CTA 위치를 옮기지 않는다. Shared TransitionPanel과 reduced-motion 처리를 그대로 사용한다. |
| Stack의 semantic HTML·colocation | View와 CSS를 함께 배치. `Guidance`, `ContextFacts`, `PriorityLabel`, `MovementNote`, `RequestStrip`을 재사용한다. |

실제 Cult `HaloBadge`는 공유 `RequestStrip`을 통해 사용한다. Badge는 클릭 가능한 CTA처럼 보이지 않는 secondary 상태 표식이다. Guidance의 실제 Motion Primitives `TransitionPanel`도 유지한다.

## Domain 예외

- 생성된 Inter·red/blue palette는 채택하지 않았다. 이 비교는 Asta·기존 semantic palette를 고정해야 한다.
- Sales CTA, proof logos, 가격표, carousel은 사고 후 도움 요청 화면과 무관해 추가하지 않았다.
- Skill의 phone viewport·safe area·Dynamic Type 지침은 native/mobile 항목이다. 이 결과는 1440×810의 고정 web canvas이며, 화면 내부에 독립 mobile layout을 추가하지 않았다.
- 76 CSS px CTA를 차량용 dp 검증으로 해석하지 않는다. Native Compose, 차량 화면, 실기 환경에서 별도 검증해야 한다.
- Font scale은 Asta와 1440px canvas에 맞춰 조정했다. `Font Size Scale` 검색 결과를 primary CTA의 검증된 근거로 표현하지 않는다.

## 확인한 항목과 남은 범위

- `npx tsc --noEmit` 통과.
- 모든 새 CSS selector가 `.uiux-view` 아래인지 assert로 확인했다.
- 실제 token의 sRGB contrast를 계산했다. Foreground/background 16.66:1, foreground/guidance surface 13.02:1, muted/guidance surface 6.54:1, primary/on-primary 11.74:1, warning/background 10.35:1이다. Browser의 합성 결과 전체를 자동 audit했다는 뜻은 아니다.
- Wrapper는 ScreenHeader 아래 717px, 내부에는 top/bottom padding과 96px request strip 공간을 둔다.
- 실제 route `http://127.0.0.1:5173/?study=tools&view=uiux`를 Playwright + installed Chrome으로 확인했다. `원래 크기` 선택 후 `.app-screen`을 capture했으며 두 상태 모두 1440×810이다.
- 두 상태에서 제목·본문·button·facts·request strip의 bounding rectangle이 canvas를 벗어나지 않았다. Page error는 없었다.
- 펼친 뒤 `긴급 도움 요청` heading에 focus, 접은 뒤 `도움 요청 안내 보기` button에 focus가 돌아왔다. Reduced motion에서도 heading focus를 확인했다.
- 펼친 뒤에도 기관별 상태는 `구호 / 요청 전`, `차량 지원 / 요청 전`, `보험 / 요청 전`으로 유지됐다.
- [접힘 screenshot](./uiux-collapsed.png), [펼침 screenshot](./uiux-expanded.png)을 직접 열어 글자·CTA·facts의 정렬과 여백을 확인했다. 제목은 내용 변경 없이 CSS `text-wrap: balance`로 두 줄을 이룬다.

실제 전화·기관 전송·native 차량 UI는 이 spike 범위에서 검증하지 않는다.
