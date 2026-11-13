package com.example.accidentpoc

import androidx.compose.runtime.saveable.Saver
import org.json.JSONArray
import org.json.JSONObject

internal val scopeItems = listOf("사고 위치", "차량 상태", "사고 기록")
private val submittableStatuses = setOf("not_sent", "deferred", "declined", "failed", "not_received")
private val settledReceiptScenes = setOf("arrived", "handoff")
private val unconfirmedReceiptScenes = setOf("initial", "checking", "lookup_failed", "not_received", "review", "sending", "send_failed")
internal data class Session(
    val version: Int = 1,
    val scenarioId: String,
    val sceneId: String,
    val requests: Map<String, String>,
    val facts: Map<String, FactOverride>,
    val record: String = "",
    val savedRecord: String = "",
    val scope: List<String> = scopeItems.take(2),
    val approvedScope: List<String> = scopeItems.take(2),
    val approvedRecord: String = "",
    val draftApproved: Boolean = true,
    val requestId: String? = "SC05-1",
    val submissions: Int = 1,
    val returnTo: String,
    val suspendedFrom: String? = null
)

internal fun createSession(story: Scenario, sceneId: String = story.initial): Session {
    require(story.id == "SC05") { "Native product UI supports SC05 only" }
    val scene = story.scene(sceneId)
    return Session(scenarioId = story.id, sceneId = scene.id,
        requests = story.requests.associate { it.id to it.status } + scene.requestOverrides,
        facts = scene.factOverrides, returnTo = story.initial,
        suspendedFrom = if (scene.id == "suspended") story.initial else null)
}

internal fun sessionFacts(story: Scenario, session: Session) = story.facts.map { fact ->
    val override = session.facts[fact.id]
    fact.copy(label = override?.label ?: fact.label, value = override?.value ?: fact.value, status = override?.status ?: fact.status)
}

private fun mergeFacts(current: Map<String, FactOverride>, incoming: Map<String, FactOverride>): Map<String, FactOverride> {
    if (incoming.isEmpty()) return current
    return current.toMutableMap().apply {
        incoming.forEach { (id, value) ->
            val known = current[id]
            if (known?.status != "confirmed" || value.status == "confirmed") {
                put(id, FactOverride(value.label ?: known?.label, value.value ?: known?.value, value.status ?: known?.status))
            }
        }
    }
}

private fun applyScene(story: Scenario, session: Session, target: String): Session {
    val scene = story.scene(target)
    val requests = if (scene.requestOverrides.isEmpty()) session.requests else session.requests.toMutableMap().apply {
        scene.requestOverrides.forEach { (id, status) -> if (get(id) != "received" || status == "received") put(id, status) }
    }
    return session.copy(sceneId = target, requests = requests, facts = mergeFacts(session.facts, scene.factOverrides),
        draftApproved = if (target == "review") false else session.draftApproved)
}

// Scene controls change a projection, never the accumulated receipt, approval snapshot or request identity.
internal fun selectScene(story: Scenario, session: Session, target: String): Session = applyScene(story,
    if (target == "suspended" && session.sceneId != "suspended") session.copy(suspendedFrom = session.sceneId) else session, target)

internal fun updateDraft(session: Session, scope: List<String> = session.scope, record: String = session.record): Session {
    require(scope.distinct().size == scope.size && scope.all { it in scopeItems }) { "Invalid scope" }
    require(record.length <= 500) { "Record exceeds 500 characters" }
    return session.copy(scope = scope.toList(), record = record, draftApproved = false)
}

internal fun submissionBlockReason(session: Session, agency: String = "vehicle"): String? = when {
    session.scope.isEmpty() -> "보낼 항목을 하나 이상 선택하세요."
    "사고 기록" in session.scope && session.savedRecord.isBlank() -> "보관된 사고 기록이 없어요. 사고 기록을 전송 범위에서 제외하세요."
    session.requests[agency] !in submittableStatuses -> "기존 요청 결과부터 확인하세요. 새 요청을 보내지 않아요."
    else -> null
}

// Pure SC05 transitions follow Web session.ts; only a current edge can execute, including self-target effects.
internal fun transition(story: Scenario, session: Session, edge: Transition): Session {
    val scene = story.scene(session.sceneId)
    if (edge !in scene.actions && edge !in scene.events) return session
    var next = session
    var target = edge.to
    val agency = edge.agency ?: "vehicle"
    when (edge.effect) {
        "submit" -> {
            if (submissionBlockReason(session, agency) != null) return session
            val count = session.submissions + 1
            next = next.copy(submissions = count, requestId = "${story.id}-$count",
                approvedScope = session.scope.toList(), approvedRecord = session.savedRecord, draftApproved = true)
        }
        "receive" -> next = next.copy(requests = next.requests + (agency to "received"))
        "not_received" -> if (next.requests[agency] != "received") next = next.copy(requests = next.requests + (agency to "not_received"))
        "handoff" -> next = next.copy(facts = mergeFacts(next.facts, mapOf("handoff" to FactOverride(value = "인계 확인", status = "confirmed"))))
        "suspend" -> next = next.copy(suspendedFrom = scene.id)
        "resume" -> {
            target = if (session.requests["vehicle"] == "received") {
                session.suspendedFrom?.takeIf { it in settledReceiptScenes } ?: "received"
            } else "checking"
            next = next.copy(suspendedFrom = null)
        }
        null -> Unit
        else -> error("Unsupported SC05 effect ${edge.effect}")
    }
    return applyScene(story, next, target)
}

