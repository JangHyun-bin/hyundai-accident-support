# Pleos Foundation 조사

확인일: 2026-11-05. 공식 Pleos 문서, 공식 GitHub repository, 공식 font 배포 자료를 기준으로 확인하였다. 날짜가 없는 문서는 확인일 기준 공개 내용이며, 아래의 권고는 공식 규정과 구분하였다.

## 1. 주요 확인 결과

1. Pleos의 차량용 시각 기준은 **Pleos Connect UI Design Guide**이다. Foundation의 공개 항목은 Colors, Typography, Iconography, App Icon, Animation, Shadow이며, Display Layout과 Window Policy는 별도 항목이다. Pleos 소개 website의 hero, 배경, page transition은 차량 app 규격의 근거가 아니다. [UI Design Guide](https://document.pleos.ai/en/docs/connect/guide/docs-design/Introduction/intro), [Foundation 진입점](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/colors)
2. Font는 Asta Sans이며 한국어·영어를 지원한다. 공개 SVG에서 text scale을 확인할 수 있으므로 Figma import 없이도 hierarchy를 검토할 수 있다. 다만 scale 표의 `Size`에는 단위가 없다. [Typography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/typography)
3. Color는 Light/Dark 값을 갖는 basic scale과 역할별 system token으로 구분한다. 실제 token name과 hex 값이 공개 image에 표시되어 있다. 일부 semantic 표에는 이름 중복과 reference/swatch 불일치가 있어 자동으로 code token으로 변환하기에는 확인이 필요하다. [Colors](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/colors)
4. 공개 문서에서 확인한 수치 기준은 icon grid `48 × 48dp`, contrast `4.5:1` 이상, 주요 정보 문자 높이 `4mm` 이상, 일반 문자 `3mm` 이상이다. `12sp`는 Typography page의 최소 권고이며 차량용 주요 text의 권장 크기로 대체하여 해석하지 않는다. [Iconography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/contents-creation/iconography), [UI Design Guide](https://document.pleos.ai/en/docs/connect/guide/docs-design/Introduction/intro)
5. Shadow의 3개 level은 HTML 수치로 공개되어 있다. Animation은 loading의 `Linear`·`Tension` 유형을 제시하며 duration·easing 수치는 확인되지 않았다. 공통 spacing scale·radius scale·layout column grid도 공개 Foundation 본문에서 확인되지 않았다. [Shadow](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/shadow), [Animation](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/animation)
6. Public component 문서는 anatomy·state·property 명세이다. 공식 Android sample은 Compose와 Material 3를 사용하지만, 이를 Pleos 전용 Compose component package의 공개 근거로 볼 수는 없다. [Basic button](https://document.pleos.ai/en/docs/connect/guide/docs-design/components/actions/basic-button), [공식 sample build 설정](https://github.com/Pleos-Playground/pleos-sample-vehicle-app/blob/959981d960ec71144accb27af5ae5d341e72a644/app/build.gradle.kts)
7. 공식 개발 문서의 Pleos AVD 기준은 Android 14/API 34이다. SDK release note·sample 설명·sample dependency 사이에는 Vehicle SDK version 불일치가 있다. 최신 version 하나로 통합하지 않고 근거별 baseline을 유지해야 한다. [Getting Started](https://document.pleos.ai/en/docs/pleos-only/getting-started), [SDK release note](https://document.pleos.ai/en/docs/pleos-only/release-note/sdk-release-note), [Sample App Guide](https://document.pleos.ai/en/docs/pleos-only/tutorial/vehicle-sdk-sample-app)
8. Design kit은 공식 `.fig` 직접 link로 공개되어 있다. 접근 가능성과 자유로운 재배포·변형 허가는 별개이다. Asta Sans의 OFL-1.1을 Pleos design assets 전체에 적용해서는 안 된다. [공식 resource 안내](https://document.pleos.ai/en/docs/connect/guide/docs-design/Introduction/intro#download-design-resources), [Asta Sans license](https://github.com/42dot/Asta-Sans/blob/main/OFL.txt), [Pleos Terms](https://developers.pleos.ai/playground/external/use-policy?locale=en-US&partnerId=672505ad-2e37-4500-8162-000bcfc05b5c)

## 2. Typography

공식 page는 일관된 정보 hierarchy, 보조 정보의 subtext 분리, 중립적인 형태와 가독성을 권고한다. System UI font로 Asta Sans를 안내한다. [Typography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/typography)

아래 값은 공식 page에 연결된 SVG를 직접 확인하여 기록하였다. `Size`의 단위, line-height, letter-spacing, numeric font-weight mapping은 해당 표에 없다. 따라서 `60sp`·`60px`·`800` 등으로 보충하지 않았다.

| Hierarchy | Large | Medium | Small | 공개 weight 표기 | 원본 |
| --- | --- | --- | --- | --- | --- |
| Headline | 60 | 56 | 48 | Extra Bold, Bold | [headline.svg](https://document.pleos.ai/en/assets/images/headline-cdddc157495a452d70cb6fc2cc2d7359.svg) |
| Title | 40 | 36 | 32 | Extra Bold, Bold, Regular | [title.svg](https://document.pleos.ai/en/assets/images/title-4ba825297b802194558f4ac3a33de511.svg) |
| Body | 30 | 28 | 26 | Strong, Normal | [body.svg](https://document.pleos.ai/en/assets/images/body-a60c3c3a40cf6fcc0b4b2c4e39eeccf1.svg) |
| Label | — | 24 | 20 | Normal | [label.svg](https://document.pleos.ai/en/assets/images/label-573dca295b60eefe86fabf8f0f0ba734.svg) |

Typography 본문은 최소 `12sp`, 실제 pixel 높이 `18px` 이상과 가독성을 위한 `18–20px` 높이를 언급한다. 별도의 UI guide는 주요 정보 `4mm`, 일반 정보 `3mm` 이상을 제시한다. 서로 다른 단위·조건이므로 display density와 실제 시청 거리를 확인한 뒤 적용해야 한다. 한국어 문장의 최대 글자 수는 이 자료에서 확정하지 않았다. [Typography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/typography), [Typography & Readability](https://document.pleos.ai/en/docs/connect/guide/docs-design/Introduction/intro#typography--readability)

Font 원본은 [42dot/Asta-Sans](https://github.com/42dot/Asta-Sans)와 [Google Fonts](https://fonts.google.com/specimen/Asta+Sans)에서 확인할 수 있다. Repository는 OFL-1.1을 표시하며, [OFL.txt](https://github.com/42dot/Asta-Sans/blob/main/OFL.txt)에 2024년 copyright와 SIL Open Font License 1.1을 명시한다.

## 3. Color

### 3.1 Basic scale

다음은 pixel sampling 결과가 아니라 공식 table에 인쇄된 token name과 hex 값이다. [Grayscale 원본](https://document.pleos.ai/en/assets/images/grayscale-f6be0c4273c5777035ffd84ea28013c9.png)

| Token | Light | Dark |
| --- | --- | --- |
| `basic_00` | `#FFFFFF` | `#131417` |
| `basic_50` | `#F7F8FA` | `#1D1E21` |
| `basic_100` | `#EDEEF2` | `#313236` |
| `basic_200` | `#E0E1E6` | `#44464E` |
| `basic_300` | `#C7C9CE` | `#686A72` |
| `basic_400` | `#A4A8AE` | `#A4A8AE` |
| `basic_500` | `#686A72` | `#C7C9CE` |
| `basic_600` | `#44464E` | `#E0E1E6` |
| `basic_700` | `#313236` | `#EDEEF2` |
| `basic_800` | `#1D1E21` | `#F7F8FA` |
| `basic_900` | `#131417` | `#FFFFFF` |

### 3.2 Informative color

| Token | Light | Dark |
| --- | --- | --- |
| `informative_active` | `#02C265` | `#00E074` |
| `informative_positive` | `#0064FF` | `#0082FF` |
| `informative_negative` | `#FE3D16` | `#FF4C28` |
| `informative_autonomous_driving` | `#5A46FA` | `#6A57FF` |

원본: [Informative table](https://document.pleos.ai/en/assets/images/system-color-informative-ef19e6a5596f00f102603ca3413577e3.png). `active`와 `positive`의 역할 이름을 일반적인 green/blue 관습으로 재명명하지 않는다.

### 3.3 역할 구분과 불일치

공식 page에는 Background, Button, Controller, Climate, Dropdown, Dim, Driving, Fields, Gleo AI, Icon, Informative, Keyboard, Media, Overlay, Phone, Regulation, Surface, Switch, Text별 table이 있다. Static color는 Light/Dark theme와 무관한 값으로 설명한다. [Colors](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/colors)

검토 시 다음 불일치를 직접 확인하였다.

- [Background table](https://document.pleos.ai/en/assets/images/system-color-background-7bee5722e2912af73a71dd8267a463f0.png)의 `background_primary`는 Light/Dark 모두 `basic_50`으로 표기하지만, swatch가 basic scale의 `basic_50` 색과 일치하지 않는다. `background_secondary`, `background_popup`에도 reference와 swatch 간 차이가 있다. 어느 쪽이 의도인지는 확인되지 않았다.
- [Text table](https://document.pleos.ai/en/assets/images/system-color-text-e7366a153c7953a16d9d7939a9ce2b25.png)은 서로 반대되는 색의 두 묶음 모두 `text_dark_primary` 등의 이름을 반복한다. 또한 [Static Light](https://document.pleos.ai/en/assets/images/light-0b540b02ca3f98e2cd94205da112ef67.png)·[Static Dark](https://document.pleos.ai/en/assets/images/dark-f44c562ac0ca05f9ccbda030142cf5e0.png) 표는 `basic_static_light_100` 등의 이름을 사용하지만 Text 표의 reference는 `static_light_100` 등이다.

**적용 권고:** 검증된 basic scale·informative 값과 semantic 역할 구분을 참고하되, 불일치한 semantic reference는 구현 정본으로 확정하기 전에 공식 asset 또는 담당자 확인이 필요하다. 이 조사는 색 이름이나 reference를 임의로 fix하지 않았다.

## 4. Layout·grid·spacing·radius

Display Layout 문서는 system UI와 application window를 구분한다. Status bar, driving view, GNB는 app content 바깥의 system 영역이며 system panel과 keyboard가 app 위를 가릴 수 있다. Application window는 하나 또는 두 app을 표시하므로 일반 app은 landscape·portrait에 대응해야 한다. [Display Layout](https://document.pleos.ai/en/docs/connect/guide/docs-design/getting-started/layout)

| 항목 | 공개 확인 내용 | 적용 한계 |
| --- | --- | --- |
| Display 유형 | Connect-S, Connect-W, Connect-W-Extended, Connect-WF | 실제 target 차량을 정하지 않고 하나의 화면 크기로 확정할 수 없음 |
| Connect-S | 17·14.6·12.9 inch. 이전 Connect-L은 Connect-S로 재분류 | inch만으로 app viewport pixel 수를 확정할 수 없음 |
| Window 비율 | Connect-S는 두 app `1:1`, 한 app `2:0`. Connect-W는 `2:1` 또는 `1:2` | 전체 display 비율과 app 내부 column grid는 다른 값임 |
| Icon grid | `48 × 48dp`, Filled·Outlined | icon 제작 기준이며 button touch target 수치로 전용하지 않음 |
| 공통 spacing | 공개 Foundation 본문에서 수치 scale 미확인 | `4dp`·`8dp` rhythm을 Pleos 공식 token으로 주장할 근거 없음 |
| 공통 radius | 공개 Foundation 본문에서 수치 scale 미확인 | component 그림의 곡률을 공식 radius token으로 추정하지 않음 |
| App layout column grid | 공개 Foundation 본문에서 column·gutter 수치 미확인 | 제안용 grid를 정하면 project 자체 결정으로 표시 필요 |

근거: [Display Layout](https://document.pleos.ai/en/docs/connect/guide/docs-design/getting-started/layout), [Window Policy](https://document.pleos.ai/en/docs/connect/guide/docs-design/getting-started/window), [Iconography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/contents-creation/iconography).

App Icon은 Android Adaptive Icon의 Foreground/Background 분리와 system mask 적용을 따른다. 브랜드별 mask template은 공식 design assets에 포함된다고 안내한다. [App Icon](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/contents-creation/app-icon)

## 5. Motion·shadow·응답 기준

### 5.1 Animation

Animation page는 상태 전달용 loading의 `Linear`·`Tension` 유형과 [Loading.zip](https://document.pleos.ai/en/assets/files/Loading-a564bf9ddfbe2fa3c9640ec7708d9e1d.zip)을 제공한다. HTML에는 duration, easing curve, spring 수치가 없다. ZIP 내부는 검사하지 않았다. [Animation](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/animation)

UI guide의 입력 후 `0.25s` 이내 응답·지연 시 처리 상태 표시, `1–2s` 내 정보 파악 기준은 **interaction 응답·glanceability 기준**이다. Animation duration token을 의미하지 않는다. [UI Design Guide](https://document.pleos.ai/en/docs/connect/guide/docs-design/Introduction/intro)

### 5.2 Shadow

아래 수치는 HTML 원문에 공개되어 있다. X/Y/Blur/Spread의 단위는 해당 page에 명시되어 있지 않다. Color는 원문의 8자리 hex와 비율을 유지하였다. CSS color 문법으로 그대로 복사하지 않는다. [Shadow](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/shadow)

| Level | 원문 layer 이름 | X | Y | Blur | Spread | Color·비율 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Shadow 1-2 | 0 | 6 | 24 | 0 | `#14000000` · 8% |
| 2 | Shadow 1-1 | 0 | 8 | 32 | 0 | `#29000000` · 16% |
| 2 | Shadow 1-2 | 0 | 2 | 2 | 0 | `#14000000` · 8% |
| 3 | Shadow 1-1 | 0 | 20 | 40 | 0 | `#3D000000` · 24% |
| 3 | Shadow 1-2 | 0 | 2 | 4 | 0 | `#33000000` · 20% |

## 6. Component 명세와 실제 code 제공 범위

| 공개 자료 | 확인된 내용 | 확인되지 않은 내용 |
| --- | --- | --- |
| [Basic button](https://document.pleos.ai/en/docs/connect/guide/docs-design/components/actions/basic-button) | Root·Label·prefix/suffix Icon, `Pressed`·`Disabled`·`Loading` Boolean state | import path, composable signature, event API. Properties 표는 States를 반복하므로 code API로 해석하지 않음 |
| [System Popup](https://document.pleos.ai/en/docs/connect/guide/docs-design/components/popups/system-popup) | Title·Description·Confirm/Cancel action, Large/Medium, Single/Vertical/Horizontal button 배치 | app 임의 popup이 OS 긴급 dialog 권한을 얻는다는 근거 |
| [Page Navigation](https://document.pleos.ai/en/docs/connect/guide/docs-design/components/page-navigation) | App icon·primary/secondary menu·suffix, Main/Depth 유형 | 별도 runtime navigation package |
| [System Notification](https://document.pleos.ai/en/docs/connect/guide/docs-design/components/notification/system-notification) | OS 제공 notification의 영역·유형·button 배치 명세 | 일반 app의 모든 system notification 권한·우선순위 |
| [공식 Vehicle sample](https://github.com/Pleos-Playground/pleos-sample-vehicle-app) | Kotlin/Compose app source와 typed Vehicle SDK 사용 예 | 공개 Pleos UI component library와의 동일성 |

공식 sample의 [app/build.gradle.kts](https://github.com/Pleos-Playground/pleos-sample-vehicle-app/blob/959981d960ec71144accb27af5ae5d341e72a644/app/build.gradle.kts)는 `compose = true`, `androidx` Compose 및 Material 3 dependency를 사용한다. 같은 commit의 [version catalog](https://github.com/Pleos-Playground/pleos-sample-vehicle-app/blob/959981d960ec71144accb27af5ae5d341e72a644/gradle/libs.versions.toml)와 함께 확인한 값은 다음과 같다.

| 항목 | Sample source 값 | 근거 |
| --- | --- | --- |
| Kotlin | `2.0.0` | `gradle/libs.versions.toml` |
| AGP | `8.8.2` | `gradle/libs.versions.toml` |
| Activity Compose | `1.10.1` | `gradle/libs.versions.toml` |
| Compose BOM | `2024.04.01` | `gradle/libs.versions.toml` |
| Material 3 | 별도 version 없이 BOM에 위임 | catalog의 `androidx-material3`, build의 BOM·Material 3 dependency |
| compileSdk / targetSdk | `35` / `35` | `app/build.gradle.kts` |
| minSdk | `23` | `app/build.gradle.kts`. Product app의 API 28 이상 기준과 별도 |

Google의 [해당 BOM POM](https://dl.google.com/dl/android/maven2/androidx/compose/compose-bom/2024.04.01/compose-bom-2024.04.01.pom)은 `androidx.compose.material3:material3`를 `1.2.1`, Compose UI·Foundation·Animation을 `1.6.6`으로 지정한다. 이는 source와 BOM을 대조한 값이며 실제 Gradle dependency resolution은 실행하지 않았다. 새 Material 3 component를 이 sample에 그대로 적용할 수 있다는 근거가 아니다. Sample의 구성은 모든 Pleos app에 대한 강제 version이나 권장 최신 version을 의미하지 않는다.

**공개 확인 범위:** 독립적인 Pleos React/npm package, Pleos 전용 Compose UI Maven artifact, version이 지정된 public design-token JSON 배포는 확인하지 못하였다. Component 명세를 이용한 제안 화면은 작성할 수 있으나, 공개 package를 그대로 import하는 방식은 근거가 확보되지 않았다.

## 7. AAOS 관계와 SDK baseline

Pleos Connect SDK는 AAOS 기반이며 Vehicle·NaviHelper·TextToSpeech·SpeechToText·FusedLocation SDK를 제공한다. 같은 기능이 AAOS에 있으면 이를 따르는 API 정책을 설명한다. UI Foundation은 차량 data SDK와 별도인 design 명세이다. [SDK Overview](https://document.pleos.ai/en/docs/pleos-only/connect-sdk-pleos/)

| 공식 근거 | 날짜·version | 확인 내용 |
| --- | --- | --- |
| [Getting Started](https://document.pleos.ai/en/docs/pleos-only/getting-started) | 게시·개정일 미표시 | Android SDK/API 34 system image, product app `minSdk` 28 이상, Vehicle `2.3.1` |
| [Emulator release note](https://document.pleos.ai/en/docs/pleos-only/release-note/emulator-release-note) | 2026-10-19 · `2.1.0` | Virtual Console·form-factor test 추가. LLM SDK·CRN·Bluetooth dongle 지원 종료 |
| [SDK release note](https://document.pleos.ai/en/docs/pleos-only/release-note/sdk-release-note) | 2026-10-19 | Vehicle `2.3.1`, NaviHelper `3.0.5`, TextToSpeech `3.3.1`, SpeechToText `3.3.1`, FusedLocation `1.1.2` |
| [Sample App Guide](https://document.pleos.ai/en/docs/pleos-only/tutorial/vehicle-sdk-sample-app) | 게시·개정일 미표시 · Sample `1.0.0-sdk35` | AVD `Pleos_Connect_v2.1`·Android 14, Vehicle `2.3.2`, Vehicle Service `2.3.22`, compile/target 35, sample minSdk 23. Product app API 28 이상을 별도로 명시 |
| [공식 sample README](https://github.com/Pleos-Playground/pleos-sample-vehicle-app/blob/959981d960ec71144accb27af5ae5d341e72a644/README.md) / [실제 dependency](https://github.com/Pleos-Playground/pleos-sample-vehicle-app/blob/959981d960ec71144accb27af5ae5d341e72a644/gradle/libs.versions.toml) | HEAD `959981d960ec71144accb27af5ae5d341e72a644` · commit 2026-10-17 UTC | README는 Vehicle `2.3.2`, dependency는 `2.3.1`로 서로 다름. Raw source로도 재확인 |

**확정 범위:** 공개 AVD의 Android 14/API 34 기준을 확인하였다. 이를 모든 양산 차량의 OS version으로 일반화하지 않는다. `compileSdk`·`targetSdk` 35는 app build 기준이며 AVD가 Android 15라는 뜻이 아니다. 이 자료에서 Pleos의 AAOS 17 지원은 확인되지 않았다.

실제 SDK 배포 repository는 [Pleos Maven](https://nexus-playground.pleos.ai/repository/maven-releases/)이며, 공개 좌표의 예는 `ai.pleos.playground:Vehicle:2.3.1`과 `ai.pleos.playground:NaviHelper:3.0.5`이다. [Getting Started](https://document.pleos.ai/en/docs/pleos-only/getting-started), [공식 NaviHelper sample](https://github.com/Pleos-Playground/pleos-sample-navi-app)

공식 sample source link는 [Vehicle](https://github.com/Pleos-Playground/pleos-sample-vehicle-app), [NaviHelper](https://github.com/Pleos-Playground/pleos-sample-navi-app), [FusedLocation](https://github.com/Pleos-Playground/pleos-sample-fusedlocation-app)이다. [공식 tutorial navigation](https://document.pleos.ai/en/docs/pleos-only/tutorial/vehicle-sdk-sample-app)에서 직접 연결된다.

SDK 접근은 공개 문서 열람과 다르다. 공식 onboarding은 Vehicle State·NaviHelper를 Ready to Use로 안내하고, FusedLocation·TTS·STT·Vehicle Control은 Not Available Yet로 안내한다. 실제 project 상태와 사전 승인 범위를 확인해야 한다. 사고 감지·긴급 통화·차량 제어를 UI 표현만으로 이미 가능한 기능으로 확정할 수 없다. [SDK access](https://document.pleos.ai/en/docs/pleos-only/create-my-project), [SDK API policy](https://document.pleos.ai/en/docs/pleos-only/connect-sdk-pleos/#api-policy)

## 8. Design kit·license·접근 상태

| 자료 | 직접 URL | 확인 상태 |
| --- | --- | --- |
| Display guide `.fig` | [Pleos_Connect_display_guide_215.fig](https://document.pleos.ai/img/Pleos_Connect_display_guide_215.fig) | 인증 없는 HTTP HEAD 200 · 44,427,926 bytes. 내부 미검사 |
| Design assets `.fig` | [Pleos_Connect_design_assets_215.fig](https://document.pleos.ai/img/Pleos_Connect_design_assets_215.fig) | 인증 없는 HTTP HEAD 200 · 2,477,386 bytes. 내부 미검사 |
| Public Foundation HTML·SVG·PNG | 위 각 Foundation link | 인증 없이 열람, text scale·color 표 직접 확인 |
| Private Figma library | 공개 문서에서 접근 가능한 library file ID·권한 미확보 | 내용·token·variant 미확인 |

두 `.fig`의 HTTP `Last-Modified`는 `2026-10-29 06:56:20 GMT`였다. 이는 server header이며 design system의 발행일을 확정하는 근거가 아니다. File name의 `215`를 semantic version `2.1.5`로 해석할 근거도 확보하지 못하였다. 공식 연결 위치는 [Download Design Resources](https://document.pleos.ai/en/docs/connect/guide/docs-design/Introduction/intro#download-design-resources)이다.

공개 Terms는 Design Assets를 service 범위에 포함하며, 제10조는 content 사용의 사전 명시적 서면 동의를, 제12조는 권리 귀속과 제한된 사용권을 명시한다. 제15조는 development tools의 reverse engineering·변형·재배포 등에 제한을 둔다. 별도 계약은 Terms와 충돌할 때 우선한다. 확인한 Terms의 시행일은 2025-03-28이다. 이는 조항의 확인 결과이며, 개별 제안서에서의 사용 허용 여부에 대한 법률 판단은 아니다. [Terms 제2·3·10·12·15조 및 부칙](https://developers.pleos.ai/playground/external/use-policy?locale=en-US&partnerId=672505ad-2e37-4500-8162-000bcfc05b5c)

## 9. 사고 대응 지원 제안에 대한 적용 판단

다음은 조사 결과에 근거한 **제안**이며 공식 Pleos 승인 사항이 아니다.

- 정보 hierarchy·Asta Sans·Light/Dark color 역할·명확한 button state·간결한 popup anatomy를 후속 component 검토의 기준으로 사용한다.
- 화면별 실제 app viewport, system overlay, portrait/landscape 변화에 대응한다. 전체 차량 display를 app이 임의로 점유하는 구성은 별도 OEM/system 권한 확인 대상으로 구분한다.
- 처리 중·실패·전송 완료·기관 수신 확인은 각각 근거가 다른 상태로 표시한다. Loader나 positive color가 외부 기관의 처리 완료를 의미하지 않도록 한다.
- 공통 spacing·radius·motion 수치를 정해야 한다면 project 자체 design 결정으로 표시한다. 확인되지 않은 값을 Pleos 공식 token으로 표기하지 않는다.
- 차량 정지가 곧 unrestricted UX 상태라는 전제를 두지 않는다. 지역·차량 상태·app category와 `CarUxRestrictions`에 따른 제한 상태 확인이 필요하다. [Pleos Driving Safety](https://document.pleos.ai/en/docs/pleos-only/vehicle-app-planning-guide/driver-distraction-guideline)

이 단계에서는 prototype·UI·`project.json`을 변경하지 않았다. 실제 Pleos AVD·차량, SDK build·API 실행, `.fig` 내부·private Figma library는 검증하지 않았다.
