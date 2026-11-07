package com.example.accidentpoc

import android.content.Intent
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.text.TextLayoutResult
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

// SC05 manifest 의 불변 조건: 조회는 재전송이 아니고, 기관별 상태는 독립이며, 접수 확인이 도착·인계를 뜻하지 않는다.
class Sc05Test {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    // 정확히 일치해야 한다. "접수 확인" 이 "접수 확인 중" 에 맞으면 다른 기관 상태가 바뀐 bug 를 놓친다.
    private fun request(id: String, status: String) = rule.onNodeWithTag("request-$id").assert(hasText(status))
    private fun fact(id: String, value: String) = rule.onNodeWithTag("fact-$id").assert(hasText(value))

    @Test fun initialSceneShowsEachAgencySeparately() {
        rule.onNodeWithText("차량 지원 접수를 확인하세요").assertIsDisplayed()
        request("rescue", "접수 확인")
        request("vehicle", "접수 미확인")
        request("insurance", "요청 전")
        fact("arrival", "미확인")
        fact("handoff", "미확인")
    }

    // 사용자가 뺀 문구는 빈 Text 로도 남지 않아야 한다.
    @Test fun removedCopyLeavesNoEmptyText() {
        rule.onNodeWithText("기존 요청의 결과부터 확인해요.").assertDoesNotExist()
        rule.onNodeWithText("접수만으로 안전이 확보되지는 않아요.").assertDoesNotExist()
        rule.onAllNodes(hasText(""), useUnmergedTree = true).assertCountEquals(0)
    }

    @Test fun simulationNoticeIsAlwaysShown() {
        listOf("initial", "checking", "received").forEach { scene ->
            rule.onNodeWithTag("scene-$scene").performClick()
            rule.onNodeWithText("가상 scenario · 실제 전화·전송 없음").assertIsDisplayed()
        }
    }

    @Test fun checkingIsNotAResendAndKeepsOtherAgencies() {
        rule.onNodeWithText("요청 상태 확인").performClick()
        rule.onNodeWithText("접수 결과를 확인하고 있어요").assertIsDisplayed()
        request("vehicle", "접수 확인 중")
        request("rescue", "접수 확인")
        request("insurance", "요청 전")
        rule.onNodeWithText("요청 상태 확인").assertDoesNotExist()
    }

    @Test fun actionMovesFocusToNewTitle() {
        rule.onNodeWithText("요청 상태 확인").performClick()
        rule.onNodeWithText("접수 결과를 확인하고 있어요").assertIsFocused()
    }

