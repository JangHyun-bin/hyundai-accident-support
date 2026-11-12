package com.example.accidentpoc

import android.content.Context
import android.graphics.BlurMaskFilter
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.addOutline
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.core.graphics.PathParser
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.math.sin
import androidx.compose.ui.graphics.Path as ComposePath

// 정본은 specs/emergency-experience/glyphs.json 이며 build 가 assets 로 넣는다. Web 도 같은 file 을 읽는다.
// RuntimeShader 를 쓰지 않는다. Satin 을 쓸 수 없는 기기에서도 icon 은 같은 모습이어야 한다.

internal class Part(val d: String, val cut: Boolean, val paint: String, val width: Float, val evenOdd: Boolean)
internal class Mark(val shape: String, val face: List<Int>, val edge: Int, val symbol: String, val ink: Int)
internal class Effect(val dy: Float, val blur: Float, val opacity: Float)
internal class DepthSpec(val inner: Effect, val lip: Effect, val top: Effect?, val face: List<Pair<Int, Float>>)
internal enum class Depth { Deep, Shallow }

internal class GlyphBook(
    private val glyphs: Map<String, List<Part>>,
    private val names: Map<String, Map<String, String>>,
    val marks: Map<String, Mark>,
    val plate: List<Pair<Int, Float>>,
    val plateAngle: Float,
    val depths: Map<Depth, DepthSpec>,
) {
    private val built = HashMap<String, Path>()

    /** 48 grid 좌표의 완성된 외곽. Part 를 순서대로 누적한다: add 는 합치고 cut 은 뺀다. */
    fun path(name: String): Path = built.getOrPut(name) { build(glyphs.getValue(name)) }
    fun cue(symbol: String) = names.getValue("cue").getValue(symbol)
    fun fact(id: String) = names.getValue("facts").getValue(id)
    fun action(id: String) = names.getValue("actions").let { it[id] ?: it.getValue("default") }
    fun validate(story: Scenario) {
        require(story.scenes.all { it.cueSymbol in names.getValue("cue") }) { "glyphs.json: unknown scenario cue" }
        require(story.visibleFacts.all { it in names.getValue("facts") }) { "glyphs.json: unknown visible fact" }
        require(story.statuses.values.all { it.second in marks }) { "glyphs.json: unknown request tone" }
    }
}

internal val LocalGlyphs = staticCompositionLocalOf<GlyphBook> { error("GlyphBook not provided") }

internal fun loadGlyphs(context: Context): GlyphBook = parseGlyphs(
    context.assets.open("glyphs.json").bufferedReader().use { it.readText() }
)

internal fun parseGlyphs(source: String): GlyphBook {
    val root = JSONObject(source)
    require(root.get("grid") == 48) { "glyphs.json: unsupported grid" }
    fun color(value: String) = android.graphics.Color.parseColor(value)
    fun stops(array: JSONArray) = List(array.length()) { array.getJSONArray(it).let { stop -> color(stop.getString(0)) to stop.getDouble(1).toFloat() } }
    fun effect(item: JSONObject) = Effect(item.getDouble("dy").toFloat(), item.optDouble("blur", 0.0).toFloat(), item.getDouble("opacity").toFloat())
    val glyphs = root.getJSONObject("glyphs").let { all ->
        all.keyList().associateWith { name ->
            val parts = all.getJSONArray(name)
            List(parts.length()) { parts.getJSONObject(it).run { Part(getString("d"), optString("op") == "cut", optString("paint", "fill"), optDouble("width", 0.0).toFloat(), optString("rule") == "evenodd") } }
        }
    }
    val marks = root.getJSONObject("marks").let { all ->
        all.keyList().associateWith { tone ->
            all.getJSONObject(tone).run { Mark(text("shape"), getJSONArray("face").let { face -> List(face.length()) { color(face.getString(it)) } }, color(text("edge")), text("symbol"), color(text("ink"))) }
        }
    }
    val material = root.getJSONObject("material")
    val depths = Depth.entries.associateWith { depth ->
        val key = depth.name.lowercase()
        root.getJSONObject("depth").getJSONObject(key).run {
            DepthSpec(effect(getJSONObject("inner")), effect(getJSONObject("lip")), optJSONObject("top")?.let(::effect), stops(material.getJSONObject("face").getJSONArray(key)))
        }
    }
    val plate = material.getJSONObject("plate")
    val names = listOf("cue", "facts", "actions", "self").associateWith { group ->
        root.getJSONObject(group).let { map -> map.keyList().associateWith(map::text) }
    }
    require(names.values.all { map -> map.values.all { it in glyphs } } && "default" in names.getValue("actions")) { "glyphs.json: unknown glyph mapping" }
    require(marks.keys == factStatuses && marks.values.all { it.symbol in glyphs && (it.shape == "disc" || it.shape in glyphs) }) { "glyphs.json: invalid status mark" }
    return GlyphBook(glyphs, names, marks, stops(plate.getJSONArray("stops")), plate.getDouble("angle").toFloat(), depths)
}

