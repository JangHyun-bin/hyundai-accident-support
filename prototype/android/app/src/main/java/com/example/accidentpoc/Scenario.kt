package com.example.accidentpoc

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

internal data class Fact(val id: String, val label: String, val value: String, val status: String)
internal data class FactOverride(val label: String? = null, val value: String? = null, val status: String? = null)
internal data class Request(val id: String, val label: String, val status: String)
internal data class Transition(
    val id: String, val label: String, val to: String,
    val effect: String? = null, val agency: String? = null, val secondary: Boolean = false
)
internal data class Scene(
    val id: String, val label: String, val title: String, val instruction: String, val voice: String,
    val cueSymbol: String, val cueStatus: String, val cueLabel: String, val cueDetail: String,
    val requestOverrides: Map<String, String>, val factOverrides: Map<String, FactOverride>,
    val panel: String?, val actions: List<Transition>, val events: List<Transition>
)
internal data class Scenario(
    val id: String, val initial: String, val contextLabel: String, val supportTitle: String, val supportNote: String,
    val facts: List<Fact>, val requests: List<Request>, val statuses: Map<String, Pair<String, String>>,
    val scenes: List<Scene>, val visibleFacts: List<String>, val visibleRequests: List<String>
) {
    fun scene(id: String) = scenes.first { it.id == id }
}

internal val factStatuses = setOf("neutral", "confirmed", "unknown", "attention")
internal val requestStatuses = setOf("not_sent", "connection_unknown", "connected", "checking", "unknown", "received", "sent", "failed", "not_received", "deferred", "declined")
private val effects = setOf("receive", "not_received", "handoff", "suspend", "resume", "submit", "save_record", "return", "risk", "support")
private val panels = setOf("scope", "record", "record_summary", "receipt", "resume", "support")
private val identifier = Regex("[a-z][a-z0-9_]*")

internal fun JSONArray.objects() = List(length()) { getJSONObject(it) }
internal fun JSONObject.keyList() = keys().asSequence().toList()
internal fun JSONObject.text(key: String): String {
    val value = get(key)
    require(value is String) { "$key: expected string" }
    return value
}
private fun JSONObject.optionalText(key: String) = if (has(key)) text(key) else null
private fun JSONObject.identifier(key: String) = text(key).also { require(identifier.matches(it)) { "$key: invalid ID $it" } }
private fun JSONArray.identifiers(): List<String> = List(length()) {
    val value = get(it)
    require(value is String && identifier.matches(value)) { "Invalid ID at index $it" }
    value
}.also { require(it.distinct().size == it.size) { "Duplicate ID" } }
private fun <T> List<T>.uniqueIds(id: (T) -> String) = also {
    require(map(id).distinct().size == size) { "Duplicate ID" }
}

// The shared fixture remains the source of truth; valid overrides are data, not an unsupported-feature guard.
internal fun loadScenario(context: Context, id: String): Scenario = parseScenario(
    context.assets.open("scenarios.json").bufferedReader().use { it.readText() }, id
)

