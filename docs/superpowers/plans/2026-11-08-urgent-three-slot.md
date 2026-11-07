# 긴급 화면 세 칸 구조 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `?study=emergency` 차량 화면을 ① 감지 / ② 차량 / ③ 나 세 칸으로 다시 짜고, 응답이 없으면 구호만 자동 연결하는 countdown과 3초 보기 평가 도구를 넣는다.

**Architecture:** 장면 정본인 `scenarios.json`에 `phase`, `auto_contact`, `self_action`, `actions[].slot`, `presentation.detected`, `safety_guidance`를 더한다. `EmergencyStudy.tsx`가 이 값으로 세 칸과 countdown을 그리고, 색은 `data-phase`와 `[data-urgent]` 묶음으로 정한다. Compose는 기존 배치를 유지하고 test의 기대 문구만 고친다.

**Tech Stack:** React 19 + Vite + TypeScript, Playwright 1.64(`page.clock`), Node `node:test`, Kotlin Compose(기대 문구만)

**Spec:** `docs/superpowers/specs/2026-11-08-urgent-three-slot-design.md`

## Global Constraints

- 1440 × 810 canvas, Asta Sans, 한국어 문구. `scenarios.json`이 장면·문구·상태의 정본이다.
- 빨강 `#FF453A`는 구호 countdown 장면의 `[data-urgent]` 묶음 안에만 쓴다. 호박 `#FFB340`은 `phase: progress`의 표시에만 쓴다.
- Countdown은 10초(`auto_contact.seconds`), `지금 연결`·`취소` 두 button, 다른 곳 click은 취소가 아니다.
- 자동 연결은 구호(`rescue`)만. 연결이 시작된 뒤 `not_sent`로 돌아가는 전이는 없다.
- 화면에 `의식 없음` 문구를 쓰지 않는다. 깜빡임·반복 motion을 쓰지 않는다. 초록 "완료" 화면을 두지 않는다.
- ③의 `now`는 3 어절 이하다. `condition`은 지우지 않는다.
- 시연 표시 `가상 scenario · 실제 전화·전송 없음` 옆에 `안전 안내 시안 · 승인 전`을 둔다.
- 날짜가 박힌 과거 문서 section은 고치지 않는다. Commit message는 영어로 쓰고 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.

## Review Focus

1. **장면 전환 직전의 오래된 timer**: 9.5초에 `지금 연결`을 누르면, 이전 장면의 countdown이 새 장면을 `unanswered`로 넘기면 안 된다. Task 3 `stale_timer_does_not_fire_after_scene_change`.
2. **Page 첫 load에서의 자동 음성**: 기본 장면(SC01 initial)이 countdown이라 음성이 바로 재생된다. 수동 `음성 안내 듣기`와 상태가 꼬이면 안 되고, 막히면 원고가 보여야 한다. Task 3 `countdown_start_speaks_once_and_blocked_speech_shows_script`.
3. **일시 중단과 3초 보기의 countdown 정지**: 멈춘 동안 줄지 않고, 풀면 남은 시간부터 이어진다. Task 3 `pause_freezes_and_reentry_restarts_countdown`, Task 4 `three_second_view_hides_review_ui_and_covers_after_3s`.
4. **흑백·색각**: 빨강이 없어도 countdown 장면이 숫자·ring·문구로 구별된다. Task 4 흑백 evidence와 ledger 기록.
5. **375 px 축소**: countdown ring·두 button·기관 줄이 canvas 밖으로 넘치지 않는다. Task 2 `scaled_canvas_keeps_three_slots_inside`.

---

### Task 1: 장면 data와 spec 규칙

**Files:**
- Modify: `specs/emergency-experience/scenarios.json`, `specs/emergency-experience/glyphs.json`(`actions`에 `connect`·`reconnect` → `phone`)
- Modify: `specs/emergency-experience/{principles,visual-language,acceptance}.md`
- Test: `specs/emergency-experience/manifest.test.mjs`

**Interfaces:**
- Produces (장면 field):
  - `phase: 'decide' | 'progress' | 'settled'` (모든 장면)
  - `auto_contact?: { seconds: number, cancel: string, expire: string }`. 연결은 `actions[0]`.
  - `self_action?: { condition?: string, now: string, next?: string }`
  - `actions[].slot?: 'car' | 'self'` (기본 `car`)
