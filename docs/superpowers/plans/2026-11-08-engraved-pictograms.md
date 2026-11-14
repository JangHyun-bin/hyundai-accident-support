# 금속 각인 Pictogram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 차량 화면 안의 pictogram을 승인된 D · 금속 각인 glyph set으로 교체한다. 범위는 web의 세 scenario 전체와 Compose의 SC05다.

**Architecture:**
- Glyph 형태와 tone별 표식, 재질 값은 `specs/emergency-experience/glyphs.json` 한 file에 둔다.
- Web은 이 file을 import해 inline SVG와 SVG filter로 그린다. Compose는 같은 file을 assets로 읽어 `android.graphics.Path` boolean 연산과 Canvas로 그린다.
- 대비는 두 platform 모두 render된 pixel로 측정하는 test가 gate다.

**Tech Stack:** React 19 + TypeScript + Vite, Playwright(`channel: 'chrome'`), Kotlin + Compose(BOM 2025.10.01, minSdk 28), `org.json`.

**Spec:** [`docs/superpowers/specs/2026-11-08-engraved-pictograms-design.md`](../specs/2026-11-08-engraved-pictograms-design.md)
- 승인 시안: [`mockup-v2.html`](../specs/2026-11-08-engraved-pictograms/mockup-v2.html)
- 형태의 출발점: 시안의 `<symbol>` 정의(`car` · `person` · `phone` · `route` · `heart` · `handoff`, 표식 `k-*`)

## Global Constraints

- Glyph 본체는 모든 tone에서 같은 금속이다.
  - `confirmed` 표식만 mint, `attention` 표식만 warning이다.
  - 큰 label 색 규칙은 그대로다. Attention의 `부상 있음`은 `--warning`이다.
- 새 tone을 만들지 않는다. Tone은 `neutral` · `unknown` · `confirmed` · `attention` 네 가지다.
  - `neutral`은 빈 ring이다. 시안의 `…` 표식은 쓰지 않는다.
- Glyph는 각 scenario의 `presentation.visible_facts`에 있는 사실에만 만든다. `road` · `mobility` · `response`는 만들지 않는다.
- Motion은 없다. 빛은 위에서 오는 방향으로 고정한다.
- Icon grid는 48이다. `glyphs.json` 좌표는 `0 0 48 48` 기준이며, 시안의 100 unit 좌표에 ×0.48을 곱한 값이다.
- Icon은 `기존 flat` / `C · Satin` 전환이나 Satin render 실패와 무관하게 같다.
- Compose icon 렌더는 `RuntimeShader`를 쓰지 않는다(minSdk 28).
- **대비**: 각인 면과 주변 plate, 표식 기호와 원판은 render된 pixel 기준으로 3:1 이상이다.
  - 가장자리 anti-aliasing 1 px만 제외하고, 그림자 띠는 포함한다.
  - 가독성이 시안보다 우선한다.
- 검토 UI의 icon은 바꾸지 않는다. Web의 `lucide-react` dependency는 남는다.
  - 차량 화면 header의 음성 button(`Volume2` · `VolumeX`)도 spec 비목표에 따라 그대로 둔다.
- 작업 branch는 `design/sc05-refine`이다.
- Commit message는 영어로 쓴다.
- Push · merge는 하지 않는다.

## Review Focus

1. **표면 전환과 Satin 실패**: `기존 flat` ↔ `C · Satin`, WebGL 불가 상황에서 glyph와 표식의 크기·색이 같아야 한다.
   - Task 2에서 `emergency-satin.spec.ts`의 snapshot 대상에 `[data-glyph], [data-mark]`를 추가한다.
2. **Attention 장면(SC01 initial)**: 사람 glyph는 금속이고, 표식은 warning 삼각형, label은 warning 색이다.
   - Task 2 `attention_cue_keeps_warning_label_with_metal_glyph`.
3. **좁은 viewport(375 px)로 축소된 canvas**: filter의 그림자·lip이 svg 밖으로 잘리지 않고, glyph가 plate 안에 남는다.
   - Task 2 `scaled_canvas_keeps_glyph_inside_plate`.
