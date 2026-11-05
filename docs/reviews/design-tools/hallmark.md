# Hallmark 적용 근거

2026-11-05. `FocusView`의 action-first 방향을 유지한 독립 variant다. Hallmark 전체의 성능을 대표하는 결과가 아니며, 점수나 사용자 선호도를 추정하지 않았다.

## Source와 적용 범위

- Skill: `/Users/janghyunbin/.agents/skills/hallmark/SKILL.md`, version `1.1.0`.
- SHA256: `5437b73a1a829210681ca21fa09b7276a5978875f960d3998846e0dc333e9343`.
- 구현: `prototype/web/src/variants/HallmarkView.tsx`, `prototype/web/src/variants/hallmark.css`.
- 재현 URL: `http://127.0.0.1:5173/?study=tools&view=hallmark`.
- Route, 비교 UI, 공통 `Guidance`는 이 variant의 독립 변경 범위에 포함하지 않았다.

## Preflight

| 확인한 항목 | 근거 | 결정 |
| --- | --- | --- |
| Audience / job | `prototype/web/DESIGN.md:5`, `:7`, `:13` | 사고 후 다음 행동을 확인하는 첫 화면. 행동 안내를 가장 먼저 읽게 한다. |
| 공통 design 조건 | `prototype/web/DESIGN.md:9`–`:14` | 같은 urgent case, Asta, dark palette, 1440 × 810 canvas, 원문 copy 유지. |
| Font | `prototype/web/src/styles.css:5`–`:7` | 설치된 Asta 400/600/700 유지. 외부 font 추가 없음. |
| Color | `prototype/web/src/styles.css:9`의 `:root` | 기존 foreground, muted, primary, warning, border token 재사용. |
| Motion | `prototype/web/package.json:17`, `src/ScreenParts.tsx`의 `Guidance` | `motion` 14.9.1과 shared TransitionPanel 사용. 독립 reveal 없음. |
| Framework | `prototype/web/package.json:18`, `:31` | React 19.3.1, Vite 8.3.6, TypeScript. |
| Spacing | 기존 CSS에 공통 `--space-*` 없음 | wrapper 안에서 8/16/24/32/40/44/80 px를 이름 붙인 spacing token으로 사용. |
| Hallmark history | 구현 전 repo 내 Hallmark CSS stamp와 log 없음 | 이 variant가 첫 기록. 다른 tool의 화면을 Hallmark history로 취급하지 않음. |

Preflight와 run 기록은 같은 directory의 `hallmark-preflight.json`, `hallmark-log.json`에 저장했다.

## 실제 적용한 reference와 판단

| 읽은 reference | 구현에 적용한 규칙 |
| --- | --- |
| `references/verbs/redesign.md` | 기존 copy·primary action·component ownership 보존. 독립 view와 scoped CSS만 추가. |
| `references/structure.md` | 색상 변경으로 끝내지 않고, 넓은 action 영역과 좁은 facts 영역의 비대칭 구성으로 바꿈. |
| `references/macrostructures.md`, `macrostructures/15-split-studio.md` | Split Studio의 양쪽 내용 대응을 적용. 왼쪽은 다음 행동, 오른쪽은 판단에 사용한 사실. |
| `references/typography.md` | 62 / 24 / 18 px 중심의 명확한 크기 차이. 제목 700, body 400. Roman heading, 긴 단어 wrap, 119 tabular numerals. |
| `references/genres/modern-minimal.md` | 장식보다 type와 정렬로 우선순위 표현. 기존 Asta와 palette가 catalog theme보다 우선. |
| `references/microinteractions.md` | 페이지 reveal, hover lift, 추가 animation 제거. CTA hover는 underline 하나, focus ring은 즉시 표시. |
| `references/slop-test.md` | Equal feature cards, 중첩 card, 장식 orbit, 색상 gradient rim, 가짜 chrome, invented metric을 배제. 전체 gate 통과 수치는 선언하지 않음. |
| `references/contract.md` | 기존 token과 framework 경계 유지. 공통 stylesheet 변경 없음. |

`macrostructures/05-workbench.md`도 검토했지만 screenshot tour 중심이라 채택하지 않았다.

구성은 action/facts를 `1.65 : 1`로 나눈 diptych와 아래 RequestStrip이다. 제목부터 CTA까지 한 흐름으로 읽고, 오른쪽에서는 네 사실을 행 단위로 찾는다. Card와 그림을 없애 가로 여백이 두 영역을 나눈다. Facts 사이의 선은 서로 다른 사실의 경계를, 아래 긴 선은 기관별 요청 상태의 경계를 나타낸다.

Motion Primitives `TransitionPanel`과 Cult `HaloBadge`는 공통 component를 그대로 사용한다. HaloBadge의 시각 장식인 rim 영역만 wrapper에서 숨기고, badge의 문구와 상태는 유지한다. CTA·fact·기관 상태 모두 원래 문구를 사용한다. 전화 연결이나 전송 동작을 만들지 않았다.

## Qualitative critique

