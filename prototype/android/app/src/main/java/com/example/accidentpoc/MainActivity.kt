package com.example.accidentpoc

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.ByteArrayInputStream

private const val PAGE = "page"
private const val CONTENT_POLICY = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: blob:; " +
    "worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'"

class MainActivity : ComponentActivity() {
    private val vehicle: VehicleViewModel by viewModels()
    private lateinit var web: WebView
    private val sentFacts = mutableMapOf<String, String>()
    @Volatile private var windowPx = WindowPx(0, 0)
    @Volatile private var hostTheme = HostTheme.Light
    private var microphoneRequest: PermissionRequest? = null
    private val microphone = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        val request = microphoneRequest ?: return@registerForActivityResult
        microphoneRequest = null
        if (granted) request.grant(request.resources) else request.deny()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).run {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        hostTheme = HostTheme.of(resources.configuration)
        val environment = vehicle.environment
        val assets = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web = HostWebView(this) { size ->
            windowPx = size
            send("chabun:host-resize", size.json())
        }.apply {
            if (hostTheme == HostTheme.Dark) setBackgroundColor(0xFF131417.toInt())
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.setGeolocationEnabled(false)
            if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false)
            }
            webViewClient = AppClient(assets)
            webChromeClient = MicrophoneClient()
            addJavascriptInterface(ChabunNative({ hostJson(environment, windowPx, hostTheme) }, ::handoff, ::openDialer), "ChabunNative")
        }
        setContentView(web)
        web.loadUrl(savedInstanceState?.getString(PAGE)?.takeIf(WebOrigin::isApp) ?: WebOrigin.START)
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch { vehicle.handoff.collect { send("chabun:handoff", it.json()) } }
                vehicle.facts.collect { sendFacts(it, replay = false) }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        web.onResume()
        vehicle.setActive(true)
    }

    override fun onStop() {
        vehicle.setActive(false)
        web.onPause()
        super.onStop()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val next = HostTheme.of(newConfig)
        if (next == hostTheme) return
        hostTheme = next
        send("chabun:host-theme", JSONObject().put("theme", next.wire))
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.url?.takeIf(WebOrigin::isApp)?.let { outState.putString(PAGE, it) }
    }

    override fun onDestroy() {
        findViewById<ViewGroup>(android.R.id.content).removeView(web)
        web.destroy()
        super.onDestroy()
    }

    private fun handoff(command: HandoffCommand) {
        vehicle.handle(command)
        if (command !is HandoffCommand.Journey) return
        send("chabun:handoff", vehicle.handoff.value.json())
        sendFacts(vehicle.facts.value, replay = true)
    }

    private fun openDialer(): Boolean {
        val dial = Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", "119", null))
        if (dial.resolveActivity(packageManager) == null) return false
        startActivity(dial)
        return true
    }

    private fun sendFacts(facts: Map<String, SdkFact>, replay: Boolean) {
        facts.forEach { (seat, fact) ->
            val fingerprint = fact.fingerprint()
            if (replay || sentFacts[seat] != fingerprint) {
                sentFacts[seat] = fingerprint
                send("chabun:vehicle-fact", fact.json())
            }
        }
    }

    private fun send(event: String, detail: JSONObject? = null) {
        val init = if (detail == null) "" else ",{detail:$detail}"
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('$event'$init))", null)
    }

    private inner class AppClient(private val assets: WebViewAssetLoader) : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
            val served = if (WebOrigin.isApp(request.url)) assets.shouldInterceptRequest(request.url) else null
            return served?.apply { responseHeaders = mapOf("Content-Security-Policy" to CONTENT_POLICY) }
                ?: WebResourceResponse("text/plain", "utf-8", 403, "Blocked", emptyMap(), ByteArrayInputStream(ByteArray(0)))
        }

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = !WebOrigin.isApp(request.url)

        override fun onPageFinished(view: WebView, url: String?) {
            if (WebOrigin.isApp(url)) send("chabun:host-ready")
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            recreate()
            return true
        }
    }

    private inner class MicrophoneClient : WebChromeClient() {
        override fun onPermissionRequest(request: PermissionRequest) {
            if (!WebOrigin.matches(request.origin) || request.resources.toSet() != setOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                request.deny()
                return
            }
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                request.grant(request.resources)
                return
            }
            microphoneRequest?.deny()
            microphoneRequest = request
            microphone.launch(Manifest.permission.RECORD_AUDIO)
        }

        override fun onPermissionRequestCanceled(request: PermissionRequest) {
            if (microphoneRequest == request) microphoneRequest = null
        }
    }
}

private class HostWebView(context: Context, private val resized: (WindowPx) -> Unit) : WebView(context) {
    // The page re-reads host().windowPx on resize, so the new size is published before Chromium learns of it.
    override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
        resized(WindowPx(width, height))
        super.onSizeChanged(width, height, oldWidth, oldHeight)
    }
}