4. **흑백**: 네 tone이 색 없이 모양으로 구별된다.
   - Task 1 `tone_marks_differ_without_color`, Task 5 흑백 evidence.
5. **Compose font scale 2.0**: 48 dp plate로 커진 사실 줄에서 값 문구가 잘리지 않는다.
   - Task 5에서 font scale 2.0으로 전체 suite를 실행하고 evidence를 남긴다.

---

### Task 1: Glyph 정본 `glyphs.json`

**Files:**
- Create: `specs/emergency-experience/glyphs.json`
- Create: `prototype/web/tests/glyphs-data.spec.ts`
- Commit with: spec·시안·이 plan(`docs/superpowers/specs/2026-11-08-engraved-pictograms*`, `docs/superpowers/plans/2026-11-08-engraved-pictograms.md`)

**Interfaces:**
- Produces: `glyphs.json` with this shape. Later tasks의 renderer는 이 shape만 안다.

```jsonc
{
  "grid": 48,
  // part 는 순서대로 누적한다. add 는 합치고, cut 은 그때까지 그린 모양에서 뺀다.
  // paint: "fill"(기본) | "stroke" | "fill+stroke". stroke 는 round cap · round join 이다.
  "glyphs": {
    "vehicle": [{ "d": "…", "rule": "evenodd" }],
    "handoff": [{ "d": "<back person>" }, { "d": "<front person>", "op": "cut", "paint": "fill+stroke", "width": 4.8 }, { "d": "<front person>" }]
  },
  "cue":     { "person": "person", "phone": "phone", "vehicle": "vehicle" },
  "facts":   { "driver": "person", "route": "route", "injury": "heart-pulse", "consciousness": "person", "arrival": "vehicle", "handoff": "handoff" },
  "actions": { "request_help": "phone", "respond": "check", "default": "route" },
  "marks": {
    "confirmed": { "shape": "disc", "face": ["#DDF7EA", "#A6D9C2"], "edge": "#2B3033", "symbol": "mark-check", "ink": "#172A24" },
    "unknown":   { "shape": "disc", "face": ["#2B3033", "#2B3033"], "edge": "#5D6467", "symbol": "mark-question", "ink": "#E6EAEB" },
    "neutral":   { "shape": "disc", "face": ["#2B3033", "#2B3033"], "edge": "#5D6467", "symbol": "mark-ring", "ink": "#E6EAEB" },
    "attention": { "shape": "mark-triangle", "face": ["#F8D4C2", "#E3A388"], "edge": "#2B3033", "symbol": "mark-exclaim", "ink": "#3A2218" }
  },
  "material": {
    "plate": { "angle": 165, "stops": [["#4C5255", 0], ["#363B3E", 0.36], ["#2B3033", 0.6], ["#3D4346", 1]] },
    "face":  { "deep": [["#9AA2A5", 0], ["#C9CFD1", 0.6], ["#E9ECEC", 1]], "shallow": [["#B9C0C3", 0], ["#E2E6E7", 0.55], ["#F6F7F7", 1]] }
  },
  // grid unit. inner = glyph 안쪽 위 그림자, lip = glyph 아래 바깥 밝은 선, top = glyph 위 바깥 어두운 선.
  "depth": {
    "deep":    { "inner": { "dy": 1.44, "blur": 0.77, "opacity": 0.9 }, "lip": { "dy": 0.58, "opacity": 0.32 }, "top": { "dy": -0.48, "opacity": 0.6 } },
    "shallow": { "inner": { "dy": 1.54, "blur": 0.77, "opacity": 0.55 }, "lip": { "dy": 1.44, "opacity": 0.38 } }
  }
}
```

