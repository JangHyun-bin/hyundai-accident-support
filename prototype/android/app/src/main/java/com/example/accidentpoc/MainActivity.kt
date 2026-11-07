package com.example.accidentpoc

import android.content.Context
import android.graphics.RuntimeShader
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.annotation.RequiresApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.intl.LocaleList
import androidx.compose.ui.text.style.LineBreak
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONArray
import org.json.JSONObject

// Web storyboard 의 dark semantic palette (prototype/web/src/styles.css).
private object Ui {
    val background = Color(0xFF131417)
    val surface = Color(0xFF191B1E)
    val card = Color(0xFF24282B)
    val foreground = Color(0xFFF2F4F2)
    val muted = Color(0xFFA9B0B2)
    val primary = Color(0xFFC4ECDA)
    val primaryForeground = Color(0xFF172A24)
    val warning = Color(0xFFF0B59C)
    val border = Color(0xFF3B4243)
    val line = Color(0xFF303539)
    val review = Color(0xFF0C0E10)
    val font = FontFamily(
        Font(R.font.asta_regular, FontWeight.Normal),
        Font(R.font.asta_semibold, FontWeight.SemiBold),
        Font(R.font.asta_bold, FontWeight.Bold)
    )
}

private const val SATIN_INTENSITY = .7f

private class Fact(val id: String, val label: String, val value: String, val status: String)
private class Request(val id: String, val label: String, val status: String)
private class Transition(val id: String, val label: String, val to: String)
private class Scene(
    val id: String, val label: String, val title: String, val instruction: String,
    val cueSymbol: String, val cueStatus: String, val cueLabel: String, val cueDetail: String,
    val requestOverrides: Map<String, String>, val actions: List<Transition>, val events: List<Transition>
)
private class Scenario(
    val initial: String, val contextLabel: String, val supportTitle: String, val supportNote: String,
    val facts: List<Fact>, val requests: List<Request>, val statuses: Map<String, Pair<String, String>>, val scenes: List<Scene>
)

private fun JSONArray.objects() = (0 until length()).map { getJSONObject(it) }
private fun JSONArray.strings() = (0 until length()).map { getString(it) }
private fun JSONObject.stringMap() = keys().asSequence().associateWith { getString(it) }
private fun JSONObject.transitions(key: String) = getJSONArray(key).objects().map { Transition(it.getString("id"), it.getString("label"), it.getString("to")) }

// 정본은 specs/emergency-experience/scenarios.json 이며 build 가 assets 로 그대로 넣는다.
private fun loadScenario(context: Context, id: String): Scenario {
    val root = JSONObject(context.assets.open("scenarios.json").bufferedReader().use { it.readText() })
    val statuses = root.getJSONObject("request_statuses").let { all -> all.keys().asSequence().associateWith { all.getJSONObject(it).let { s -> s.getString("label") to s.getString("tone") } } }
    val scenario = root.getJSONArray("scenarios").objects().first { it.getString("id") == id }
    val presentation = scenario.getJSONObject("presentation")
    val visibleFacts = presentation.getJSONArray("visible_facts").strings()
    val visibleRequests = presentation.getJSONArray("visible_requests").strings()
    // ponytail: SC05 has no fact_overrides; apply them when another scenario is ported.
    return Scenario(
        initial = scenario.getString("initial"),
        contextLabel = presentation.getString("context_label"),
        supportTitle = presentation.getString("support_title"),
        supportNote = presentation.getString("support_note"),
        facts = scenario.getJSONArray("facts").objects().map { Fact(it.getString("id"), it.getString("label"), it.getString("value"), it.getString("status")) }.filter { it.id in visibleFacts },
        requests = scenario.getJSONArray("requests").objects().map { Request(it.getString("id"), it.getString("label"), it.getString("status")) }.filter { it.id in visibleRequests },
        statuses = statuses,
        scenes = scenario.getJSONArray("states").objects().map { state ->
            val cue = state.getJSONObject("cue")
            Scene(
                state.getString("id"), state.getString("label"), state.getString("title"), state.getString("instruction"),
                cue.getString("symbol"), cue.getString("status"), cue.getString("label"), cue.getString("detail"),
                state.getJSONObject("request_overrides").stringMap(), state.transitions("actions"), state.transitions("events")
            )
        }
    )
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).run {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        val story = loadScenario(this, "SC05")
        // Web 의 ?scene= 과 같다. 잘못된 값은 초기 장면으로 돌아간다.
        val start = intent.getStringExtra("scene")?.takeIf { id -> story.scenes.any { it.id == id } } ?: story.initial
        setContent { Storyboard(story, start) }
    }
}

