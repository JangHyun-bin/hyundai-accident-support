package com.example.accidentpoc

import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class ScenarioLoadTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private fun source() = JSONObject(context.assets.open("scenarios.json").bufferedReader().use { it.readText() })
    private fun scenario(root: JSONObject) = root.getJSONArray("scenarios").objects().first { it.text("id") == "SC05" }
    private fun state(root: JSONObject, id: String = "initial") = scenario(root).getJSONArray("states").objects().first { it.text("id") == id }
    private fun rejects(fragment: String, change: (JSONObject) -> Unit) {
        val root = source().also(change)
        val error = assertThrows(IllegalArgumentException::class.java) { parseScenario(root.toString(), "SC05") }
        assertTrue(error.message, error.message!!.contains("scenarios.json/SC05"))
        assertTrue(error.message, error.message!!.contains(fragment))
    }

    @Test fun allSharedScenariosParseWithoutClaimingProductUiSupport() {
        listOf("SC01", "SC02", "SC03", "SC04", "SC05").forEach { id -> assertEquals(id, loadScenario(context, id).id) }
        assertThrows(IllegalArgumentException::class.java) { createSession(loadScenario(context, "SC03")) }
    }

    @Test fun validFactOverridesArePreservedIncludingNonVisibleFacts() {
        val sc03 = loadScenario(context, "SC03")
        assertTrue(sc03.scenes.any { it.factOverrides["response"]?.status == "confirmed" })
        val sc05 = loadScenario(context, "SC05")
        assertEquals(FactOverride(value = "도착 확인", status = "confirmed"), sc05.scene("arrived").factOverrides["arrival"])
        assertEquals(FactOverride(value = "인계 확인", status = "confirmed"), sc05.scene("handoff").factOverrides["handoff"])
    }

    @Test fun effectsAgencySecondaryAndPanelsSurviveLoading() {
        val story = loadScenario(context, "SC05")
        assertEquals(11, story.scenes.size)
        assertEquals("scope", story.scene("review").panel)
        assertEquals("resume", story.scene("suspended").panel)
        assertEquals("receipt", story.scene("received").panel)
        assertTrue(story.scene("initial").actions.first { it.id == "suspend" }.secondary)
        assertEquals("submit", story.scene("review").actions.first().effect)
        assertEquals("vehicle", story.scene("review").actions.first().agency)
    }

    @Test fun invalidVersionScenarioAndDuplicateIdsAreRejected() {
        rejects("version") { it.put("version", "0.3") }
        rejects("scenario ID") { scenario(it).put("id", "SC99") }
        rejects("Duplicate ID") { root -> root.getJSONArray("scenarios").put(scenario(root)) }
        rejects("Duplicate ID") { root -> scenario(root).getJSONArray("states").put(state(root)) }
        rejects("Duplicate ID") { root -> scenario(root).getJSONArray("facts").put(scenario(root).getJSONArray("facts").getJSONObject(0)) }
        rejects("Unknown initial") { scenario(it).put("initial", "missing") }
        assertThrows(IllegalArgumentException::class.java) { parseScenario(source().toString(), "missing") }
    }

    @Test fun invalidTargetsAgenciesEffectsAndTypesAreDiagnosed() {
        rejects("initial: Unknown target") { state(it).getJSONArray("actions").getJSONObject(0).put("to", "missing") }
        rejects("initial: Unsupported effect") { state(it).getJSONArray("actions").getJSONObject(0).put("effect", "pretend_success") }
        rejects("initial: Unsupported effect") { state(it).getJSONArray("actions").getJSONObject(0).put("effect", "save_record") }
        rejects("Unsupported agency IDs") { scenario(it).getJSONArray("requests").getJSONObject(0).put("id", "unknown_agency") }
        rejects("initial: Unknown agency") { state(it).getJSONArray("actions").getJSONObject(0).put("agency", "missing") }
        rejects("initial: secondary") { state(it).getJSONArray("actions").getJSONObject(0).put("secondary", "true") }
        rejects("initial: label") { state(it).getJSONArray("actions").getJSONObject(0).put("label", 7) }
        rejects("initial: Unsupported panel") { state(it).put("panel", "pretend") }
    }

    @Test fun invalidOverrideReferencesStatusesFieldsAndStringTypesAreRejected() {
        rejects("Unknown fact override") { state(it).getJSONObject("fact_overrides").put("missing", JSONObject()) }
        rejects("Unknown request override") { state(it).getJSONObject("request_overrides").put("missing", "received") }
        rejects("Invalid request status") { state(it).getJSONObject("request_overrides").put("vehicle", "arrived") }
        rejects("expected string") { state(it).getJSONObject("request_overrides").put("vehicle", 1) }
        rejects("Invalid fact status") { state(it, "arrived").getJSONObject("fact_overrides").getJSONObject("arrival").put("status", "received") }
        rejects("expected string") { state(it, "arrived").getJSONObject("fact_overrides").getJSONObject("arrival").put("value", true) }
        rejects("Unknown fact override field") { state(it, "arrived").getJSONObject("fact_overrides").getJSONObject("arrival").put("id", "handoff") }
        rejects("Unknown presentation") { scenario(it).getJSONObject("presentation").getJSONArray("visible_facts").put("missing") }
        rejects("request status keys") { it.getJSONObject("request_statuses").put("pretend", JSONObject().put("label", "x").put("tone", "unknown")) }
    }

    @Test fun glyphGridMappingsAndStatusMarksAreValidated() {
        val raw = context.assets.open("glyphs.json").bufferedReader().use { it.readText() }
        parseGlyphs(raw).validate(loadScenario(context, "SC05"))
        assertThrows(IllegalArgumentException::class.java) { parseGlyphs(JSONObject(raw).put("grid", 24).toString()) }
        val unknownGlyph = JSONObject(raw).apply { getJSONObject("cue").put("vehicle", "missing") }
        assertThrows(IllegalArgumentException::class.java) { parseGlyphs(unknownGlyph.toString()) }
        val unknownMark = JSONObject(raw).apply { getJSONObject("marks").getJSONObject("unknown").put("symbol", "missing") }
        assertThrows(IllegalArgumentException::class.java) { parseGlyphs(unknownMark.toString()) }
        val noVehicleMapping = JSONObject(raw).apply { getJSONObject("cue").remove("vehicle") }
        assertThrows(IllegalArgumentException::class.java) { parseGlyphs(noVehicleMapping.toString()).validate(loadScenario(context, "SC05")) }
    }
}