- [ ] **Step 1: Write the failing test** `prototype/web/tests/glyphs-data.spec.ts`. Page가 필요 없는 data test이며, `glyphs.json`과 `scenarios.json`을 import한다.
  - `every_visible_fact_cue_action_and_tone_has_a_glyph`
    - 모든 scenario의 `presentation.visible_facts` id가 `facts`에 있다.
    - 모든 state의 `cue.symbol`이 `cue`에 있다.
    - 모든 action id는 `actions`에 있거나 `default`로 처리된다.
    - `request_statuses`의 모든 tone과 cue status가 `marks`에 있다.
    - 위에서 참조된 glyph 이름과 각 mark의 `symbol` · `shape`(disc 제외)가 모두 `glyphs`에 있다.
  - `no_glyph_for_hidden_facts`: `facts`에 `road` · `mobility` · `response` key가 없다.
  - `tone_marks_differ_without_color`: 네 mark의 `symbol`이 서로 다르다. `attention`만 `shape`가 disc가 아니다.
  - `parts_are_well_formed`
    - 모든 part의 `op` ∈ {undefined, `add`, `cut`}, `paint` ∈ {undefined, `fill`, `stroke`, `fill+stroke`}이다.
    - Stroke가 들어간 part에는 `width > 0`이 있다.
    - 첫 part는 `cut`이 아니다.
    - `d`의 모든 좌표 숫자가 [0, 48] 안에 있다. Arc의 rotation · flag는 검사에서 뺀다.
- [ ] **Step 2: Run it to verify it fails.**
  - Run: `cd prototype/web && npx playwright test tests/glyphs-data.spec.ts`
  - Expected: FAIL. `glyphs.json`을 import할 수 없다.
- [ ] **Step 3: Write `specs/emergency-experience/glyphs.json`.** 위 shape를 따르고 시안의 형태를 옮긴다.
  - Scratchpad의 일회용 script(commit하지 않음)로 시안의 100 unit `d`를 ×0.48 한다. 절대 명령 M · H · V · L · C · S · A · Z만 쓰며, A의 rotation과 flag는 그대로 둔다.
  - `<circle>`은 반원 arc 두 개의 `d`로 바꾼다.
  - Glyph별 매핑:
    - `vehicle`: `car`, evenodd.
    - `person`: `person`.
    - `phone`: `phone`.
    - `route`
      - 시작 ring은 evenodd이고, 도착 pin은 hole이 있는 evenodd다.
      - 굽은 길은 `paint: "stroke"`, `width: 3.6`.
    - `heart-pulse`: 하트를 add한 뒤, 맥박 polyline을 `op: "cut"`, `paint: "stroke"`, `width: 2.64`로 뺀다.
    - `handoff`: 위 예시대로. Front person을 fill+stroke 4.8로 cut한 뒤 다시 add한다.
    - `check`: 굵은 check. Stroke width 4.3.
    - `arrow-right`: 시안 button의 화살표. Stroke width 4.3.
    - 표식 `mark-check` · `mark-question` · `mark-exclaim`: 시안 `k-*`를 ×2(24 → 48 box) 한 것.
    - `mark-ring`: 중심 (24, 24), r 8, stroke 3.
    - `mark-triangle`: 시안 `k-warn` 삼각형 ×2.
  - `material.face.deep[0]`는 사용자 결정대로 `#9AA2A5`에서 시작한다. Task 3이 이 값과 `depth.deep.inner.opacity`를 조정한다.
- [ ] **Step 4: Run it to verify it passes.**
  - Run: `cd prototype/web && npx playwright test tests/glyphs-data.spec.ts`
  - Expected: 4 passed
- [ ] **Step 5: Commit**

```bash
git add specs/emergency-experience/glyphs.json prototype/web/tests/glyphs-data.spec.ts docs/superpowers/specs/2026-11-08-engraved-pictograms-design.md docs/superpowers/specs/2026-11-08-engraved-pictograms docs/superpowers/plans/2026-11-08-engraved-pictograms.md
git commit -m "design: define engraved pictogram glyphs as shared data"
```

---

### Task 2: Web renderer와 차량 화면 교체