- Produces (scenario·manifest field):
  - `presentation.detected: string`
  - manifest의 `safety_guidance: { status: string, source: string, urls: string[] }`
  - `presentation.visible_requests`: 세 기관 모두

- [ ] **Step 1: Write the failing manifest tests**

`manifest.test.mjs`에 더한다.
- `auto_contact_only_where_rescue_is_not_sent_and_only_rescue_changes`
  - `auto_contact`가 있는 장면: rescue 상태 `not_sent`, `seconds > 0`, `cancel`·`expire` 장면 존재, `actions[0]` 존재.
  - `expire` 장면의 rescue는 `connection_unknown`, `cancel` 장면의 rescue는 `not_sent`.
  - `vehicle`·`insurance` 상태는 세 장면에서 같다.
- `decide_phase_means_countdown`
  - `phase ∈ {decide, progress, settled}`.
  - `phase === 'decide'`와 `auto_contact` 존재는 서로 같다.
- `connecting_rescue_never_returns_to_not_sent`: rescue가 `connection_unknown | connected | checking | unknown | received`인 장면의 action·event·`auto_contact` 대상 중 rescue가 `not_sent`인 것이 없다.
- `self_action_now_is_three_words_or_fewer`: `now.trim().split(/\s+/).length <= 3`.
- `scene_copy_never_says_unconscious`: `title`, `instruction`, `cue.label`, `self_action.*`, action label에 `의식 없음`이 없다.
- `every_scenario_shows_three_agencies_and_detected_label`: `visible_requests`가 `['rescue','vehicle','insurance']`이고 `detected`가 비어 있지 않다.

기존 test는 이렇게 바꾼다.
- `response and connection…`: `unanswered.actions`에 `slot === 'self'`이고 `to === 'contact_unknown'`인 action이 있다. 나머지 단언은 그대로다.
- `all storyboard transitions…`: `auto_contact.cancel`·`expire`도 전이 대상으로 확인한다.

- [ ] **Step 2: Run to verify RED**

Run: `node --test specs/emergency-experience/manifest.test.mjs`
Expected: 새 test가 `phase`·`auto_contact` 없음으로 FAIL.

- [ ] **Step 3: Rewrite scenes in `scenarios.json`**

설계 문서의 「Scenario별 흐름」 표와 「구현 전 결정」을 그대로 옮긴다. 장면 목록:
- **SC01**: `initial`(decide), `cancelled`, `auto_contact`, `contact_unknown`, `connected`
  - SC01의 cue는 모든 장면에서 `person/attention`이다. 자동 연결 장면의 label만 `부상 있음 · 응답 없음`이다.
- **SC03**: `initial`(decide), `unanswered`, `contact_unknown`, `responded`
  - `응답 재확인` event는 지운다.
- **SC05**: `initial`, `checking`, `received`
  - ID·event는 유지하고 `title`만 바꾼다: `차량 지원 접수 미확인` / `차량 지원 접수 확인 중` / `차량 지원 접수 확인`.

공통 규칙:
- Countdown 장면은 `actions: [{ id: 'connect', label: '지금 연결', to: … }]`, `events: [{ id: 'no_response', label: '응답 없음 (즉시)', to: <expire> }]`를 갖는다.
- 취소 장면은 `actions: [{ id: 'reconnect', label: '다시 연결', to: 'contact_unknown' }]`를 갖는다.
- `voice`는 countdown 장면에서 `응답이 없으면 10초 후 119에 연결합니다.`로 시작한다.
- `detected`: SC01·SC03은 `충돌 감지`, SC05는 `차량 지원`이다.
- `safety_guidance.source`: `한국도로공사 2차 사고 예방 행동요령(비트박스)`. `urls`에 설계 문서의 두 link를 넣는다.

- [ ] **Step 4: Update spec 규칙 문서**

설계 문서 「바뀌는 spec 규칙」 표의 일곱 줄을 반영한다. 각 변경에 `(2026-11-08 사용자 결정)`을 붙인다.
- `visual-language.md`
  - 「화면 역할」은 세 칸으로 다시 쓴다.
  - 「Motion·음성·입력」의 TransitionPanel 160 ms 문장은 "사실 chip도 즉시 교체한다"로 바꾼다.
  - 색 규칙 표(결정 필요 / 진행 중 / 대기·확인됨)를 더한다.
