# Anti-UI-slop를 보완하는 도구 조사

확인일: 2026-11-05. 대상은 선택된 A안의 React/TypeScript prototype과 이후 Kotlin/Compose 구현이다. GitHub API, pinned source, README, LICENSE를 읽었다. 도구 설치·실행, prototype 변경, Kotlin compile은 하지 않았다. 아래 도입 비용은 작은 PoC에 대한 상대적 판단이며 측정치가 아니다.

**권고: 기존 Base UI + Playwright를 유지하고, reference에서 뽑은 값을 사람이 승인한 token과 상태별 screenshot으로 관리한다.** axe-core는 다음 검증 확장 후보다. Style Dictionary는 web과 Compose의 token을 함께 유지하기 시작할 때 붙인다. coss·Storybook 전체 도입은 지금 보류한다.

## 이미 있는 기반

[package.json](../../prototype/web/package.json)에는 `@base-ui/react 1.9.0`, `@playwright/test 1.64.1`, Tailwind v4가 있다. [styles.css](../../prototype/web/src/styles.css)의 color·radius·typography CSS variables도 재사용할 수 있다. [review.spec.ts](../../prototype/web/tests/review.spec.ts)에는 4개 test가 있으며, 상태 보존·focus 이동·작은 browser·reduced-motion 환경을 다룬다. `toHaveScreenshot`이나 axe 검사는 아직 없다. 이는 source 확인이며 test 통과 보고가 아니다.

## 후보 7개

각 source 링크는 조사한 default branch의 commit으로 고정하였다. 활동 날짜는 GitHub API에서 확인한 해당 branch HEAD의 commit 날짜(UTC)다. 모두 archived가 아니었다.