**Files:**
- Create: `prototype/web/src/emergency/glyphs.tsx`
- Modify: `prototype/web/src/emergency/EmergencyStudy.tsx` (`symbols`, `factSymbols`, `StatusMark`, cue, facts, action button, request 부분)
- Modify: `prototype/web/src/emergency/emergency.css` (`.emergency-symbol`, `.emergency-symbol-state`, `.emergency-fact`, `.emergency-request-icon`)
- Create: `prototype/web/tests/emergency-glyphs.spec.ts`
- Modify: `prototype/web/tests/emergency-satin.spec.ts:16` (snapshot selector)

**Interfaces:**
- Consumes: Task 1 `glyphs.json`
- Produces (Task 3 · 5가 사용):
  - `GlyphDefs(): JSX.Element`
    - `.emergency-screen` 안에 한 번 둔다.
    - Filter `glyph-deep` · `glyph-shallow`와 face gradient를 정의한다. 값은 `glyphs.json`의 `depth` · `material`에서 읽는다.
  - `Glyph({ name, depth, size }: { name: string; depth: 'deep' | 'shallow' | 'solid'; size: number })`
    - `<svg data-glyph={name} viewBox="0 0 48 48" overflow="visible" aria-hidden>`를 그린다.
    - `solid`는 `currentColor` 단색이고 filter가 없다.
    - Part 누적 규칙:
      - Cut이 나오면, 그때까지의 element를 `<g mask>`로 감싼다. Mask는 흰 rect에 cut 모양을 검게 그린 것이다.
      - `paint`가 stroke이면 `fill="none"`, `stroke-width={width}`, round cap · join으로 그린다.
  - `StatusMark({ tone, size }: { tone: string; size: number })`
    - `<svg data-mark={tone}>`를 그린다.
    - Disc면 r 22 원, 아니면 `shape` glyph를 그린다. Face는 vertical gradient, edge는 1 unit 선이다.
    - 그 위에 `symbol`을 `ink` 색으로 그린다. Filter는 없다.
  - CSS class `metal-plate`: 시안 `.pd .plate`의 background · box-shadow 그대로.
- 배치(시안 크기를 product 수치에 맞춤):
  - **Cue**
    - `.emergency-symbol`은 268 px `metal-plate`, radius 56이다. `--cue-color` tint와 border는 뺀다.
    - `Glyph depth="deep" size={174}`.
    - Badge `.emergency-symbol-state`는 100 px 금속 원판이다. 시안 `.badge`의 background · shadow를 쓰고, 그 안에 `StatusMark size={68}`.
  - **사실 줄**: 48 px `metal-plate`(radius 14) 안에 `Glyph depth="shallow" size={34}`. Grid column은 36 px에서 48 px로. 값 앞의 표식은 `StatusMark size={23}`.
  - **요청 footer**: `StatusMark size={30}`.
  - **주 행동**: `Glyph depth="solid" size={30}` + `Glyph name="arrow-right" depth="solid" size={28}`. 색은 `--primary-foreground`.

- [ ] **Step 1: Write the failing tests** `prototype/web/tests/emergency-glyphs.spec.ts`. `manifest`와 `glyphs.json`을 import하고 모든 scenario × state를 돈다.
  - `vehicle_screen_draws_mapped_glyphs_and_marks`
    - `.emergency-screen svg.lucide:not(.emergency-voice-button svg)` 수가 0이다.
    - Cue `[data-glyph]`가 `glyphs.cue[scene.cue.symbol]`이고, cue `[data-mark]`가 `scene.cue.status`다.
    - 각 `[data-fact=id] [data-glyph]`가 `glyphs.facts[id]`다.
    - 각 `[data-request]`의 `[data-mark]`가 그 요소의 `tone-*` class와 같다.
    - 각 `.emergency-primary-action [data-glyph]`의 첫 값이 `glyphs.actions[id] ?? glyphs.actions.default`다.
  - `attention_cue_keeps_warning_label_with_metal_glyph`
    - `?scenario=SC01&scene=initial`.
    - Cue `h2` color가 `rgb(240, 181, 156)`이고, `[data-mark="attention"]`가 보인다.
    - Cue `[data-glyph]` 안의 path fill이 `url(#…)` gradient다. Warning 단색이 아니다.
  - `scaled_canvas_keeps_glyph_inside_plate`
    - Viewport 375×900, `?study=emergency&scenario=SC05`.
    - Cue `[data-glyph]`의 bounding box가 `.emergency-symbol` box 안에 있다.
    - `document.documentElement.scrollWidth <= innerWidth`.
