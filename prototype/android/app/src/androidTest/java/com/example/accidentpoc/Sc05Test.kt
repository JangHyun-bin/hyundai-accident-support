package com.example.accidentpoc

import android.content.Intent
import android.os.Build
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

// These tests exercise shared SC05 fixtures and real Compose controls, not a separate three-scene storyboard.
class Sc05Test {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()
    private fun click(tag: String) = rule.onNodeWithTag(tag).performScrollTo().performClick()
    private fun request(id: String, status: String) = rule.onNodeWithTag("request-$id").performScrollTo().assert(hasText(status))
    private fun fact(id: String, value: String) = rule.onNodeWithTag("fact-$id").performScrollTo().assert(hasText(value))
    private fun identity(count: Int) = rule.onNodeWithTag("request-identity").performScrollTo().assert(hasText("요청 SC05-$count · 전송 ${count}회"))
    private fun review() {
        click("action-check_status")
        click("event-not_received")
        click("action-review")
    }

    @Test fun initialSceneShowsEachAgencySeparately() {
        rule.onNodeWithTag("scene-title").assert(hasText("차량 지원 접수 미확인"))
        request("rescue", "접수 확인")
        request("vehicle", "접수 미확인")
        request("insurance", "요청 전")
        fact("arrival", "미확인")
        fact("handoff", "미확인")
        identity(1)
    }

    @Test fun removedCopyLeavesNoEmptyText() {
        rule.onNodeWithText("기존 요청의 결과부터 확인해요.").assertDoesNotExist()
        rule.onNodeWithText("접수만으로 안전이 확보되지는 않아요.").assertDoesNotExist()
        rule.onAllNodes(hasText(""), useUnmergedTree = true).assertCountEquals(0)
    }

    @Test fun allElevenSceneControlsAreReachableAndKeepSimulationNotice() {
        val story = loadScenario(rule.activity, "SC05")
        assertEquals(11, story.scenes.size)
        story.scenes.forEach { scene ->
            click("scene-${scene.id}")
            rule.onNodeWithTag("scene-${scene.id}").assertIsDisplayed()
            rule.onNodeWithText("가상 scenario · 실제 전화·전송 없음").assertIsDisplayed()
            identity(1)
        }
    }

    @Test fun checkingUnknownFailureAndResumeNeverResend() {
        click("action-check_status")
        request("vehicle", "접수 확인 중")
        click("event-receipt_unknown")
        request("vehicle", "접수 미확인")
        click("action-check_status")
        click("event-lookup_failed")
        request("vehicle", "접수 미확인")
        click("action-retry")
        click("action-suspend")
        click("action-resume")
        request("vehicle", "접수 확인 중")
        request("rescue", "접수 확인")
        request("insurance", "요청 전")
        identity(1)
    }

    @Test fun actionMovesFocusToNewTitle() {
        click("action-check_status")
        rule.onNodeWithTag("scene-title").assertIsFocused().assert(hasText("차량 지원 접수 확인 중"))
    }