- `acceptance.md`: 「자동 검사」를 새 규칙으로 고친다. 「사용자 이해도 평가」에 `3초 보기` 사용을 한 줄 더한다.

- [ ] **Step 5: Verify GREEN**

Run: `node --test specs/emergency-experience/manifest.test.mjs && cd prototype/web && npx playwright test tests/glyphs-data.spec.ts`
Expected: 모두 PASS.

- [ ] **Step 6: Commit** — `git add specs/emergency-experience && git commit -m "design: rewrite emergency scenes for three slots and rescue countdown"`

### Task 2: 세 칸 화면과 긴박도 색

**Files:**
- Modify: `prototype/web/src/emergency/EmergencyStudy.tsx`, `prototype/web/src/emergency/emergency.css`, `prototype/web/src/emergency/satin.css`(사라진 class 정리만)
- Create: `prototype/web/tests/emergency-urgent.spec.ts`
- Modify tests: `emergency.spec.ts`, `emergency-glyphs.spec.ts`, `emergency-satin.spec.ts`(새 문구·selector)

**Interfaces:**
- Consumes: Task 1의 장면 field
- Produces (DOM):
  - `[data-slot="detected" | "car" | "self"]`
  - `.emergency-screen[data-phase]`
  - `[data-urgent]`(decide 장면에만 하나, countdown ring·숫자·`지금 연결`을 감싼다)
  - `[data-countdown]`(숫자, `aria-hidden`)
  - ②의 제목 `h1`. `aria-live="polite"`는 제목·보조 줄을 감싼 요소에 둔다.
- 유지하는 selector: `.emergency-symbol`(84 px plate, glyph 56)과 `.emergency-symbol-state`(mark 30), `[data-fact]`와 `.emergency-fact-plate`, `[data-request]`와 `[data-mark]`, `.emergency-primary-action`

- [ ] **Step 1: Write failing tests in `emergency-urgent.spec.ts`**
  - `every_scene_has_three_slots_and_three_agencies`: 모든 장면에서 세 `[data-slot]`이 보인다. `[data-slot="car"] h1`이 `scene.title`이다. `[data-request]` 3개. `self_action`이 있으면 `[data-slot="self"]`에 `now`가 있다.
  - `red_appears_only_inside_the_rescue_decision`
    - 모든 장면에서 계산된 `color`·`background-color`·`border-color`·`fill`·`stroke`가 `rgb(255, 69, 58)`인 요소는 모두 `[data-urgent]` 안에 있다.
    - `[data-urgent]`는 `phase === 'decide'`이면 1개, 아니면 0개다.
  - `screen_never_says_unconscious`: 모든 장면에서 `.emergency-screen`의 innerText에 `의식 없음`이 없다.
  - `scaled_canvas_keeps_three_slots_inside`: 375 × 900 SC03 initial에서 세 slot·`[data-urgent]`·`취소` button의 box가 `.emergency-screen` box 안에 있다. Page에 가로 scroll이 없다.
- [ ] **Step 2: Run to verify RED** — `cd prototype/web && npx playwright test tests/emergency-urgent.spec.ts` → FAIL(`[data-slot]` 없음)
- [ ] **Step 3: Implement**
  - 차량 화면 배치: grid 행 `84px 150px 1fr 170px`(header / ① / ② / ③), 좌우 padding 96.
  - ①: `.emergency-symbol` plate, `${detected} · ${cue.label}`, `visible_facts` chip(작은 plate + label + mark).
  - ②
    - `phase`별 ring: decide는 빨강 countdown ring, progress는 호박 정적 arc, settled는 없음.
    - 제목과 `instruction` 한 줄. Decide 장면의 보조 줄은 `응답이 없으면 {seconds}초 후 자동 연결`이다.
    - Button: `slot !== 'self'` action. Decide 장면이면 `취소`도 둔다.
    - 그 아래에 기관 줄: `[data-request]` 3개와 `연결 · 접수 · 도착은 별도 확인`.
  - ③: `condition`(작게) + `now`(50 px 굵게) + `→ next`(작게), 또는 `slot === 'self'` action button.
  - 주 button 색: decide는 빨강 배경에 흰 글자, 그 외는 `#E6EAEB` 배경에 `#0A0C0D` 글자.
  - `FactsPanel`·`TransitionPanel` 사용을 지운다. `cue.detail`은 화면에서 뺀다(spec 보기에는 남는다).
  - Countdown 숫자는 이 task에서 `seconds` 고정값을 보여 준다. 줄어드는 동작은 Task 3에서 넣는다.
