package com.example.accidentpoc

import ai.pleos.playground.vehicle.Vehicle
import ai.pleos.playground.vehicle.api.Safety
import ai.pleos.playground.vehicle.api.model.area.SeatArea
import ai.pleos.playground.vehicle.api.model.capability.AccessType
import ai.pleos.playground.vehicle.constant.PleosPermission
import ai.pleos.playground.vehicle.listener.SeatAirbagDeployedListener
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import java.time.Instant

internal data class SafetyState(val source: FactSource, val facts: Map<String, SdkFact> = emptyMap())
internal data class SignalLine(val text: String, val tone: String)

internal fun SafetyState.line(): SignalLine {
    val readings = facts.values.filterIsInstance<SdkFact.Reading>()
    val gap = facts.values.filterIsInstance<SdkFact.Unavailable>().maxByOrNull { it.observedAt }
    val (status, tone) = when {
        readings.any { it.value } -> "에어백 전개 신호 있음" to "attention"
        readings.isNotEmpty() -> "에어백 전개 신호 없음" to "neutral"
        gap == null -> "에어백 신호 확인 중" to "unknown"
        else -> when (gap.cause) {
            UnavailableCause.PermissionDenied -> "에어백 신호 권한 없음"
            UnavailableCause.Unsupported -> "에어백 신호 미지원"
            UnavailableCause.Disconnected -> "차량 서비스 연결 안 됨"
            UnavailableCause.ReadFailed -> "에어백 신호를 읽지 못함"
        } to "unknown"
    }
    return SignalLine(listOfNotNull("Pleos SDK", status, "시뮬레이션".takeIf { source == FactSource.Simulation }).joinToString(" · "), tone)
}

internal class PleosSafetySource(private val context: Context, private val onUpdate: (SafetyState, SdkFact?) -> Unit) {
    private val main = Handler(Looper.getMainLooper())
    private val environment = if (BuildConfig.VEHICLE_ENVIRONMENT == "emulator" ||
        Build.FINGERPRINT.contains("generic", ignoreCase = true) || Build.FINGERPRINT.contains("emulator", ignoreCase = true) ||
        Build.MODEL.contains("Emulator", ignoreCase = true) || Build.HARDWARE in setOf("ranchu", "goldfish")) FactSource.Simulation else FactSource.Pleos
    private var state = SafetyState(source = environment)
    private var vehicle: Vehicle? = null
    private var safety: Safety? = null
    private var generation = 0
    private val listeners = mutableMapOf<SeatArea, SeatAirbagDeployedListener>()
    private val sequences = mutableMapOf<String, Int>()
    private val poll = object : Runnable {
        override fun run() {
            listeners.keys.toList().forEach(::readSeat)
            main.postDelayed(this, 15_000)
        }
    }

    fun start() {
        stop()
        state = SafetyState(source = environment)
        onUpdate(state, null)
        try {
            context.packageManager.getPermissionInfo(PleosPermission.CAR_SAFETY, 0)
        } catch (_: PackageManager.NameNotFoundException) {
            unavailable("all", UnavailableCause.Unsupported)
            return
        }
        if (ContextCompat.checkSelfPermission(context, PleosPermission.CAR_SAFETY) != PackageManager.PERMISSION_GRANTED) {
            unavailable("all", UnavailableCause.PermissionDenied)
            return
        }
        val epoch = generation
        var capabilitiesReturned = false
        try {
            val instance = Vehicle(context)
            vehicle = instance
            instance.initialize()
            val api = instance.getSafety()
            safety = api
            api.checkAirbagDeployedCapabilities(onComplete = { config, areas ->
                main.post {
                    if (epoch != generation) return@post
                    capabilitiesReturned = true
                    if (config.accessType !in setOf(AccessType.READ, AccessType.READ_WRITE) || areas.isEmpty()) {
                        unavailable("all", UnavailableCause.Unsupported)
                    } else {
                        areas.distinct().forEach { area ->
                            val listener = object : SeatAirbagDeployedListener {
                                override fun onSeatAirbagDeployUpdated(deployed: Boolean?) {
                                    main.post {
                                        if (epoch == generation) {
                                            val seat = seatId(area)
                                            sequences[seat] = (sequences[seat] ?: 0) + 1
                                            reading(seat, deployed)
                                        }
                                    }
                                }
                                override fun onFailed(e: Exception) {
                                    main.post { if (epoch == generation) unavailable(seatId(area), cause(e)) }
                                }
                            }
                            listeners[area] = listener
                            try { api.registerSeatAirbagDeployed(area, listener) }
                            catch (error: Exception) { unavailable(seatId(area), cause(error)) }
                            readSeat(area)
                        }
                        main.postDelayed(poll, 15_000)
                    }
                }
            }, onFailed = { error ->
                main.post {
                    if (epoch == generation) {
                        capabilitiesReturned = true
                        unavailable("all", cause(error))
                    }
                }
            })
            main.postDelayed({
                if (epoch == generation && !capabilitiesReturned) unavailable("all", UnavailableCause.Disconnected)
            }, 10_000)
        } catch (error: Exception) { unavailable("all", cause(error)) }
    }

    private fun readSeat(area: SeatArea) {
        val api = safety ?: return
        val epoch = generation
        val seat = seatId(area)
        val sequence = (sequences[seat] ?: 0) + 1
        sequences[seat] = sequence
        var completed = false
        try {
            api.hasSeatAirbagBeenDeployed(area, onComplete = { value ->
                main.post {
                    if (epoch == generation && sequence == sequences[seat]) {
                        completed = true
                        reading(seat, value)
                    }
                }
            }, onFailed = { error ->
                main.post {
                    if (epoch == generation && sequence == sequences[seat]) {
                        completed = true
                        unavailable(seat, cause(error))
                    }
                }
            })
            main.postDelayed({
                if (epoch == generation && sequence == sequences[seat] && !completed) unavailable(seat, UnavailableCause.Disconnected)
            }, 10_000)
        } catch (error: Exception) { unavailable(seat, cause(error)) }
    }

    private fun reading(seat: String, value: Boolean?) {
        if (value == null) { unavailable(seat, UnavailableCause.ReadFailed); return }
        val fact = SdkFact.Reading(seat, Instant.now(), value, environment)
        state = state.copy(facts = state.facts - "all" + (seat to fact))
        onUpdate(state, fact)
    }
    private fun unavailable(seat: String, cause: UnavailableCause) {
        val fact = SdkFact.Unavailable(seat, Instant.now(), cause)
        state = state.copy(facts = state.facts + (seat to fact))
        onUpdate(state, fact)
    }
    // SDK 2.3.2 ships its exception type obfuscated, so the platform permission failure is the only cause told apart by type.
    private fun cause(error: Exception) = if (error is SecurityException) UnavailableCause.PermissionDenied else UnavailableCause.ReadFailed
    private fun seatId(area: SeatArea) = area.values.joinToString("+") { it.name }.ifEmpty { "unknown-seat" }

    fun stop() {
        generation++
        main.removeCallbacksAndMessages(null)
        val api = safety
        if (api != null) listeners.forEach { (area, listener) ->
            try { api.unregisterSeatAirbagDeployed(area, listener) } catch (_: Exception) { }
        }
        listeners.clear()
        sequences.clear()
        try { vehicle?.release() } catch (_: Exception) { }
        safety = null
        vehicle = null
    }
}