    @Test fun eventMovesFocusToCurrentSceneButton() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.setInTouchMode(false)
        try {
            rule.onNodeWithTag("action-check_status").performSemanticsAction(SemanticsActions.OnClick)
            rule.onNodeWithTag("event-receipt_unknown").performSemanticsAction(SemanticsActions.OnClick)
            rule.onNodeWithTag("scene-initial").assertIsFocused()
        } finally {
            instrumentation.setInTouchMode(true)
        }
    }

    @Test fun suspendedReceiptAndHandoffStaySuspendedUntilResume() {
        click("action-check_status")
        click("action-suspend")
        click("event-received")
        click("event-handoff")
        rule.onNodeWithTag("scene-title").performScrollTo().assert(hasText("여기서 잠시 멈췄어요"))
        rule.onNodeWithTag("resume-status").performScrollTo().assert(hasText("기존 요청 · 접수 확인"))
        request("vehicle", "접수 확인")
        fact("handoff", "인계 확인")
        fact("arrival", "미확인")
        identity(1)
        click("action-resume")
        rule.onNodeWithTag("scene-title").assert(hasText("차량 지원 접수 확인"))
        fact("handoff", "인계 확인")
        identity(1)
    }

    @Test fun receiptAndFactsSurviveNavigationRecreationAndLateUnknown() {
        click("event-receipt_received")
        fact("arrival", "미확인")
        fact("handoff", "미확인")
        click("event-arrived")
        fact("arrival", "도착 확인")
        fact("handoff", "미확인")
        click("event-handoff")
        click("scene-checking")
        click("event-receipt_unknown")
        click("surface-flat")
        rule.activityRule.scenario.recreate()
        request("vehicle", "접수 확인")
        fact("arrival", "도착 확인")
        fact("handoff", "인계 확인")
        identity(1)
        rule.onNodeWithTag("surface-status").performScrollTo().assert(hasText("기존 flat"))
        rule.onNodeWithTag("scene-title").performScrollTo().assert(hasText("차량 지원 접수 확인"))
    }

    @Test fun scopeValidationCancelApprovalAndFailedReapprovalUseRealControls() {
        review()
        click("scope-0")
        click("scope-1")
        rule.onNodeWithTag("action-retry").performScrollTo().assertIsNotEnabled()
        rule.onNodeWithTag("submit-block-reason").performScrollTo().assert(hasText("보낼 항목을 하나 이상 선택하세요."))
        click("scope-2")
        rule.onNodeWithTag("action-retry").performScrollTo().assertIsNotEnabled()
        rule.onNodeWithTag("submit-block-reason").performScrollTo().assert(hasText("보관된 사고 기록이 없어요. 사고 기록을 전송 범위에서 제외하세요."))
        click("scope-2")
        click("scope-0")
        rule.onNodeWithTag("action-retry").performScrollTo().assertIsEnabled()
        click("action-cancel")
        identity(1)
        click("action-review")
        rule.onNodeWithTag("scope-0").assertIsOn()
        rule.onNodeWithTag("scope-1").assertIsOff()
        click("action-retry")
        identity(2)
        click("event-failed")
        request("vehicle", "전송 실패")
        click("action-retry")
        rule.onNodeWithTag("approved-scope").performScrollTo().assert(hasText("마지막 승인 범위 · 사고 위치"))
        click("scope-1")
        rule.onNodeWithTag("approved-scope").performScrollTo().assert(hasText("마지막 승인 범위 · 사고 위치"))
        click("action-retry")
        identity(3)
        click("event-sent")
        click("action-suspend")
        rule.onNodeWithTag("approved-scope").performScrollTo().assert(hasText("마지막 승인 범위 · 사고 위치 · 차량 상태"))
        identity(3)
    }

    @Test fun queuedDuplicateApprovalOnlySubmitsOnce() {
        review()
        val queuedClick = rule.onNodeWithTag("action-retry").performScrollTo().fetchSemanticsNode().config[SemanticsActions.OnClick].action!!
        rule.runOnIdle { queuedClick(); queuedClick() }
        identity(2)
        request("vehicle", "전송됨 · 접수 미확인")
    }

    @Test fun fullSessionScopeApprovalSuspendedResultsAndSurfaceSurviveRecreation() {
        review()
        click("scope-1")
        click("action-retry")
        click("event-failed")
        click("action-retry")
        click("scope-1")
        click("scene-suspended")
        click("event-received")
        click("event-handoff")
        click("surface-flat")
        rule.activityRule.scenario.recreate()
        rule.onNodeWithTag("scene-title").performScrollTo().assert(hasText("여기서 잠시 멈췄어요"))
        request("vehicle", "접수 확인")
        fact("handoff", "인계 확인")
        fact("arrival", "미확인")
        identity(2)
        rule.onNodeWithTag("approved-scope").performScrollTo().assert(hasText("마지막 승인 범위 · 사고 위치"))
        rule.onNodeWithTag("approval-status").performScrollTo().assert(hasText("변경한 범위는 다시 승인해야 해요."))
        rule.onNodeWithTag("surface-status").performScrollTo().assert(hasText("기존 flat"))
        click("action-resume")
        rule.onNodeWithTag("scene-title").assert(hasText("차량 지원 접수 확인"))
        click("scene-review")
        rule.onNodeWithTag("scope-0").assertIsOn()
        rule.onNodeWithTag("scope-1").assertIsOn()
        rule.onNodeWithTag("scope-2").assertIsOff()
        identity(2)
    }

    @Test fun primaryAndSecondaryHaveSeparateBoundsAndBothWork() {
        val primary = rule.onNodeWithTag("action-check_status").getUnclippedBoundsInRoot()
        val secondary = rule.onNodeWithTag("action-suspend").getUnclippedBoundsInRoot()
        assertTrue("Primary and secondary actions overlap", primary.bottom <= secondary.top)
        assertTrue(primary.height >= 64.dp && secondary.height >= 64.dp)
        click("action-check_status")
        request("vehicle", "접수 확인 중")
        click("action-suspend")
        rule.onNodeWithTag("scene-title").performScrollTo().assert(hasText("여기서 잠시 멈췄어요"))
    }

    @Test fun koreanTextWrapsOnlyBetweenWordsAcrossAllScenes() {
        loadScenario(rule.activity, "SC05").scenes.forEach { scene ->
            click("scene-${scene.id}")
            val nodes = rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsActions.GetTextLayoutResult), useUnmergedTree = true).fetchSemanticsNodes()
            nodes.forEach { node ->
                val layouts = mutableListOf<TextLayoutResult>()
                node.config[SemanticsActions.GetTextLayoutResult].action?.invoke(layouts)
                val layout = layouts.first()
                val text = layout.layoutInput.text.text
                for (line in 0 until layout.lineCount - 1) {
                    val end = layout.getLineEnd(line)
                    assertTrue("${scene.id}: mid-word break in \"$text\" at $end", text[end - 1] == ' ' || text.getOrNull(end) == ' ' || text[end - 1] == '\n')
                }
            }
        }
    }

    @Test fun surfaceToggleKeepsSceneAndUsesApiSpecificCapability() {
        click("action-check_status")
        click("surface-flat")
        request("vehicle", "접수 확인 중")
        click("surface-satin")
        val expected = if (Build.VERSION.SDK_INT >= 33) "Satin 적용 · 강도 70%" else "Satin 미지원 · 기본 background"
        rule.onNodeWithTag("surface-status").performScrollTo().assert(hasText(expected))
        request("rescue", "접수 확인")
        identity(1)
    }

    @Test fun sc05DrawsMappedGlyphsAndMarks() {
        fun inside(parent: String, tag: String) = rule.onNode(hasTestTag(tag) and hasAnyAncestor(hasTestTag(parent)), useUnmergedTree = true).assertExists()
        inside("cue", "glyph-vehicle")
        inside("cue", "mark-unknown")
        inside("fact-arrival", "glyph-vehicle")
        inside("fact-handoff", "glyph-handoff")
        inside("request-rescue", "mark-confirmed")
        inside("request-vehicle", "mark-unknown")
        inside("request-insurance", "mark-neutral")
        click("event-receipt_received")
        inside("cue", "mark-confirmed")
        inside("request-vehicle", "mark-confirmed")
    }

    @Test fun font200PercentKeepsActionsAndEverySceneControlReachable() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val original = rule.activity.resources.configuration.fontScale
        fun scale(value: Float) {
            instrumentation.uiAutomation.executeShellCommand("settings put system font_scale $value").use { descriptor ->
                java.io.FileInputStream(descriptor.fileDescriptor).use { it.readBytes() }
            }
            rule.waitUntil { kotlin.math.abs(rule.activity.resources.configuration.fontScale - value) < .05f }
        }
        try {
            scale(2f)
            click("action-check_status")
            click("action-suspend")
            click("action-resume")
            loadScenario(rule.activity, "SC05").scenes.forEach { click("scene-${it.id}") }
            click("scene-review")
            click("scope-0")
            click("scope-1")
            rule.onNodeWithTag("action-retry").performScrollTo().assertIsNotEnabled()
            click("action-cancel")
            rule.onNodeWithText("가상 scenario · 실제 전화·전송 없음").performScrollTo().assertIsDisplayed()
        } finally {
            scale(original)
        }
    }
}

