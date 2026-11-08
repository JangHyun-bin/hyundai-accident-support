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
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
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
import androidx.compose.ui.unit.Density
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

internal class Fact(val id: String, val label: String, val value: String, val status: String)
internal class Request(val id: String, val label: String, val status: String)
internal class Transition(val id: String, val label: String, val to: String)
internal class Scene(
    val id: String, val label: String, val title: String, val instruction: String,
    val cueSymbol: String, val cueStatus: String, val cueLabel: String, val cueDetail: String,
    val requestOverrides: Map<String, String>, val actions: List<Transition>, val events: List<Transition>
)
internal class Scenario(
    val initial: String, val contextLabel: String, val supportTitle: String, val supportNote: String,
    val facts: List<Fact>, val requests: List<Request>, val statuses: Map<String, Pair<String, String>>, val scenes: List<Scene>
)

private fun JSONArray.objects() = (0 until length()).map { getJSONObject(it) }
private fun JSONArray.strings() = (0 until length()).map { getString(it) }
private fun JSONObject.stringMap() = keys().asSequence().associateWith { getString(it) }
private fun JSONObject.transitions(key: String) = getJSONArray(key).objects().map { Transition(it.getString("id"), it.getString("label"), it.getString("to")) }

// 정본은 specs/emergency-experience/scenarios.json 이며 build 가 assets 로 그대로 넣는다.
internal fun loadScenario(context: Context, id: String): Scenario {
    val root = JSONObject(context.assets.open("scenarios.json").bufferedReader().use { it.readText() })
    val statuses = root.getJSONObject("request_statuses").let { all -> all.keys().asSequence().associateWith { all.getJSONObject(it).let { s -> s.getString("label") to s.getString("tone") } } }
    val scenario = root.getJSONArray("scenarios").objects().first { it.getString("id") == id }
    val presentation = scenario.getJSONObject("presentation")
    val visibleFacts = presentation.getJSONArray("visible_facts").strings()
    val visibleRequests = presentation.getJSONArray("visible_requests").strings()
    return Scenario(
        initial = scenario.getString("initial"),
        contextLabel = presentation.getString("context_label"),
        supportTitle = presentation.getString("support_title"),
        supportNote = presentation.optString("support_note"),
        facts = scenario.getJSONArray("facts").objects().map { Fact(it.getString("id"), it.getString("label"), it.getString("value"), it.getString("status")) }.filter { it.id in visibleFacts },
        requests = scenario.getJSONArray("requests").objects().map { Request(it.getString("id"), it.getString("label"), it.getString("status")) }.filter { it.id in visibleRequests },
        statuses = statuses,
        scenes = scenario.getJSONArray("states").objects().map { state ->
            // ponytail: fact_overrides 는 아직 적용하지 않는다. 있는 scenario 를 잘못 보여주지 않도록 멈춘다.
            require(state.getJSONObject("fact_overrides").length() == 0) { "$id/${state.getString("id")}: fact_overrides are not supported yet" }
            val cue = state.getJSONObject("cue")
            Scene(
                state.getString("id"), state.getString("label"), state.getString("title"), state.optString("instruction"),
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
    // Font scale 변경 등으로 activity 가 다시 만들어져도 장면을 유지한다. 외부 요청을 취소·재전송하지 않는다.
    var sceneId by rememberSaveable { mutableStateOf(start) }
    var satin by rememberSaveable { mutableStateOf(true) }
    val satinAvailable = remember { satinCompiles(SATIN) }
    val scene = story.scenes.first { it.id == sceneId }
    // Web 과 같이 주 행동 뒤에는 새 제목으로, 외부 event 로 button 이 사라지면 현재 장면 button 으로 focus 를 옮긴다.
    val titleFocus = remember { FocusRequester() }
    val sceneFocus = remember { story.scenes.associate { it.id to FocusRequester() } }
    var focusAfter by remember { mutableStateOf<FocusRequester?>(null) }
    LaunchedEffect(sceneId, focusAfter) { focusAfter?.requestFocus(); focusAfter = null }
    val context = LocalContext.current
    val glyphs = remember { loadGlyphs(context) }
    CompositionLocalProvider(LocalGlyphs provides glyphs) { Column(Modifier.fillMaxSize().background(Ui.review)) {
        ProductScreen(story, scene, satin && satinAvailable, titleFocus, Modifier.fillMaxWidth().weight(1f)) { sceneId = it; focusAfter = titleFocus }
        // 시연 control 은 차량 화면 밖의 검토 도구라 font scale 을 따르지 않는다. 커지면 차량 화면을 밀어낸다.
        CompositionLocalProvider(LocalDensity provides Density(LocalDensity.current.density, 1f)) {
            ReviewStrip(story, scene, satin, satinAvailable, sceneFocus, { to, event -> sceneId = to; if (event) focusAfter = sceneFocus.getValue(to) }, { satin = it })
        }
    } }
}

@Composable
private fun Copy(value: String, size: Int, color: Color = Ui.foreground, weight: FontWeight = FontWeight.Normal, modifier: Modifier = Modifier, lineHeight: Float = 1.4f, tracking: Float = 0f, align: TextAlign? = null) {
    Text(value, modifier = modifier, color = color, fontSize = size.sp, fontWeight = weight, fontFamily = Ui.font, letterSpacing = tracking.em, lineHeight = (size * lineHeight).sp, textAlign = align, style = LocalTextStyle.current.copy(lineBreak = koreanLineBreak, localeList = korean))
}

// 한국어를 어절 단위로 나누고 줄 길이를 고르게 한다 (web 의 text-wrap: balance 에 대응). Phrase 는 Android 13 이상이며 ko locale 이 필요하다.
private val korean = LocaleList("ko-KR")
private val koreanLineBreak = LineBreak(LineBreak.Strategy.Balanced, LineBreak.Strictness.Default, LineBreak.WordBreak.Phrase)

@Composable
private fun Divider(color: Color) = Box(Modifier.fillMaxWidth().height(1.dp).background(color))

@Composable
private fun ProductScreen(story: Scenario, scene: Scene, satin: Boolean, titleFocus: FocusRequester, modifier: Modifier, go: (String) -> Unit) {
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
                ActionArea(story, scene, titleFocus, Modifier.weight(1.15f), go)
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
    // Glyph 본체는 모든 tone 에서 금속이다. Tone 색은 label 과 표식에만 남는다.
    val color = if (scene.cueStatus == "attention") Ui.warning else Ui.foreground
    Column(modifier.testTag("cue"), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(268.dp)) {
            Box(Modifier.matchParentSize().metalPlate(RoundedCornerShape(56.dp)), contentAlignment = Alignment.Center) {
                EngravedGlyph(LocalGlyphs.current.cue(scene.cueSymbol), Depth.Deep, 174.dp)
            }
            Box(Modifier.align(Alignment.BottomEnd).offset(18.dp, 12.dp).size(100.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF4C5255), Color(0xFF2B3033)))), contentAlignment = Alignment.Center) {
                StatusMark(scene.cueStatus, 68.dp)
            }
        }
        Spacer(Modifier.height(30.dp))
        Copy(scene.cueLabel, 50, color, FontWeight.SemiBold, lineHeight = 1.15f, tracking = -.035f, align = TextAlign.Center)
        Spacer(Modifier.height(10.dp))
        Copy(scene.cueDetail, 20, Ui.muted, align = TextAlign.Center)
    }
}