internal fun parseScenario(source: String, id: String): Scenario = try {
    val root = JSONObject(source)
    require(root.text("version") == "0.2") { "Unsupported manifest version" }
    require(root.get("simulation_only") == true && root.text("data_source") == "scenario_fixture") { "Expected simulation fixture" }
    val statuses = root.getJSONObject("request_statuses").let { all ->
        require(all.keyList().toSet() == requestStatuses) { "Unsupported request status keys" }
        all.keyList().associateWith { key -> all.getJSONObject(key).let { status ->
            val tone = status.text("tone")
            require(tone in factStatuses) { "$key: invalid tone $tone" }
            status.text("label") to tone
        } }
    }
    val all = root.getJSONArray("scenarios").objects().uniqueIds { it.text("id") }
    require(all.all { it.text("id") in setOf("SC01", "SC02", "SC03", "SC04", "SC05") }) { "Unsupported scenario ID" }
    val scenario = all.firstOrNull { it.text("id") == id } ?: error("Unknown scenario $id")
    val facts = scenario.getJSONArray("facts").objects().map { fact ->
        Fact(fact.identifier("id"), fact.text("label"), fact.text("value"), fact.text("status").also {
            require(it in factStatuses) { "Invalid fact status $it" }
        })
    }.uniqueIds { it.id }
    val requests = scenario.getJSONArray("requests").objects().map { request ->
        Request(request.identifier("id"), request.text("label"), request.text("status").also {
            require(it in statuses) { "Invalid request status $it" }
        })
    }.uniqueIds { it.id }
    val factIds = facts.map { it.id }.toSet()
    val requestIds = requests.map { it.id }.toSet()
    val states = scenario.getJSONArray("states").objects().uniqueIds { it.identifier("id") }
    require(states.isNotEmpty()) { "Empty states" }
    val stateIds = states.map { it.text("id") }.toSet()
    val initial = scenario.identifier("initial")
    require(initial in stateIds) { "Unknown initial state $initial" }
    require(requestIds == setOf("rescue", "vehicle", "insurance")) { "Unsupported agency IDs" }
    val sceneEffects = if (id == "SC05") setOf("receive", "not_received", "handoff", "suspend", "resume", "submit") else effects
    val scenes = states.map { state ->
        val sceneId = state.text("id")
        try {
            fun transitions(key: String) = state.getJSONArray(key).objects().map { edge ->
                val to = edge.identifier("to")
                require(to in stateIds) { "Unknown target $to" }
                val effect = edge.optionalText("effect")
                require(effect == null || effect in sceneEffects) { "Unsupported effect $effect" }
                val agency = edge.optionalText("agency")
                require(agency == null || agency in requestIds) { "Unknown agency $agency" }
                val secondary = if (edge.has("secondary")) edge.get("secondary").also {
                    require(it is Boolean) { "secondary: expected boolean" }
                } as Boolean else false
                Transition(edge.identifier("id"), edge.text("label"), to, effect, agency, secondary)
            }.uniqueIds { it.id }
            val requestOverrides = state.getJSONObject("request_overrides").let { overrides ->
                overrides.keyList().associateWith { key ->
                    require(key in requestIds) { "Unknown request override $key" }
                    overrides.text(key).also { require(it in statuses) { "Invalid request status $it" } }
                }
            }
            val factOverrides = state.getJSONObject("fact_overrides").let { overrides ->
                overrides.keyList().associateWith { key ->
                    require(key in factIds) { "Unknown fact override $key" }
                    val value = overrides.getJSONObject(key)
                    require(value.keyList().all { it in setOf("label", "value", "status") }) { "Unknown fact override field $key" }
                    FactOverride(value.optionalText("label"), value.optionalText("value"), value.optionalText("status").also {
                        require(it == null || it in factStatuses) { "Invalid fact status $it" }
                    })
                }
            }
            val cue = state.getJSONObject("cue")
            val cueStatus = cue.text("status").also { require(it in factStatuses) { "Invalid cue status $it" } }
            val panel = state.optionalText("panel").also { require(it == null || it in panels) { "Unsupported panel $it" } }
            val actions = transitions("actions")
            val events = transitions("events")
            require((actions + events).map { it.id }.distinct().size == actions.size + events.size) { "Duplicate transition ID" }
            Scene(sceneId, state.text("label"), state.text("title"), state.optionalText("instruction") ?: "", state.text("voice"),
                cue.text("symbol"), cueStatus, cue.text("label"), cue.text("detail"),
                requestOverrides, factOverrides, panel, actions, events)
        } catch (error: Exception) {
            throw IllegalArgumentException("$sceneId: ${error.message}", error)
        }
    }
    val presentation = scenario.getJSONObject("presentation")
    val visibleFacts = presentation.getJSONArray("visible_facts").identifiers()
    val visibleRequests = presentation.getJSONArray("visible_requests").identifiers()
    require(visibleFacts.all { it in factIds } && visibleRequests.all { it in requestIds }) { "Unknown presentation reference" }
    Scenario(id, initial, presentation.text("context_label"), presentation.text("support_title"),
        presentation.optionalText("support_note") ?: "", facts, requests, statuses, scenes, visibleFacts, visibleRequests)
} catch (error: Exception) {
    throw IllegalArgumentException("scenarios.json/$id: ${error.message}", error)
}