@Composable
private fun Storyboard(story: Scenario, start: String) {
    // 회전·font scale 변경으로 activity 가 다시 만들어져도 장면을 유지한다. 외부 요청을 취소·재전송하지 않는다.
    var sceneId by rememberSaveable { mutableStateOf(start) }
    var satin by rememberSaveable { mutableStateOf(true) }
    val scene = story.scenes.first { it.id == sceneId }
    Column(Modifier.fillMaxSize().background(Ui.review)) {
        ProductScreen(story, scene, satin, Modifier.fillMaxWidth().weight(1f)) { sceneId = it }
        ReviewStrip(story, scene, satin, { sceneId = it }, { satin = it })
    }
}

@Composable
private fun Copy(value: String, size: Int, color: Color = Ui.foreground, weight: FontWeight = FontWeight.Normal, modifier: Modifier = Modifier, lineHeight: Float = 1.4f, tracking: Float = 0f, align: TextAlign? = null) {
    Text(value, modifier = modifier, color = color, fontSize = size.sp, fontWeight = weight, fontFamily = Ui.font, letterSpacing = tracking.em, lineHeight = (size * lineHeight).sp, textAlign = align, style = LocalTextStyle.current.copy(lineBreak = koreanLineBreak, localeList = korean))
}

// 한국어를 어절 단위로 나누고 줄 길이를 고르게 한다 (web 의 text-wrap: balance 에 대응). Phrase 는 Android 13 이상이며 ko locale 이 필요하다.
private val korean = LocaleList("ko-KR")
private val koreanLineBreak = LineBreak(LineBreak.Strategy.Balanced, LineBreak.Strictness.Default, LineBreak.WordBreak.Phrase)

private fun mix(color: Color, base: Color, amount: Float) = Color(
    base.red + (color.red - base.red) * amount, base.green + (color.green - base.green) * amount, base.blue + (color.blue - base.blue) * amount
)

@Composable
private fun Divider(color: Color) = Box(Modifier.fillMaxWidth().height(1.dp).background(color))

@Composable
private fun ProductScreen(story: Scenario, scene: Scene, satin: Boolean, modifier: Modifier, go: (String) -> Unit) {
    Box(modifier.surface(satin).padding(horizontal = 48.dp)) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().height(88.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(12.dp, 24.dp).rotate(30f).border(2.dp, Ui.primary, RoundedCornerShape(7.dp)))
                Spacer(Modifier.width(12.dp))
                Copy("사고 대응", 24, weight = FontWeight.SemiBold)
                Spacer(Modifier.weight(1f))
                Copy(story.contextLabel, 20, Ui.muted)
            }
            Divider(Ui.line)
            Row(Modifier.fillMaxWidth().weight(1f).padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 18.dp), horizontalArrangement = Arrangement.spacedBy(72.dp), verticalAlignment = Alignment.CenterVertically) {
                Cue(scene, Modifier.weight(.85f))
                ActionArea(story, scene, Modifier.weight(1.15f), go)
            }
            Divider(Ui.border)
            Row(Modifier.fillMaxWidth().heightIn(min = 108.dp), horizontalArrangement = Arrangement.spacedBy(28.dp), verticalAlignment = Alignment.CenterVertically) {
                Copy("지원 현황", 19, Ui.muted, modifier = Modifier.widthIn(min = 100.dp))
                story.requests.forEach { RequestStatus(it, scene.requestOverrides[it.id] ?: it.status, story.statuses) }
                Spacer(Modifier.weight(1f))
                Copy("연결 · 접수 · 도착은 별도 확인", 17, Ui.muted, modifier = Modifier.widthIn(max = 185.dp))
            }
        }
    }
}

