package com.example.accidentpoc

import android.content.Intent
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.compose.ui.text.TextLayoutResult
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

// SC05 manifest 의 불변 조건: 조회는 재전송이 아니고, 기관별 상태는 독립이며, 접수 확인이 도착·인계를 뜻하지 않는다.
class Sc05Test {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    private fun request(id: String, status: String) = rule.onNodeWithTag("request-$id").assert(hasText(status, substring = true))
    private fun fact(id: String, value: String) = rule.onNodeWithTag("fact-$id").assert(hasText(value, substring = true))

    @Test fun initialSceneShowsEachAgencySeparately() {
        rule.onNodeWithText("차량 지원 접수를 확인하세요").assertIsDisplayed()
        request("rescue", "접수 확인")
        request("vehicle", "접수 미확인")
        request("insurance", "요청 전")
        fact("arrival", "미확인")
        fact("handoff", "미확인")
    }

    @Test fun checkingIsNotAResendAndKeepsOtherAgencies() {
        rule.onNodeWithText("요청 상태 확인").performClick()
        rule.onNodeWithText("접수 결과를 확인하고 있어요").assertIsDisplayed()
        request("vehicle", "접수 확인 중")
        request("rescue", "접수 확인")
        request("insurance", "요청 전")
        rule.onNodeWithText("요청 상태 확인").assertDoesNotExist()
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
        request("insurance", "요청 전")
        fact("arrival", "미확인")
        fact("handoff", "미확인")
    }

    @Test fun sceneSurvivesActivityRecreation() {
        rule.onNodeWithText("요청 상태 확인").performClick()
        rule.activityRule.scenario.recreate()
        rule.onNodeWithText("접수 결과를 확인하고 있어요").assertIsDisplayed()
        request("vehicle", "접수 확인 중")
    }

    // 한국어 문구가 낱말 중간("확/인")에서 줄바꿈되지 않아야 한다.
    @Test fun koreanTextWrapsOnlyBetweenWords() {
        val nodes = rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsActions.GetTextLayoutResult), useUnmergedTree = true).fetchSemanticsNodes()
        nodes.forEach { node ->
            val layouts = mutableListOf<TextLayoutResult>()
            node.config[SemanticsActions.GetTextLayoutResult].action?.invoke(layouts)
            val layout = layouts.first()
            val text = layout.layoutInput.text.text
            for (line in 0 until layout.lineCount - 1) {
                val end = layout.getLineEnd(line)
                assertTrue("mid-word break in \"$text\" at $end", text[end - 1] == ' ' || text.getOrNull(end) == ' ')
            }
        }
    }

    @Test fun surfaceToggleKeepsSceneAndRequests() {
        rule.onNodeWithText("요청 상태 확인").performClick()
        rule.onNodeWithTag("surface-flat").performClick()
        rule.onNodeWithText("접수 결과를 확인하고 있어요").assertIsDisplayed()
        request("vehicle", "접수 확인 중")
        rule.onNodeWithTag("surface-satin").performClick()
        rule.onNodeWithTag("surface-status").assert(hasText("Satin 적용", substring = true))
        request("rescue", "접수 확인")
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