class ScenarioSessionTest {
    private val story = loadScenario(InstrumentationRegistry.getInstrumentation().targetContext, "SC05")
    private fun step(session: Session, id: String): Session {
        val scene = story.scene(session.sceneId)
        return transition(story, session, (scene.actions + scene.events).first { it.id == id })
    }
    private fun fact(session: Session, id: String) = sessionFacts(story, session).first { it.id == id }

    @Test fun lookupUnknownFailureSuspensionAndResumeKeepOriginalIdentityAndOtherAgencies() {
        var session = createSession(story)
        val initial = session
        listOf("check_status", "receipt_unknown", "check_status", "lookup_failed", "retry", "suspend", "resume").forEach { edge ->
            session = step(session, edge)
            assertEquals("SC05-1", session.requestId)
            assertEquals(1, session.submissions)
            assertEquals("received", session.requests["rescue"])
            assertEquals("not_sent", session.requests["insurance"])
            assertEquals(initial.approvedScope, session.approvedScope)
        }
        assertEquals("checking", session.sceneId)
        assertEquals("checking", session.requests["vehicle"])
    }

    @Test fun receiveAndHandoffWhileSuspendedUpdateSessionWithoutLeavingOrResending() {
        var session = step(step(createSession(story), "check_status"), "suspend")
        assertEquals("checking", session.suspendedFrom)
        session = step(step(session, "received"), "handoff")
        assertEquals("suspended", session.sceneId)
        assertEquals("received", session.requests["vehicle"])
        assertEquals("confirmed", fact(session, "handoff").status)
        assertEquals("unknown", fact(session, "arrival").status)
        session = step(session, "resume")
        assertEquals("received", session.sceneId)
        assertEquals(null, session.suspendedFrom)
        assertEquals("SC05-1", session.requestId)
        assertEquals(1, session.submissions)
        assertEquals("confirmed", fact(session, "handoff").status)
    }

    @Test fun handoffSelfTargetAppliesWithoutInventingArrivalOrVehicleReceipt() {
        val session = step(createSession(story), "handoff")
        assertEquals("initial", session.sceneId)
        assertEquals("unknown", session.requests["vehicle"])
        assertEquals("unknown", fact(session, "arrival").status)
        assertEquals("confirmed", fact(session, "handoff").status)
        assertEquals(1, session.submissions)
    }

    @Test fun receiptArrivalAndHandoffAreIndependentAndMonotonicAcrossLateResults() {
        var session = step(createSession(story), "receipt_received")
        assertEquals("unknown", fact(session, "arrival").status)
        assertEquals("unknown", fact(session, "handoff").status)
        session = step(session, "arrived")
        assertEquals("confirmed", fact(session, "arrival").status)
        assertEquals("unknown", fact(session, "handoff").status)
        session = step(session, "handoff")
        session = selectScene(story, session, "checking")
        session = step(session, "receipt_unknown")
        session = decodeSession(story, encodeSession(session))
        assertEquals("received", session.requests["vehicle"])
        assertEquals("confirmed", fact(session, "arrival").status)
        assertEquals("confirmed", fact(session, "handoff").status)
        assertEquals(story.scene("received").title, projectedScene(story, session).title)
        session = step(selectScene(story, session, "checking"), "not_received")
        assertEquals("received", session.requests["vehicle"])
        assertEquals(1, session.submissions)
    }

    @Test fun directHandoffFixtureDoesNotInventArrivalAndResumePreservesOrigin() {
        val handoff = createSession(story, "handoff")
        assertEquals("unknown", fact(handoff, "arrival").status)
        assertEquals("confirmed", fact(handoff, "handoff").status)
        listOf("arrived", "handoff").forEach { id ->
            val session = step(selectScene(story, createSession(story, id), "suspended"), "resume")
            assertEquals(id, session.sceneId)
            assertEquals(1, session.submissions)
        }
    }

