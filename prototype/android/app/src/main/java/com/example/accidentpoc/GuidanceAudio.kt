package com.example.accidentpoc

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.view.accessibility.AccessibilityManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

// A clip is found by its exact script, the same rule as web src/audio/manifest.ts, so a scene speaks only when audio for its
// current voice text exists in assets/guidance.
internal class GuidanceAudio(private val context: Context) {
    private val audio = context.getSystemService(AudioManager::class.java)
    private val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()
    private val focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(attributes).setOnAudioFocusChangeListener { change ->
            if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) stop()
        }.build()
    private var clips: Map<String, String>? = null
    private var player: MediaPlayer? = null

    suspend fun speak(script: String) {
        val clip = (clips ?: withContext(Dispatchers.IO) { index() }.also { clips = it })[script]
        stop()
        if (clip == null || context.getSystemService(AccessibilityManager::class.java).isTouchExplorationEnabled) return
        if (audio.requestAudioFocus(focus) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) return
        try {
            val next = MediaPlayer()
            player = next
            next.setAudioAttributes(attributes)
            context.assets.openFd("guidance/$clip").use { next.setDataSource(it.fileDescriptor, it.startOffset, it.length) }
            next.setOnPreparedListener { if (player === it) it.start() }
            next.setOnCompletionListener { stop() }
            next.setOnErrorListener { _, _, _ -> stop(); true }
            next.prepareAsync()
        } catch (_: Exception) { stop() }
    }

    fun stop() {
        player?.release()
        player = null
        audio.abandonAudioFocusRequest(focus)
    }

    private fun index(): Map<String, String> {
        val files = context.assets.list("guidance").orEmpty().toSet()
        return files.filter { it.endsWith(".json") }.mapNotNull { name ->
            runCatching {
                val sidecar = JSONObject(context.assets.open("guidance/$name").bufferedReader().use { it.readText() })
                sidecar.string("script") to sidecar.string("file")
            }.getOrNull()?.takeIf { it.second in files }
        }.toMap()
    }
}