| Repository | 실제 역할 · 이 PoC에서 쓸 부분 | 한계 · license · 도입 비용 | 확인한 source · 최근 commit |
| --- | --- | --- | --- |
| [Manavarya09/design-extract](https://github.com/Manavarya09/design-extract) (`designlang`) | Browser의 live DOM에서 style을 관찰하여 token·design-language 문서를 생성한다. 허용된 reference 한두 개의 color·type·spacing을 비교할 때 후보로 쓴다. | 추출값은 원래 설계자의 의도와 같다고 보장되지 않는다. Android emitter는 아래 제한이 있다. MIT. Node 20+·browser·결과 정리 필요: **중간**. | [README](https://github.com/Manavarya09/design-extract/blob/6050fdb470d87c14f3db42a07ba782ca93286c75/README.md), [LICENSE](https://github.com/Manavarya09/design-extract/blob/6050fdb470d87c14f3db42a07ba782ca93286c75/LICENSE). 2026-11-05. |
| [style-dictionary/style-dictionary](https://github.com/style-dictionary/style-dictionary) | 사람이 정한 token을 CSS와 Kotlin 등으로 내보내는 build tool이다. 사고 대응 semantic color·spacing의 정본을 공유할 때 적합하다. | 화면·layout·interaction 변환기가 아니다. 단위·transform 설정을 검증해야 한다. Apache-2.0. 지금은 불필요한 build 단계, Compose 병행 시 **중간**. | [README](https://github.com/style-dictionary/style-dictionary/blob/795233d9bee6a7b5787d685d75d626df3399d24d/README.md), [LICENSE](https://github.com/style-dictionary/style-dictionary/blob/795233d9bee6a7b5787d685d75d626df3399d24d/LICENSE). 2026-11-03. |
| [mui/base-ui](https://github.com/mui/base-ui) | 외형을 정하지 않는 React primitive다. 필요한 시점에 Dialog·AlertDialog 등의 interaction과 focus 관리를 재사용한다. | 시각 방향과 Compose 구현은 별도다. MIT. 이미 설치됨: **낮음**. | [README](https://github.com/mui/base-ui/blob/cf696d6f6e08c699c5bda24d5a033430909f2285/README.md), [LICENSE](https://github.com/mui/base-ui/blob/cf696d6f6e08c699c5bda24d5a033430909f2285/LICENSE), [Dialog API](https://base-ui.com/react/components/dialog). 2026-11-02. |
| [cosscom/ui](https://github.com/cosscom/ui) | Base UI + Tailwind로 만든 Cal.com design system이다. 확인 dialog의 구성이나 상태별 component 예시를 선택적으로 참고한다. | Cal.com 외형이 Pleos 외형은 아니다. 복사한 wrapper와 CSS를 유지해야 한다. **현재 전체 MIT**. 전체 도입은 **중간**, source 참고는 **낮음**. | [README](https://github.com/cosscom/ui/blob/890a79a5368b3cdebbdd860aa1908f2843fd7ddc/README.md), [LICENSE](https://github.com/cosscom/ui/blob/890a79a5368b3cdebbdd860aa1908f2843fd7ddc/LICENSE), [AlertDialog source](https://github.com/cosscom/ui/blob/890a79a5368b3cdebbdd860aa1908f2843fd7ddc/packages/ui/src/components/alert-dialog.tsx). 2026-10-28. |
| [microsoft/playwright](https://github.com/microsoft/playwright) | 실제 browser에서 interaction과 screenshot regression을 확인한다. A안의 주 행동·기관별 상태·미확인·확인 dialog를 같은 fixture로 반복한다. | 승인한 baseline 이후의 차이를 찾는다. 좋은 설계인지 판단하지 않는다. OS·font·browser 환경에 따라 screenshot이 달라질 수 있다. Apache-2.0. 이미 설치됨: **낮음**. | [README](https://github.com/microsoft/playwright/blob/71350712ca049af48d50f8d23441c6ac82a21da0/README.md), [LICENSE](https://github.com/microsoft/playwright/blob/71350712ca049af48d50f8d23441c6ac82a21da0/LICENSE), [visual comparisons](https://playwright.dev/docs/test-snapshots). 2026-11-05. |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | DOM 기반 accessibility rule engine이다. `@axe-core/playwright`를 통해 초기 화면과 열린 상세/확인 상태의 label·contrast·ARIA 등을 검사할 수 있다. | 자동 검사가 모든 문제를 찾지 않는다. `incomplete`는 사람이 확인해야 한다. 차량 조작 적합성이나 Compose semantics를 검증하지 않는다. MPL-2.0. dev integration **낮음**. | [README](https://github.com/dequelabs/axe-core/blob/cf9d7a19c592734bc56f50452780655529996353/README.md), [LICENSE](https://github.com/dequelabs/axe-core/blob/cf9d7a19c592734bc56f50452780655529996353/LICENSE), [Playwright 연동](https://playwright.dev/docs/accessibility-testing). 2026-11-04. |
| [storybookjs/storybook](https://github.com/storybookjs/storybook) | component·page를 독립된 상태로 열어 개발·문서화·검증하는 workshop이다. 공통 component와 상태 조합을 여러 사람이 계속 다룰 때 유용하다. | 현재 첫 화면 PoC에는 별도 설정·stories 유지 비용이 크다. 우선 기존 fixture와 review 화면으로 충분하다. MIT. **중간 이상**; 지금 보류. | [README](https://github.com/storybookjs/storybook/blob/1a39a14560d3d8e4374cc0c6ef7e696d71c267fb/README.md), [LICENSE](https://github.com/storybookjs/storybook/blob/1a39a14560d3d8e4374cc0c6ef7e696d71c267fb/LICENSE). 2026-11-05. |

검색 결과의 `samarameneses/design-extract.md`는 정본의 fork다. coss UI도 별도 제품 repository인 `cosscom/coss`와 구분해야 한다. `cosscom/ui`는 2026-10-28 [commit](https://github.com/cosscom/ui/commit/890a79a5368b3cdebbdd860aa1908f2843fd7ddc)에서 전체 MIT로 바뀌었다. 과거 mixed AGPL/MIT 설명이나 API의 `NOASSERTION`만으로 현재 license를 판단하면 틀린다.

## Android emitter를 source로 확인한 결과

`design-extract`의 [android-compose.js](https://github.com/Manavarya09/design-extract/blob/6050fdb470d87c14f3db42a07ba782ca93286c75/src/formatters/android-compose.js)는 `Theme.kt`, `colors.xml`, `dimens.xml`을 만든다. `Theme.kt`의 실제 내용은 `object DesignTokens` 안의 `Color(...)`와 spacing/radius `.dp` 상수다. [저장된 생성 예시](https://github.com/Manavarya09/design-extract/blob/6050fdb470d87c14f3db42a07ba782ca93286c75/website/public/gallery/cal-com/android/Theme.kt)에서도 확인하였다. Typography, `MaterialTheme`, Composable 화면, 상태·navigation·interaction은 이 emitter가 생성하지 않는다.

더 중요한 제한은 단위다. 이 emitter는 px·pt·dp의 숫자를 그대로 받아 `.dp`로 출력하고, rem·em은 숫자에 16을 곱한다. 이는 차량 화면의 실제 크기나 font scale을 확인한 변환이 아니다. 따라서 reference 분석용 초안으로만 취급한다. Pleos 문서 사이트의 DOM을 추출해도 문서 사이트의 style을 얻는 것이지 차량 UI의 원래 token을 복구했다고 볼 수 없다. 후자는 이 도구의 입력/출력에 근거한 판단이다.

Style Dictionary의 `compose/object` 역시 Kotlin object와 `val`을 생성한다. [template](https://github.com/style-dictionary/style-dictionary/blob/795233d9bee6a7b5787d685d75d626df3399d24d/lib/common/templates/compose/object.kt.template.js)와 [integration snapshot](https://github.com/style-dictionary/style-dictionary/blob/795233d9bee6a7b5787d685d75d626df3399d24d/__integration__/__snapshots__/compose.test.snap.js)에 `Color`, `.dp`, `.sp`, token reference 출력이 있다. DTCG/단위/typography 입력과 transform을 정한 다음, 실제 Kotlin compile과 native 화면에서 확인해야 한다. **두 도구 모두 CSS→Compose 화면 변환으로 추천하지 않는다.**

## `slop` 점수의 의미와 한계

최신 `designlang` README에는 `slop`과 `verify-ui`가 있다. `slop`은 model 판단이 아니라 10개 [deterministic detector](https://github.com/Manavarya09/design-extract/blob/6050fdb470d87c14f3db42a07ba782ca93286c75/src/slop/detectors.js)의 결과다. Gradient, default typeface, hero 뒤의 세 card, glow, 같은 radius, stock copy 등을 센다. `verify-ui`는 brand와 화면 사이의 token 차이를 검사한다고 설명한다. 실제 CLI 실행과 우리 화면의 적합성은 미검증이다.

Repository 자체의 [2026-11-04 calibration](https://github.com/Manavarya09/design-extract/blob/6050fdb470d87c14f3db42a07ba782ca93286c75/bench/results/slop-2026-11-04.md)은 AI-built 30개 중 generic band 3%, mixed 또는 generic band 27%를 보고한다. Handmade 40개 중 generic band는 0%였다. 이는 작성자가 선정한 표본의 결과이며 재현하지 않았다. AI-built 여부 자체도 나쁜 설계의 ground truth는 아니다. 따라서 점수는 특정 표현을 찾는 보조 자료로만 쓰고, anti-slop 품질 gate로 삼지 않는다.

## 다음 확장에 적용할 최소 경로

1. **Reference와 token 결정:** Pleos의 확인된 기준, A안에서 승인한 선택, 아직 임의인 값을 구분한다. 현재 CSS variables를 먼저 정리한다. 외부 추출기는 필요할 때 source를 확인한 단일 reference에 한해 평가한다.
2. **Component 선택:** 기존 Cult component와 Base UI를 사용한다. 확인 dialog가 필요해지면 primitive부터 확인한다. coss는 실제로 필요한 한 component의 source만 비교한다.
3. **검증:** 기존 Playwright test에 A안의 승인된 screenshot과 기관별 독립 상태를 추가하는 방향이 작다. Screenshot 생성 환경을 고정하고 font 로딩을 기다린다. axe 검사는 초기 상태뿐 아니라 UI를 연 상태에도 수행하는 후보로 둔다. Keyboard·focus·reduced motion·문구 의미는 사람이 함께 검토한다.
4. **Compose 이식:** 상태 이름·문구·token 역할·interaction 명세를 넘긴다. dp/sp·type scale·touch target·차량 restriction은 native에서 다시 정한다. 여러 platform의 token 변경이 실제로 반복되면 Style Dictionary로 출력만 자동화한다.

설치·실행·runtime 품질 비교와 실제 Pleos device 검증은 수행하지 않았다. 가장 큰 위험은 자동 추출·점수·web screenshot을 native 적합성의 증거로 잘못 취급하는 것이다.
