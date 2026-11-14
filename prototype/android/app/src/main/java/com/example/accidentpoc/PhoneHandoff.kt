package com.example.accidentpoc

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import kotlinx.coroutines.delay
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val clock = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault())
private val draft = mapOf("empty" to "없음", "draft" to "작성 중", "confirmed" to "확인됨")

@Composable
internal fun PhoneHandoff(link: VehicleLink, control: HandoffControl) {
    var now by remember { mutableStateOf(Instant.now()) }
    val pair = link.saved?.pair
    LaunchedEffect(pair) {
        now = Instant.now()
        if (pair != null && pair.expiresAt.isAfter(now)) {
            delay(Duration.between(now, pair.expiresAt).toMillis())
            now = Instant.now()
        }
    }
    val phase = handoff(link, now)
    val requester = remember { BringIntoViewRequester() }
    val attention = when (phase) {
        is Handoff.Pairing -> phase.claims.size
        is Handoff.Approving -> -1
        else -> null
    }
    LaunchedEffect(attention) { if (attention != null) requester.bringIntoView() }
    Column(Modifier.fillMaxWidth().padding(top = 8.dp).bringIntoViewRequester(requester).testTag("phone-handoff")
        .border(1.dp, Ui.border, RoundedCornerShape(14.dp)).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).metalPlate(RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                EngravedGlyph(LocalGlyphs.current.action("connect"), Depth.Shallow, 34.dp)
            }
            Spacer(Modifier.width(14.dp))
            Copy("휴대폰으로 이어서 기록", 23, weight = FontWeight.SemiBold, modifier = Modifier.semantics { heading() })
        }
        when (phase) {
            Handoff.Unconfigured -> Copy("이 빌드에는 서버 주소가 없어 휴대폰 연결을 쓸 수 없어요.", 19, Ui.muted)
            Handoff.Connecting -> if (link.error == null) Copy("서버에 연결하고 있어요.", 19, Ui.muted)
                else HandoffButton("다시 시도", "handoff-retry", enabled = !link.busy, onClick = control::connect)
            Handoff.Ready -> {
                Copy("사진과 진술은 휴대폰에 남기고, 진행 상황은 여기서 볼 수 있어요.", 19, Ui.muted)
                HandoffButton("휴대폰 연결하기", "handoff-start", enabled = !link.busy, onClick = control::startPairing)
            }
            is Handoff.Pairing -> Row(horizontalArrangement = Arrangement.spacedBy(28.dp)) {
                JoinQr(phase.pair.joinUrl)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Status(if (phase.claims.isEmpty()) "휴대폰 카메라로 QR 코드를 찍어 주세요" else "숫자를 확인해 주세요")
                    if (phase.claims.isEmpty()) Copy("휴대폰을 기다리고 있어요.", 19, Ui.muted)
                    phase.claims.forEach { claim -> Claim(claim, enabled = !link.busy) { control.approve(claim) } }
                    Copy("${clock.format(phase.pair.expiresAt)}까지 쓸 수 있어요", 17, Ui.muted, modifier = Modifier.testTag("handoff-expiry"))
                }
            }
            Handoff.Expired -> {
                Status("연결 코드가 만료됐어요")
                Copy("새 코드를 받아 휴대폰으로 다시 찍어 주세요.", 19, Ui.muted)
                HandoffButton("새 코드 받기", "handoff-renew", enabled = !link.busy, onClick = control::startPairing)
            }
            is Handoff.Approving -> {
                Code(phase.claim.verificationCode)
                Status("승인 결과를 아직 확인하지 못했어요")
                HandoffButton("승인 결과 확인", "handoff-confirm", enabled = !link.busy, onClick = control::confirmApproval)
            }
            is Handoff.Connected -> Progress(phase.progress, link.online)
        }
        link.error?.let { Copy(it, 18, Ui.warning, modifier = Modifier.testTag("handoff-error").semantics { liveRegion = LiveRegionMode.Polite }) }
    }
}

@Composable
private fun Status(value: String) =
    Copy(value, 22, weight = FontWeight.SemiBold, modifier = Modifier.testTag("handoff-status").semantics { liveRegion = LiveRegionMode.Polite })

