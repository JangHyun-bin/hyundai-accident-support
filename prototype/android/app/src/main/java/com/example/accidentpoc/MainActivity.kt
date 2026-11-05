package com.example.accidentpoc

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val bg = Color(0xFF131417)
private val panel = Color(0xFF1D1E21)
private val line = Color(0xFF3C4148)
private val text = Color(0xFFF7F8FA)
private val muted = Color(0xFFA4A8AE)
private val mint = Color(0xFF6FE3C1)
private val blue = Color(0xFF96BDFF)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { AccidentPoC() } }
    }
}

@Composable
private fun AccidentPoC() {
    var scene by remember { mutableIntStateOf(0) }
    var sample by remember { mutableIntStateOf(0) }
    val heading = if (scene == 0) "먼저, 몸 상태를 확인할게요" else "요청 상태를 확인하세요"
    val message = if (scene == 0) "답하기 어려우면 도움 요청을 선택할 수 있어요." else "각 요청은 확인된 상태를 따로 보여줘요."
    Surface(color = bg, modifier = Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 28.dp, vertical = 15.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(30.dp).clip(RoundedCornerShape(9.dp)).background(mint), contentAlignment = Alignment.Center) {
                    Text("+", color = bg, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.width(10.dp))
                Text("사고 대응 지원", color = text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.weight(1f))
                Text("CONCEPT  /  INTERACTIVE POC", color = muted, fontSize = 10.sp, letterSpacing = 1.3.sp)
            }
            Spacer(Modifier.height(15.dp))
            Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Column(Modifier.weight(1.08f).fillMaxHeight(), verticalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(7.dp).clip(CircleShape).background(mint))
                            Spacer(Modifier.width(8.dp))
                            Text(if (scene == 0) "01  상황 확인" else "02  진행 확인", color = mint, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, letterSpacing = .5.sp)
                        }
                        Spacer(Modifier.height(14.dp))
                        AnimatedContent(targetState = heading, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "heading") { h ->
                            Text(h, color = text, fontSize = 25.sp, lineHeight = 31.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(message, color = muted, fontSize = 13.sp, lineHeight = 19.sp)
                    }
                    Column {
                        Text("이 화면은 가상 상황을 보여주는 PoC입니다.", color = Color(0xFF8D959D), fontSize = 11.sp)
                        Spacer(Modifier.height(9.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Pill(if (scene == 0) "다음 화면 보기  →" else "처음으로  ↗", true, Modifier.weight(1f)) { scene = 1 - scene }
                            Pill("상황 바꾸기", false, Modifier.weight(.8f)) { sample = 1 - sample; scene = 1 }
                        }
                    }
                }
                Column(Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(22.dp)).background(panel).border(1.dp, line, RoundedCornerShape(22.dp)).padding(17.dp).verticalScroll(rememberScrollState())) {
                    AnimatedContent(targetState = scene, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "scene") { active ->
                        if (active == 0) {
                            Column {
                                Text("지금 확인할 내용", color = muted, fontSize = 11.sp)
                                Spacer(Modifier.height(10.dp))
                                Text("도움이 필요한 사람이 있나요?", color = text, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(6.dp))
                                Text("운전자와 동승자를 함께 확인해요.", color = muted, fontSize = 12.sp)
                                Spacer(Modifier.height(14.dp))
                                ActionRow("도움이 필요해요", "연락 방법 확인", mint) { scene = 1 }
                                Spacer(Modifier.height(7.dp))
                                ActionRow("아직 잘 모르겠어요", "확인 가능한 방법 보기", blue) { sample = 1; scene = 1 }
                                Spacer(Modifier.height(10.dp))
                                Text("답변은 예시이며 실제 연락은 이뤄지지 않아요.", color = muted, fontSize = 10.sp)
                            }
                        } else {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text("기관별 진행 상태", color = text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                                        Spacer(Modifier.height(3.dp))
                                        Text("아래 내용은 예시입니다", color = muted, fontSize = 11.sp)
                                    }
                                    Text("상황 0${sample + 1}", color = mint, fontSize = 11.sp)
                                }
                                Spacer(Modifier.height(12.dp))
                                StatusRow("01", "구호 요청", if (sample == 0) "접수 확인" else "접수 미확인", if (sample == 0) mint else Color(0xFFFFC777))
                                Spacer(Modifier.height(7.dp))
                                StatusRow("02", "차량 지원", if (sample == 0) "확인 대기" else "요청 전", blue)
                                Spacer(Modifier.height(7.dp))
                                StatusRow("03", "보험 처리", "요청 전", muted)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Pill(label: String, primary: Boolean, modifier: Modifier = Modifier, action: () -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    Box(modifier.height(48.dp).clip(shape).background(if (primary) mint else Color(0xFF292D32)).clickable(onClick = action), contentAlignment = Alignment.Center) {
        Text(label, color = if (primary) bg else text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
    }
}

@Composable
private fun ActionRow(title: String, subtitle: String, accent: Color, action: () -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(Color(0xFF292D32)).clickable(onClick = action).padding(horizontal = 13.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(30.dp).clip(CircleShape).background(accent.copy(alpha = .13f)), contentAlignment = Alignment.Center) { Text("+", color = accent, fontSize = 18.sp) }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) { Text(title, color = text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold); Text(subtitle, color = muted, fontSize = 10.sp) }
        Text("↗", color = muted, fontSize = 16.sp)
    }
}

@Composable
private fun StatusRow(index: String, title: String, status: String, accent: Color) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0xFF292D32)).padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(index, color = muted, fontSize = 10.sp)
        Spacer(Modifier.width(11.dp))
        Text(title, color = text, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
        Box(Modifier.clip(RoundedCornerShape(8.dp)).background(accent.copy(alpha = .12f)).padding(horizontal = 8.dp, vertical = 5.dp)) {
            Text(status, color = accent, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}