@Composable
private fun Cue(scene: Scene, modifier: Modifier) {
    val color = if (scene.cueStatus == "attention") Ui.warning else Ui.foreground
    val shape = RoundedCornerShape(56.dp)
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(268.dp)) {
            Box(Modifier.matchParentSize().clip(shape).background(mix(color, Ui.background, .06f)).border(1.dp, mix(color, Ui.background, .24f), shape), contentAlignment = Alignment.Center) {
                LucideIcon(symbols[scene.cueSymbol] ?: "circle-question-mark", 1.3f, color, 174.dp)
            }
            Box(Modifier.align(Alignment.BottomEnd).offset(18.dp, 12.dp).size(100.dp).clip(CircleShape).background(Ui.background), contentAlignment = Alignment.Center) {
                StatusMark(scene.cueStatus, 68.dp, if (scene.cueStatus == "confirmed") Ui.primary else color)
            }
        }
        Spacer(Modifier.height(30.dp))
        Copy(scene.cueLabel, 50, color, FontWeight.SemiBold, lineHeight = 1.15f, tracking = -.035f, align = TextAlign.Center)
        Spacer(Modifier.height(10.dp))
        Copy(scene.cueDetail, 20, Ui.muted, align = TextAlign.Center)
    }
}

@Composable
private fun ActionArea(story: Scenario, scene: Scene, modifier: Modifier, go: (String) -> Unit) {
    // 큰 font scale 에서 잘리지 않도록 scroll 로 남긴다. 1.0 에서는 scroll 없이 들어간다.
    Column(modifier.verticalScroll(rememberScrollState()).padding(top = 8.dp)) {
        Copy(scene.title, 44, weight = FontWeight.SemiBold, lineHeight = 1.25f, tracking = -.035f, modifier = Modifier.semantics { heading(); liveRegion = LiveRegionMode.Polite })
        Spacer(Modifier.height(18.dp))
        Copy(scene.instruction, 24, Ui.muted, lineHeight = 1.45f)
        Box(Modifier.fillMaxWidth().heightIn(min = 116.dp).padding(top = 28.dp)) {
            scene.actions.forEach { action ->
                Row(Modifier.fillMaxWidth().heightIn(min = 82.dp).clip(RoundedCornerShape(14.dp)).background(Ui.primary).clickable(role = Role.Button) { go(action.to) }.padding(horizontal = 28.dp, vertical = 22.dp), verticalAlignment = Alignment.CenterVertically) {
                    LucideIcon("route", 2f, Ui.primaryForeground, 30.dp)
                    Spacer(Modifier.width(18.dp))
                    Copy(action.label, 28, Ui.primaryForeground, FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    LucideIcon("arrow-right", 2f, Ui.primaryForeground, 28.dp)
                }
            }
        }
        Spacer(Modifier.height(28.dp))
        Divider(Ui.border)
        Spacer(Modifier.height(24.dp))
        Copy(story.supportTitle, 21, weight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Copy(story.supportNote, 18, Ui.muted)
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            story.facts.forEach { fact ->
                Row(Modifier.weight(1f).testTag("fact-${fact.id}").semantics(mergeDescendants = true) {}, verticalAlignment = Alignment.CenterVertically) {
                    LucideIcon(factSymbols[fact.id] ?: "circle-question-mark", 1.5f, Ui.muted, 32.dp)
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Copy(fact.label, 18, Ui.muted)
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            StatusMark(fact.status, 23.dp, if (fact.status == "confirmed") Ui.primary else Ui.muted)
                            Spacer(Modifier.width(9.dp))
                            Copy(fact.value, 26, weight = FontWeight.SemiBold, lineHeight = 1.2f)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RequestStatus(request: Request, status: String, statuses: Map<String, Pair<String, String>>) {
    val (label, tone) = statuses.getValue(status)
    Row(Modifier.widthIn(min = 240.dp).testTag("request-${request.id}").semantics(mergeDescendants = true) {}, verticalAlignment = Alignment.CenterVertically) {
        StatusMark(tone, 30.dp, if (tone == "confirmed") Ui.primary else Ui.muted)
        Spacer(Modifier.width(12.dp))
        Column {
            Copy(request.label, 17, Ui.muted)
            Spacer(Modifier.height(7.dp))
            Copy(label, 22, weight = FontWeight.SemiBold)
        }
    }
}

// 시연 event 와 재질 비교는 web 과 같이 차량 화면 밖에서 공급한다.
@Composable
private fun ReviewStrip(story: Scenario, scene: Scene, satin: Boolean, go: (String) -> Unit, setSatin: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().height(90.dp).padding(horizontal = 24.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
        Copy("시연 control · 차량 화면 밖", 13, Ui.muted)
        story.scenes.forEach { ReviewButton(it.label, it.id == scene.id, "scene-${it.id}") { go(it.id) } }
        Spacer(Modifier.weight(1f))
        Copy("외부 결과 시연", 13, Ui.muted)
        scene.events.forEach { ReviewButton(it.label, false, "event-${it.id}") { go(it.to) } }
        Spacer(Modifier.width(14.dp))
        ReviewButton("기존 flat", !satin, "surface-flat") { setSatin(false) }
        ReviewButton("C · Satin", satin, "surface-satin") { setSatin(true) }
        val status = when {
            !satin -> "기존 flat"
            Build.VERSION.SDK_INT >= 33 -> "Satin 적용 · 강도 70%"
            else -> "C render 불가 · Android 13 미만"
        }
        Copy(status, 12, Ui.muted, modifier = Modifier.widthIn(max = 130.dp).testTag("surface-status"))
    }
}

@Composable
private fun ReviewButton(label: String, selected: Boolean, tag: String, onClick: () -> Unit) {
    val shape = RoundedCornerShape(10.dp)
    Box(Modifier.testTag(tag).heightIn(min = 48.dp).clip(shape).background(if (selected) Ui.card else Ui.surface).border(1.dp, if (selected) Ui.primary else Ui.line, shape).clickable(role = Role.Button, onClick = onClick).semantics { this.selected = selected }.padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
        Copy(label, 14, if (selected) Ui.foreground else Ui.muted)
    }
}

// C · Satin: prototype/web/src/emergency/SatinSurface.tsx 의 GLSL 을 AGSL 로 옮겼다.
// GLSL pow(x, 2.) 는 음수 x 에서 정의되지 않으므로 x*x 로 쓴다.
private const val SATIN = """
uniform float2 size;
uniform float intensity;
const float PI=3.14159265359;
float hash(float2 p){return fract(sin(dot(p,float2(127.17,311.73))+19.89)*43758.5453);}
float2 hash2(float2 p){return float2(hash(p),hash(p+float2(43.71,17.31)));}
float noise(float2 p){float2 i=floor(p);float2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+float2(1,0)),f.x),mix(hash(i+float2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(float2 p){float a=.55;float s=0.;float2x2 r=float2x2(.8,-.6,.6,.8);for(int i=0;i<4;i++){s+=a*noise(p);p=r*p*2.07+float2(13.9,7.1);a*=.48;}return s;}
float gabor(float2 p){float2 cell=floor(p);float sum=0.;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){float2 id=cell+float2(float(x),float(y));float2 h=hash2(id);float2 d=p-id-h;float angle=(hash(id+14.6)-.5)*.38;float2 direction=float2(sin(angle),cos(angle));sum+=exp(-3.2*dot(d,d))*cos(2.*PI*((.65+1.1*hash(id+4.5))*dot(d,direction)+h.y));}}return sum;}
half4 main(float2 coord){
 float2 p=coord/size;float2 px=p*float2(1440.,810.);
 float local=fbm(p*4.7);
 float2 q=float2(px.x*.11+(fbm(p*12.)-.5)*.6,px.y*.40+(local-.5)*1.2);
 float grain=gabor(q)*.7+gabor(q*float2(.31,.46)+41.)*.3;
 float rise=smoothstep(.02,.88,p.y);
 float3 steel=mix(float3(.033,.042,.073),float3(.21,.27,.36),rise);
 float theta=.186;float2 d=p-float2(.255,.58);
 float2x2 rotation=float2x2(cos(theta),-sin(theta),sin(theta),cos(theta));float2 r=rotation*d;
 float roughness=.075+.025*local+.015*grain;
 float a=r.x/roughness;float b=r.y/.67;float sheen=exp(-a*a-b*b);
 a=(r.x-.07)/.25;b=r.y/.82;float shoulder=exp(-a*a-b*b);
 a=(r.x+.12)/.11;b=r.y/.9;float cut=exp(-a*a-b*b);
 steel+=float3(.12,.14,.18)*(sheen*.78+shoulder*.25);
 steel-=float3(.04,.045,.05)*cut;
 steel+=grain*.021;
 float actionShade=mix(1.,.39,smoothstep(.36,.56,p.x));
 float footerShade=mix(1.,.37,smoothstep(.73,.86,p.y));
 float edgeShade=.82+.18*sin(clamp(p.x,0.,1.)*PI);
 float3 base=float3(19.,20.,23.)/255.;
 float3 material=steel*actionShade*footerShade*edgeShade;
 material=max(base*.72,material);
 material=min(material,float3(.235,.25,.28));
 return half4(half3(mix(base,material,intensity)),1.);
}"""

@RequiresApi(33)
private fun satinBrush(width: Float, height: Float) = RuntimeShader(SATIN).run {
    setFloatUniform("size", width, height)
    setFloatUniform("intensity", SATIN_INTENSITY)
    ShaderBrush(this)
}

private fun Modifier.surface(satin: Boolean) =
    if (satin && Build.VERSION.SDK_INT >= 33) drawWithCache { val brush = satinBrush(size.width, size.height); onDrawBehind { drawRect(brush) } } else background(Ui.background)

private val symbols = mapOf("vehicle" to "car-front")
private val factSymbols = mapOf("arrival" to "car-front", "handoff" to "handshake")

@Composable
private fun StatusMark(status: String, size: Dp, tint: Color) =
    // ponytail: SC05 tones only; add triangle-alert when an "attention" scenario is ported.
    LucideIcon(when (status) { "confirmed" -> "circle-check"; "unknown" -> "circle-question-mark"; else -> "circle" }, 1.8f, tint, size)

// Lucide 1.69.0 (ISC, third-party/lucide/LICENSE). circle·rect 는 같은 모양의 path 로 바꿨다.
private val lucide = mapOf(
    "car-front" to listOf("m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8", "M7 14h.01", "M17 14h.01", "M5 10h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2z", "M5 18v2", "M19 18v2"),
    "circle-question-mark" to listOf("M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0", "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", "M12 17h.01"),
    "circle-check" to listOf("M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0", "m16 9-5.5 5.5L8 12"),
    "circle" to listOf("M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0"),
    "handshake" to listOf("m11 17 2 2a1 1 0 1 0 3-3", "m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4", "m21 3 1 11h-2", "M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3", "M3 4h8"),
    "route" to listOf("M3 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15", "M15 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"),
    "arrow-right" to listOf("M5 12h14", "m12 5 7 7-7 7"),
)

@Composable
private fun LucideIcon(name: String, stroke: Float, tint: Color, size: Dp) {
    val vector = remember(name, stroke) {
        ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
            lucide.getValue(name).forEach { d ->
                addPath(addPathNodes(d), fill = null, stroke = SolidColor(Color.White), strokeLineWidth = stroke, strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round)
            }
        }.build()
    }
    Icon(vector, contentDescription = null, tint = tint, modifier = Modifier.size(size))
}
