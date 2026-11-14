package com.example.accidentpoc

import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.URI
import java.net.URL
import java.time.Instant
import java.util.UUID
import javax.net.ssl.HttpsURLConnection

internal class VehicleApiException(val status: Int, val code: String, val latest: VehicleProgress?) : IOException(code)
internal class PairExpired : IOException("Pair is no longer valid")
internal data class VehicleSnapshot(val saved: StoredVehicle?, val progress: VehicleProgress?)

internal class VehicleRepository(private val store: SecureVehicleStore, private val origin: String) {
    private val mutex = Mutex()
    private var loaded = false
    private var saved: StoredVehicle? = null
    private var progress: VehicleProgress? = null

    suspend fun snapshot(): VehicleSnapshot = locked { load(); snapshotNow() }

    suspend fun start(): VehicleSnapshot = locked {
        validateOrigin()
        load()
        if (saved == null) persist(StoredVehicle.new(origin))
        val identity = requireNotNull(saved)
        if (identity.access == null) {
            val result = request("POST", "/cases", JSONObject().put("creationId", identity.creationId)
                .put("creationSecret", identity.creationSecret).put("deviceLabel", "차분 차량 화면"), authenticated = false)
            val access = CaseAccess(result.string("caseId"), result.string("vehicleCredential"), Instant.parse(result.string("expiresAt")))
            persist(identity.copy(access = access))
            accept(VehicleProgress.parse(result.getJSONObject("progress")))
        } else {
            refreshNow()
        }
        snapshotNow()
    }

    suspend fun forget() = locked {
        store.delete()
        saved = null
        progress = null
        loaded = true
    }

    suspend fun enqueueFact(fact: SdkFact): VehicleSnapshot = locked {
        load()
        val state = saved ?: return@locked snapshotNow()
        if (state.factFingerprints[fact.seatId] == fact.fingerprint()) return@locked snapshotNow()
        val fingerprints = when {
            fact is SdkFact.Reading -> state.factFingerprints - "all"
            fact.seatId == "all" -> emptyMap()
            else -> state.factFingerprints
        }
        val mutation = PendingMutation(UUID.randomUUID().toString(), progress?.revision ?: 0, fact)
        persist(state.copy(pending = state.pending + mutation, factFingerprints = fingerprints + (fact.seatId to fact.fingerprint())))
        snapshotNow()
    }

    // The server deduplicates by mutationId, so stamping the latest revision on every attempt keeps a resend after a lost response
    // harmless. A conflict retries against the newer revision; a fact the server rejects is dropped.
    suspend fun sendPending(): VehicleSnapshot = locked {
        load()
        if (saved?.access == null) return@locked snapshotNow()
        repeat(32) {
            val next = saved?.pending?.firstOrNull() ?: return@locked snapshotNow()
            val current = progress ?: return@locked snapshotNow()
            val mutation = next.copy(expectedRevision = current.revision)
            replacePending(mutation)
            try {
                accept(VehicleProgress.parse(request("POST", "$casePath/vehicle-facts", mutation.body())))
                removePending(mutation)
            } catch (error: VehicleApiException) {
                error.latest?.let(::accept)
                when {
                    error.status == 409 && error.latest != null -> Unit
                    error.status == 400 -> removePending(mutation)
                    else -> throw error
                }
            }
        }
        snapshotNow()
    }

    suspend fun newPair(): VehicleSnapshot = locked {
        load()
        val state = requireNotNull(saved)
        require(state.pendingApproval == null) { "Confirm the pending approval first" }
        state.pair?.let(::revokePairNow)
        val pair = PairLink.parse(request("POST", "$casePath/pairs", JSONObject()))
        val join = URI(pair.joinUrl)
        val backend = URI(origin)
        require(join.scheme == "https" && join.host == backend.host && join.port == backend.port && join.rawUserInfo == null)
        require(join.path == "/phone" && join.rawQuery == null && join.fragment?.startsWith("pair=") == true)
        persist(requireNotNull(saved).copy(pair = pair))
        snapshotNow()
    }

    suspend fun claims(): List<PairClaim> = locked {
        val pair = saved?.pair ?: return@locked emptyList()
        if (!pair.expiresAt.isAfter(Instant.now())) return@locked emptyList()
        val response = try {
            request("GET", "/pairs/${Uri.encode(pair.pairId)}/claims")
        } catch (error: VehicleApiException) {
            if (error.status in setOf(404, 409, 410)) throw PairExpired()
            throw error
        }
        response.getJSONArray("claims").objects().map(PairClaim::parse).filter { it.expiresAt.isAfter(Instant.now()) }
    }

