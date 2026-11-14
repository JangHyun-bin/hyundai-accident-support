package com.example.accidentpoc

import android.view.ViewGroup
import android.webkit.WebView
import androidx.test.core.app.ActivityScenario
import org.json.JSONObject
import org.json.JSONTokener
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.TimeUnit

class WebHostTest {
    @Test fun bundledJourneyGetsTheBridgeAndCannotLeaveItsOrigin() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            waitFor(scenario, "location.origin + ' ' + document.readyState") { it == "https://appassets.androidplatform.net complete" }
            val host = JSONObject(evaluate(scenario, "ChabunNative.host()"))
            assertEquals(1, host.getInt("version"))
            assertEquals(BuildConfig.DEMO_CONTROLS, host.getBoolean("demo"))
            assertEquals("rejected", evaluate(scenario, "ChabunNative.dial('112')"))

            assertEquals("200", probe(scenario, "fetch('/assets/web/index.html').then(r => String(r.status))"))
            assertEquals("403", probe(scenario, "fetch('/api/cases').then(r => String(r.status))"))
            assertEquals("blocked", probe(scenario, "fetch('https://example.com/').then(() => 'loaded')"))
            assertEquals("blocked", probe(scenario, "fetch('file:///android_asset/web/index.html').then(() => 'loaded')"))

            evaluate(scenario, "location.href = 'https://example.com/'")
            Thread.sleep(1_500)
            assertEquals("https://appassets.androidplatform.net", evaluate(scenario, "location.origin"))
            scenario.onActivity { activity ->
                val web = webView(activity)
                assertFalse(web.settings.allowFileAccess)
                assertFalse(web.settings.allowContentAccess)
                assertEquals("https://appassets.androidplatform.net", web.url?.substringBefore("/assets/"))
                val window = host.getJSONObject("windowPx")
                assertEquals(web.width to web.height, window.getInt("width") to window.getInt("height"))
            }
        }
    }

    private fun probe(scenario: ActivityScenario<MainActivity>, promise: String): String {
        evaluate(scenario, "window.__probe = 'pending'; ($promise).then(v => window.__probe = v, () => window.__probe = 'blocked'); 0")
        return waitFor(scenario, "window.__probe") { it != "pending" }
    }

    private fun waitFor(scenario: ActivityScenario<MainActivity>, script: String, done: (String) -> Boolean): String {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(30)
        while (true) {
            val value = evaluate(scenario, script)
            if (done(value)) return value
            check(System.nanoTime() < deadline) { "Timed out on $script, last value $value" }
            Thread.sleep(200)
        }
    }

    private fun evaluate(scenario: ActivityScenario<MainActivity>, script: String): String {
        val result = ArrayBlockingQueue<String>(1)
        scenario.onActivity { activity -> webView(activity).evaluateJavascript(script) { result.put(it) } }
        val raw = requireNotNull(result.poll(10, TimeUnit.SECONDS)) { "No result for $script" }
        return JSONTokener(raw).nextValue().toString()
    }

    private fun webView(activity: MainActivity): WebView {
        val root = activity.findViewById<ViewGroup>(android.R.id.content)
        return (0 until root.childCount).map(root::getChildAt).filterIsInstance<WebView>().single()
    }
}
