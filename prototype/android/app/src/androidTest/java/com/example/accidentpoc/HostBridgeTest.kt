package com.example.accidentpoc

import android.content.res.Configuration
import android.net.Uri
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class HostBridgeTest {
    private val expires = Instant.parse("2026-11-14T03:05:00Z")
    private val serverProgress = JSONObject("""
        {
          "schemaVersion":1,"caseId":"case-1","revision":4,"updatedAt":"2026-11-14T03:00:00Z",
          "stage":"record","returnStage":null,"suspended":false,"riskCheckRequired":false,
          "scene":{"id":"record","title":"기록","body":"","actions":[{"id":"need-help","label":"도움"}]},
          "phone":{"paired":true,"online":true,"lastSeenAt":"2026-11-14T03:00:00Z","clientId":"phone"},
          "record":{"photos":2,"audio":1,"video":0,"statement":"draft","report":"empty"},
          "copy":{"id":null,"preparedAt":null},"insurance":{"integration":"unavailable","receipt":null},
          "futureField":"kept"
        }
    """.trimIndent())
    private val progress = VehicleProgress.parse(serverProgress)

    @Test fun handoffStatesUseTheWebShapeAndPassServerProgressThrough() {
        assertEquals("""{"kind":"idle"}""", HandoffState.Idle.json().toString())
        assertEquals("""{"kind":"starting"}""", HandoffState.Starting.json().toString())
        val pair = PairLink("pair-1", "https://vehicle.example/phone#pair=token", expires)
        val claim = PairClaim("claim-1", "412805", "휴대전화", expires)
        val pairing = HandoffState.Pairing(pair, listOf(claim), progress).json()
        assertEquals("pairing", pairing.getString("kind"))
        assertEquals("https://vehicle.example/phone#pair=token", pairing.getJSONObject("pair").getString("joinUrl"))
        assertEquals("2026-11-14T03:05:00Z", pairing.getJSONObject("pair").getString("expiresAt"))
        val sent = pairing.getJSONArray("claims").getJSONObject(0)
        assertEquals(listOf("claimId", "verificationCode", "deviceLabel", "expiresAt").sorted(), sent.keys().asSequence().toList().sorted())
        assertEquals("412805", sent.getString("verificationCode"))
        assertEquals(serverProgress.toString(), pairing.getJSONObject("progress").toString())
        assertEquals("kept", HandoffState.Connected(progress).json().getJSONObject("progress").getString("futureField"))
        val offline = HandoffState.Failed(FailureReason.Unavailable, null).json()
        assertEquals("unavailable", offline.getString("reason"))
        assertTrue(offline.isNull("progress"))
        assertEquals("expired", HandoffState.Failed(FailureReason.Expired, progress).json().getString("reason"))
    }

    @Test fun commandsAcceptOnlyTheContractShapes() {
        assertEquals(HandoffCommand.Journey("8c0f3c2e-5b7a-4f43-9a8e-1d2c3b4a5f6e"),
            HandoffCommand.parse("journey", """{"journeyId":"8c0f3c2e-5b7a-4f43-9a8e-1d2c3b4a5f6e"}"""))
        assertEquals(HandoffCommand.Journey(null), HandoffCommand.parse("journey", """{"journeyId":""}"""))
        assertEquals(HandoffCommand.Journey(null), HandoffCommand.parse("journey", """{"journeyId":"../other"}"""))
        assertEquals(HandoffCommand.Journey(null), HandoffCommand.parse("journey", "not json"))
        assertEquals(HandoffCommand.Approve("claim-1"), HandoffCommand.parse("approve", """{"claimId":"claim-1"}"""))
        assertNull(HandoffCommand.parse("approve", "{}"))
        assertEquals(HandoffCommand.Start, HandoffCommand.parse("start", null))
        assertEquals(HandoffCommand.Renew, HandoffCommand.parse("renew", "{}"))
        assertEquals(HandoffCommand.Retry, HandoffCommand.parse("retry", ""))
        assertNull(HandoffCommand.parse("call-119", "{}"))
        assertNull(HandoffCommand.parse(null, null))
    }

    @Test fun onlyTheBundledJourneyIsAnAppPage() {
        assertTrue(WebOrigin.isApp(WebOrigin.START))
        assertTrue(WebOrigin.isApp("https://appassets.androidplatform.net/assets/web/index.html?host=pleos-app&case=abc"))
        assertFalse(WebOrigin.isApp("http://appassets.androidplatform.net/assets/web/index.html"))
        assertFalse(WebOrigin.isApp("https://appassets.androidplatform.net:8443/assets/web/index.html"))
        assertFalse(WebOrigin.isApp("https://appassets.androidplatform.net.example.com/assets/web/index.html"))
        assertFalse(WebOrigin.isApp("https://appassets.androidplatform.net/assets/other/secret.json"))
        assertFalse(WebOrigin.isApp("https://appassets.androidplatform.net/assets/web/../other/secret.json"))
        assertFalse(WebOrigin.isApp("file:///android_asset/web/index.html"))
        assertFalse(WebOrigin.isApp("https://satisfied-casa-solid-near.trycloudflare.com/phone"))
        assertFalse(WebOrigin.isApp(null))
        assertTrue(WebOrigin.matches(Uri.parse("https://appassets.androidplatform.net/")))
    }

    @Test fun hostReportsDemoBuildSignalEnvironmentWindowAndTheme() {
        val host = hostJson(FactSource.Simulation, WindowPx(1682, 1210), HostTheme.Dark)
        assertEquals(1, host.getInt("version"))
        assertEquals(BuildConfig.DEMO_CONTROLS, host.getBoolean("demo"))
        assertEquals("2.3.2", host.getString("sdk"))
        assertEquals("emulator", host.getString("environment"))
        assertEquals("""{"width":1682,"height":1210}""", host.getJSONObject("windowPx").toString())
        assertEquals("dark", host.getString("theme"))
        val vehicle = hostJson(FactSource.Pleos, WindowPx(841, 1210), HostTheme.Light)
        assertEquals("vehicle", vehicle.getString("environment"))
        assertEquals("light", vehicle.getString("theme"))
        val night = Configuration().apply { uiMode = Configuration.UI_MODE_TYPE_CAR or Configuration.UI_MODE_NIGHT_YES }
        assertEquals(HostTheme.Dark, HostTheme.of(night))
        assertEquals(HostTheme.Light, HostTheme.of(Configuration().apply { uiMode = Configuration.UI_MODE_TYPE_CAR or Configuration.UI_MODE_NIGHT_NO }))
    }
}