- [ ] **Step 2: Run to verify they fail.**
  - Run: `cd prototype/web && npx playwright test tests/emergency-glyphs.spec.ts`
  - Expected: FAIL. `svg.lucide`가 남아 있고 `[data-glyph]`가 없다.
- [ ] **Step 3: Implement `glyphs.tsx`, then replace the vehicle-screen icons** in `EmergencyStudy.tsx` and `emergency.css` per the Interfaces block.
  - 검토 UI의 Lucide import(`TriangleAlert` · `CircleHelp` 등 scenario nav, `Pause` · `Play` · `Maximize2` · `Minimize2` · `Code2` · `Volume2` · `VolumeX`)는 그대로 둔다.
  - 쓰지 않게 된 import(`CarFront` · `UserRound` · `Phone` · `Route` · `HeartPulse` · `Handshake` · `Check` · `CheckCircle2` · `Circle` · `ArrowRight`)를 지운다. Nav가 쓰면 남긴다.
  - `.emergency-cue.tone-*`의 `--cue-color`는 label(`h2`) 색에만 계속 쓴다.
- [ ] **Step 4: Add the surface-invariance check.**
  - `emergency-satin.spec.ts:16`의 selector에 `, [data-glyph], [data-mark]`를 추가한다.
- [ ] **Step 5: Run to verify they pass.**
  - Run: `cd prototype/web && npm run check && npx playwright test`
  - Expected: 전체 통과. 새 test 3개와 satin snapshot이 표면 전환 뒤에도 같다.
- [ ] **Step 6: Commit**

```bash
git add prototype/web/src/emergency prototype/web/tests
git commit -m "feat(web): render engraved pictograms on the vehicle screen"
```

---

### Task 3: Web 대비 gate와 값 조정

**Files:**
- Modify: `prototype/web/tests/emergency-glyphs.spec.ts` (test 추가)
- Modify: `prototype/web/src/emergency/emergency.css` (측정 mode)
- Modify: `specs/emergency-experience/glyphs.json` (`material.face.deep`, `depth.deep.inner.opacity`)
- Create: `prototype/web/evidence/emergency-glyphs/contrast-check.json`

**Interfaces:**
- Consumes: Task 2 `[data-glyph]` · `[data-mark]` · `.metal-plate`
- Produces: 측정 mode `.emergency-screen[data-measure]`. Task 5 문서가 측정 방법을 인용한다.

측정 algorithm은 test와 정의를 맞춰야 하므로 여기서 정한다.

```text
A = element.screenshot()                       // 평소 render
B = element.screenshot() with [data-measure]   // glyph·표식 기호 = #fff, filter 없음 · plate·원판 = #000, shadow 없음
decode A·B in page (Image → canvas → getImageData)
face  = B 에서 R ≥ 250 이고 8 이웃도 모두 ≥ 250 인 pixel   (1 px anti-aliasing 제외; 그림자 띠는 포함)
plate = B 에서 R ≤ 5 이고 8 이웃도 모두 ≤ 5, face 로부터 Chebyshev 거리 ≤ 6 px 인 pixel
L = WCAG relative luminance of A
face 평균 L > plate 평균 L 이면 ratio = (min L(face) + .05) / (max L(plate) + .05)
아니면                           ratio = (min L(plate) + .05) / (max L(face) + .05)
```

- [ ] **Step 1: Write the failing test** `engraved_glyphs_and_marks_reach_3_to_1`.
  - 대상: SC05 initial의 cue plate(`.emergency-symbol`, badge 제외), `[data-fact="arrival"]` plate, cue badge 안 `[data-mark]`, SC01 initial의 cue · badge(attention), SC05 received의 요청 `[data-mark="confirmed"]`.
  - 각 ratio가 `>= 3`이다.
  - `RECORD_EVIDENCE=1`이면 대상별 ratio, `face_min_rgb`, `plate_max_rgb`, 측정 정의를 `prototype/web/evidence/emergency-glyphs/contrast-check.json`에 쓴다. 기존 `emergency-satin/contrast-check.json`처럼 `note`도 넣는다.
