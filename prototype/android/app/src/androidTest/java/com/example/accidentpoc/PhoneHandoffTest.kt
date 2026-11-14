package com.example.accidentpoc

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.time.Instant

class PhoneHandoffTest {
    @get:Rule val rule = createComposeRule()
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val now = Instant.parse("2026-11-14T03:00:00Z")
    private val later = now.plusSeconds(240)
    private val pair = PairLink("pair-1", "https://vehicle.example/phone#pair=private-pair-token", later)
    private val claim = PairClaim("claim-1", "412805", "휴대전화", later)

    private class Recorder : HandoffControl {
        val calls = mutableListOf<String>()
        override fun connect() { calls += "connect" }
        override fun startPairing() { calls += "pair" }
        override fun approve(claim: PairClaim) { calls += "approve:${claim.claimId}" }
        override fun confirmApproval() { calls += "confirm" }
    }

    private fun progress(paired: Boolean = false, photos: Int = 0) = VehicleProgress.parse(JSONObject("""
        {
          "schemaVersion":1,"caseId":"case-1","revision":4,"updatedAt":"2026-11-14T03:00:00Z",
          "stage":"record","returnStage":null,"suspended":false,"riskCheckRequired":false,
          "scene":{"id":"record","title":"휴대폰에서 기록을 이어가세요","body":"","actions":[{"id":"need-help","label":"도움"},{"id":"defer-recording","label":"잠시 멈출게요"}]},
          "phone":{"paired":$paired,"online":$paired,"lastSeenAt":${if (paired) "\"2026-11-14T03:00:00Z\"" else "null"},"clientId":${if (paired) "\"phone\"" else "null"}},
          "record":{"photos":$photos,"audio":1,"video":0,"statement":"draft","report":"empty"},
          "copy":{"id":null,"preparedAt":null},"insurance":{"integration":"unavailable","receipt":null}
        }
    """.trimIndent()))

    private fun link(pair: PairLink? = null, approval: PairClaim? = null, claims: List<PairClaim> = emptyList(), progress: VehicleProgress? = progress()) =
        VehicleLink(configured = true, safety = SafetyState(FactSource.Simulation), progress = progress, claims = claims,
            saved = StoredVehicle.new("https://vehicle.example").copy(pair = pair, pendingApproval = approval), online = true)

    private fun show(link: VehicleLink, control: HandoffControl) = rule.setContent {
        CompositionLocalProvider(LocalGlyphs provides loadGlyphs(context)) { PhoneHandoff(link, control) }
    }

    @Test fun onlySc05PauseCarriesABackendAction() {
        val edges = loadScenario(context, "SC05").scenes.flatMap { it.actions + it.events }
        assertTrue(edges.any { it.effect == "suspend" })
        edges.forEach { edge -> assertEquals(edge.id, if (edge.effect == "suspend") VehicleActionId.Defer else null, vehicleAction(edge)) }
    }

    @Test fun phaseFollowsApprovalPairExpiryAndPhoneState() {
        assertEquals(Handoff.Unconfigured, handoff(link().copy(configured = false), now))
        assertEquals(Handoff.Connecting, handoff(link(progress = null), now))
        assertEquals(Handoff.Ready, handoff(link(), now))
        assertEquals(Handoff.Approving(claim), handoff(link(pair = pair, approval = claim, claims = listOf(claim)), now))
        val stale = claim.copy(claimId = "claim-old", expiresAt = now.minusSeconds(1))
        assertEquals(Handoff.Pairing(pair, listOf(claim)), handoff(link(pair = pair, claims = listOf(claim, stale)), now))
        assertEquals(Handoff.Expired, handoff(link(pair = pair), later))
        val connected = progress(paired = true)
        assertEquals(Handoff.Connected(connected), handoff(link(pair = pair, progress = connected), later))
        assertEquals(Handoff.Pairing(pair, emptyList()), handoff(link(pair = pair, progress = connected), now))
    }

    @Test fun pairingShowsQrAndCodeAndApprovesOnlyThroughTheExplicitButton() {
        val recorder = Recorder()
        show(link(pair = pair.copy(expiresAt = Instant.now().plusSeconds(240)), claims = listOf(claim.copy(expiresAt = Instant.now().plusSeconds(240)))), recorder)
        rule.onNodeWithTag("handoff-qr").assertIsDisplayed()
        rule.onNodeWithTag("handoff-code").assert(hasText("412 805"))
        rule.onNodeWithText("휴대전화에서 연결을 요청했어요").assertIsDisplayed()
        assertTrue(recorder.calls.isEmpty())
        rule.onNodeWithTag("handoff-approve").performClick()
        assertEquals(listOf("approve:claim-1"), recorder.calls)
    }

    @Test fun expiredCodeOffersRenewalAndConnectedPhoneShowsRecordProgress() {
        val recorder = Recorder()
        var current by mutableStateOf(link(pair = pair.copy(expiresAt = Instant.now().minusSeconds(1))))
        rule.setContent { CompositionLocalProvider(LocalGlyphs provides loadGlyphs(context)) { PhoneHandoff(current, recorder) } }
        rule.onNodeWithTag("handoff-status").assert(hasText("연결 코드가 만료됐어요"))
        rule.onNodeWithTag("handoff-renew").performClick()
        assertEquals(listOf("pair"), recorder.calls)
        current = link(progress = progress(paired = true, photos = 2))
        rule.onNodeWithTag("handoff-phone").assert(hasText("휴대폰 연결됨"))
        rule.onNodeWithTag("handoff-record").assert(hasText("2장")).assert(hasText("작성 중"))
    }
}