@Composable
private fun ActionArea(story: Scenario, scene: Scene, titleFocus: FocusRequester, modifier: Modifier, go: (String) -> Unit) {
    // 큰 font scale 에서 잘리지 않도록 scroll 로 남긴다. 1.0 에서는 scroll 없이 들어간다.
    Column(modifier.verticalScroll(rememberScrollState()).padding(top = 8.dp)) {
        Copy(scene.title, 44, weight = FontWeight.SemiBold, lineHeight = 1.25f, tracking = -.035f, modifier = Modifier.semantics { heading(); liveRegion = LiveRegionMode.Polite }.focusRequester(titleFocus).focusable())
        // 문구가 없는 장면은 빈 줄을 남기지 않는다.
        if (scene.instruction.isNotEmpty()) {
            Spacer(Modifier.height(18.dp))
            Copy(scene.instruction, 24, Ui.muted, lineHeight = 1.45f)
        }
        Box(Modifier.fillMaxWidth().heightIn(min = 116.dp).padding(top = 28.dp)) {
            scene.actions.forEach { action ->
                Row(Modifier.fillMaxWidth().heightIn(min = 82.dp).clip(RoundedCornerShape(14.dp)).background(Ui.primary).clickable(role = Role.Button) { go(action.to) }.padding(horizontal = 28.dp, vertical = 22.dp), verticalAlignment = Alignment.CenterVertically) {
                    SolidGlyph(LocalGlyphs.current.action(action.id), Ui.primaryForeground, 30.dp)
                    Spacer(Modifier.width(18.dp))
                    Copy(action.label, 28, Ui.primaryForeground, FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    SolidGlyph("arrow-right", Ui.primaryForeground, 28.dp)
                }
            }
        }
        Spacer(Modifier.height(28.dp))
        Divider(Ui.border)
        Spacer(Modifier.height(24.dp))
        Copy(story.supportTitle, 21, weight = FontWeight.SemiBold)
        if (story.supportNote.isNotEmpty()) {
            Spacer(Modifier.height(6.dp))
            Copy(story.supportNote, 18, Ui.muted)
        }
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            story.facts.forEach { fact ->
                Row(Modifier.weight(1f).testTag("fact-${fact.id}").semantics(mergeDescendants = true) {}, verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(48.dp).metalPlate(RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                        EngravedGlyph(LocalGlyphs.current.fact(fact.id), Depth.Shallow, 34.dp)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Copy(fact.label, 18, Ui.muted)
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            StatusMark(fact.status, 23.dp)
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
        StatusMark(tone, 30.dp)
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
private fun ReviewStrip(story: Scenario, scene: Scene, satin: Boolean, satinAvailable: Boolean, sceneFocus: Map<String, FocusRequester>, go: (String, Boolean) -> Unit, setSatin: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().height(90.dp).padding(horizontal = 24.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
        Column {
            Copy("시연 control · 차량 화면 밖", 13, Ui.muted)
            Copy("가상 scenario · 실제 전화·전송 없음", 13, Ui.warning)
        }
        story.scenes.forEach { ReviewButton(it.label, it.id == scene.id, "scene-${it.id}", Modifier.focusRequester(sceneFocus.getValue(it.id))) { go(it.id, false) } }
        Spacer(Modifier.weight(1f))
        Copy("외부 결과 시연", 13, Ui.muted)
        if (scene.events.isEmpty()) Copy("다른 장면을 선택해 비교할 수 있어요.", 13, Ui.muted)
        scene.events.forEach { ReviewButton(it.label, false, "event-${it.id}") { go(it.to, true) } }
        Spacer(Modifier.width(14.dp))
        ReviewButton("기존 flat", !satin, "surface-flat") { setSatin(false) }
        ReviewButton("C · Satin", satin, "surface-satin") { setSatin(true) }
        val status = when {
            !satin -> "기존 flat"
            satinAvailable -> "Satin 적용 · 강도 70%"
            else -> "C render 불가 · 기본 background"
        }
        Copy(status, 12, Ui.muted, modifier = Modifier.widthIn(max = 130.dp).testTag("surface-status"))
    }
}

@Composable
private fun ReviewButton(label: String, selected: Boolean, tag: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(10.dp)
    Box(modifier.testTag(tag).heightIn(min = 48.dp).clip(shape).background(if (selected) Ui.card else Ui.surface).border(1.dp, if (selected) Ui.primary else Ui.line, shape).clickable(role = Role.Button, onClick = onClick).semantics { this.selected = selected }.padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
        Copy(label, 14, if (selected) Ui.foreground else Ui.muted)
    }
}

// C · Satin: prototype/web/src/emergency/SatinSurface.tsx 의 GLSL 을 AGSL 로 옮겼다.
// GLSL pow(x, 2.) 는 음수 x 에서 정의되지 않으므로 x*x 로 쓴다.
internal const val SATIN = """
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

// AGSL compile 실패는 crash 대신 기본 background 로 처리한다.
internal fun satinCompiles(source: String) = Build.VERSION.SDK_INT >= 33 && compiles(source)

@RequiresApi(33)
private fun compiles(source: String) = runCatching { RuntimeShader(source) }.isSuccess

@RequiresApi(33)
private fun satinBrush(width: Float, height: Float) = RuntimeShader(SATIN).run {
    setFloatUniform("size", width, height)
    setFloatUniform("intensity", SATIN_INTENSITY)
    ShaderBrush(this)
}

private fun Modifier.surface(satin: Boolean) =
    if (satin && Build.VERSION.SDK_INT >= 33) drawWithCache { val brush = satinBrush(size.width, size.height); onDrawBehind { drawRect(brush) } } else background(Ui.background)