- [ ] **Step 2: Run to verify it fails.**
  - Run: `cd prototype/web && npx playwright test tests/emergency-glyphs.spec.ts -g 3_to_1`
  - Expected: FAIL. Cue plate ratio가 3 미만이다(spec 측정 약 1.1:1).
- [ ] **Step 3: Tune `glyphs.json`.**
  - `depth.deep.inner.opacity`를 0.05씩 낮추고, 필요하면 `material.face.deep[0]`을 밝힌다. 통과하는 첫 값에서 멈춘다.
  - `shallow`와 표식은 바꾸지 않는다. Spec 측정상 이미 통과하며, 실패하면 같은 방식으로 조정하고 ledger에 기록한다.
- [ ] **Step 4: Run to verify it passes and record.**
  - Run: `cd prototype/web && RECORD_EVIDENCE=1 npx playwright test tests/emergency-glyphs.spec.ts && npx playwright test`
  - Expected: 전체 통과. `contrast-check.json`이 생기고 모든 ratio ≥ 3이다.
- [ ] **Step 5: Commit**

```bash
git add prototype/web specs/emergency-experience/glyphs.json
git commit -m "test(web): gate engraved pictogram contrast at 3:1 and tune depth"
```

---

### Task 4: Compose renderer와 SC05 교체

**Files:**
- Create: `prototype/android/app/src/main/java/com/example/accidentpoc/Glyphs.kt`
- Modify: `prototype/android/app/src/main/java/com/example/accidentpoc/MainActivity.kt` (`Cue` 212–228, `ActionArea` 244–247 · 263 · 269, `RequestStatus` 284, `symbols` · `factSymbols` · `StatusMark` · `lucide` · `LucideIcon` 380–410 삭제)
- Create: `prototype/android/app/src/androidTest/java/com/example/accidentpoc/GlyphsTest.kt`
- Modify: `prototype/android/app/src/androidTest/java/com/example/accidentpoc/Sc05Test.kt` (test 추가)
- Delete: `prototype/android/third-party/lucide/`

**Interfaces:**
- Consumes: Task 3에서 조정된 `glyphs.json`(assets의 `glyphs.json`, 기존 `sourceSets` 설정으로 포함됨)
- Produces:
  - `internal class GlyphBook(...)`, `internal fun loadGlyphs(context: Context): GlyphBook`
    - `GlyphBook.path(name: String): android.graphics.Path`: 48 unit 좌표이며 part를 누적한 결과다.
      - Stroke는 `Paint.getFillPath`로 바꾼다. Paint는 STROKE 모드, round cap · join이다.
      - `add`는 `Path.Op.UNION`, `cut`은 `Path.Op.DIFFERENCE`이다.
      - `rule: evenodd`는 `FillType.EVEN_ODD`이다.
    - `GlyphBook.cue(symbol)`, `.fact(id)`, `.action(id)`, `.mark(tone)`: 이름과 mark spec을 돌려준다.
  - `val LocalGlyphs = staticCompositionLocalOf<GlyphBook>`: `Storyboard`에서 한 번 load해 제공한다.
  - Composable:
    - `EngravedGlyph(name: String, depth: Depth, size: Dp, measure: Boolean = false)`
    - `SolidGlyph(name: String, tint: Color, size: Dp)`
    - `StatusMark(tone: String, size: Dp, measure: Boolean = false)`
    - `Modifier.metalPlate(shape: Shape, measure: Boolean = false)`
    - `enum class Depth { Deep, Shallow }`
  - 각 glyph에는 `Modifier.testTag("glyph-$name")`, 표식에는 `testTag("mark-$tone")`를 단다.
  - 그리기(`drawWithCache`, glyph를 size에 맞게 scale):
    1. `top`: glyph를 dy만큼 옮긴 것에서 glyph를 뺀 모양을 검게.
    2. `lip`: dy만큼 옮긴 것에서 glyph를 뺀 모양을 희게.
    3. Face: `Brush.verticalGradient`(glyph bounds 기준).
    4. `inner`: glyph로 `clipPath`한 뒤, 큰 rect에서 dy만큼 옮긴 glyph를 뺀 모양을 `BlurMaskFilter(blur, NORMAL)`로 검게.
    - Blur 반경은 SVG `stdDeviation`과 맞추기 위해 `blur × 2` px 환산을 시작값으로 한다. Contrast test가 최종 판정이다.
    - `measure = true`면 glyph·기호는 흰색, plate·원판은 검은색이고 효과는 없다.
  - Plate: 165° linear gradient + 2 px 간격의 결 선(alpha .035 / .04) + 윗면 1 px 밝은 선, 아랫면 1 px 어두운 선 + 아래 그림자.