    @Test fun reviewCancelEmptyScopeAndMissingRecordCannotSubmit() {
        val session = step(createSession(story, "not_received"), "review")
        assertFalse(session.draftApproved)
        val submit = story.scene("review").actions.first { it.effect == "submit" }
        val empty = updateDraft(session, scope = emptyList())
        assertSame(empty, transition(story, empty, submit))
        assertTrue(submissionBlockReason(empty)!!.contains("하나 이상"))
        val missingRecord = updateDraft(session, scope = listOf("사고 기록"), record = "아직 보관하지 않은 기록")
        assertSame(missingRecord, transition(story, missingRecord, submit))
        assertTrue(submissionBlockReason(missingRecord)!!.contains("보관된 사고 기록이 없어요"))
        val cancelled = step(updateDraft(session, scope = listOf("사고 위치")), "cancel")
        assertEquals(1, cancelled.submissions)
        assertEquals("SC05-1", cancelled.requestId)
        assertEquals(listOf("사고 위치"), cancelled.scope)
        assertEquals(scopeItems.take(2), cancelled.approvedScope)
    }

    @Test fun explicitApprovalFreezesSnapshotAndFailedRetryNeedsNewApproval() {
        val original = createSession(story, "not_received").copy(record = "작성 중인 다음 진술", savedRecord = "승인할 사고 기록")
        val review = updateDraft(step(original, "review"), scope = listOf("사고 위치", "사고 기록"))
        val submit = story.scene("review").actions.first { it.effect == "submit" }
        val sending = transition(story, review, submit)
        assertEquals("SC05-2", sending.requestId)
        assertEquals(2, sending.submissions)
        assertEquals(listOf("사고 위치", "사고 기록"), sending.approvedScope)
        assertEquals("승인할 사고 기록", sending.approvedRecord)
        assertEquals("작성 중인 다음 진술", sending.record)
        assertTrue(sending.draftApproved)
        assertSame(sending, transition(story, sending, submit))
        val failed = step(sending, "failed")
        assertEquals("failed", failed.requests["vehicle"])
        assertEquals(sending.approvedRecord, failed.approvedRecord)
        assertEquals(2, failed.submissions)
        val nextReview = updateDraft(step(failed, "retry").copy(savedRecord = "새 보관 기록"), scope = listOf("차량 상태"))
        assertEquals(sending.approvedScope, nextReview.approvedScope)
        assertEquals("승인할 사고 기록", nextReview.approvedRecord)
        assertFalse(nextReview.draftApproved)
        val resubmitted = step(nextReview, "retry")
        assertEquals("SC05-3", resubmitted.requestId)
        assertEquals(3, resubmitted.submissions)
        assertNotEquals(sending.requestId, resubmitted.requestId)
        assertEquals(listOf("차량 상태"), resubmitted.approvedScope)
        assertEquals("새 보관 기록", resubmitted.approvedRecord)
        assertEquals("승인할 사고 기록", sending.approvedRecord)
    }

    @Test fun knownReceiptBlocksApprovalEvenWhenReviewProjectionWasSelected() {
        val received = step(createSession(story), "receipt_received")
        val review = selectScene(story, received, "review")
        assertEquals("received", review.requests["vehicle"])
        assertSame(review, step(review, "retry"))
        assertEquals(1, review.submissions)
    }

    @Test fun fullSessionSerializationPreservesEveryFieldForAllElevenScenes() {
        story.scenes.forEach { scene ->
            val original = createSession(story, scene.id).copy(
                requests = mapOf("rescue" to "received", "vehicle" to "received", "insurance" to "declined"),
                facts = mapOf("arrival" to FactOverride(label = "도착", value = "도착 확인", status = "confirmed"), "handoff" to FactOverride(value = "인계 확인", status = "confirmed")),
                record = "미보관 draft", savedRecord = "현재 보관 기록", scope = listOf("차량 상태"),
                approvedScope = listOf("사고 위치", "사고 기록"), approvedRecord = "과거 승인 기록", draftApproved = false,
                requestId = "SC05-3", submissions = 3, returnTo = "received", suspendedFrom = "arrived")
            assertEquals("Full state for ${scene.id}", original, decodeSession(story, encodeSession(original)))
        }
    }

    @Test fun invalidSavedSessionCannotReplaceTheAuthoritativeState() {
        val value = encodeSession(createSession(story))
        listOf("sceneId" to "missing", "requestId" to "SC05-2", "submissions" to 0, "version" to 2).forEach { (key, invalid) ->
            assertThrows(IllegalArgumentException::class.java) { decodeSession(story, JSONObject(value).put(key, invalid).toString()) }
        }
        assertThrows(IllegalArgumentException::class.java) { decodeSession(story, JSONObject(value).put("scope", org.json.JSONArray(listOf("없는 범위"))).toString()) }
    }
}
