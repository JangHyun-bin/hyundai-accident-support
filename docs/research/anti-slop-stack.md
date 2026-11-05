# 사고 대응 PoC의 anti-UI-slop 도구 조사

확인일: 2026-11-05. 사용자는 A · 행동 중심을 선택하고, 후속 UI 확장 전에 GitHub의 관련 도구를 다양한 관점에서 조사하도록 요청하였다. README뿐 아니라 skill 본문·CLI 계약·license·일부 구현 source를 대조하였다. 새 도구를 설치하거나 실행한 비교 시험은 아니다.

**권고 조합은 Impeccable의 critique·audit, 기존 Cult UI·TransitionPanel, 기존 Playwright다.** Reference와 product 기준은 `PRODUCT.md`·`DESIGN.md`로 명시하고, axe와 React Grab은 각각 검증·의견 전달에 필요할 때 추가한다. 여러 design skill을 동시에 자동 적용하지 않는다. 도입 순위는 이 PoC의 범위에 대한 판단이며 도구 간 품질 benchmark의 결과가 아니다.

## 관점별 후보

| 관점 | Repository | 확인한 역할 | 이 project의 판단 |
| --- | --- | --- | --- |
| 기존 화면의 design 판단 | [Impeccable](https://github.com/pbakaus/impeccable) | `critique`, `audit`, `typeset`, `layout`, `polish`와 deterministic detector를 제공한다. Product·design context 문서를 사용한다. | **우선 평가.** A의 구조를 유지하며 문제를 구체적으로 지적하는 용도로 적합하다. 자동 점수는 심미적 품질의 보증이 아니다. |
| Art direction 생성 | [Taste Skill](https://github.com/Leonxlnx/taste-skill) | 최신 2.5.0은 company website, 전체 화면 section, 실제 시각 자료, browser 검사를 중심으로 한다. | **제안서·소개 site의 후보.** 차량 app의 기본 규칙으로 전체 적용하지 않는다. |
| 구조적 반복·장식 검토 | [Hallmark](https://github.com/Nutlope/hallmark), [anti-slop](https://github.com/miqdadbadjuber/anti-slop) | Hallmark는 구조의 다양성과 design system 고정을, anti-slop은 목적 없는 표현·불명확한 문구·동작 없는 UI 등의 검토를 제안한다. | Hallmark는 현재 환경에 있다. 한 번의 critique에 필요한 관점만 사용한다. 금지 목록만 통과한 밋밋한 화면을 목표로 삼지 않는다. |
| 대안의 폭 확대 | [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 검색 가능한 style·palette·UX·stack 자료와 별도의 browser 검토 starter를 제공한다. | 이미 사용할 수 있다. Type·density·상태 표현의 후보를 비교하는 자료로 사용한다. Pleos 기준을 임의의 추천 palette로 대체하지 않는다. |
| 사용자의 구체적인 의견 전달 | [React Grab](https://github.com/aidenybai/react-grab) | Browser에서 고른 요소의 HTML·React component stack·source 위치를 agent에 전달한다. Vite 개발 환경의 연동 예시가 있다. | **선택적 도입.** “이 부분이 별로다”라는 피드백의 대상을 정확히 전달한다. Design을 판단하거나 고치는 도구 자체는 아니다. |
| Reference의 수치 추출 | [design-extract / designlang](https://github.com/Manavarya09/design-extract) | Live DOM의 style에서 token과 문서를 추출한다. `slop`·`verify-ui`도 제공한다. | 필요한 reference 하나로 먼저 평가한다. 추출값을 설계자의 의도나 Pleos 공식 token으로 간주하지 않는다. |
| 개성 있는 외형과 interaction | [Cult UI](https://github.com/nolly-studio/cult-ui), [Base UI](https://github.com/mui/base-ui), [coss UI](https://github.com/cosscom/ui) | Cult는 시각·motion component, Base UI는 외형을 강제하지 않는 primitive, coss는 Base UI 기반 design system이다. | Cult·Base UI는 이미 사용 중이다. 새 library 전체를 추가하기보다 필요한 component의 source와 interaction을 선택한다. |
| 실제 화면 검증 | [Playwright](https://github.com/microsoft/playwright), [axe-core](https://github.com/dequelabs/axe-core) | 실제 browser의 동작·screenshot과 DOM 접근성 규칙을 검사한다. | Playwright는 유지하고 axe를 다음 검증 후보로 둔다. Screenshot baseline은 먼저 사람이 선택한 화면이어야 한다. |
| Web·Compose의 기준 공유 | [Style Dictionary](https://github.com/style-dictionary/style-dictionary) | 동일한 token에서 CSS와 Kotlin 등의 상수를 생성한다. | 두 platform의 token을 함께 유지할 때 도입한다. 화면·interaction 변환기는 아니다. |

## 선택에 영향을 주는 source 확인

### Impeccable — 현재 화면에 대한 critique

확인한 [README](https://github.com/pbakaus/impeccable/blob/c8891a9ae865d6ee311836ae5199bfce0fe115b1/README.md)는 62개 deterministic rule과 기술 audit을 설명한다. [critique 규약](https://github.com/pbakaus/impeccable/blob/c8891a9ae865d6ee311836ae5199bfce0fe115b1/skill/reference/critique.md)은 제품 고유성·정보 위계·인지 부담에 대한 design 판단과 detector 결과를 구분한다. 이 구분이 현재 A에 유용하다고 판단한다. 사람이 선택한 방향을 유지하면서 구체적인 근거를 검토할 수 있기 때문이다.

같은 규약은 native에서 web detector를 실행하지 않도록 명시한다. Android source에 빈 검출 결과가 나와도 정상 UI의 증거가 되지 않는다. Compose에서는 visual review와 native 검증이 별도로 필요하다.

`live`는 단순한 읽기 전용 검사와 구분해야 한다. README에 따르면 copy Apply 시 chat agent가 polling하지 않으면 permission·sandbox 검사를 끈 별도 Codex/Claude CLI를 실행할 수 있다. 도입 후보는 우선 critique·audit이며, live를 사용한다면 `IMPECCABLE_LIVE_COPY_AGENT=chat` 또는 `off` 설정을 명시한다. 이 조사에서는 live·installer·hook을 실행하지 않았다.

### Taste Skill — 최신판의 용도 변경

[2026-11-05 변경 기록](https://github.com/Leonxlnx/taste-skill/blob/9b4bf937a1f69348126959c15d2f99a73e65699b/CHANGELOG.md)과 [2.5.0 skill 본문](https://github.com/Leonxlnx/taste-skill/blob/9b4bf937a1f69348126959c15d2f99a73e65699b/skills/taste-skill/SKILL.md)을 확인하였다. 첫 화면을 hero 하나로 구성하고, 뒤 section도 화면 단위로 배치하며, photography·product visual·hover 표현을 규정한다. 과거 검색 결과의 “app 화면에 바로 적용하는 범용 skill” 설명만으로 현재판을 도입하면 범위가 어긋난다.

회사 소개·공모전 소개 site에는 평가할 가치가 있으나, 긴급 상황에서 제한된 정보와 행동을 보여 주는 차량 UI에는 해당 규칙을 그대로 적용하지 않는 편이 적합하다. 이는 source의 적용 대상과 현재 제품 목적을 비교한 판단이다.

### Reference 추출·Compose 출력·점수의 한계

[별도 source 조사](anti-slop-tools-scout.md)에 7개 도구의 pinned source와 license를 기록하였다. `design-extract`의 Android emitter는 `Theme.kt`라는 이름으로 Color·spacing·radius 상수를 출력하지만 Composable 화면·Typography·interaction은 생성하지 않는다. px 숫자를 그대로 dp로 내보내는 경로도 있어 차량 크기를 검증한 변환으로 사용할 수 없다.

`designlang slop`은 특정 표현을 세는 heuristic이다. 자체 calibration 결과와 표본 한계도 공개되어 있다. “AI가 만들었는가”, “금지 패턴이 있는가”, “우리 사용자에게 좋은 화면인가”는 같은 질문이 아니다. Score는 검토할 위치를 찾는 보조 자료로만 사용한다.

## 현재 A에 대한 판단

아래 항목은 자동 도구의 결과가 아니라 실제 [A 화면](../../prototype/web/evidence/focus.png)을 본 판단이다.

1. **유지할 것:** 가장 중요한 안내와 주 행동의 위계, 독립된 사람·도로·차량 상태, 기관별 요청 전 표시.
2. **다시 판단할 것:** 큰 shield·orbit와 무지개 glow의 역할. 화면 면적을 사용하지만 다음 행동이나 미확인 정보를 추가하지 않는다.
3. **제품에 맞출 것:** Headline이 일반적인 안전 선언에 머무는지, 지금 확인할 사실과 행동을 더 직접적으로 전달할 수 있는지 검토한다.
4. **동작으로 확인할 것:** 긴 문구·무응답·일부 접수·접수 미확인에서도 같은 정보 위계와 다음 행동이 유지되는지 확인한다.

색·radius를 금지하는 방식만으로 문제를 해결하지 않는다. 시각적 특징마다 이 제품에서의 목적을 정하고, reference와 실제 화면을 함께 비교한다.

## 다음 작업의 최소 구성

1. `PRODUCT.md`: 사고 직후 사용자, A의 핵심 과업, 표시 가능한 사실, 미결정 정책을 기록한다.
2. `DESIGN.md`: Pleos에서 확인한 기준과 project가 선택한 type·색·density·motion·component 역할을 구분한다. 차량 HMI의 한눈에 읽히는 위계와 긴급 안내 표현을 reference 선택 기준으로 둔다.
3. Impeccable의 source와 실행 범위를 고정하고, A의 critique에서 우선순위가 높은 항목 3–5개를 선정한다. 진단 결과를 모두 자동 적용하지 않는다.
4. 원래 A와 개선된 A를 동일한 상황으로 비교한다. 그림·glow를 제거하는 것뿐 아니라 정보의 크기·위치·관계를 개선한다.
5. 선택된 화면을 Playwright baseline과 상태 fixture로 보존하고 후속 상태를 확장한다. Compose 이전 시에는 token 역할·문구·동작 명세를 재사용한다.

Storybook, 별도 UI library 전체, 복수의 전역 design skill installer는 현재 첫 화면 PoC에서 도입 비용이 크다. 기존 review page와 catalog를 먼저 사용한다. [Anthropic frontend-design](https://github.com/anthropics/skills/blob/ca45fc496a3436251f191354091d557da31c15b5/skills/frontend-design/SKILL.md)도 제품별 시각 판단의 참고 자료지만, 동일한 역할의 skill을 추가로 중첩할 이유는 아직 없다.

## License와 검증 범위

GitHub API·license에서 Impeccable은 Apache-2.0, Taste Skill·Hallmark·UI UX Pro Max·anti-slop·Cult UI·Motion Primitives는 MIT를 확인하였다. Anthropic frontend-design은 해당 directory의 Apache-2.0 license를 확인하였다. React Grab은 README의 MIT 표기를 확인하였다. Base UI·coss·검증·token 도구의 정확한 source와 license는 [보완 조사](anti-slop-tools-scout.md)를 따른다. Snapshot 이후 version의 조건은 도입 시 다시 확인한다.

새 도구의 설치·runtime 비교, 우리 A에 대한 detector 실행, 실제 Pleos 적합성 검증은 수행하지 않았다. 이번 결과는 도입 후보와 실행 범위를 정하는 source 조사다.