    // Keyboard·rotary 사용자를 재현한다. Touch mode 에서는 Android button 이 focus 를 받지 않는다.
    @Test fun eventMovesFocusToCurrentSceneButton() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.setInTouchMode(false)
        try {
            rule.onNodeWithText("요청 상태 확인").performSemanticsAction(SemanticsActions.OnClick)
            rule.onNodeWithTag("event-receipt_unknown").performSemanticsAction(SemanticsActions.OnClick)
            rule.onNodeWithTag("scene-initial").assertIsFocused()
        } finally {
            instrumentation.setInTouchMode(true)
        }
    }

    @Test fun unknownResultReturnsToUnconfirmedScene() {
        rule.onNodeWithText("요청 상태 확인").performClick()
        rule.onNodeWithTag("event-receipt_unknown").performClick()
        rule.onNodeWithText("차량 지원 접수를 확인하세요").assertIsDisplayed()
        request("vehicle", "접수 미확인")
    }

    @Test fun receiptDoesNotConfirmArrivalOrHandoff() {
        rule.onNodeWithTag("event-receipt_received").performClick()
        rule.onNodeWithText("차량 지원이 접수됐어요").assertIsDisplayed()
        request("vehicle", "접수 확인")
        request("rescue", "접수 확인")
        request("insurance", "요청 전")
        fact("arrival", "미확인")
        fact("handoff", "미확인")
        rule.onNodeWithText("다른 장면을 선택해 비교할 수 있어요.").assertIsDisplayed()
    }

    @Test fun sceneAndSurfaceSurviveActivityRecreation() {
        rule.onNodeWithText("요청 상태 확인").performClick()
        rule.onNodeWithTag("surface-flat").performClick()
        rule.activityRule.scenario.recreate()
        rule.onNodeWithText("접수 결과를 확인하고 있어요").assertIsDisplayed()
        request("vehicle", "접수 확인 중")
        rule.onNodeWithTag("surface-status").assert(hasText("기존 flat"))
    }

    // 한국어 문구가 낱말 중간("확/인")에서 줄바꿈되지 않아야 한다. 세 장면 모두 확인한다.
    @Test fun koreanTextWrapsOnlyBetweenWords() {
        listOf("initial", "checking", "received").forEach { scene ->
            rule.onNodeWithTag("scene-$scene").performClick()
            rule.waitForIdle()
            val nodes = rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsActions.GetTextLayoutResult), useUnmergedTree = true).fetchSemanticsNodes()
            nodes.forEach { node ->
                val layouts = mutableListOf<TextLayoutResult>()
                node.config[SemanticsActions.GetTextLayoutResult].action?.invoke(layouts)
                val layout = layouts.first()
                val text = layout.layoutInput.text.text
                for (line in 0 until layout.lineCount - 1) {
                    val end = layout.getLineEnd(line)
                    assertTrue("$scene: mid-word break in \"$text\" at $end", text[end - 1] == ' ' || text.getOrNull(end) == ' ')
                }
            }
        }
    }

    @Test fun surfaceToggleKeepsSceneAndRequests() {
        rule.onNodeWithText("요청 상태 확인").performClick()
        rule.onNodeWithTag("surface-flat").performClick()
        rule.onNodeWithText("접수 결과를 확인하고 있어요").assertIsDisplayed()
        request("vehicle", "접수 확인 중")
        rule.onNodeWithTag("surface-satin").performClick()
        rule.onNodeWithTag("surface-status").assert(hasText("Satin 적용 · 강도 70%"))
        request("rescue", "접수 확인")
    }

    // 각 장면의 cue·사실·요청이 glyphs.json 의 mapping 과 tone 대로 그려진다.
    @Test fun sc05DrawsMappedGlyphsAndMarks() {
        val tones = mapOf("접수 확인" to "confirmed", "접수 미확인" to "unknown", "접수 확인 중" to "unknown", "요청 전" to "neutral")
        fun inside(parent: String, tag: String) = rule.onNode(hasTestTag(tag) and hasAnyAncestor(hasTestTag(parent)), useUnmergedTree = true).assertExists()
        mapOf("initial" to "unknown", "checking" to "unknown", "received" to "confirmed").forEach { (scene, cueTone) ->
            rule.onNodeWithTag("scene-$scene").performClick()
            inside("cue", "glyph-vehicle")
            inside("cue", "mark-$cueTone")
            inside("fact-arrival", "glyph-vehicle")
            inside("fact-handoff", "glyph-handoff")
            listOf("rescue", "vehicle", "insurance").forEach { id ->
                val status = tones.keys.sortedByDescending { it.length }.first { label -> rule.onNodeWithTag("request-$id").fetchSemanticsNode().config.toString().contains(label) }
                inside("request-$id", "mark-${tones.getValue(status)}")
            }
        }
    }
}

// Web 의 ?scene= 과 같은 시작 장면 지정. 잘못된 값은 초기 장면으로 돌아간다.
class Sc05LaunchTest {
    @get:Rule val rule = createEmptyComposeRule()

    private fun launch(scene: String) = ActivityScenario.launch<MainActivity>(
        Intent(InstrumentationRegistry.getInstrumentation().targetContext, MainActivity::class.java).putExtra("scene", scene)
    )

    @Test fun validSceneExtraOpensThatScene() {
        launch("received").use { rule.onNodeWithText("차량 지원이 접수됐어요").assertIsDisplayed() }
    }

    @Test fun invalidSceneExtraFallsBackToInitial() {
        launch("bogus").use { rule.onNodeWithText("차량 지원 접수를 확인하세요").assertIsDisplayed() }
    }
}

class SatinShaderTest {
    @Test fun satinShaderCompiles() = assertTrue(satinCompiles(SATIN))

    // Compile 실패를 crash 대신 기본 background 로 처리하기 위한 판정.
    @Test fun brokenShaderIsReportedUnavailable() = assertFalse(satinCompiles("half4 main(float2 c){return nope;}"))
}

class ScenarioLoadTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    // Native 는 fact_overrides 를 적용하지 않으므로 그런 scenario 를 조용히 잘못 보여주지 않고 멈춘다.
    @Test fun scenarioWithFactOverridesFailsFast() {
        assertThrows(IllegalArgumentException::class.java) { loadScenario(context, "SC03") }
    }
}
