# Cult UI Design PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 Cult UI source를 사용하는 두 가지 첫 화면을 localhost에서 비교하고, 선택한 화면의 상태 전환을 검증한 뒤 Kotlin + Compose의 한 화면으로 재현한다.

**Architecture:** `prototype/web/`에 독립적인 React prototype을 구축한다. 두 화면은 동일한 가상 상황과 문구를 사용하며, 선택된 안에만 후속 상태를 추가한다. 최종 app은 Kotlin + Compose로 구현하고 web 결과물의 화면 명세·문구·fixture를 재사용한다.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS 4, Cult UI source, Motion Primitives TransitionPanel, Playwright. Native 검증에는 기존 `prototype/android/`의 Kotlin + Compose 환경을 사용한다.

**Spec:** [기존 design 방향](../../research/design-direction.md), [통합 flow 검수본 v1.2](../../reviews/flow-review-v1.2.md), 2026-11-05 사용자의 “실제 Cult UI로 design 검증 후 Compose” 선택. 아래 범위는 기존 문서의 web component 참고 방식을 실제 source 사용으로 구체화한다. 과거 문서와 원본 flow는 보존한다.

## Global Constraints

- 최종 app의 구현 방식은 Kotlin + Compose다. WebView 배포나 React Native 전환은 이 계획에 포함하지 않는다.
- 첫 비교는 **두 구조 × 하나의 사고 상황**이다. 선택된 구조에만 세 가지 상태와 상세 확인 interaction을 구현한다.
- `project.json`, `archive/`, 기존 검수본을 변경하지 않는다. 기존 Compose PoC의 세 단계 구성을 제품 절차의 정본으로 사용하지 않는다.
- 실제 전화·전송·차량 신호 수신은 수행하지 않는다. 가상 상황 선택과 `시연용 가상 정보` 표시는 app 화면 바깥의 review 영역에 둔다.
- D01–D05의 미결정 정책을 design으로 확정하지 않는다. 응답 없음은 의식 없음이 아니며, 전송됨은 접수 확인이 아니다.
- Cult UI source와 license, 원본 hash, project의 변경 내역을 함께 기록한다. 선택한 component와 필요한 dependency만 추가한다.
- 구현 branch는 `prototype/cult-design-poc`로 분리한다. 계획 반영 이후의 현재 branch HEAD에서 시작하고 현재 native PoC의 이력을 보존한다.

## Review Focus

1. 부상·고속도로·차량 이동 가능의 동시 성립: 상태를 각각 표시하고 차량 이동 가능만으로 운전을 지시하지 않는다. Task 1.
2. 두 구조 사이 전환: 동일한 상황과 문구를 유지하며 비교 과정에서 요청 상태를 초기화하지 않는다. Task 1.
3. 일부 접수·미확인: 기관별 상태를 구분하며 전체 완료 표시나 자동 재전송을 생성하지 않는다. Task 2.
4. 상세 열기·닫기와 빠른 연속 입력: 우선 안내를 가리지 않고 focus와 요청 상태를 보존한다. Task 2.
5. 긴 한국어 문구·확대·reduced motion: 주요 행동이 잘리지 않고 움직임 없이도 모든 상태를 이해할 수 있다. Tasks 2–3.

## 첫 산출물과 비교 기준

첫 산출물은 실제 browser에서 작동하는 하나의 review page다. 구조 선택 control과 가상 상황 control은 app 화면 밖에 배치한다. 기본 비교 canvas는 **1440 × 810 CSS px**이며 project의 검토용 크기다. 실제 Pleos 화면 크기나 dp로 주장하지 않는다. 작은 browser에서는 전체 축소 보기와 원래 크기 보기를 제공한다.

| 안 | 화면 구성 | 비교할 경험 |
| --- | --- | --- |
| `focus` · 행동 중심 | 가장 중요한 안내와 주 행동을 큰 surface에 배치하고, 사람·차량·기관 상태를 짧은 고정 영역에 표시한다. | 다음 행동을 빠르게 찾으면서 현재 상태를 놓치지 않는가? |
| `context` · 상황 중심 | 사람·차량·도로 상태를 일정한 위치에 두고, 옆의 넓은 영역에서 현재 안내와 행동을 갱신한다. | 여러 상황이 겹쳐도 우선순위와 진행 상태를 이해하는가? |