class Sc05LaunchTest {
    @get:Rule val rule = createEmptyComposeRule()
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private fun launch(scene: String) = ActivityScenario.launch<MainActivity>(Intent(context, MainActivity::class.java).putExtra("scene", scene))

    @Test fun everySharedSceneOpensAndSurvivesRealActivityRecreation() {
        loadScenario(context, "SC05").scenes.forEach { scene ->
            launch(scene.id).use { activity ->
                rule.onNodeWithTag("scene-title").assert(hasText(scene.title))
                activity.recreate()
                rule.onNodeWithTag("scene-title").assert(hasText(scene.title))
                rule.onNodeWithTag("request-identity").performScrollTo().assert(hasText("요청 SC05-1 · 전송 1회"))
            }
        }
    }

    @Test fun invalidSceneExtraFallsBackToInitial() {
        launch("bogus").use { rule.onNodeWithTag("scene-title").assert(hasText("차량 지원 접수 미확인")) }
    }
}

class SatinShaderTest {
    @Test fun satinShaderCompilesOnSupportedApiAndIsNormalFallbackOnApi28() {
        assertEquals(Build.VERSION.SDK_INT >= 33, satinCompiles(SATIN))
    }
    @Test fun brokenShaderIsReportedUnavailable() = assertFalse(satinCompiles("half4 main(float2 c){return nope;}"))
}
