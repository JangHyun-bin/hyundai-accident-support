package com.example.accidentpoc

import org.json.JSONObject
import java.time.Instant

internal enum class VehicleActionId(val wire: String) {
    NeedHelp("need-help"),
    Ready("confirm-record-ready"),
    Defer("defer-recording"),
    Risk("report-risk"),
    Resume("resume-recording"),
    Decline("decline-sharing");

    companion object {
        fun parse(value: String) = entries.firstOrNull { it.wire == value }
            ?: throw IllegalArgumentException("Unsupported vehicle action")
    }
}

internal data class VehicleProgress(
    val caseId: String,
    val revision: Long,
    val updatedAt: Instant,
    val stage: String,
    val suspended: Boolean,
    val riskCheckRequired: Boolean,
    val sceneId: String,
    val title: String,
    val body: String,
    val actions: List<VehicleActionId>,
    val phone: PhoneProgress,
    val record: RecordProgress,
    val copyPreparedAt: Instant?,
) {
    companion object {
        fun parse(value: JSONObject): VehicleProgress {
            require(value.get("schemaVersion") == 1)
            val insurance = value.getJSONObject("insurance")
            require(insurance.string("integration") == "unavailable" && insurance.isNull("receipt"))
            val scene = value.getJSONObject("scene")
            val phone = value.getJSONObject("phone")
            val record = value.getJSONObject("record")
            val stage = value.string("stage")
            require(stage in setOf("response", "record", "review", "follow-up"))
            val actions = scene.getJSONArray("actions").objects().map {
                VehicleActionId.parse(it.string("id"))
            }
            require(actions.distinct().size == actions.size)
            val paired = phone.boolean("paired")
            val online = phone.boolean("online")
            val seen = phone.optionalInstant("lastSeenAt")
            require(!online || (paired && seen != null))
            return VehicleProgress(
                caseId = value.string("caseId"), revision = value.nonnegativeLong("revision"),
                updatedAt = Instant.parse(value.string("updatedAt")), stage = stage,
                suspended = value.boolean("suspended"), riskCheckRequired = value.boolean("riskCheckRequired"),
                sceneId = scene.string("id"), title = scene.string("title"), body = scene.string("body"),
                actions = actions,
                phone = PhoneProgress(paired, online, seen, phone.optionalString("clientId")),
                record = RecordProgress(record.nonnegativeLong("photos"), record.nonnegativeLong("audio"),
                    record.nonnegativeLong("video"), record.recordState("statement"), record.recordState("report")),
                copyPreparedAt = value.getJSONObject("copy").optionalInstant("preparedAt"),
            )
        }
    }
}

internal data class PhoneProgress(val paired: Boolean, val online: Boolean, val lastSeenAt: Instant?, val clientId: String?)
internal data class RecordProgress(val photos: Long, val audio: Long, val video: Long, val statement: String, val report: String)
internal data class CaseAccess(val caseId: String, val credential: String, val expiresAt: Instant)
internal data class PairLink(val pairId: String, val joinUrl: String, val expiresAt: Instant)
internal data class PairClaim(val claimId: String, val verificationCode: String, val deviceLabel: String, val expiresAt: Instant)
internal enum class FactSource(val wire: String) { Pleos("pleos-sdk"), Simulation("simulation") }
internal enum class UnavailableCause(val wire: String) {
    PermissionDenied("permission-denied"), Unsupported("capability-missing"), Disconnected("disconnected"), ReadFailed("read-failed")
}

internal sealed interface SdkFact {
    val seatId: String
    val observedAt: Instant

    data class Reading(override val seatId: String, override val observedAt: Instant, val value: Boolean, val source: FactSource) : SdkFact
    data class Unavailable(override val seatId: String, override val observedAt: Instant, val cause: UnavailableCause) : SdkFact

    fun fingerprint(): String = when (this) {
        is Reading -> "$seatId:reading:$value:${source.wire}"
        is Unavailable -> "$seatId:unavailable:${cause.wire}"
    }

    fun json(): JSONObject = JSONObject().put("signal", "seat-airbag-deployed")
        .put("seatId", seatId).put("sdkVersion", "2.3.2").put("observedAt", observedAt.toString()).apply {
            when (val fact = this@SdkFact) {
                is Reading -> put("kind", "reading").put("value", fact.value).put("source", fact.source.wire)
                is Unavailable -> put("kind", "unavailable").put("cause", fact.cause.wire)
            }
        }

    companion object {
        fun parse(value: JSONObject): SdkFact {
            require(value.string("signal") == "seat-airbag-deployed" && value.string("sdkVersion") == "2.3.2")
            val seat = value.string("seatId")
            val at = Instant.parse(value.string("observedAt"))
            return when (value.string("kind")) {
                "reading" -> Reading(seat, at, value.boolean("value"), FactSource.entries.first { it.wire == value.string("source") })
                "unavailable" -> Unavailable(seat, at, UnavailableCause.entries.first { it.wire == value.string("cause") })
                else -> throw IllegalArgumentException("Unsupported SDK fact")
            }
        }
    }
}

internal sealed interface VehicleIntent {
    data class Action(val id: VehicleActionId) : VehicleIntent
    data class Fact(val fact: SdkFact) : VehicleIntent
}
internal data class PendingMutation(val mutationId: String, val expectedRevision: Long, val intent: VehicleIntent) {
    fun body(): JSONObject = JSONObject().put("mutationId", mutationId).put("expectedRevision", expectedRevision).apply {
        when (val value = intent) {
            is VehicleIntent.Action -> put("actionId", value.id.wire)
            is VehicleIntent.Fact -> put("fact", value.fact.json())
        }
    }
}

internal fun JSONObject.string(key: String): String = (get(key) as? String)
    ?: throw IllegalArgumentException("Expected text for $key")
internal fun JSONObject.boolean(key: String): Boolean = (get(key) as? Boolean)
    ?: throw IllegalArgumentException("Expected boolean for $key")
internal fun JSONObject.nonnegativeLong(key: String): Long {
    val value = get(key)
    require(value is Int || value is Long)
    return (value as Number).toLong().also { require(it >= 0) }
}
internal fun JSONObject.optionalString(key: String): String? = if (isNull(key)) null else string(key)
internal fun JSONObject.optionalInstant(key: String): Instant? = optionalString(key)?.let(Instant::parse)
private fun JSONObject.recordState(key: String) = string(key).also { require(it in setOf("empty", "draft", "confirmed")) }