@Composable
private fun Code(value: String) = Copy("${value.take(3)} ${value.drop(3)}", 44, Ui.primary, FontWeight.Bold, lineHeight = 1.15f, tracking = .06f,
    modifier = Modifier.testTag("handoff-code").semantics { contentDescription = "확인 숫자 " + value.toList().joinToString(" ") })

@Composable
private fun Claim(claim: PairClaim, enabled: Boolean, approve: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Copy("${claim.deviceLabel.take(40)}에서 연결을 요청했어요", 17, Ui.muted)
        Code(claim.verificationCode)
        Copy("휴대폰 화면의 숫자와 같으면 승인해 주세요.", 19)
        HandoffButton("승인", "handoff-approve", primary = true, enabled = enabled, onClick = approve)
    }
}

@Composable
private fun Progress(progress: VehicleProgress, online: Boolean) {
    val phone = progress.phone
    Status("휴대폰과 연결됐어요")
    Row(Modifier.testTag("handoff-phone").semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite }, verticalAlignment = Alignment.CenterVertically) {
        StatusMark(if (phone.online) "confirmed" else "unknown", 24.dp)
        Spacer(Modifier.width(10.dp))
        Copy(when {
            phone.online -> "휴대폰 연결됨"
            phone.lastSeenAt != null -> "휴대폰 응답 없음 · 마지막 확인 ${clock.format(phone.lastSeenAt)}"
            else -> "휴대폰 응답 없음"
        }, 20)
    }
    if (progress.suspended) Copy("기록을 잠시 멈췄어요. 휴대폰에서 상태를 확인하면 이어갈 수 있어요.", 18, Ui.warning)
    val record = progress.record
    Row(Modifier.testTag("handoff-record").semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite }, horizontalArrangement = Arrangement.spacedBy(36.dp)) {
        listOfNotNull("사진" to "${record.photos}장", "음성" to "${record.audio}개", ("영상" to "${record.video}개").takeIf { record.video > 0 },
            "진술" to draft.getValue(record.statement), "경위서" to draft.getValue(record.report)).forEach { (label, value) ->
            Column {
                Copy(label, 17, Ui.muted)
                Spacer(Modifier.height(6.dp))
                Copy(value, 24, weight = FontWeight.SemiBold, lineHeight = 1.2f)
            }
        }
    }
    if (!online) Copy("서버 응답이 없어 마지막으로 확인한 기록을 보여 드려요.", 17, Ui.warning)
}

@Composable
private fun HandoffButton(label: String, tag: String, primary: Boolean = false, enabled: Boolean = true, onClick: () -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    val filled = primary && enabled
    val foreground = if (filled) Ui.primaryForeground else if (enabled) Ui.foreground else Ui.muted
    Row(Modifier.testTag(tag).heightIn(min = 64.dp).clip(shape).background(if (filled) Ui.primary else Ui.card)
        .border(1.dp, if (filled) Ui.primary else Ui.border, shape).clickable(enabled = enabled, role = Role.Button, onClick = onClick)
        .padding(horizontal = 26.dp, vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        Copy(label, 23, foreground, FontWeight.SemiBold)
        Spacer(Modifier.width(16.dp))
        SolidGlyph("arrow-right", foreground, 24.dp)
    }
}

@Composable
private fun JoinQr(url: String) {
    val image = remember(url) { qr(url) }
    Image(image, "휴대폰 연결 QR 코드", Modifier.size(260.dp).clip(RoundedCornerShape(10.dp)).background(Color.White).padding(10.dp).testTag("handoff-qr"),
        filterQuality = FilterQuality.None)
}

private fun qr(url: String): ImageBitmap {
    val matrix = QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 0, 0,
        mapOf(EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M, EncodeHintType.MARGIN to 4))
    val pixels = IntArray(matrix.width * matrix.height) { index ->
        if (matrix[index % matrix.width, index / matrix.width]) android.graphics.Color.BLACK else android.graphics.Color.WHITE
    }
    return Bitmap.createBitmap(pixels, matrix.width, matrix.height, Bitmap.Config.ARGB_8888).asImageBitmap()
}