두 안은 동일한 문구·상태·색 의미를 사용한다. 첫 시각 제안은 graphite 계열 배경, Asta Sans, 깊이 차이가 드러나는 surface, 한 곳에 집중된 강조색이다. Cult의 surface 표현과 interaction을 활용하고 주요 안내의 가독성을 함께 검토한다. 초기 비교에서 light/dark와 여러 palette를 동시에 늘리지 않는다.

첫 화면에서 볼 항목은 안내의 위계, 한국어 줄바꿈, 여백, 상태의 구분, 주요 행동의 발견 가능성이다. 사용자가 실제 두 화면을 본 뒤 하나를 선택하거나 결합할 요소를 지정한다. 두 안 모두 만족스럽지 않으면 이 화면에서 방향을 다시 정한다. 후속 상태와 native 구현은 방향 선택 뒤 진행한다.

## Component 적용 범위

| Source | 실제 적용 | 조정 기준 |
| --- | --- | --- |
| [Cult Halo Card](https://www.cult-ui.com/docs/components/halo-card) | 핵심 안내 surface와 주요 행동 | Font·크기·색은 project token으로 조정한다. 장식이 상태나 안내보다 강하게 보이지 않는지 검토한다. |
| [Cult Halo Badge](https://www.cult-ui.com/docs/components/halo-badge) | 기관별 요청 상태 | Text와 색을 함께 사용한다. Pulse를 접수 성공의 근거로 사용하지 않는다. |
| [Cult Side Panel](https://www.cult-ui.com/docs/components/side-panel) | 수신처·전송 항목 또는 기관별 상세 확인 | 명시적인 열기·닫기와 keyboard 조작을 제공한다. 원래 안내 영역을 유지한다. |
| [Motion Primitives TransitionPanel](https://github.com/ibelick/motion-primitives/blob/main/components/core/transition-panel.tsx) | 사용자의 행동 또는 가상 상태 변경에 따른 안내 전환 | 최초 project 값은 200 ms, opacity와 최대 8 CSS px의 이동이다. Reduced motion에서는 이동 없이 즉시 전환한다. |

Motion 값은 조정 가능한 project 제안이다. 긴급 안내 문구는 장식 animation 완료를 기다리지 않고 표시한다. 첫 화면에서는 Halo Card·Halo Badge·TransitionPanel을 사용하고 Side Panel은 선택된 안을 확장할 때 추가한다. Family Drawer는 같은 상세 열기 역할을 중복 구현하므로 첫 PoC에서 제외한다.

2026-11-05 공식 registry JSON을 조회하였다. Halo Card는 `@base-ui/react`·`motion`, Halo Badge는 `class-variance-authority`·`motion` 및 shadcn `badge`, Side Panel은 `motion`·`react-use-measure`를 참조한다. 구현 시 source를 다시 확인하고 실제 설치 version을 lockfile에 고정한다. Registry는 `https://www.cult-ui.com/r/{name}.json`이다.

## 선택 후 확장할 상태

| Fixture ID | 가상 사실과 표시 | 검토 근거 |
| --- | --- | --- |
| `urgent` | 고속도로·부상·차량 이동 가능. 운전자 조작 가능과 이동 경로는 미확인. 안전·구호 안내를 우선하고 이동 지시는 보류한다. | SC01, I2, S1, G4, D01 |
| `partial` | 구호 요청은 접수 확인, 차량 지원은 전송됨, 보험은 전송 전. 기관별 상태를 유지한다. | I3, I7, I8, S8, F08 |
| `unconfirmed` | 차량 지원의 접수 결과는 미확인. 다른 기관의 확인된 상태는 유지한다. 상세를 닫아도 미확인 상태를 보존한다. | E6, F06, D03 |

세 fixture는 각각 독립된 시연 장면이다. `urgent`에서 시간 경과로 `partial`로 자동 진행하지 않는다. Fixture 전환은 review control에서 명시적으로 수행한다. 상세에는 가상 수신처·목적·전송 항목을 표시하고, `전송 시연`은 local 상태를 `전송됨`으로만 변경한다. `접수 확인`은 별도 가상 회신을 선택한 경우에만 표시한다. `보류`와 상세 닫기는 외부 요청의 취소로 처리하지 않는다.

## File 역할

| 경로 | 역할 |
| --- | --- |
| `prototype/web/package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `components.json` | 최소 Vite 실행·build·alias와 registry 설정 |
| `prototype/web/src/main.tsx`, `App.tsx` | Review control, 선택한 화면, local 시연 상태 |
| `prototype/web/src/cases.ts` | 세 fixture, 공통 문구, source node 참조 |
| `prototype/web/src/FocusView.tsx`, `ContextView.tsx` | 첫 화면의 두 구조. 선택하지 않은 안은 최초 비교본으로 보존 |
| `prototype/web/src/components/ui/`, `src/lib/utils.ts` | Cult·Motion Primitives source와 필요한 shadcn helper |
| `prototype/web/src/styles.css`, `public/fonts/` | Project token과 기존 Asta Sans의 web 사용본 |
| `prototype/web/playwright.config.ts`, `tests/review.spec.ts` | 상태·focus·접근성·layout의 최소 browser 검증 |
| `prototype/web/README.md`, `SOURCES.md`, `third-party/` | 실행 방법, source hash, license, project 변경 기록 |
| `docs/reviews/cult-design-poc.md`, `prototype/web/evidence/` | 비교 화면·motion 기록, 선택 근거, native 이전 명세 |
| `prototype/android/app/src/main/java/com/example/accidentpoc/MainActivity.kt` | 선택한 화면 한 개의 Compose 재현 |

## Task 1 · 두 가지 첫 화면

**Interface:** `Variant = 'focus' | 'context'`, `CaseId = 'urgent' | 'partial' | 'unconfirmed'`. `cases.ts`에서 공통 `DesignCase`와 `cases: Record<CaseId, DesignCase>`를 export한다. `DesignCase`에는 `title`, `guidance`, `primaryActionLabel`, `context: {label, value}[]`, `requests: {id, label, status}[]`, `sourceNodes: string[]`를 둔다. 두 view는 동일한 `caseData: DesignCase`를 받는다. 이 단계의 화면에는 `urgent`만 노출한다.

- [ ] 현재 작업 상태를 확인하고 새 branch를 생성한다. 최소 React·TypeScript·Tailwind 환경과 `dev`, `check`, `test:ui` script를 추가한다. `check`는 typecheck와 production build를 수행한다.
- [ ] 공식 source를 읽은 뒤 Halo Card·Halo Badge·TransitionPanel을 가져온다. License·URL·수신 원본 SHA-256·변경 내역을 `SOURCES.md`에 기록한다. Asta Sans와 OFL은 기존 `prototype/android/`의 asset을 재사용한다.
- [ ] Browser test `same_urgent_case_in_both_variants`를 작성한다. 두 view에서 부상·고속도로·차량 이동 가능·조작 가능 미확인을 확인하고, 같은 주 행동 문구를 요구한다. 이동을 지시하는 CTA가 없어야 한다. 초기 실패를 확인한다.
- [ ] 공통 fixture와 두 view를 구현한다. 동작하는 상세 열기 대신, 첫 단계에서는 안내의 보조 내용 펼치기에 TransitionPanel을 적용하여 실제 motion을 비교한다. Primary CTA는 `도움 요청 안내 보기`로 통일한다. 해당 문구는 검토용 제안으로 기록한다.
- [ ] `npm run check`와 `npm run test:ui`를 통과시킨다. Browser에서 원래 크기로 두 화면과 전환을 직접 확인하고 screenshot 두 개·짧은 motion 기록·localhost 주소를 제시한다.
- [ ] Source·lockfile·license·검증 기록을 함께 commit한다. 사용자가 고른 구조와 유지할 요소를 `docs/reviews/cult-design-poc.md`에 기록한다. 선택 전에 Task 2로 확장하지 않는다.

## Task 2 · 선택한 화면의 세 상태와 상세 확인

**Interface:** Task 1의 `DesignCase`를 유지한다. 요청 상태는 `'not-sent' | 'sent' | 'received' | 'unknown'`으로 제한한다. 화면 label은 각각 `전송 전`, `전송됨`, `접수 확인`, `접수 미확인`이다. `App.tsx`가 선택된 fixture와 변경 상태를 소유하여 view 전환이나 상세 열기·닫기에서 요청 상태가 유실되지 않게 한다. 새로고침은 fixture 초기 상태로 돌아간다.

- [ ] Browser test `request_states_remain_independent`를 추가하고 실패를 확인한다. `partial`에서 세 기관의 label이 각각 다르며, `unconfirmed`를 열고 닫아도 미확인이 유지되어야 한다. 전송 시연으로 접수 확인이나 전체 완료가 나타나면 실패다.
- [ ] 선택한 view에 세 fixture와 실제 Side Panel source를 연결한다. Fixture 변경은 명시적 초기화이며, 구조 전환은 기존 local 상태를 유지한다. `?view=focus&case=urgent`와 같은 URL은 초기 장면을 재현하며 잘못된 값은 `focus`·`urgent`로 처리한다.
- [ ] 상세의 수신처·목적·항목·전송 시연·보류를 구현한다. Panel을 닫을 때 열기 control로 focus를 돌려준다. Keyboard만으로 열기·이동·닫기가 가능해야 한다. 반복 클릭이 시연 요청을 중복 생성하지 않게 한다.
- [ ] Test `detail_keeps_focus_and_state`와 `reduced_motion_and_long_copy`를 추가한다. 빠른 열기·닫기, keyboard focus 복원, 긴 문구, browser 200% 확대, reduced motion에서 주요 행동의 접근 가능성을 확인한다.
- [ ] `npm run check`·`npm run test:ui`를 통과시킨다. 실제 browser에서 세 상태의 text·contrast·clipping·motion을 확인하고 선정 화면의 기록을 갱신한다. 상태 의미나 새 위험 안내를 animation으로 지연시키지 않는다.
- [ ] 변경을 commit하고 사용자가 확인할 localhost 주소와 세 장면을 제공한다. Design 검토 결과를 기록한다.

## Task 3 · Compose 한 화면의 재현 가능성 검증

**Interface:** `docs/reviews/cult-design-poc.md`에 선정 구조, 역할별 token, 한국어 문구, fixture, motion의 시작·끝 상태, 열기·닫기·뒤로 동작을 기록한다. Web의 component 이름과 CSS 수치는 참조이며 Compose API나 dp 값으로 자동 변환하지 않는다.

- [ ] 선정 화면에서 구현 난도가 높은 조합인 **기관별 상태 유지 + 상세 열기·닫기 + 상태 전환**을 native 검증 대상으로 고정한다. 새 native project를 만들지 않고 기존 Compose PoC를 사용한다.
- [ ] `MainActivity.kt`에서 같은 fixture와 화면을 구현한다. 기존 Asta Sans를 사용하며 가용 영역·density·font scale을 확인하여 크기를 정한다. Web의 blur·spring을 그대로 복제할 수 없는 경우 의미와 가독성을 유지하는 대안을 기록한다.
- [ ] `prototype/android/`에서 `./gradlew assembleDebug`를 실행한다. 전용 `accident-support-poc` emulator에서 접수 미확인 유지, 상세 닫기·Android Back, 큰 font scale, animation 비활성 상태의 표시를 확인한다.
- [ ] Emulator 직접 실행과 실제 동영상으로 web·native를 비교한다. 기존 900 ms screenshot 갱신 page는 motion의 검증 근거로 사용하지 않는다. 차이가 큰 부분을 조정하고 남은 차이를 기록한다.
- [ ] Build 결과·화면·동작 확인 근거와 한계를 commit한다. Native 한 화면의 재현이 확인된 후 전체 Compose E2E 확장 범위를 별도로 정한다.

## 완료 기준과 후속 범위

이 계획의 완료는 선택한 design의 web 시연과 native 한 화면의 재현 근거까지다. Backend·계정·실제 기관 연계·전체 사고 처리 engine·전체 web app은 만들지 않는다. 원본 48개 node를 모두 구현하였다고 주장하지 않는다.

GitHub에는 source·문서·license·lockfile·대표 비교 기록을 저장한다. `node_modules/`, build output, browser trace 같은 임시 산출물은 제외한다. Push 전에 대상 repository의 read-only API와 remote branch를 확인하며, `main` merge는 별도 작업이다.

실제 Pleos 환경의 가용 영역·UX restriction·차량 SDK 및 사고 대응 정책의 적합성은 후속 검증이다. Kotlin + Compose는 사용자가 선택한 project 제약이며, 공모전 규정 원문에서 의무 여부를 확인한 결과로 표현하지 않는다.

## 실행 기록 (2026-11-07)

- Task 1: 완료. [비교 기록](../../reviews/cult-design-poc.md).
- Task 2: [긴급 storyboard](2026-11-05-emergency-storyboard.md)로 대체. Side Panel은 만들지 않았다.
- Task 3: 사용자 승인에 따라 대상을 SC05 세 장면 + C · Satin으로 다시 정했다. 상세 열기·닫기 대신 Android Back과 activity 재생성 후 상태 유지를 확인했다. 결과는 [비교 기록의 Task 3](../../reviews/cult-design-poc.md#task-3--compose-재현-2026-11-07)에 있다.