- 배치는 Task 2와 같은 수치를 dp로 쓴다.
  - Cue plate 268 / glyph 174 / badge 100 / mark 68
  - 사실 plate 48 / glyph 34 / 값 표식 23
  - 요청 표식 30
  - Action 30 + arrow 28, `Ui.primaryForeground`
  - Cue tile의 `color` tint · border는 빼고, label 색 규칙은 그대로 둔다.

- [ ] **Step 1: Write the failing tests.**
  - `GlyphsTest.kt`(`InstrumentationRegistry` context로 `loadGlyphs`):
    - `everyMappedGlyphBuildsANonEmptyPath`: `vehicle` · `person` · `phone` · `route` · `heart-pulse` · `handoff` · `check` · `arrow-right`와 네 mark symbol이 모두 `!path.isEmpty`이다.
    - `heartPulseCutLeavesAGap`
      - `Region().setPath(path, Region(0, 0, 48, 48))`로 판정하되 정수 판정을 위해 ×10 scale한다.
      - 맥박선 위의 점, 시안 (50, 64) ×0.48은 포함되지 않는다.
      - 하트 위쪽 볼록한 곳, 시안 (30, 35) ×0.48은 포함된다.
    - `handoffKeepsAChannelBetweenPeople`: 시안 (55, 33) ×0.48 = (26.4, 15.84)는 포함되지 않는다. 이 점은 뒷사람 머리 안에 있지만 앞사람 둘레 channel에 걸린다. 앞사람 머리 중심인 시안 (38, 38) ×0.48은 포함된다.
    - `cueGlyphReaches3To1`
      - `createAndroidComposeRule<ComponentActivity>`로 268 dp `metalPlate` + `EngravedGlyph("vehicle", Deep, 174.dp)`를 `measure` false와 true로 각각 `captureToImage()` 한다.
      - Task 3과 같은 algorithm으로 ratio ≥ 3이다.
  - `Sc05Test.kt`에 추가: `sc05DrawsMappedGlyphsAndMarks`.
    - 세 장면에서 cue 영역에 `glyph-vehicle`과 `mark-<cueStatus>`가 있다.
    - `fact-arrival` 안에 `glyph-vehicle`, `fact-handoff` 안에 `glyph-handoff`가 있다(`useUnmergedTree = true`).
    - 각 `request-*` 안의 `mark-*`가 그 상태의 tone이다.
- [ ] **Step 2: Run to verify they fail.**
  - Run: `cd prototype/android && export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ANDROID_SERIAL=emulator-5554 ./gradlew connectedDebugAndroidTest`
  - Expected: compile FAIL. `loadGlyphs`와 `EngravedGlyph`가 정의되지 않았다.
- [ ] **Step 3: Implement `Glyphs.kt` and swap the call sites** in `MainActivity.kt` per the Interfaces block.
  - `lucide` · `LucideIcon` · `symbols` · `factSymbols`와 쓰지 않게 된 import(`Icon` · `ImageVector` · `addPathNodes` · `StrokeCap` · `StrokeJoin` · `SolidColor`)를 지운다.
  - `third-party/lucide/`를 삭제한다.
