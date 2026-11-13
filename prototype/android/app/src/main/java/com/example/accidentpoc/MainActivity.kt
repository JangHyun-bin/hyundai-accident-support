package com.example.accidentpoc

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
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.selection.toggleable
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.intl.LocaleList
import androidx.compose.ui.text.style.LineBreak
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

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
    // The complete request/approval state, not just a projection ID, survives activity recreation.
    var session by rememberSaveable(stateSaver = sessionSaver(story)) { mutableStateOf(createSession(story, start)) }
    var satin by rememberSaveable { mutableStateOf(true) }
    val satinAvailable = remember { satinCompiles(SATIN) }
    val scene = remember(story, session) { projectedScene(story, session) }
    val titleFocus = remember { FocusRequester() }
    val sceneFocus = remember { story.scenes.associate { it.id to FocusRequester() } }
    var focusAfter by remember { mutableStateOf<FocusRequester?>(null) }
    LaunchedEffect(session.sceneId, focusAfter) { focusAfter?.requestFocus(); focusAfter = null }
    val context = LocalContext.current
    val glyphs = remember { loadGlyphs(context).also { it.validate(story) } }
    CompositionLocalProvider(LocalGlyphs provides glyphs) { Column(Modifier.fillMaxSize().background(Ui.review)) {
        ProductScreen(story, scene, session, satin && satinAvailable, titleFocus, Modifier.fillMaxWidth().weight(1f),
            act = { edge ->
                val next = transition(story, session, edge)
                if (next != session) { session = next; focusAfter = titleFocus }
            },
            changeScope = { session = updateDraft(session, scope = it) })
        // This review-only tool stays outside the vehicle surface and never initiates a request.
        ReviewStrip(story, session, satin, satinAvailable, sceneFocus,
            select = { session = selectScene(story, session, it) },
            event = { edge ->
                session = transition(story, session, edge)
                focusAfter = sceneFocus.getValue(session.sceneId)
            }, setSatin = { satin = it })
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
private fun ProductScreen(story: Scenario, scene: Scene, session: Session, satin: Boolean, titleFocus: FocusRequester, modifier: Modifier, act: (Transition) -> Unit, changeScope: (List<String>) -> Unit) {
    BoxWithConstraints(modifier.surface(satin).padding(horizontal = 32.dp)) {
        // A short landscape viewport must not shrink the actionable region below a 64 dp target.
        // On those devices the complete surface scrolls; a full vehicle display retains its fixed bands.
        val compact = maxHeight < 480.dp
        Column(Modifier.fillMaxSize().then(if (compact) Modifier.verticalScroll(rememberScrollState()) else Modifier)) {
            Row(Modifier.fillMaxWidth().heightIn(min = 72.dp).padding(vertical = 10.dp).horizontalScroll(rememberScrollState()), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(12.dp, 24.dp).rotate(30f).border(2.dp, Ui.primary, RoundedCornerShape(7.dp)))
                Spacer(Modifier.width(12.dp))
                Copy("사고 대응", 24, weight = FontWeight.SemiBold)
                Spacer(Modifier.width(36.dp))
                Copy(story.contextLabel, 20, Ui.muted)
            }
            Divider(Ui.line)
            val body = if (compact) Modifier.heightIn(min = 320.dp) else Modifier.weight(1f)
            Row(Modifier.fillMaxWidth().then(body).padding(horizontal = 8.dp, vertical = 18.dp), horizontalArrangement = Arrangement.spacedBy(40.dp), verticalAlignment = if (compact) Alignment.Top else Alignment.CenterVertically) {
                Cue(scene, Modifier.weight(.85f).then(if (compact) Modifier else Modifier.verticalScroll(rememberScrollState())))
                ActionArea(story, scene, session, titleFocus, Modifier.weight(1.15f), act, changeScope, scroll = !compact)
            }
            Divider(Ui.border)
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).heightIn(min = 108.dp).padding(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(28.dp), verticalAlignment = Alignment.CenterVertically) {
                Copy("지원 현황", 19, Ui.muted)
                story.requests.filter { it.id in story.visibleRequests }.forEach { RequestStatus(it, session.requests.getValue(it.id), story.statuses) }
                Copy("연결 · 접수 · 도착은 별도 확인", 17, Ui.muted, modifier = Modifier.widthIn(max = 210.dp))
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
        if (scene.cueDetail.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Copy(scene.cueDetail, 20, Ui.muted, align = TextAlign.Center)
        }
    }
}

@Composable
private fun WorkflowPanel(scene: Scene, session: Session, changeScope: (List<String>) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(top = 18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Copy("요청 ${session.requestId} · 전송 ${session.submissions}회", 17, Ui.muted,
            modifier = Modifier.testTag("request-identity").semantics { liveRegion = LiveRegionMode.Polite })
        if (scene.panel == "scope") {
            Copy("받는 곳 · 차량 지원\n목적 · 이동 불가 차량 지원", 19, Ui.muted)
            Copy("보낼 항목", 21, weight = FontWeight.SemiBold)
            scopeItems.forEachIndexed { index, item ->
                val checked = item in session.scope
                Row(Modifier.fillMaxWidth().testTag("scope-$index").heightIn(min = 64.dp)
                    .toggleable(value = checked, role = Role.Checkbox) { selected ->
                        changeScope(scopeItems.filter { if (it == item) selected else it in session.scope })
                    }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Copy(if (checked) "☑" else "☐", 28, Ui.primary)
                    Spacer(Modifier.width(14.dp))
                    Copy(item, 23, modifier = Modifier.weight(1f))
                }
            }
            Copy(session.savedRecord.ifBlank { "아직 보관한 사고 기록이 없어요." }, 18, Ui.muted, modifier = Modifier.testTag("saved-record"))
            submissionBlockReason(session)?.let {
                Copy(it, 19, Ui.warning, modifier = Modifier.testTag("submit-block-reason").semantics { liveRegion = LiveRegionMode.Polite })
            }
        }
        if (scene.panel == "resume") {
            Copy(if (session.requests["vehicle"] == "received") "기존 요청 · 접수 확인" else "기존 요청 · 결과 확인 필요", 21,
                modifier = Modifier.testTag("resume-status").semantics { liveRegion = LiveRegionMode.Polite })
            Copy("기록과 전송 범위는 그대로 유지돼요.", 18, Ui.muted)
        }
        if (scene.panel == "scope" || scene.panel == "receipt" || scene.panel == "resume") {
            Copy("마지막 승인 범위 · ${session.approvedScope.joinToString(" · ").ifBlank { "없음" }}", 17, Ui.muted, modifier = Modifier.testTag("approved-scope"))
            Copy("승인한 사고 기록 · ${session.approvedRecord.ifBlank { "없음" }}", 17, Ui.muted, modifier = Modifier.testTag("approved-record"))
            Copy(if (session.draftApproved) "승인 당시 내용 유지" else "변경한 범위는 다시 승인해야 해요.", 17, Ui.muted, modifier = Modifier.testTag("approval-status"))
        }
    }
}

@Composable
private fun ActionArea(story: Scenario, scene: Scene, session: Session, titleFocus: FocusRequester, modifier: Modifier, act: (Transition) -> Unit, changeScope: (List<String>) -> Unit, scroll: Boolean) {
    Column(modifier.then(if (scroll) Modifier.verticalScroll(rememberScrollState()) else Modifier).testTag("action-area").padding(top = 8.dp)) {
        Copy(scene.title, 44, weight = FontWeight.SemiBold, lineHeight = 1.25f, tracking = -.035f, modifier = Modifier.testTag("scene-title").semantics { heading(); liveRegion = LiveRegionMode.Polite }.focusRequester(titleFocus).focusable())
        if (scene.instruction.isNotEmpty()) {
            Spacer(Modifier.height(18.dp))
            Copy(scene.instruction, 24, Ui.muted, lineHeight = 1.45f)
        }
        WorkflowPanel(scene, session, changeScope)
        Column(Modifier.fillMaxWidth().padding(top = 28.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            // Each primary/secondary action owns its own row, including at 200% text size.
            scene.actions.forEach { action ->
                val enabled = action.effect != "submit" || submissionBlockReason(session, action.agency ?: "vehicle") == null
                val background = if (action.secondary || !enabled) Ui.card else Ui.primary
                val foreground = if (action.secondary || !enabled) Ui.foreground else Ui.primaryForeground
                Row(Modifier.fillMaxWidth().testTag("action-${action.id}").heightIn(min = 82.dp).clip(RoundedCornerShape(14.dp)).background(background).border(1.dp, if (action.secondary) Ui.border else background, RoundedCornerShape(14.dp)).clickable(enabled = enabled, role = Role.Button) { act(action) }.padding(horizontal = 24.dp, vertical = 22.dp), verticalAlignment = Alignment.CenterVertically) {
                    SolidGlyph(LocalGlyphs.current.action(action.id), foreground, 30.dp)
                    Spacer(Modifier.width(18.dp))
                    Copy(action.label, 28, foreground, FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    SolidGlyph("arrow-right", foreground, 28.dp)
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
            sessionFacts(story, session).filter { it.id in story.visibleFacts }.forEach { fact ->
                Row(Modifier.weight(1f).testTag("fact-${fact.id}").semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite }, verticalAlignment = Alignment.CenterVertically) {
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
    Row(Modifier.widthIn(min = 240.dp).testTag("request-${request.id}").semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite; stateDescription = label }, verticalAlignment = Alignment.CenterVertically) {
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
private fun ReviewStrip(story: Scenario, session: Session, satin: Boolean, satinAvailable: Boolean, sceneFocus: Map<String, FocusRequester>, select: (String) -> Unit, event: (Transition) -> Unit, setSatin: (Boolean) -> Unit) {
    val scene = story.scene(session.sceneId)
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            Copy("시연 control · 차량 화면 밖", 13, Ui.muted)
            Copy("가상 scenario · 실제 전화·전송 없음", 13, Ui.warning)
        }
        Row(Modifier.fillMaxWidth().testTag("scene-controls").horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            story.scenes.forEach { ReviewButton(it.label, it.id == scene.id, "scene-${it.id}", Modifier.focusRequester(sceneFocus.getValue(it.id))) { select(it.id) } }
        }
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Copy("외부 결과 시연", 13, Ui.muted)
            if (scene.events.isEmpty()) Copy("다른 장면을 선택해 비교할 수 있어요.", 13, Ui.muted)
            scene.events.forEach { ReviewButton(it.label, false, "event-${it.id}") { event(it) } }
            ReviewButton("기존 flat", !satin, "surface-flat") { setSatin(false) }
            ReviewButton("C · Satin", satin, "surface-satin") { setSatin(true) }
            Copy(satinStatus(satin, satinAvailable), 12, Ui.muted, modifier = Modifier.testTag("surface-status"))
        }
    }
}

internal fun satinStatus(selected: Boolean, available: Boolean): String = when {
    !selected -> "기존 flat"
    Build.VERSION.SDK_INT < 33 -> "Satin 미지원 · 기본 background"
    available -> "Satin 적용 · 강도 70%"
    else -> "Satin 오류 · 기본 background"
}

@Composable
private fun ReviewButton(label: String, selected: Boolean, tag: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(10.dp)
    Box(modifier.testTag(tag).heightIn(min = 48.dp).clip(shape).background(if (selected) Ui.card else Ui.surface).border(1.dp, if (selected) Ui.primary else Ui.line, shape).clickable(role = Role.Button, onClick = onClick).semantics { this.selected = selected }.padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
        Copy(label, 14, if (selected) Ui.foreground else Ui.muted)
    }
}

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

