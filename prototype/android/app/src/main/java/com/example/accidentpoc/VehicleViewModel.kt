package com.example.accidentpoc

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.IOException
import java.security.MessageDigest
import java.time.Instant

internal data class VehicleLink(
    val configured: Boolean,
    val safety: SafetyState,
    val saved: StoredVehicle? = null,
    val progress: VehicleProgress? = null,
    val claims: List<PairClaim> = emptyList(),
    val online: Boolean = false,
    val busy: Boolean = false,
    val error: String? = null,
)

internal sealed interface Handoff {
    data object Unconfigured : Handoff
    data object Connecting : Handoff
    data object Ready : Handoff
    data class Pairing(val pair: PairLink, val claims: List<PairClaim>) : Handoff
    data object Expired : Handoff
    data class Approving(val claim: PairClaim) : Handoff
    data class Connected(val progress: VehicleProgress) : Handoff
}

internal fun handoff(link: VehicleLink, now: Instant): Handoff {
    if (!link.configured) return Handoff.Unconfigured
    link.saved?.pendingApproval?.let { return Handoff.Approving(it) }
    val pair = link.saved?.pair
    if (pair != null && pair.expiresAt.isAfter(now)) return Handoff.Pairing(pair, link.claims.filter { it.expiresAt.isAfter(now) })
    val progress = link.progress ?: return Handoff.Connecting
    return when {
        progress.phone.paired -> Handoff.Connected(progress)
        pair != null -> Handoff.Expired
        else -> Handoff.Ready
    }
}

// SC05 "나중에 이어하기" and the backend's defer-recording share one intent: pause now, keep what exists, check again before
// continuing. No other SC05 transition carries a backend action; the README mapping table explains each one.
internal fun vehicleAction(edge: Transition): VehicleActionId? = if (edge.effect == "suspend") VehicleActionId.Defer else null

internal interface HandoffControl {
    fun connect()
    fun startPairing()
    fun approve(claim: PairClaim)
    fun confirmApproval()
}

internal class VehicleViewModel(application: Application) : AndroidViewModel(application), HandoffControl {
    private val repository = BuildConfig.API_BASE_URL.takeIf { it.isNotEmpty() }?.let { origin ->
        VehicleRepository(SecureVehicleStore(application, storeName(origin)), origin)
    }
    private val mutable = MutableStateFlow(VehicleLink(configured = repository != null, safety = SafetyState(source = FactSource.Pleos)))
    val state = mutable.asStateFlow()
    private val facts = mutableMapOf<String, SdkFact>()
    private var operations = 0
    private var polling: Job? = null
    private val safety = PleosSafetySource(application) { value, fact ->
        mutable.update { it.copy(safety = value) }
        if (fact != null) {
            facts[fact.seatId] = fact
            quietly { it.enqueueFact(fact); it.sendPending() }
        }
    }

    init {
        safety.start()
        connect()
    }

    override fun connect() = visibly { repository ->
        apply(repository.start())
        facts.values.toList().forEach { repository.enqueueFact(it) }
        apply(repository.sendPending())
    }

    override fun startPairing() = visibly { repository ->
        apply(repository.beginPair())
        mutable.update { it.copy(claims = repository.claims()) }
    }

    override fun approve(claim: PairClaim) = visibly { repository ->
        apply(repository.approve(claim))
        mutable.update { it.copy(claims = emptyList()) }
    }

    override fun confirmApproval() = visibly { repository -> apply(repository.retryApproval()) }

    fun follow(edge: Transition) {
        val action = vehicleAction(edge) ?: return
        if (action in mutable.value.progress?.actions.orEmpty()) quietly { it.enqueueAction(action); it.sendPending() }
    }

    fun setActive(active: Boolean) {
        polling?.cancel()
        polling = if (active) viewModelScope.launch { while (isActive) { delay(2_500); poll() } } else null
    }

    private suspend fun poll() {
        val repository = repository ?: return
        if (mutable.value.saved?.access == null) return
        try {
            apply(repository.refresh())
            if (mutable.value.saved?.pending.orEmpty().isNotEmpty()) apply(repository.sendPending())
            if (mutable.value.saved?.pair != null) mutable.update { it.copy(claims = repository.claims()) }
            mutable.update { it.copy(online = true) }
        } catch (error: Exception) {
            if (error is CancellationException) throw error
            mutable.update { it.copy(online = false) }
        }
    }

    private fun visibly(block: suspend (VehicleRepository) -> Unit) {
        val repository = repository ?: return
        viewModelScope.launch {
            operations++
            mutable.update { it.copy(busy = true, error = null) }
            try {
                block(repository)
                mutable.update { it.copy(online = true) }
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                mutable.update { it.copy(online = false, error = message(error)) }
                resync(repository)
            } finally {
                operations--
                mutable.update { it.copy(busy = operations > 0) }
            }
        }
    }

    private fun quietly(block: suspend (VehicleRepository) -> VehicleSnapshot) {
        val repository = repository ?: return
        viewModelScope.launch {
            try {
                apply(block(repository))
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                mutable.update { it.copy(online = false) }
                resync(repository)
            }
        }
    }

    // A failed call can still have persisted a pending approval or cleared a rejected pair; show what the store now holds.
    private suspend fun resync(repository: VehicleRepository) {
        try { apply(repository.snapshot()) } catch (error: Exception) { if (error is CancellationException) throw error }
    }

    private fun apply(snapshot: VehicleSnapshot) = mutable.update { it.copy(saved = snapshot.saved, progress = snapshot.progress) }

    private fun message(error: Exception) = when {
        error is PairApprovalRejected -> "승인하지 못했어요. 새 코드를 받아 다시 연결해 주세요."
        error is VehicleApiException && error.status == 401 -> "차량 연결 권한이 끝났어요."
        error is VehicleApiException && error.status == 429 -> "요청이 많아요. 잠시 후 다시 시도해 주세요."
        error is IOException -> "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요."
        else -> "연결 정보를 확인하지 못했어요."
    }

    override fun onCleared() {
        safety.stop()
        super.onCleared()
    }
}

// One encrypted identity per backend origin, so a rebuilt app pointing at another server never reuses or blocks on a foreign case.
private fun storeName(origin: String) =
    "vehicle-" + MessageDigest.getInstance("SHA-256").digest(origin.toByteArray()).take(8).joinToString("") { "%02x".format(it) }