- [ ] **Step 4: Update existing tests** to new copy and flow. 장면 이름·제목은 Task 1 data를 따른다. Glyph·contrast test의 selector는 유지한 class라서 바뀌지 않아야 한다. 바뀌면 ledger에 Ruling을 남긴다.
- [ ] **Step 5: Verify GREEN** — `npm run check && npx playwright test` → 전체 PASS. Contrast test가 3:1 미만이면 glyph 크기가 아니라 측정 target 크기를 확인한다(평소 render에서 face pixel이 20개 이하인지).
- [ ] **Step 6: Commit** — `feat(web): lay out the emergency screen as detected, car and self slots`

### Task 3: 구호 countdown

**Files:**
- Modify: `prototype/web/src/emergency/EmergencyStudy.tsx`(+ 필요하면 `useCountdown` 같은 hook을 같은 file 안에)
- Test: `prototype/web/tests/emergency-urgent.spec.ts`, `emergency.spec.ts`(음성 test는 countdown 없는 SC05로 옮긴다)

**Interfaces:**
- Consumes: Task 2의 `[data-countdown]`, `[data-urgent]`, Task 1의 `auto_contact`
- Produces
  - countdown은 장면 진입과 `restartCountdown()` 호출 때 `seconds`로 시작한다.
  - `paused || frozen`이면 멈춘다.
  - 0이 되면 `goToScene(expire)`로 간다. 이 이동은 focus를 옮기지 않는다.

- [ ] **Step 1: Write failing tests** (모두 `await page.clock.install()` 후 `page.goto`)
  - `countdown_expires_into_auto_rescue_and_keeps_unknowns`
    - SC03 initial, `[data-countdown]`=`10`, `runFor(10_000)`.
    - 제목 `119 연결 중`, `응답이 없어 자동으로 연결했어요`, rescue `연결 미확인`, vehicle·insurance `요청 전`, injury·consciousness `미확인`.
  - `connect_now_and_cancel_paths`
    - `지금 연결`을 누르면 `119 연결 중`이 된다.
    - SC03 initial로 다시 들어가 `취소`를 누르면 `구호 연결 안 함`과 `다시 연결` button이 보이고, rescue는 `요청 전`이다.
    - `runFor(15_000)` 뒤에도 같은 장면이다.
  - `clicking_outside_buttons_does_not_cancel`: `[data-slot="detected"]`를 click하고 `runFor(10_000)`하면 `unanswered`(자동 연결 문구)가 된다.
  - `pause_freezes_and_reentry_restarts_countdown`
    - `runFor(4_000)`이면 `6`. 일시 중단 뒤 `runFor(10_000)`이어도 `6`이고 같은 장면이다.
    - 재개 뒤 `runFor(6_000)`이면 자동 연결 장면이 된다.
    - 장면 목록에서 initial을 다시 고르면 `10`이다.
  - `stale_timer_does_not_fire_after_scene_change`: `runFor(9_500)`, `지금 연결`, `runFor(2_000)`. 제목은 `119 연결 중`이고 자동 연결 문구는 없다.
  - `late_response_after_auto_connect_keeps_rescue_connecting`: 만료 뒤 `응답할 수 있어요`를 누르면 ① `응답 확인`, ② `119 연결 중`, rescue `연결 미확인`이고 `취소`·`연결 끊기` 같은 button이 없다.
  - `countdown_start_speaks_once_and_blocked_speech_shows_script`
    - speechSynthesis mock: SC03 initial에서 `speak` 1회, text가 `10초 후 119에 연결`을 포함한다.
    - `speak`가 throw하는 mock: status가 `음성 원고`를 포함한다.
- [ ] **Step 2: Run to verify RED** → countdown이 줄지 않아 FAIL.
- [ ] **Step 3: Implement**
  - 남은 시간은 마감 시각(`Date.now()` 기준)으로 계산한다. Tick 수로 세지 않는다. 250 ms interval로 갱신한다.
  - Effect cleanup으로 장면이 바뀌면 timer를 버린다.
  - 일시 중단 때 남은 ms를 저장하고, 재개 때 마감을 다시 잡는다.
  - 시작 때 기존 `playVoice` 경로로 `scene.voice`를 한 번 읽는다.
  - 경고음은 WebAudio 880 Hz 짧은 tone 3회다. `AudioContext`가 `running`이 아니면 조용히 넘어간다. 차단은 음성 error 경로가 표시한다.
  - Ring은 `stroke-dashoffset` 1 s linear transition이다. `prefers-reduced-motion`이면 transition이 없다.
