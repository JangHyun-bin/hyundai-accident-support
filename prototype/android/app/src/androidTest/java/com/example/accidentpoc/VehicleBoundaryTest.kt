package com.example.accidentpoc

import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.security.KeyStore
import java.time.Instant
import java.util.UUID

class VehicleBoundaryTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val storeNames = mutableListOf<String>()

    @After fun removeOnlyTestKeysAndFiles() {
        val keys = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        storeNames.forEach { name ->
            listOf(".enc", ".enc.bak", ".enc.new").forEach { File(context.noBackupFilesDir, name + it).delete() }
            keys.deleteEntry("${context.packageName}.$name.v1")
        }
    }

    @Test fun encryptedIdentityAndUnacknowledgedMutationSurviveReopening() {
        val name = "boundary-${UUID.randomUUID()}".also(storeNames::add)
        val identity = StoredVehicle.new("https://vehicle.example")
        val mutation = PendingMutation("unchanged-operation-id", 17, VehicleIntent.Action(VehicleActionId.Defer))
        val saved = identity.copy(access = CaseAccess("same-case", "private-vehicle-credential", Instant.parse("2030-01-01T00:00:00Z")),
            pending = listOf(mutation),
            pair = PairLink("same-pair", "https://vehicle.example/phone#pair=private-pair-token", Instant.parse("2030-01-01T00:00:00Z")),
            pendingApproval = PairClaim("same-claim", "412805", "내 휴대전화", Instant.parse("2030-01-01T00:00:00Z")))
        SecureVehicleStore(context, name).write(saved)
        val restored = requireNotNull(SecureVehicleStore(context, name).read())
        assertEquals(saved, restored)
        assertEquals("same-claim", restored.pendingApproval?.claimId)
        assertEquals("same-pair", restored.pair?.pairId)
        assertEquals("unchanged-operation-id", restored.pending.single().body().getString("mutationId"))
        assertEquals(17L, restored.pending.single().body().getLong("expectedRevision"))
        val disk = File(context.noBackupFilesDir, "$name.enc").readText()
        assertFalse(disk.contains(identity.creationSecret))
        assertFalse(disk.contains("private-vehicle-credential"))
        assertFalse(disk.contains("same-case"))
        SecureVehicleStore(context, name).write(saved)
        assertNotEquals(disk, File(context.noBackupFilesDir, "$name.enc").readText())
        assertEquals(saved, SecureVehicleStore(context, name).read())
    }

    @Test fun corruptCiphertextCannotSilentlyCreateAnotherIdentity() {
        val name = "boundary-${UUID.randomUUID()}".also(storeNames::add)
        SecureVehicleStore(context, name).write(StoredVehicle.new("https://vehicle.example"))
        val file = File(context.noBackupFilesDir, "$name.enc")
        val envelope = JSONObject(file.readText())
        val cipher = envelope.getString("ciphertext")
        envelope.put("ciphertext", (if (cipher[0] == 'A') "B" else "A") + cipher.drop(1))
        file.writeText(envelope.toString())
        assertThrows(Exception::class.java) { SecureVehicleStore(context, name).read() }
    }

    @Test fun phoneOnlineRequiresAnActualHeartbeat() {
        val value = progress()
        value.getJSONObject("phone").put("paired", true).put("online", true)
        assertThrows(IllegalArgumentException::class.java) { VehicleProgress.parse(value) }
        value.getJSONObject("phone").put("lastSeenAt", "2026-11-14T03:00:00Z").put("clientId", "phone-client")
        val parsed = VehicleProgress.parse(value)
        assertTrue(parsed.phone.online)
        assertEquals(Instant.parse("2026-11-14T03:00:00Z"), parsed.phone.lastSeenAt)
    }

    @Test fun unsupportedServerActionsAndInventedInsuranceReceiptsAreRejected() {
        val value = progress()
        value.getJSONObject("insurance").put("receipt", "not-a-real-receipt")
        assertThrows(IllegalArgumentException::class.java) { VehicleProgress.parse(value) }
        val other = progress()
        other.getJSONObject("scene").getJSONArray("actions").getJSONObject(0).put("id", "auto-call-119")
        assertThrows(IllegalArgumentException::class.java) { VehicleProgress.parse(other) }
    }

    @Test fun sdkUndeployedAndSimulationProvenanceStayDistinct() {
        val fact = SdkFact.Reading("ROW_1_LEFT", Instant.parse("2026-11-14T03:00:00Z"), false, FactSource.Simulation)
        val restored = SdkFact.parse(fact.json())
        assertEquals(fact, restored)
        assertEquals("simulation", fact.json().getString("source"))
        assertFalse(fact.json().getBoolean("value"))
        val unsupported = SdkFact.Unavailable("all", fact.observedAt, UnavailableCause.Unsupported)
        assertEquals(unsupported, SdkFact.parse(unsupported.json()))
        assertFalse(unsupported.json().has("value"))
        assertFalse(unsupported.json().has("source"))
    }

    @Test fun signalLineSaysWhatTheSdkReportedAndMarksSimulation() {
        val at = Instant.parse("2026-11-14T03:00:00Z")
        assertEquals(SignalLine("Pleos SDK · 에어백 신호 확인 중 · 시뮬레이션", "unknown"), SafetyState(FactSource.Simulation).line())
        val quiet = SafetyState(FactSource.Pleos, mapOf("ROW_1_LEFT" to SdkFact.Reading("ROW_1_LEFT", at, false, FactSource.Pleos)))
        assertEquals(SignalLine("Pleos SDK · 에어백 전개 신호 없음", "neutral"), quiet.line())
        val deployed = quiet.copy(facts = quiet.facts + ("ROW_1_RIGHT" to SdkFact.Reading("ROW_1_RIGHT", at, true, FactSource.Pleos)))
        assertEquals(SignalLine("Pleos SDK · 에어백 전개 신호 있음", "attention"), deployed.line())
        val denied = SafetyState(FactSource.Pleos, mapOf("all" to SdkFact.Unavailable("all", at, UnavailableCause.PermissionDenied)))
        assertEquals(SignalLine("Pleos SDK · 에어백 신호 권한 없음", "unknown"), denied.line())
        val partial = quiet.copy(facts = quiet.facts + ("ROW_2_LEFT" to SdkFact.Unavailable("ROW_2_LEFT", at, UnavailableCause.ReadFailed)))
        assertEquals("Pleos SDK · 에어백 전개 신호 없음", partial.line().text)
    }

    private fun progress() = JSONObject("""
        {
          "schemaVersion":1,"caseId":"case-1","revision":4,"updatedAt":"2026-11-14T03:00:00Z",
          "stage":"response","returnStage":null,"suspended":false,"riskCheckRequired":true,
          "scene":{"id":"situation-check","title":"상황 확인","body":"직접 확인해 주세요.","actions":[{"id":"need-help","label":"도움"}]},
          "phone":{"paired":false,"online":false,"lastSeenAt":null,"clientId":null},
          "record":{"photos":0,"audio":0,"video":0,"statement":"empty","report":"empty"},
          "copy":{"id":null,"preparedAt":null},"insurance":{"integration":"unavailable","receipt":null}
        }
    """.trimIndent())
}