// Stroke 외곽선과 boolean 연산은 ×10 좌표에서 계산한다. 48 unit 그대로면 곡선 근사가 커진 뒤 각져 보인다.
private const val WORK = 10f

private fun build(parts: List<Part>): Path {
    val result = Path()
    parts.forEach { part ->
        val shape = PathParser.createPathFromPathData(part.d).apply {
            transform(scale(WORK))
            fillType = if (part.evenOdd) Path.FillType.EVEN_ODD else Path.FillType.WINDING
        }
        val outline = when (part.paint) {
            "stroke" -> stroke(shape, part.width * WORK)
            "fill+stroke" -> shape.apply { op(stroke(this, part.width * WORK), Path.Op.UNION) }
            else -> shape
        }
        result.op(outline, if (part.cut) Path.Op.DIFFERENCE else Path.Op.UNION)
    }
    return result.apply { transform(scale(1 / WORK)) }
}

private fun scale(factor: Float) = Matrix().apply { setScale(factor, factor) }
private fun stroke(path: Path, width: Float) = Path().also {
    Paint().apply { style = Paint.Style.STROKE; strokeWidth = width; strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND }.getFillPath(path, it)
}
private fun paint(color: Int, opacity: Float = 1f) = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color; alpha = (opacity * 255).roundToInt() }
private fun gradient(bounds: RectF, colors: IntArray, stops: FloatArray?) =
    Paint(Paint.ANTI_ALIAS_FLAG).apply { shader = LinearGradient(0f, bounds.top, 0f, bounds.bottom, colors, stops, Shader.TileMode.CLAMP) }
private fun bounds(path: Path) = RectF().also { path.computeBounds(it, true) }

// SVG feGaussianBlur 의 stdDeviation 을 Skia 의 blur radius 로 바꾼다 (sigma = 0.57735 · radius + 0.5).
private fun blurRadius(sigma: Float) = max(.5f, (sigma - .5f) / .57735f)

/** 금속판에 깎아 넣은 glyph. 빛은 위에서 오고 움직이지 않는다. measure 는 대비 test 용으로 면만 흰색으로 그린다. */
@Composable
internal fun EngravedGlyph(name: String, depth: Depth, size: Dp, measure: Boolean = false) {
    val book = LocalGlyphs.current
    Spacer(Modifier.size(size).testTag("glyph-$name").drawWithCache {
        val unit = this.size.width / 48f
        val glyph = Path(book.path(name)).apply { transform(scale(unit)) }
        if (measure) {
            val white = paint(android.graphics.Color.WHITE)
            return@drawWithCache onDrawBehind { drawIntoCanvas { it.nativeCanvas.drawPath(glyph, white) } }
        }
        val spec = book.depths.getValue(depth)
        fun moved(dy: Float) = Path(glyph).apply { offset(0f, dy * unit) }
        fun edge(effect: Effect, color: Int) = moved(effect.dy).apply { op(glyph, Path.Op.DIFFERENCE) } to paint(color, effect.opacity)
        val edges = listOfNotNull(edge(spec.lip, android.graphics.Color.WHITE), spec.top?.let { edge(it, android.graphics.Color.BLACK) })
        val area = bounds(glyph)
        val face = gradient(area, spec.face.map { it.first }.toIntArray(), spec.face.map { it.second }.toFloatArray())
        // 깎인 홈 안쪽 위의 그림자: glyph 바깥 전체를 dy 만큼 내려 흐리게 그린 뒤 glyph 로 자른다.
        val outside = Path().apply {
            addRect(-this@drawWithCache.size.width, -this@drawWithCache.size.height, 2 * this@drawWithCache.size.width, 2 * this@drawWithCache.size.height, Path.Direction.CW)
            op(moved(spec.inner.dy), Path.Op.DIFFERENCE)
        }
        val inner = paint(android.graphics.Color.BLACK, spec.inner.opacity).apply { maskFilter = BlurMaskFilter(blurRadius(spec.inner.blur * unit), BlurMaskFilter.Blur.NORMAL) }
        onDrawBehind {
            drawIntoCanvas { canvas ->
                val native = canvas.nativeCanvas
                edges.forEach { (path, edgePaint) -> native.drawPath(path, edgePaint) }
                native.drawPath(glyph, face)
                native.save()
                native.clipPath(glyph)
                native.drawPath(outside, inner)
                native.restore()
            }
        }
    })
}