// A delayed unknown result may change the lookup projection, never the already confirmed receipt copy.
internal fun projectedScene(story: Scenario, session: Session): Scene {
    val scene = story.scene(session.sceneId)
    if (session.requests["vehicle"] != "received") return scene
    val arrival = session.facts["arrival"]?.status == "confirmed"
    val detail = if (arrival) "차량 지원 · 도착 확인" else "차량 지원 · 도착 미확인"
    if (scene.id == "received") return scene.copy(cueDetail = detail)
    if (scene.id == "suspended") return scene.copy(cueStatus = "confirmed", cueLabel = "접수 확인", cueDetail = detail)
    if (scene.id !in unconfirmedReceiptScenes) return scene
    val received = story.scene("received")
    return scene.copy(title = received.title, cueStatus = received.cueStatus, cueLabel = received.cueLabel,
        cueDetail = detail, instruction = "접수는 확인됐어요. 현장 도착·구호 인계는 각각 확인하세요.")
}

internal fun encodeSession(session: Session): String = JSONObject().apply {
    put("version", session.version); put("scenarioId", session.scenarioId); put("sceneId", session.sceneId)
    put("requests", JSONObject(session.requests))
    put("facts", JSONObject().apply {
        session.facts.forEach { (id, fact) -> put(id, JSONObject().apply {
            fact.label?.let { put("label", it) }; fact.value?.let { put("value", it) }; fact.status?.let { put("status", it) }
        }) }
    })
    put("record", session.record); put("savedRecord", session.savedRecord)
    put("scope", JSONArray(session.scope)); put("approvedScope", JSONArray(session.approvedScope)); put("approvedRecord", session.approvedRecord)
    put("draftApproved", session.draftApproved); put("requestId", session.requestId ?: JSONObject.NULL)
    put("submissions", session.submissions); put("returnTo", session.returnTo); put("suspendedFrom", session.suspendedFrom ?: JSONObject.NULL)
}.toString()

internal fun decodeSession(story: Scenario, value: String): Session {
    val root = JSONObject(value)
    require(root.get("version") == 1 && root.text("scenarioId") == story.id) { "Invalid session version/scenario" }
    fun scene(key: String) = root.text(key).also { id -> require(story.scenes.any { it.id == id }) { "Invalid session scene $id" } }
    fun scope(key: String) = root.getJSONArray(key).let { array -> List(array.length()) {
        (array.get(it) as? String ?: error("Invalid scope type")).also { item -> require(item in scopeItems) }
    } }.also { require(it.distinct().size == it.size) }
    fun record(key: String) = root.text(key).also { require(it.length <= 500) }
    val requests = root.getJSONObject("requests").let { requests ->
        require(requests.keyList().toSet() == story.requests.map { it.id }.toSet())
        requests.keyList().associateWith { requests.text(it).also { status -> require(status in story.statuses) } }
    }
    val facts = root.getJSONObject("facts").let { facts -> facts.keyList().associateWith { id ->
        require(story.facts.any { it.id == id })
        val fact = facts.getJSONObject(id)
        require(fact.keyList().all { it in setOf("label", "value", "status") })
        fun optional(key: String) = if (fact.has(key)) fact.text(key) else null
        FactOverride(optional("label"), optional("value"), optional("status").also { require(it == null || it in factStatuses) })
    } }
    val count = root.get("submissions").also { require(it is Int && it >= 1) } as Int
    val requestId = root.text("requestId").also { require(it == "${story.id}-$count") }
    val approved = root.get("draftApproved").also { require(it is Boolean) } as Boolean
    val suspended = if (root.isNull("suspendedFrom")) null else scene("suspendedFrom")
    return Session(scenarioId = story.id, sceneId = scene("sceneId"), requests = requests, facts = facts,
        record = record("record"), savedRecord = record("savedRecord"), scope = scope("scope"), approvedScope = scope("approvedScope"),
        approvedRecord = record("approvedRecord"), draftApproved = approved, requestId = requestId, submissions = count,
        returnTo = scene("returnTo"), suspendedFrom = suspended)
}

internal fun sessionSaver(story: Scenario) = Saver<Session, String>(save = { encodeSession(it) }, restore = { runCatching { decodeSession(story, it) }.getOrNull() })
