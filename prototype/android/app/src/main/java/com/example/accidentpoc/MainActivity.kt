package com.example.accidentpoc

import android.os.Bundle
import android.view.View
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// PoC palette: Pleos basic colours with project-defined surfaces, type sizes and spacing.
private object Ui {
    val canvas = Color(0xFFF7F8FA)
    val surface = Color.White
    val soft = Color(0xFFF0F3F6)
    val ink = Color(0xFF131D2A)
    val secondary = Color(0xFF596675)
    val faint = Color(0xFF8994A1)
    val line = Color(0xFFE2E7EC)
    val accent = Color(0xFF0064FF)
    val accentSoft = Color(0xFFEDF4FF)
    val guide = Color(0xFF15293D)
    val guideMuted = Color(0xFFAFBDCC)
    val guideLine = Color(0xFF31475B)
    val font = FontFamily(
        Font(R.font.asta_regular, FontWeight.Normal),
        Font(R.font.asta_semibold, FontWeight.SemiBold),
        Font(R.font.asta_bold, FontWeight.Bold)
    )
}

class MainActivity : ComponentActivity() {
    @Suppress("DEPRECATION")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        setContent { MaterialTheme { SupportScreen() } }
    }
}

@Composable
private fun Copy(value: String, size: Int, color: Color = Ui.ink, weight: FontWeight = FontWeight.Normal, modifier: Modifier = Modifier) {
    Text(value, modifier = modifier, fontFamily = Ui.font, fontSize = size.sp, color = color, fontWeight = weight, lineHeight = (size * 1.35f).sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
}

@Composable
private fun SupportScreen() {
    var page by remember { mutableIntStateOf(0) }
    var answer by remember { mutableIntStateOf(-1) }
    val labels = listOf("도움이 필요해요", "잘 모르겠어요", "다친 사람은 없어요")
    Surface(color = Ui.canvas, modifier = Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 27.dp)) {
            Row(Modifier.fillMaxWidth().height(49.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(26.dp).clip(RoundedCornerShape(8.dp)).background(Ui.ink), contentAlignment = Alignment.Center) {
                    Copy("+", 20, Color.White, FontWeight.SemiBold)
                }
                Spacer(Modifier.width(9.dp))
                Copy("사고 대응 지원", 14, weight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Box(Modifier.clip(RoundedCornerShape(20.dp)).background(Ui.soft).padding(horizontal = 10.dp, vertical = 5.dp)) {
                    Copy("시나리오 예시", 10, Ui.secondary, FontWeight.SemiBold)
                }
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(Ui.line))
            Spacer(Modifier.height(15.dp))
            Row(Modifier.fillMaxSize().padding(bottom = 15.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Column(Modifier.weight(1.65f).fillMaxHeight()) {
                    AnimatedContent(targetState = page, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "support") { current ->
                        when (current) {
                            0 -> QuestionPanel(answer) { answer = it }
                            1 -> ConfirmationPanel(labels.getOrElse(answer) { "선택하지 않음" })
                            else -> StatusPanel()
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        if (page > 0) {
                            Control("이전", false, Modifier.width(95.dp)) { page-- }
                        }
                        Spacer(Modifier.weight(1f))
                        Control(if (page == 0) "다음" else if (page == 1) "요청 현황 보기" else "처음으로", true, Modifier.width(if (page == 1) 147.dp else 112.dp), enabled = page != 0 || answer >= 0) {
                            page = if (page == 2) { answer = -1; 0 } else page + 1
                        }
                    }
                }
                GuidePanel(page, Modifier.weight(1f).fillMaxHeight())
            }
        }
    }
}

@Composable
private fun QuestionPanel(answer: Int, choose: (Int) -> Unit) {
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
        Copy("상태 확인", 11, Ui.accent, FontWeight.Bold)
        Spacer(Modifier.height(5.dp))
        Copy("도움이 필요한 사람이 있나요?", 24, weight = FontWeight.Bold)
        Spacer(Modifier.height(2.dp))
        Copy("운전자와 동승자의 상태를 확인해 주세요.", 12, Ui.secondary)
        Spacer(Modifier.height(12.dp))
        listOf("도움이 필요해요", "잘 모르겠어요", "다친 사람은 없어요").forEachIndexed { i, label ->
            Choice(label, selected = answer == i) { choose(i) }
            if (i < 2) Spacer(Modifier.height(6.dp))
        }
    }
}

@Composable
private fun Choice(label: String, selected: Boolean, choose: () -> Unit) {
    val shape = RoundedCornerShape(11.dp)
    val fill by animateColorAsState(if (selected) Ui.accentSoft else Ui.surface, label = "choice")
    val outline by animateColorAsState(if (selected) Ui.accent else Ui.line, label = "outline")
    Row(Modifier.fillMaxWidth().height(40.dp).clip(shape).background(fill).border(1.dp, outline, shape).clickable(onClick = choose).padding(horizontal = 13.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(16.dp).border(if (selected) 5.dp else 1.dp, if (selected) Ui.accent else Ui.faint, CircleShape))
        Spacer(Modifier.width(11.dp))
        Copy(label, 13, if (selected) Ui.accent else Ui.ink, FontWeight.SemiBold)
    }
}

@Composable
private fun ConfirmationPanel(answer: String) {
    Column(Modifier.fillMaxWidth()) {
        Copy("선택 확인", 11, Ui.accent, FontWeight.Bold)
        Spacer(Modifier.height(5.dp))
        Copy("선택한 내용을 확인해 주세요", 24, weight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        Copy("입력 내용은 이후 안내에 참고할 수 있어요.", 12, Ui.secondary)
        Spacer(Modifier.height(17.dp))
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(Ui.surface).border(1.dp, Ui.line, RoundedCornerShape(13.dp)).padding(15.dp)) {
            Copy("몸 상태", 11, Ui.secondary)
            Spacer(Modifier.height(5.dp))
            Copy(answer, 16, weight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(10.dp))
        Copy("이 예시에서는 실제 연락이나 정보 전송이 이뤄지지 않아요.", 11, Ui.secondary)
    }
}

@Composable
private fun StatusPanel() {
    Column(Modifier.fillMaxWidth()) {
        Copy("지원 현황", 11, Ui.accent, FontWeight.Bold)
        Spacer(Modifier.height(5.dp))
        Copy("요청 현황을 확인하세요", 24, weight = FontWeight.Bold)
        Spacer(Modifier.height(3.dp))
        Copy("각 요청의 진행 상황을 따로 보여줘요.", 12, Ui.secondary)
        Spacer(Modifier.height(12.dp))
        listOf("구호 요청", "차량 지원", "보험 처리").forEach { label ->
            Row(Modifier.fillMaxWidth().height(39.dp), verticalAlignment = Alignment.CenterVertically) {
                Copy(label, 13, weight = FontWeight.SemiBold)
                Spacer(Modifier.weight(1f))
                Copy("요청 전", 11, Ui.secondary)
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(Ui.line))
        }
    }
}

@Composable
private fun GuidePanel(page: Int, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(14.dp)
    Column(modifier.clip(shape).background(Ui.guide).padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
        Column {
            Copy("안내 순서", 11, Ui.guideMuted, FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Copy("필요한 도움을\n차근차근 확인해요", 17, Color.White, FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            listOf("상태 확인", "선택 확인", "지원 현황").forEachIndexed { index, label ->
                Row(Modifier.fillMaxWidth().height(37.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(24.dp).clip(CircleShape).background(if (index == page) Color.White else Ui.guideLine), contentAlignment = Alignment.Center) {
                        Copy("${index + 1}", 10, if (index == page) Ui.guide else Ui.guideMuted, FontWeight.Bold)
                    }
                    Spacer(Modifier.width(10.dp))
                    Copy(label, 12, if (index == page) Color.White else Ui.guideMuted, if (index == page) FontWeight.Bold else FontWeight.Normal)
                }
            }
        }
        Column {
            Box(Modifier.fillMaxWidth().height(1.dp).background(Ui.guideLine))
            Spacer(Modifier.height(9.dp))
            Copy("한 단계씩 살펴볼게요.", 11, Ui.guideMuted)
        }
    }
}

@Composable
private fun Control(label: String, primary: Boolean, modifier: Modifier = Modifier, enabled: Boolean = true, action: () -> Unit) {
    val shape = RoundedCornerShape(11.dp)
    Box(modifier.height(43.dp).clip(shape).background(if (!enabled) Ui.line else if (primary) Ui.ink else Ui.surface).then(if (primary) Modifier else Modifier.border(1.dp, Ui.line, shape)).clickable(enabled = enabled, onClick = action), contentAlignment = Alignment.Center) {
        Copy(label, 12, if (!enabled) Ui.faint else if (primary) Color.White else Ui.ink, FontWeight.SemiBold)
    }
}
