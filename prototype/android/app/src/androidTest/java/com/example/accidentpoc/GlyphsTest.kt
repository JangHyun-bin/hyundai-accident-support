package com.example.accidentpoc

import android.graphics.Matrix
import android.graphics.Region
import androidx.activity.ComponentActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

class GlyphsTest {
    @get:Rule val rule = createAndroidComposeRule<ComponentActivity>()
    private val book = loadGlyphs(InstrumentationRegistry.getInstrumentation().targetContext)

    // 48 grid 좌표를 ×10 해서 정수 Region 으로 판정한다.
    private fun contains(name: String, x: Float, y: Float): Boolean {
        val path = android.graphics.Path(book.path(name)).apply { transform(Matrix().apply { setScale(10f, 10f) }) }
        return Region().apply { setPath(path, Region(0, 0, 480, 480)) }.contains((x * 10).toInt(), (y * 10).toInt())
    }

    @Test fun everyMappedGlyphBuildsANonEmptyPath() {
        listOf("vehicle", "person", "phone", "route", "heart-pulse", "handoff", "check", "arrow-right", "mark-check", "mark-question", "mark-ring", "mark-exclaim", "mark-triangle")
            .forEach { assertFalse(it, book.path(it).isEmpty) }
    }

    @Test fun heartPulseCutLeavesAGap() {
        assertFalse(contains("heart-pulse", 50 * .48f, 64 * .48f))
        assertTrue(contains("heart-pulse", 30 * .48f, 35 * .48f))
    }

    @Test fun handoffKeepsAChannelBetweenPeople() {
        assertFalse(contains("handoff", 26.4f, 15.84f))
        assertTrue(contains("handoff", 38 * .48f, 38 * .48f))
    }

    // Web 과 같은 정의 (plan Task 3): 면은 흰색, plate 는 검은색으로 다시 그린 image 로 pixel 을 나눈다.
    @Test fun cueGlyphReaches3To1() {
        var measure by mutableStateOf(false)
        rule.setContent {
            CompositionLocalProvider(LocalGlyphs provides book) {
                Box(Modifier.background(Color(0xFF808080)).testTag("frame")) {
                    Box(Modifier.size(268.dp).metalPlate(RoundedCornerShape(56.dp), measure), contentAlignment = Alignment.Center) {
                        EngravedGlyph("vehicle", Depth.Deep, 174.dp, measure)
                    }
                }
            }
        }
        val normal = rule.onNodeWithTag("frame").captureToImage().toPixelMap()
        measure = true
        rule.waitForIdle()
        val mask = rule.onNodeWithTag("frame").captureToImage().toPixelMap()
        val reach = (6 * rule.density.density).toInt()
        val width = mask.width
        val height = mask.height
        fun red(x: Int, y: Int) = (mask[x, y].red * 255).toInt()
        fun solid(x: Int, y: Int, pass: (Int) -> Boolean): Boolean {
            for (dy in -1..1) for (dx in -1..1) {
                val nx = x + dx
                val ny = y + dy
                if (nx !in 0 until width || ny !in 0 until height || !pass(red(nx, ny))) return false
            }
            return true
        }
        val face = Array(height) { y -> BooleanArray(width) { x -> solid(x, y) { it >= 250 } } }
        fun near(x: Int, y: Int): Boolean {
            for (ny in max(0, y - reach)..min(height - 1, y + reach)) for (nx in max(0, x - reach)..min(width - 1, x + reach)) if (face[ny][nx]) return true
            return false
        }
        fun linear(value: Float) = if (value <= .04045f) value / 12.92f else ((value + .055f) / 1.055f).pow(2.4f)
        fun luminance(x: Int, y: Int) = normal[x, y].let { .2126f * linear(it.red) + .7152f * linear(it.green) + .0722f * linear(it.blue) }
        var faceMin = 1f
        var plateMax = 0f
        var faceWorst = Color.Unspecified
        var plateWorst = Color.Unspecified
        var faceCount = 0
        var plateCount = 0
        for (y in 0 until height) for (x in 0 until width) {
            if (face[y][x]) { faceCount++; if (luminance(x, y) < faceMin) { faceMin = luminance(x, y); faceWorst = normal[x, y] } }
            else if (solid(x, y) { it <= 5 } && near(x, y)) { plateCount++; if (luminance(x, y) > plateMax) { plateMax = luminance(x, y); plateWorst = normal[x, y] } }
        }
        assertTrue("face $faceCount", faceCount > 20)
        assertTrue("plate $plateCount", plateCount > 20)
        val ratio = (faceMin + .05f) / (plateMax + .05f)
        fun rgb(color: Color) = listOf(color.red, color.green, color.blue).map { (it * 255).toInt() }
        assertTrue("ratio $ratio face ${rgb(faceWorst)} plate ${rgb(plateWorst)} density ${rule.density.density}", ratio >= 3f)
    }
}
