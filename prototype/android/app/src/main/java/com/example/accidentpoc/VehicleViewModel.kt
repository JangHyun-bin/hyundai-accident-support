package com.example.accidentpoc

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.time.Instant

internal enum class FailureReason(val wire: String) { Unavailable("unavailable"), Expired("expired"), Access("access") }

// Mirrors VehicleHandoffState in prototype/web/src/product/vehicle-handoff.ts; the web renders whatever this sends.
internal sealed interface HandoffState {
    data object Idle : HandoffState
    data object Starting : HandoffState
    data class Pairing(val pair: PairLink, val claims: List<PairClaim>, val progress: VehicleProgress) : HandoffState
    data class Connected(val progress: VehicleProgress) : HandoffState
    data class Failed(val reason: FailureReason, val progress: VehicleProgress?) : HandoffState
}

private enum class Settle { Resume, Recover, Renew }

internal class VehicleViewModel(application: Application) : AndroidViewModel(application) {
    private val origin = BuildConfig.API_BASE_URL
    private val mutableHandoff = MutableStateFlow<HandoffState>(HandoffState.Idle)
    val handoff = mutableHandoff.asStateFlow()
    private val mutableFacts = MutableStateFlow<Map<String, SdkFact>>(emptyMap())
    val facts = mutableFacts.asStateFlow()
    private var journeyId: String? = null
    private var repository: VehicleRepository? = null
    private var epoch = 0
    private var inflight = 0
    private var polling: Job? = null
    private val safety = PleosSafetySource(application) { seats, fact ->
        mutableFacts.value = seats
        if (fact != null) repository?.let(::uploadFacts)
    }
    val environment get() = safety.environment

    init {
        safety.start()
    }

    fun handle(command: HandoffCommand) {
        when (command) {
            is HandoffCommand.Journey -> select(command.id)
            HandoffCommand.Start -> command(HandoffState.Starting) { settle(it, Settle.Recover) }
            HandoffCommand.Renew -> command { settle(it, Settle.Renew) }
            HandoffCommand.Retry -> {
                val forget = (handoff.value as? HandoffState.Failed)?.reason == FailureReason.Access
                command(HandoffState.Starting) {
                    if (forget) it.forget()
                    settle(it, Settle.Recover)
                }
            }
            is HandoffCommand.Approve -> {
                val claim = (handoff.value as? HandoffState.Pairing)?.claims?.firstOrNull { it.claimId == command.claimId } ?: return
                command { HandoffState.Connected(checkNotNull(it.approve(claim).progress)) }
            }
        }
    }

    fun setActive(active: Boolean) {
        polling?.cancel()
        polling = if (active) viewModelScope.launch { while (isActive) { poll(); delay(3_000) } } else null
    }

    private fun select(id: String?) {
        if (id == journeyId) return
        journeyId = id
        epoch++
        mutableHandoff.value = HandoffState.Idle
        val selected = if (id != null && origin.isNotEmpty()) {
            VehicleRepository(SecureVehicleStore(getApplication<Application>(), storeName(origin, id)), origin)
        } else null
        repository = selected
        if (selected == null) return
        val ticket = epoch
        viewModelScope.launch {
            val stored = try { selected.snapshot().saved != null } catch (error: Exception) {
                if (error is CancellationException) throw error
                true
            }
            if (stored && ticket == epoch) handle(HandoffCommand.Start)
        }
    }

    private fun command(pending: HandoffState? = null, work: suspend (VehicleRepository) -> HandoffState) {
        if (journeyId == null) return
        val selected = repository
        if (selected == null) {
            mutableHandoff.value = HandoffState.Failed(FailureReason.Unavailable, null)
            return
        }
        val ticket = ++epoch
        pending?.let { mutableHandoff.value = it }
        execute(selected, ticket, work)
    }

    private fun poll() {
        val selected = repository ?: return
        if (inflight > 0) return
        val mode = when (val state = handoff.value) {
            is HandoffState.Pairing, is HandoffState.Connected -> Settle.Resume
            is HandoffState.Failed -> if (state.reason == FailureReason.Unavailable) Settle.Recover else return
            else -> return
        }
        execute(selected, epoch) { settle(it, mode) }
    }

    private fun execute(selected: VehicleRepository, ticket: Int, work: suspend (VehicleRepository) -> HandoffState) {
        inflight++
        viewModelScope.launch {
            val next = try {
                work(selected)
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                HandoffState.Failed(reason(error), progress(handoff.value))
            } finally { inflight-- }
            if (ticket != epoch) return@launch
            mutableHandoff.value = next
            if (next !is HandoffState.Failed) uploadFacts(selected)
        }
    }

    private suspend fun settle(selected: VehicleRepository, mode: Settle): HandoffState {
        var snapshot = selected.start()
        if (snapshot.saved?.pendingApproval != null) snapshot = selected.retryApproval()
        val progress = checkNotNull(snapshot.progress)
        if (progress.phone.paired) return HandoffState.Connected(progress)
        val pair = snapshot.saved?.pair
        if (mode != Settle.Renew && pair != null && pair.expiresAt.isAfter(Instant.now())) {
            return HandoffState.Pairing(pair, selected.claims(), progress)
        }
        if (mode == Settle.Resume && pair != null) return HandoffState.Failed(FailureReason.Expired, progress)
        val paired = selected.newPair()
        return HandoffState.Pairing(checkNotNull(paired.saved?.pair), emptyList(), paired.progress ?: progress)
    }

    // A failed upload stays queued in the encrypted store and is resent after the next successful poll.
    private fun uploadFacts(selected: VehicleRepository) {
        viewModelScope.launch {
            try {
                facts.value.values.forEach { selected.enqueueFact(it) }
                selected.sendPending()
            } catch (error: Exception) {
                if (error is CancellationException) throw error
            }
        }
    }

    private fun progress(state: HandoffState): VehicleProgress? = when (state) {
        is HandoffState.Pairing -> state.progress
        is HandoffState.Connected -> state.progress
        is HandoffState.Failed -> state.progress
        else -> null
    }

    private fun reason(error: Exception) = when {
        error is PairExpired -> FailureReason.Expired
        error is VehicleApiException && (error.status == 401 || error.status == 403) -> FailureReason.Access
        else -> FailureReason.Unavailable
    }

    override fun onCleared() {
        safety.stop()
        super.onCleared()
    }
}

// One encrypted identity per backend origin and journey, so a rebuilt app pointing at another server never reuses a foreign case.
private fun storeName(origin: String, journeyId: String) = "vehicle-" +
    MessageDigest.getInstance("SHA-256").digest("$origin\n$journeyId".toByteArray()).take(8).joinToString("") { "%02x".format(it) }