- [ ] **Step 4: Run to verify they pass.**
  - Run: same command.
  - Expected: 기존 16개 + 새 5개 = 21 tests, 0 failures.
  - `cueGlyphReaches3To1`이 실패하면 Compose 쪽 blur 환산만 조정한다. `glyphs.json` 값을 바꾸면 Task 3 web test도 다시 돌린다.
- [ ] **Step 5: Commit**

```bash
git add prototype/android
git commit -m "feat(android): draw engraved pictograms from shared glyph data"
```

---

### Task 5: Evidence와 문서

**Files:**
- Create: `prototype/web/evidence/emergency-glyphs/<SC>-<scene>.png` (9장), `SC01-initial-grayscale.png`
- Replace: `prototype/android/evidence/sc05/*.jpg` (9장)
- Modify: `prototype/android/README.md` (Icon 출처 문장 42행, 검사 수 50 · 65행, 구성 설명)
- Modify: `docs/reviews/cult-design-poc.md` (section 추가)
- Modify: `specs/emergency-experience/visual-language.md` (측정 기록 한 줄, 56행 근처)

**Interfaces:**
- Consumes: Task 3 `contrast-check.json`과 측정 정의, Task 4 test 수

- [ ] **Step 1: Capture web evidence.**
  - Scratchpad의 일회용 Playwright script(`channel: 'chrome'`, viewport 1600×1050)로 9개 장면의 `.emergency-screen`을 `?material=satin`에서 찍는다.
  - SC01 initial은 `.emergency-screen`에 CSS `filter: grayscale(1)`를 넣은 것도 한 장 찍는다.
  - Expected: 10개 PNG. 흑백 image에서 주의 삼각형과 원판 표식이 모양으로 구별된다(눈으로 확인하고 ledger에 기록).
- [ ] **Step 2: Capture Compose evidence and run the suite at font scale 2.0.**
  - 촬영 절차는 장면마다 `adb shell am start -S -n com.example.accidentpoc/.MainActivity --es scene <id>`, `sleep 3`, `screencap` 순이다. 처음 뜨는 "Viewing full screen" dialog는 닫는다. JPEG q88, 폭 1440.
  - Font scale 1.0 · 1.3 · 2.0으로 `adb shell settings put system font_scale <v>`를 바꿔 가며 9장을 다시 찍는다.
  - Font scale 2.0 상태에서 `./gradlew connectedDebugAndroidTest`를 실행한 뒤 1.0으로 되돌린다.
  - Expected: 21 tests, 0 failures. 2.0 image에서 사실 값 문구가 잘리지 않는다.
  - 다시 확인할 수 있도록 마지막에 `installDebug`로 app을 다시 설치한다. Connected test가 app을 제거하기 때문이다.
- [ ] **Step 3: Update docs.**
  - `prototype/android/README.md`
    - Icon 문장을 "`specs/emergency-experience/glyphs.json`의 각인 glyph"로 바꾼다.
    - 검사 수를 21개로 바꾸고, glyph 관련 검사 항목 두 줄을 추가한다.
    - Lucide license 언급을 삭제한다.
  - `docs/reviews/cult-design-poc.md`에 "금속 각인 pictogram (2026-11-08)" section을 추가한다.
    - 범위, 측정 정의, `contrast-check.json`의 ratio, evidence link, 남은 한계(실차 시인성 미검증)를 쓴다.
  - `visual-language.md` 56행 다음에 pictogram 대비 측정 기록 한 줄과 link를 추가한다. 기존 Satin 문장과 같은 형식이다.
- [ ] **Step 4: Final check.**
  - Run: `cd prototype/web && npm run check && npx playwright test`
  - Expected: 전체 통과.
- [ ] **Step 5: Commit**

```bash
git add prototype/web/evidence/emergency-glyphs prototype/android/evidence prototype/android/README.md docs/reviews/cult-design-poc.md specs/emergency-experience/visual-language.md
git commit -m "docs: record engraved pictogram evidence and contrast"
```
