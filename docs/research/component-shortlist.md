# 사고 대응 UX — Contemporary component shortlist

조사 기준일: 2026-11-05

우선 검토 방향은 단일 다음 행동, 기관별 요청 상태, 작은 voice feedback 영역이다. Android 화면은 Pleos의 component·token을 우선 적용하고, 부족한 interaction만 아래 native 후보로 보완한다. Web 후보는 HTML prototype의 표현과 상태 비교에 한정한다. 최신 release·실제 component 변경·license를 각각 확인하였으며, stars와 repository의 `pushed_at`만으로 우선순위를 정하지 않았다.

아래의 **확인**은 공식 source·문서·GitHub metadata의 내용이며, **적용 판단**은 기존 [flow 검수본의 F05–F08](../reviews/flow-review-v1.2.md)에 대응한 제안이다. 아직 구현하거나 실제 차량에서 검증한 결과는 아니다.

## 우선 검토 방향

| 방향 | 구체적인 표현 | 우선 참고 component | 실제 visual reference·demo |
| --- | --- | --- | --- |
| A · 단일 다음 행동 | 화면 상단에 현재 상황 한 문장과 필요한 다음 행동 하나를 제시한다. 보조 정보는 낮은 강조의 상태 row로 유지한다. 긴급 연락과 일반 정보 제공 동의를 같은 승인으로 통합하지 않는다. | Pleos component 우선. Native 보완 후보는 Material 3 `Button`·`ListItem`. Car App Library 대상이면 `MessageTemplate`·`PaneTemplate`의 표현 범위를 먼저 확인한다. | [공식 Button visual examples](https://developer.android.com/develop/ui/compose/components/button), [Android car showcase](https://github.com/android/car-samples/tree/main/car_app_library/showcase) |
| B · 기관별 요청 상태 | 기관마다 `요청 전송`·`접수 확인`·`출동 확인`·`인계 확인`을 별도 상태로 표시한다. 현재 상태와 확인 시각을 먼저 제시하고, 이전 상태와 동의 항목은 펼쳐서 확인한다. | Native: Compose Unstyled `Drawer`·`Disclosure`. Web: shadcn `ItemGroup`·`ItemFooter`·`Badge`·`AlertDialog`; 직접 표현을 설계할 때는 Base UI `Dialog`·`Collapsible`. | [Drawer interactive demo](https://composeunstyled.com/docs/components/drawer/), [shadcn Item demo](https://ui.shadcn.com/docs/components/base/item), [Base UI Dialog demo](https://base-ui.com/react/components/dialog) |
| C · 작은 voice feedback 영역 | 고정된 작은 영역에서 `듣는 중`·`처리 중`·`응답 중`을 text와 함께 표시한다. 다음 행동과 기관별 상태는 그대로 읽을 수 있어야 한다. 상태 변경에는 짧은 opacity transition을 우선 검토한다. | Web: ElevenLabs `VoiceButton`·`BarVisualizer`, Motion Primitives `TransitionPanel`. Native에서는 상태 구분과 작은 영역만 참고하여 Pleos·Compose로 다시 표현한다. | [VoiceButton demo와 source](https://github.com/elevenlabs/ui/blob/main/apps/www/content/docs/components/voice-button.mdx), [BarVisualizer demo와 source](https://github.com/elevenlabs/ui/blob/main/apps/www/content/docs/components/bar-visualizer.mdx), [TransitionPanel card demo](https://github.com/ibelick/motion-primitives/blob/main/app/docs/transition-panel/transition-panel-card.tsx) |

방향 C의 공개 demo page는 [VoiceButton](https://ui.elevenlabs.io/docs/components/voice-button), [BarVisualizer](https://ui.elevenlabs.io/docs/components/bar-visualizer), [TransitionPanel](https://motion-primitives.com/docs/transition-panel)이다. TransitionPanel과 Compose Unstyled Drawer의 공개 demo 화면은 browser에서 확인하였다. VoiceButton·BarVisualizer는 source와 공개 문서를 확인하였으며 음성 입력은 실행하지 않았다.

## 후보 8개

### 1. AndroidX Material 3 — Button·ListItem·LoadingIndicator

**분류: Android-native 재사용 후보.** 정본은 [`androidx/androidx`](https://github.com/androidx/androidx)이며 GitHub는 AOSP 개발 branch와 동기화하는 repository다. `Button`은 primary action, `ListItem`은 제목·보조 설명·leading/trailing content를 제공한다. `LoadingIndicator`·`ContainedLoadingIndicator`는 determinate/indeterminate 표시와 shape morph를 제공한다. [Button source](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/Button.kt), [ListItem source](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/ListItem.kt), [LoadingIndicator source](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/LoadingIndicator.kt).

**적용 판단:** 단일 다음 행동과 기관별 상태 row의 native 기준으로 가장 적합하다. Expressive의 모든 shape·motion을 함께 적용할 필요는 없다. `LoadingIndicator`는 실제 요청 처리 대기에만 사용하고, `접수 확인`이나 `출동 확인`을 대신하는 표시로 사용하지 않는다. 반복 morph는 긴급 화면의 기본 표현에서 제외하고, text 상태와 작은 정적 indicator를 우선 비교한다.

**version 주의:** 공식 release notes의 stable은 `1.4.0`, 최신 RC는 **`1.5.0-rc01` — 2026-11-04**다. 개발 branch의 `LoadingIndicator`에는 `ExperimentalMaterial3ExpressiveApi`가 남아 있다. Expressive 전체가 stable artifact에 포함되었다고 가정하지 않는다. Motion의 `standard()`와 `expressive()`도 별도 선택이다. [공식 release notes](https://developer.android.com/jetpack/androidx/releases/compose-material3#1.5.0-rc01), [MotionScheme source](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MotionScheme.kt).

### 2. Compose Unstyled — Drawer·Disclosure·Dialog

**분류: Android-native·Compose Multiplatform 재사용 후보.** 실제 owner는 [`composablehorizons/compose-unstyled`](https://github.com/composablehorizons/compose-unstyled)다. `UnstyledDrawer`는 named snap point, modal/overlay/in-place presentation, gesture·Back·outside dismissal 제어를 제공한다. `UnstyledDisclosure`는 controlled expanded state와 접근성용 expand/collapse action을 제공한다. `UnstyledDialog`는 modal focus와 dismissal·enter/exit transition을 제공한다. [Drawer 문서 source](https://github.com/composablehorizons/compose-unstyled/blob/main/docs/pages/drawer.md), [Disclosure source](https://github.com/composablehorizons/compose-unstyled/blob/main/docs/pages/disclosure.md), [Dialog source](https://github.com/composablehorizons/compose-unstyled/blob/main/docs/pages/dialog.md).

**적용 판단:** Pleos 외형을 유지하면서 동의 세부 항목·기관별 이력·남은 일을 표시하는 interaction 후보로 적합하다. 주행 중 drag를 필수 조작으로 만들지 않고, 명시적인 열기·닫기 control을 유지한다. 보조 panel 때문에 긴급 next action이 가려지지 않도록 한다.

**최신 변경:** 2026-11-02 default branch에서 기존 **Bottom Sheet·Modal Bottom Sheet를 Drawer로 deprecate**하였다. 새 설계의 reference는 Drawer로 통일한다. 이 deprecation commit은 최신 published release `2.10.2`보다 뒤이므로 source의 변경과 배포된 API를 구분한다. [deprecation commit](https://github.com/composablehorizons/compose-unstyled/commit/32faeabec60cdab5d6b03e5e7d2555d770557ccf), [2.10.2 release](https://github.com/composablehorizons/compose-unstyled/releases/tag/2.10.2).

### 3. MaterialKolor — DynamicMaterialExpressiveTheme·rememberDynamicColorScheme

**분류: Native theme 보조 후보, interaction component가 아님.** [`jordond/MaterialKolor`](https://github.com/jordond/MaterialKolor)는 seed 기반 color scheme과 Material 3·Compose Unstyled adapter를 제공한다. `DynamicMaterialExpressiveTheme`, `rememberDynamicColorScheme`, `contrastLevel`, palette별 color override가 실제 API다. [README와 API examples](https://github.com/jordond/MaterialKolor/blob/main/README.md).

**적용 판단:** Pleos token으로 표현이 충분하면 도입하지 않는다. Brand seed를 여러 light/dark variation으로 비교해야 할 때만 보조로 검토한다. 위험·미확인·완료의 의미 색은 고정하고, 자동 harmonization 결과를 그대로 승인하지 않는다.

**최신 변경:** `6.0.0`은 2026-10-15 배포되었다. `5.x`에서 `6.0`으로 이동하면 기본 color spec이 `SPEC_2021`에서 `SPEC_2025`로 바뀌고 artifact·package도 분리된다. 외형 비교는 동일 version·spec 기준으로 수행해야 한다. [6.0.0 release](https://github.com/jordond/MaterialKolor/releases/tag/6.0.0), [migration guide](https://github.com/jordond/MaterialKolor/blob/main/docs/migration-6.0.md).

### 4. Android car-samples — MessageTemplate·PaneTemplate·Row·Action

**분류: Car App Library 대상의 native template reference. Compose library가 아님.** [`android/car-samples`](https://github.com/android/car-samples)는 `MessageTemplate`·`PaneTemplate`·`Row`와 primary `Action` 사용을 실제 source로 제공한다. Showcase에는 Android Auto용 mobile module과 AAOS용 automotive module이 구분되어 있다. [showcase README](https://github.com/android/car-samples/blob/main/car_app_library/showcase/README.md), [ShortMessageTemplate example](https://github.com/android/car-samples/blob/main/car_app_library/showcase/common/src/main/java/androidx/car/app/sample/showcase/common/screens/templatelayouts/messagetemplates/ShortMessageTemplateDemoScreen.java), [PaneTemplate example](https://github.com/android/car-samples/blob/main/car_app_library/showcase/common/src/main/java/androidx/car/app/sample/showcase/common/screens/templatelayouts/PaneTemplateDemoScreen.java).

**적용 판단:** 하나의 안내·다음 행동과 짧은 상태 row 구성을 검토하는 기준이다. 이 sample의 존재만으로 사고 지원 app category, 주행 중 제공 가능 범위, Pleos 배포 권한을 확인한 것은 아니다. Pleos native app과 Car App Library app을 같은 구현 대상으로 간주하지 않는다. Template 대상에서는 arbitrary HTML/Compose screen을 그대로 옮길 수 있다고 가정하지 않는다.

### 5. shadcn/ui — ItemGroup·ItemFooter·Badge·AlertDialog

**분류: HTML·React prototype 전용.** [`shadcn-ui/ui`](https://github.com/shadcn-ui/ui)의 `Item`에는 media·title·description·actions·footer가 있으며 `ItemGroup`으로 묶을 수 있다. `AlertDialog`는 title·description·action·cancel slot을 제공한다. 조사한 `new-york-v4` source는 Radix primitive를 사용하며, 현재 공식 Item 문서에는 Base UI·React Aria·Radix variant가 구분되어 있다. [Item source](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/item.tsx), [AlertDialog source](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/alert-dialog.tsx), [공식 Item demo](https://ui.shadcn.com/docs/components/base/item).

**적용 판단:** 기관별 상태 card와 재개 시 남은 일의 목록을 빠르게 비교하는 web reference로 우선한다. `ItemFooter`에는 마지막 확인 시각·다음 확인 조건을 배치한다. 승인 전에는 수신처·목적·전송 항목을 명시하고 보류·거절 action을 별도로 유지한다. 작은 badge 색만으로 상태를 표현하지 않는다.

**구성 한계:** 이 후보는 사고 대응용 timeline이나 전송 state machine을 제공하지 않는다. Timeline은 `Item`·`Badge`·`Separator`의 표현을 참고하여 별도로 구성하며, 기관별 event와 확인 근거를 source of truth로 사용한다. `요청 전송`을 `접수 확인`으로 자동 승격하는 animation은 추가하지 않는다.

### 6. Base UI — Dialog·Collapsible·Progress

**분류: HTML·React prototype 전용, custom visual을 직접 설계할 때의 대안.** [`mui/base-ui`](https://github.com/mui/base-ui)는 unstyled primitive를 제공한다. `Dialog.Root`는 controlled open state·modal focus·pointer dismissal 제어를 제공하며, `Collapsible.Root`도 controlled open state를 제공한다. `Progress.Root`는 `value=null`인 indeterminate 상태와 `progressbar` semantics를 제공한다. [Dialog source](https://github.com/mui/base-ui/blob/master/packages/react/src/dialog/root/DialogRoot.tsx), [Collapsible source](https://github.com/mui/base-ui/blob/master/packages/react/src/collapsible/root/CollapsibleRoot.tsx), [Progress source](https://github.com/mui/base-ui/blob/master/packages/react/src/progress/root/ProgressRoot.tsx).

**적용 판단:** shadcn의 외형보다 Pleos에 가까운 web mock을 직접 설계해야 할 때 선택한다. 같은 prototype에서 shadcn·Radix·Base UI의 같은 역할 component를 중복 조합할 필요는 없다. 공식 문서도 gesture·snap point가 필요한 경우 `Dialog`와 `Drawer`를 구분한다. [Dialog demo와 usage guidelines](https://base-ui.com/react/components/dialog).

**상태 표현:** 접수 대기에는 `Progress`의 indeterminate 표현을 참고할 수 있다. 기관 처리 전체를 근거 없는 percent로 표시하거나, `Meter`를 업무 진행률로 대체하지 않는다. `Meter`의 공식 정의는 범위 안의 수치 표시다. [Progress source](https://github.com/mui/base-ui/blob/master/packages/react/src/progress/root/ProgressRoot.tsx), [Meter 정의](https://base-ui.com/react/components/meter).

### 7. Motion Primitives — TransitionPanel·AnimatedNumber

**분류: Web motion reference. Native에서는 시각적 전환 원칙만 참고.** [`ibelick/motion-primitives`](https://github.com/ibelick/motion-primitives)의 `TransitionPanel`은 `activeIndex`에 따라 content를 교체하고 enter/center/exit variant를 받는다. `AnimatedNumber`는 실제 value 변화에 spring을 적용한다. 두 component 모두 `motion/react`를 사용한다. [TransitionPanel source](https://github.com/ibelick/motion-primitives/blob/main/components/core/transition-panel.tsx), [AnimatedNumber source](https://github.com/ibelick/motion-primitives/blob/main/components/core/animated-number.tsx).

**적용 판단:** 다음 행동이 바뀌었음을 알리는 작은 opacity transition 후보로 제한한다. 기관별 card의 위치·순서는 유지한다. `AnimatedNumber`는 확인된 남은 항목 수 같은 보조 수치에만 검토하고, 확인되지 않은 도착 예정 시간이나 긴급 countdown을 생성하지 않는다. Spring·morph·slide의 결합은 기본안에서 제외한다.

**유지보수 해석:** repository는 2026-09까지 활동하였으나, `TransitionPanel` 자체의 최신 commit은 **2025-01-09**다. 신규 component로 분류하지 않고, source가 짧고 전환이 분리되어 있는 reference로 평가한다. [component commit](https://github.com/ibelick/motion-primitives/commit/e3c7b9967f5a3f59e993a760af463a454d215e16), [최근 repository commit](https://github.com/ibelick/motion-primitives/commit/120f64f6ca60348e251f929e9c81f11ccbe45eda).

### 8. ElevenLabs UI — VoiceButton·BarVisualizer

**분류: HTML·React prototype 전용, native에서는 상태 표현 reference.** [`elevenlabs/ui`](https://github.com/elevenlabs/ui)의 `VoiceButton`은 `idle`·`recording`·`processing`·`success`·`error`를 받는다. `BarVisualizer`는 `connecting`·`initializing`·`listening`·`speaking`·`thinking`을 구분하며 실제 `MediaStream` 입력과 `demo` mode를 별도로 지원한다. [VoiceButton source](https://github.com/elevenlabs/ui/blob/main/apps/www/registry/elevenlabs-ui/ui/voice-button.tsx), [BarVisualizer source](https://github.com/elevenlabs/ui/blob/main/apps/www/registry/elevenlabs-ui/ui/bar-visualizer.tsx).

**적용 판단:** 큰 animated orb 대신 낮은 높이의 voice strip을 참고한다. `듣는 중`·`처리 중`을 text로 함께 제시하고, 음성 입력 중단과 수동 입력 경로를 유지한다. Prototype의 합성 waveform을 실제 녹음·음성 인식 성공의 근거로 사용하지 않는다. `ConversationBar`는 ElevenLabs agent 연결까지 포함한 통합 UI이므로 이번 reference의 기본 단위에서는 제외한다. [ConversationBar 설명](https://github.com/elevenlabs/ui/blob/main/apps/www/content/docs/components/conversation-bar.mdx).

**직접 재사용 시 보완점:** `VoiceButton` source의 success/error visual feedback은 기본 **1,500 ms** 뒤 사라지고, processing 중 button은 disabled된다. 사고 요청의 성공·실패 상태는 별도 지속 영역에 보존해야 하며, 단기 voice feedback과 기관 접수 결과를 같은 상태로 표현하지 않는다. 기본 `aria-label`도 `Voice Button`이므로 실제 action·상태에 맞는 명칭이 필요하다. [확인 source](https://github.com/elevenlabs/ui/blob/main/apps/www/registry/elevenlabs-ui/ui/voice-button.tsx).

## License·유지보수 확인

아래의 `archived=false`는 조사일의 GitHub repository metadata 값이다. Release가 있다는 사실과 선택한 component가 최근 바뀌었다는 사실을 구분하였다. GitHub release가 없는 repository를 package 배포가 없는 것으로 판단하지 않았다.

| 정확한 repository | License 원문·SPDX | 조사일 archive 상태 | 최신 release·의미 있는 변경 근거 |
| --- | --- | --- | --- |
| `androidx/androidx` | [Apache-2.0](https://github.com/androidx/androidx/blob/androidx-main/LICENSE.txt) | [false](https://api.github.com/repos/androidx/androidx) | [Material 3 1.5.0-rc01, 2026-11-04](https://developer.android.com/jetpack/androidx/releases/compose-material3#1.5.0-rc01). GitHub release 대신 공식 AndroidX release notes를 기준으로 삼았다. |
| `composablehorizons/compose-unstyled` | [MIT](https://github.com/composablehorizons/compose-unstyled/blob/main/LICENSE) | [false](https://api.github.com/repos/composablehorizons/compose-unstyled) | [2.10.2, 2026-10-28](https://github.com/composablehorizons/compose-unstyled/releases/tag/2.10.2). 같은 날 [hosted modal focus 이탈 fix](https://github.com/composablehorizons/compose-unstyled/commit/649c4713a3fee130cb0d4dd0cf215be6338a07e3). |
| `jordond/MaterialKolor` | [MIT](https://github.com/jordond/MaterialKolor/blob/main/LICENSE) | [false](https://api.github.com/repos/jordond/MaterialKolor) | [6.0.0, 2026-10-15](https://github.com/jordond/MaterialKolor/releases/tag/6.0.0). [color spec·artifact 변경](https://github.com/jordond/MaterialKolor/blob/main/docs/migration-6.0.md). |
| `android/car-samples` | [Apache-2.0](https://github.com/android/car-samples/blob/main/LICENSE) | [false](https://api.github.com/repos/android/car-samples) | [v1.9.0-alpha01, 2026-06-03](https://github.com/android/car-samples/releases/tag/v1.9.0-alpha01). 실제 [sample sync commit은 2026-05-18](https://github.com/android/car-samples/commit/9be0b199986770cd5cde7765765c0eaef0758d15). Alpha sample 기준이다. |
| `shadcn-ui/ui` | [MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) | [false](https://api.github.com/repos/shadcn-ui/ui) | [CLI shadcn@4.23.0, 2026-10-27](https://github.com/shadcn-ui/ui/releases/tag/shadcn%404.23.0). 선택한 [Item source의 최근 변경은 2026-09-04](https://github.com/shadcn-ui/ui/commit/c257f688cf4de7ec10cc1be84cad29cd4631182c). CLI release와 component version은 동일 개념이 아니다. |
| `mui/base-ui` | [MIT](https://github.com/mui/base-ui/blob/master/LICENSE) | [false](https://api.github.com/repos/mui/base-ui) | [v1.9.0, 2026-10-09](https://github.com/mui/base-ui/releases/tag/v1.9.0). 이후 [Dialog 등의 open-change 규칙 통일, 2026-10-29](https://github.com/mui/base-ui/commit/06cf9a0064231a1393cd43d86439bbc52255fa5a). |
| `ibelick/motion-primitives` | [MIT](https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md) | [false](https://api.github.com/repos/ibelick/motion-primitives) | [GitHub releases 없음](https://api.github.com/repos/ibelick/motion-primitives/releases). [TransitionPanel 변경 2025-01-09](https://github.com/ibelick/motion-primitives/commit/e3c7b9967f5a3f59e993a760af463a454d215e16); 최근 repository 활동은 2026-09의 배포·문서 작업이다. |
| `elevenlabs/ui` | [MIT](https://github.com/elevenlabs/ui/blob/main/LICENSE.md) | [false](https://api.github.com/repos/elevenlabs/ui) | [v1.0.0, 2025-10-10](https://github.com/elevenlabs/ui/releases/tag/v1.0.0). [VoiceButton canvas size fix 2025-10-27](https://github.com/elevenlabs/ui/commit/cdd50490fe5aaa2b76360bb3fcb1285ed114f479). 2026-10 repository activity는 dependency 보안 fix이며 component 신기능의 증거는 아니다. |

MIT·Apache-2.0 표기는 위 repository license 원문을 확인한 결과다. 실제 도입 시에는 선택한 version의 source·의존 package·asset에 적용되는 고지를 함께 보존한다.

## 추가 후보의 선별 결과

| 후보 | 확인한 내용 | 이번 기본안의 판단 |
| --- | --- | --- |
| [`radix-ui/primitives`](https://github.com/radix-ui/primitives) | `Dialog`·`AlertDialog`·`Collapsible`·`Progress`가 존재한다. 2026-10-14 [Dialog overlay tap fix](https://github.com/radix-ui/primitives/commit/e9013c21be90f94c8e9fb8516fb19d58d878c116)도 확인하였다. | shadcn의 조사한 variant가 이미 Radix를 사용하므로 별도 visual 방향으로 중복 추천하지 않는다. Direct primitive가 필요한 경우의 대안이다. |
| [`imskyleen/animate-ui`](https://github.com/imskyleen/animate-ui) | 현재 owner와 [README](https://github.com/imskyleen/animate-ui/blob/main/README.md)는 Radix·Base UI·React Aria용 animated primitive를 명시한다. [Tabs fix, 2026-11-02](https://github.com/imskyleen/animate-ui/commit/e5f47ca55688ff4736139755f6dbe236ccf6fa36). [LICENSE는 MIT + Commons Clause](https://github.com/imskyleen/animate-ui/blob/main/LICENSE.md), [GitHub SPDX는 NOASSERTION](https://api.github.com/repos/imskyleen/animate-ui)이다. | 일반 MIT와 같은 조건으로 취급하지 않는다. Application 내 사용과 component 자체 판매·재배포의 조건이 다르다. 전체 UI에 animation을 일괄 적용하는 방향은 사고 대응 flow의 기본안에서 제외한다. |
| [`DavidHDev/react-bits`](https://github.com/DavidHDev/react-bits) | 현재 [LICENSE는 MIT + Commons Clause v1.0](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md), [GitHub SPDX는 NOASSERTION](https://api.github.com/repos/DavidHDev/react-bits)이다. Component·tool·sound 자체와 단독 export의 재판매·재배포를 제한한다. [2026-10-18 Center Stage·Sound Lab 추가](https://github.com/DavidHDev/react-bits/commit/d965399df489c7b8da3874e07d716c0d98ab39fd). | conditional visual inspiration으로만 보관한다. 사고 대응용 기본 dependency로 추천하지 않는다. Product 안에서의 사용과 component·sound·template pack 재배포를 구분해야 한다. |
| [`magicuidesign/magicui`](https://github.com/magicuidesign/magicui) | [MIT](https://github.com/magicuidesign/magicui/blob/main/LICENSE.md). `AnimatedList`가 존재하고 [2026-11-02 DitherField WebGL2 background 추가](https://github.com/magicuidesign/magicui/commit/43c0915a4e319e1eb037c55f7714f488c9ad238d)가 확인된다. | 반복 등장 animation과 decorative background보다 고정된 기관별 상태 목록을 우선한다. 이번 flow에서는 별도 도입 근거가 약하다. |

## 적용 원칙과 검증 경계

- **다음 행동:** urgent action은 한 곳에 유지한다. 동등하게 강조된 action을 여러 card에 반복하지 않는다.
- **상태 timeline:** `전송`·`접수`·`출동`·`인계`는 각각의 외부 확인으로 갱신한다. `미확인`·`보류`·`거절`·`실패`를 완료 단계 사이의 animation으로 축약하지 않는다. 출동이 없는 업무에는 해당 단계를 강제로 부여하지 않는다.
- **기관별 card:** 기관마다 요청 범위·현재 상태·확인 시각·다음 행동을 분리한다. 일부 기관의 접수만 확인되었을 때 전체 완료 표시를 하지 않는다.
- **동의 세부:** 수신처·목적·항목은 승인 전에 읽을 수 있어야 한다. 부가 설명은 Disclosure에 배치할 수 있으나 승인 범위 자체를 숨기지 않는다.
- **재개·남은 일:** 중단을 외부 요청 취소로 표현하지 않는다. 재개 시 기존 결과와 중단 위치를 먼저 제시하고, 입력이 유효한 범위에서 계속한다.
- **Voice·motion:** text 상태와 수동 control을 유지한다. Motion 축소 설정, focus 순서, touch target, 명도 대비와 상태 announcement는 실제 target에서 확인한다. Particle·spotlight·glow·bento 배치를 novelty 때문에 추가하지 않는다.

이 판단은 design 적합성의 검토다. Pleos target의 허용 UI 범위·주행 중 제한·접근성·기관 연계 동작에 대한 인증이나 적합성 판정은 아니다. 실제 target과 mode를 정한 뒤 크기·interaction·motion을 검증하며, 일반 Android 기본값이나 다른 driving system의 수치를 Pleos token으로 간주하지 않는다.

UI code·prototype·dependency 설치는 수행하지 않았다. 기존 board와 flow는 변경하지 않았다.