    suspend fun approve(claim: PairClaim): VehicleSnapshot = locked {
        val state = requireNotNull(saved)
        val pair = state.pair ?: throw PairExpired()
        if (state.pendingApproval == null) {
            val now = Instant.now()
            if (!pair.expiresAt.isAfter(now) || !claim.expiresAt.isAfter(now)) throw PairExpired()
            persist(state.copy(pendingApproval = claim))
        } else require(state.pendingApproval.claimId == claim.claimId)
        approvePendingNow()
        snapshotNow()
    }

    suspend fun retryApproval(): VehicleSnapshot = locked {
        approvePendingNow()
        snapshotNow()
    }

    private fun approvePendingNow() {
        val state = requireNotNull(saved)
        val pair = requireNotNull(state.pair)
        val claim = requireNotNull(state.pendingApproval)
        try {
            request("POST", "/pairs/${Uri.encode(pair.pairId)}/approve", JSONObject().put("claimId", claim.claimId))
        } catch (error: VehicleApiException) {
            if (error.status in setOf(400, 403, 404, 409, 410, 422)) {
                persist(state.copy(pair = null, pendingApproval = null))
                throw PairExpired()
            }
            throw error
        }
        persist(state.copy(pair = null, pendingApproval = null))
        refreshNow()
    }

    private fun revokePairNow(pair: PairLink) {
        try { request("DELETE", "$casePath/pairs/${Uri.encode(pair.pairId)}") }
        catch (error: VehicleApiException) { if (error.status != 404 && error.status != 410) throw error }
        persist(requireNotNull(saved).copy(pair = null))
    }

    private fun load() {
        if (loaded) return
        saved = store.read()
        require(saved == null || saved?.origin == origin) { "Saved case belongs to a different backend" }
        loaded = true
    }
    private fun persist(value: StoredVehicle) { store.write(value); saved = value }
    private fun snapshotNow() = VehicleSnapshot(saved, progress)
    private fun replacePending(mutation: PendingMutation) {
        val state = requireNotNull(saved)
        persist(state.copy(pending = state.pending.map { if (it.mutationId == mutation.mutationId) mutation else it }))
    }
    private fun removePending(mutation: PendingMutation) {
        val state = requireNotNull(saved)
        persist(state.copy(pending = state.pending.filterNot { it.mutationId == mutation.mutationId }))
    }
    private fun refreshNow() { accept(VehicleProgress.parse(request("GET", "$casePath/progress"))) }
    private fun accept(value: VehicleProgress) {
        require(value.caseId == saved?.access?.caseId)
        if (value.revision >= (progress?.revision ?: -1)) progress = value
    }
    private val casePath: String get() = "/cases/${Uri.encode(requireNotNull(saved?.access).caseId)}"
    private suspend fun <T> locked(block: () -> T): T = withContext(Dispatchers.IO) { mutex.withLock { block() } }

    private fun validateOrigin() {
        val uri = URI(origin)
        require(uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.rawUserInfo == null &&
            uri.rawQuery == null && uri.rawFragment == null && uri.rawPath.isNullOrEmpty()) { "HTTPS backend is not configured" }
    }

    private fun request(method: String, path: String, body: JSONObject? = null, authenticated: Boolean = true): JSONObject {
        validateOrigin()
        val connection = URL("$origin/api$path").openConnection() as HttpsURLConnection
        connection.requestMethod = method
        connection.instanceFollowRedirects = false
        connection.connectTimeout = 10_000
        connection.readTimeout = 15_000
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Cache-Control", "no-store")
        if (authenticated) connection.setRequestProperty("Authorization", "Bearer ${requireNotNull(saved?.access).credential}")
        try {
            if (body != null) {
                val bytes = body.toString().toByteArray(Charsets.UTF_8)
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.setFixedLengthStreamingMode(bytes.size)
                connection.outputStream.use { it.write(bytes) }
            }
            val status = connection.responseCode
            val input = if (status in 200..299) connection.inputStream else connection.errorStream
            val output = ByteArrayOutputStream()
            input?.use { stream ->
                val buffer = ByteArray(8192)
                while (true) {
                    val count = stream.read(buffer)
                    if (count < 0) break
                    if (output.size() + count > 1_048_576) throw IOException("Vehicle response exceeds limit")
                    output.write(buffer, 0, count)
                }
            }
            val result = if (output.size() == 0) JSONObject() else JSONObject(output.toString(Charsets.UTF_8.name()))
            if (status !in 200..299) {
                val error = result.optJSONObject("error")
                val latest = result.optJSONObject("progress")?.let(VehicleProgress::parse)
                throw VehicleApiException(status, error?.optString("code") ?: "unavailable", latest)
            }
            return result
        } finally { connection.disconnect() }
    }
}