- [ ] **Step 4: Verify GREEN** — `npm run check && npx playwright test` → 전체 PASS.
- [ ] **Step 5: Commit** — `feat(web): count down to an automatic rescue connection`

### Task 4: 3초 보기, 표시, evidence, Compose 문구

**Files:**
- Modify: `prototype/web/src/emergency/EmergencyStudy.tsx`, `emergency.css`
- Test: `prototype/web/tests/emergency-urgent.spec.ts`
- Modify: `prototype/android/app/src/androidTest/java/com/example/accidentpoc/Sc05Test.kt`(기대 문구만)
- Create: `prototype/web/evidence/emergency-urgent/*.png`(12개 장면 + `SC03-initial-grayscale.png`)
- Modify: `docs/reviews/cult-design-poc.md`(새 section), `prototype/web/README.md`(emergency 설명이 있으면)

- [ ] **Step 1: Write failing tests**
  - `three_second_view_hides_review_ui_and_covers_after_3s`
    - Clock 사용. SC03 initial에서 `runFor(4_000)` 뒤 `3초 보기`를 누른다.
    - 장면 선택 nav와 시나리오 nav가 숨겨지고, canvas가 보이며 countdown은 `10`이다.
    - `runFor(3_000)`이면 `다시 3초`·`닫기`가 보이고 canvas는 가려진다.
    - `runFor(20_000)` 뒤 `닫기`를 누르면 장면은 여전히 initial이고 countdown은 `7`이다.
  - `review_header_marks_safety_copy_as_draft`: `안전 안내 시안 · 승인 전`이 보인다. Spec 보기에 `비트박스`가 있다.
  - `footer_counts_scenes_from_data`: footer가 `3 scenarios / 12 scenes`다.
- [ ] **Step 2: RED** → FAIL.
- [ ] **Step 3: Implement**
  - 발표 mode: `.emergency-study.is-presenting`에서 viewport 밖 요소를 숨긴다. Viewport는 `position: fixed; inset: 0` 검은 배경이다.
  - Cover는 viewport 안 overlay다. `frozen` state가 countdown을 멈춘다.
  - Footer 수는 manifest에서 센다. 시연 표시에 `안전 안내 시안 · 승인 전`을 더한다. Spec 보기에 `safety_guidance`를 보여 준다.
- [ ] **Step 4: GREEN** — `npm run check && npx playwright test` → 전체 PASS.
- [ ] **Step 5: Compose 문구**
  - `Sc05Test.kt`의 기대 제목을 바꾼다: `차량 지원 접수를 확인하세요` → `차량 지원 접수 미확인`, `접수 결과를 확인하고 있어요` → `차량 지원 접수 확인 중`, `차량 지원이 접수됐어요` → `차량 지원 접수 확인`.
  - 사라진 보조 문구 단언은 새 data에 맞춘다.
  - Run: `cd prototype/android && JAVA_HOME=… ANDROID_HOME=… ANDROID_SERIAL=emulator-5554 ./gradlew connectedDebugAndroidTest`. Expected: 21 tests, 0 failures. 그 뒤 `installDebug`를 실행한다.
- [ ] **Step 6: Evidence와 문서**
  - Scratchpad의 일회용 Playwright script로 `?study=emergency`의 12개 장면을 찍는다. Countdown 장면은 clock을 멈추고 `10`일 때 찍는다.
  - SC03 initial은 `filter: grayscale(1)`로도 한 장 찍는다. 흑백에서 countdown 장면이 숫자·ring·문구로 구별되는지 눈으로 보고 ledger에 남긴다.
  - `cult-design-poc.md`에 「긴급 화면 세 칸 구조 (2026-11-08)」 section을 더한다. 내용은 범위, 사용자 결정, 제 판단(연결 뒤 정지 불가 등), evidence link, 남은 한계(3초 평가 미실시, 안전 문구 승인 전, Compose 배치 미갱신)다.
- [ ] **Step 7: Commit** — `feat(web): add a 3-second view and record urgent screen evidence`