- Philosophy: 다음 행동과 그 근거를 한 화면에서 읽도록 분리했다. 구조를 위해 사고 사실을 추가하지 않았다.
- Hierarchy: 큰 제목과 유일한 mint CTA가 왼쪽에서 우선한다. 오른쪽 facts와 아래 요청 상태는 작게 읽힌다.
- Execution: 접힘·펼침 모두 canvas에 들어간다. CTA와 facts의 좌측 정렬, badge 높이와 spacing을 Chrome에서 확인했다.
- Specificity: `부상 있음`, `조작·경로 미확인`, 기관별 `요청 전`이 각각 유지된다. 의료 판단이나 접수 성공을 암시하는 decoration은 추가하지 않았다.
- Restraint: 큰 그림과 hero card를 제외했다. Shared Cult component가 제공하는 상태 변화만 남긴다.
- Variety: baseline의 위 hero / 아래 가로 facts에서 왼쪽 action / 오른쪽 세로 facts로 구조가 바뀐다. 다만 `ContextView`와 같은 두 column 계열이라 구조적 차이가 무한히 크다는 주장은 하지 않는다.

왼쪽 아래 여백은 오른쪽 사실 목록을 더 조밀하게 만들지 않으면서 CTA를 독립시킨 선택이다. 이 여백이 사용자에게 안정감 또는 빈 공간으로 읽히는지는 실제 선호도 확인이 필요하다.

## 실제 확인

- `npx tsc --noEmit`: exit 0. 최종 scoped CSS 변경 뒤 다시 실행했다.
- Playwright의 system Chrome에서 연결된 URL을 열고 `원래 크기`를 선택했다. `.app-screen` screenshot은 정확히 1440 × 810이다.
- 접힘·펼침 두 상태에서 제목, body, button, fact, request가 canvas 경계를 넘지 않았다. Shared header 아래 wrapper는 717 px이다.
- 네 facts와 `요청 전` badge 세 개가 존재한다. 펼친 뒤에도 기관별 요청 상태 문자열이 같다.
- 펼치면 `긴급 도움 요청` heading으로 focus 이동, 접으면 `도움 요청 안내 보기` button으로 focus 복귀를 확인했다.
- 초기 browser preference가 `prefers-reduced-motion: reduce`일 때 펼침 후 panel transform은 `none`이었다. 실행 도중 OS preference를 바꾸는 경우까지 검증한 것은 아니다.
- 320 / 375 / 414 / 768 px browser 폭에서 document width가 각각 viewport width와 같았다. 네 screenshot을 확인했다. 비교 UI가 고정 canvas를 축소하는 방식이며 mobile app용 reflow 검증은 아니다.
- 연결된 route에서 `pageerror`는 없었다.
- 원본 capture: `/tmp/hallmark-route-summary.png`, `/tmp/hallmark-route-expanded.png`. 좁은 폭 capture: `/tmp/hallmark-width-{320,375,414,768}.png`. `/tmp` 파일은 영구 증거 저장소가 아니다.

공통 token으로 WCAG contrast ratio를 계산했다. 아래는 확인한 pair이며 모든 element/state를 exhaustive audit한 결과는 아니다.

| Pair | Ratio |
| --- | ---: |
| foreground / background | 16.66:1 |
| muted-foreground / background | 8.37:1 |
| muted-foreground / card | 6.75:1 |
| primary-foreground / primary | 11.74:1 |
| warning / background | 10.35:1 |
| primary / background | 14.35:1 |

## 적용하지 않은 규칙과 이유

1. 사용자 brief와 `DESIGN.md`가 audience·job·font·palette·scope를 이미 고정했고 독립 구현을 지시했다. Skill의 재질문·승인 절차를 반복하지 않았다.
2. Marketing hero, nav/footer rotation, screenshot tour, 추가 CTA를 넣지 않았다. 사고 대응 app의 첫 화면이며 공통 ScreenHeader는 소유 범위 밖이다.
3. 두 font와 OKLCH palette 생성, 별도 root `tokens.css`, `DESIGN.md` export 갱신을 생략했다. 공통 Asta·palette를 유지하고 CSS를 wrapper에 한정하라는 비교 조건을 우선했다.
4. `.hallmark/` 전역 파일 대신 이 variant에 속한 preflight/log를 기록했다. 다른 tool과 공통 source를 건드리지 않았다.
5. 숫자로 된 self-critique score와 전체 gate pass stamp는 쓰지 않았다. 정성 판단과 실제 측정을 구분했다.
6. 새로운 loading/error/success 상태를 만들지 않았다. 안내를 펼치고 접는 공통 동작에 없는 service 상태를 창작하지 않기 위해서다. Default, hover, focus-visible, active, disabled 스타일은 있다.
7. `html`·`body`의 강제 `overflow-x: clip`은 추가하지 않았다. 공통 비교 UI 소유 범위 밖이며 좁은 폭 확인은 실제 route에서 수행했다.

차량 hardware, 운전자 시선, 주행 중 사용성, 실제 전화·전송은 검증하지 않았다. CSS px를 차량 dp 또는 안전 기준으로 해석할 수 없다.

## 영구 증거

통합 후 실제 route를 다시 capture하였다: [접힘](../../../prototype/web/evidence/tools/hallmark-summary.png), [펼침](../../../prototype/web/evidence/tools/hallmark-expanded.png).