/** Mint button 위처럼 깎지 않는 자리의 단색 glyph. */
@Composable
internal fun SolidGlyph(name: String, tint: Color, size: Dp) {
    val book = LocalGlyphs.current
    Spacer(Modifier.size(size).testTag("glyph-$name").drawWithCache {
        val glyph = Path(book.path(name)).apply { transform(scale(this@drawWithCache.size.width / 48f)) }
        val fill = paint(tint.toArgb())
        onDrawBehind { drawIntoCanvas { it.nativeCanvas.drawPath(glyph, fill) } }
    })
}

/** Tone 표식: 원판(주의는 삼각형) + 기호. 색이 없어도 기호 모양으로 구별된다. */
@Composable
internal fun StatusMark(tone: String, size: Dp) {
    val book = LocalGlyphs.current
    val mark = book.marks.getValue(tone)
    Spacer(Modifier.size(size).testTag("mark-$tone").drawWithCache {
        val unit = this.size.width / 48f
        val base = if (mark.shape == "disc") Path().apply { addCircle(24 * unit, 24 * unit, 22 * unit, Path.Direction.CW) } else Path(book.path(mark.shape)).apply { transform(scale(unit)) }
        val face = gradient(bounds(base), mark.face.toIntArray(), null)
        val edge = paint(mark.edge).apply { style = Paint.Style.STROKE; strokeWidth = unit }
        val symbol = Path(book.path(mark.symbol)).apply { transform(scale(unit)) }
        val ink = paint(mark.ink)
        onDrawBehind {
            drawIntoCanvas { canvas ->
                canvas.nativeCanvas.run { drawPath(base, face); drawPath(base, edge); drawPath(symbol, ink) }
            }
        }
    })
}

/** 결이 있는 금속판. 윗면 1 dp 밝은 선, 아랫면 1 dp 어두운 선, 아래 그림자. measure 는 검은 판만 그린다. */
internal fun Modifier.metalPlate(shape: Shape, measure: Boolean = false): Modifier = composed {
    val book = LocalGlyphs.current
    (if (measure) this else shadow(16.dp, shape, clip = false, ambientColor = Color.Black, spotColor = Color.Black)).drawWithCache {
        val outline = ComposePath().apply { addOutline(shape.createOutline(size, layoutDirection, this@drawWithCache)) }
        if (measure) return@drawWithCache onDrawBehind { drawPath(outline, Color.Black) }
        // CSS linear-gradient 의 각도: 0° 는 위쪽, 시계 방향.
        val radians = Math.toRadians(book.plateAngle.toDouble())
        val direction = Offset(sin(radians).toFloat(), -cos(radians).toFloat())
        val half = (abs(size.width * direction.x) + abs(size.height * direction.y)) / 2
        val center = Offset(size.width / 2, size.height / 2)
        val brush = Brush.linearGradient(*book.plate.map { (color, at) -> at to Color(color) }.toTypedArray(), start = center - direction * half, end = center + direction * half)
        val line = 1.dp.toPx()
        fun band(dy: Float) = ComposePath.combine(PathOperation.Difference, outline, ComposePath().apply { addPath(outline, Offset(0f, dy)) })
        val top = band(line)
        val bottom = band(-line)
        onDrawBehind {
            drawPath(outline, brush)
            clipPath(outline) {
                var x = 0f
                while (x < size.width) {
                    drawRect(Color.White.copy(alpha = .035f), Offset(x, 0f), Size(line, size.height))
                    drawRect(Color.Black.copy(alpha = .04f), Offset(x + line, 0f), Size(line, size.height))
                    x += 2 * line
                }
            }
            drawPath(top, Color.White.copy(alpha = .24f))
            drawPath(bottom, Color.Black.copy(alpha = .55f))
        }
    }
}
