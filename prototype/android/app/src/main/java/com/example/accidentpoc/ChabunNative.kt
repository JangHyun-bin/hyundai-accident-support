package com.example.accidentpoc

import android.content.res.Configuration
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit

internal object WebOrigin {
    const val HOST = "appassets.androidplatform.net"
    const val START = "https://$HOST/assets/web/index.html?host=pleos-app"

    fun matches(uri: Uri): Boolean = uri.scheme == "https" && uri.host == HOST && uri.port == -1

    fun isApp(uri: Uri): Boolean = matches(uri) && uri.path.orEmpty().startsWith("/assets/web/") && ".." !in uri.pathSegments

    fun isApp(url: String?): Boolean = url != null && isApp(Uri.parse(url))
}

internal sealed interface HandoffCommand {
    data class Journey(val id: String?) : HandoffCommand
    data object Start : HandoffCommand
    data class Approve(val claimId: String) : HandoffCommand
    data object Renew : HandoffCommand
    data object Retry : HandoffCommand

    companion object {
        private val journeyId = Regex("[A-Za-z0-9._:-]{1,128}")

        fun parse(command: String?, argJson: String?): HandoffCommand? = when (command) {
            "start" -> Start
            "renew" -> Renew
            "retry" -> Retry
            "approve" -> argument(argJson, "claimId")?.let(::Approve)
            "journey" -> Journey(argument(argJson, "journeyId")?.takeIf(journeyId::matches))
            else -> null
        }

        private fun argument(json: String?, key: String): String? = try {
            json?.let { JSONObject(it).optString(key) }?.ifEmpty { null }
        } catch (_: JSONException) { null }
    }
}

internal fun HandoffState.json(): JSONObject = when (this) {
    HandoffState.Idle -> JSONObject().put("kind", "idle")
    HandoffState.Starting -> JSONObject().put("kind", "starting")
    is HandoffState.Pairing -> JSONObject().put("kind", "pairing").put("pair", pair.json())
        .put("claims", JSONArray(claims.map(PairClaim::json))).put("progress", JSONObject(progress.json))
    is HandoffState.Connected -> JSONObject().put("kind", "connected").put("progress", JSONObject(progress.json))
    is HandoffState.Failed -> JSONObject().put("kind", "failed").put("reason", reason.wire)
        .put("progress", progress?.let { JSONObject(it.json) } ?: JSONObject.NULL)
}

internal data class WindowPx(val width: Int, val height: Int) {
    fun json(): JSONObject = JSONObject().put("width", width).put("height", height)
}

internal enum class HostTheme(val wire: String) {
    Light("light"), Dark("dark");

    companion object {
        fun of(configuration: Configuration) =
            if (configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES) Dark else Light
    }
}

internal fun hostJson(environment: FactSource, window: WindowPx, theme: HostTheme): JSONObject = JSONObject().put("version", 1)
    .put("demo", BuildConfig.DEMO_CONTROLS).put("sdk", "2.3.2").put("environment", if (environment == FactSource.Simulation) "emulator" else "vehicle")
    .put("windowPx", window.json()).put("theme", theme.wire)

// Exposed as window.ChabunNative. WebView calls these on its JavaBridge thread, so work that touches the activity runs on main.
internal class ChabunNative(
    private val describe: () -> JSONObject,
    private val onHandoff: (HandoffCommand) -> Unit,
    private val openDialer: () -> Boolean,
) {
    private val main = Handler(Looper.getMainLooper())

    @JavascriptInterface fun host(): String = describe().toString()

    @JavascriptInterface fun handoff(command: String?, argJson: String?) {
        val parsed = HandoffCommand.parse(command, argJson) ?: return
        main.post { onHandoff(parsed) }
    }

    @JavascriptInterface fun dial(number: String?): String {
        if (number != "119") return "rejected"
        val opened = FutureTask { openDialer() }
        main.post(opened)
        return try {
            if (opened.get(5, TimeUnit.SECONDS)) "opened" else "unavailable"
        } catch (_: Exception) { "unavailable" }
    }
}
