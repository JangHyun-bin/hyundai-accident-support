import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const output = fileURLToPath(new URL('../public/journey-samples/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 960, height: 540 } })
await page.setContent('<canvas width="960" height="540"></canvas>')

async function frame(time, rear = false) {
  return page.evaluate(({ time, rear }) => {
    const canvas = document.querySelector('canvas')
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#D8DBDC'; ctx.fillRect(0, 0, 960, 540)
    ctx.fillStyle = '#BEC5C6'; ctx.fillRect(0, 200, 960, 80)
    for (let i = 0; i < 12; i++) {
      const x = i * 100 - 20
      ctx.fillStyle = i % 2 ? '#A7B0B1' : '#B3BABB'; ctx.fillRect(x, 135 + (i % 3) * 20, 70, 120)
      ctx.fillStyle = '#C9D0D0'; ctx.fillRect(x + 12, 154 + (i % 3) * 20, 45, 3)
    }
    ctx.fillStyle = '#8F999A'; ctx.beginPath(); ctx.moveTo(360, 240); ctx.lineTo(600, 240); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#454C4F'; ctx.beginPath(); ctx.moveTo(390, 240); ctx.lineTo(570, 240); ctx.lineTo(875, 540); ctx.lineTo(85, 540); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#DFE3E4'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(402, 240); ctx.lineTo(130, 540); ctx.moveTo(558, 240); ctx.lineTo(830, 540); ctx.stroke()
    const motion = Math.min(time, 11) * .8
    for (let i = -1; i < 9; i++) {
      const phase = ((i + motion) % 8 + 8) % 8 / 8
      const y = 245 + phase * phase * 320
      const length = 5 + phase * 35
      ctx.strokeStyle = '#D6D9DA'; ctx.lineWidth = 1 + phase * 4
      ctx.beginPath(); ctx.moveTo(480, y); ctx.lineTo(480, y + length); ctx.stroke()
    }
    function car(x, y, scale, color) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale)
      ctx.fillStyle = '#303638'; ctx.beginPath(); ctx.ellipse(0, 38, 92, 13, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-72, -30, 144, 66, 12); ctx.fill()
      ctx.beginPath(); ctx.moveTo(-58, -30); ctx.lineTo(-43, -68); ctx.lineTo(43, -68); ctx.lineTo(58, -30); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#66777C'; ctx.beginPath(); ctx.moveTo(-45, -33); ctx.lineTo(-35, -59); ctx.lineTo(35, -59); ctx.lineTo(45, -33); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#E9ECEC'; ctx.fillRect(-60, -10, 25, 6); ctx.fillRect(35, -10, 25, 6)
      ctx.fillStyle = '#7D888B'; ctx.fillRect(-22, 14, 44, 10)
      ctx.restore()
    }
    const approach = Math.min(time / 11, 1)
    if (rear) {
      car(425 + approach * 23, 320 + approach * 110, .55 + approach * .7, '#BFC9CC')
      car(600, 290, .38, '#8D9DA2')
    } else {
      car(390 + approach * 60, 310 + approach * 70, .65 + approach * .25, '#BFC9CC')
      car(590 - approach * 80, 350 + approach * 44, .8 + approach * .2, '#8B9DA3')
    }
    ctx.fillStyle = '#242A2C'; ctx.beginPath(); ctx.moveTo(0, 540); ctx.quadraticCurveTo(480, 490, 960, 540); ctx.closePath(); ctx.fill()
    return canvas.toDataURL('image/png').split(',')[1]
  }, { time, rear })
}

try {
  for (const [name, rear] of [['front', false], ['rear', true]]) {
    const destination = path.join(output, `${name}-20s.mp4`)
    const encoder = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '24', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination])
    let failure = ''
    encoder.stderr.on('data', chunk => { failure += chunk })
    const closed = once(encoder, 'close')
    for (let i = 0; i < 480; i++) {
      const png = Buffer.from(await frame(i / 24, rear), 'base64')
      if (!encoder.stdin.write(png)) await once(encoder.stdin, 'drain')
    }
    encoder.stdin.end()
    const [code] = await closed
    if (code !== 0) throw new Error(failure || `ffmpeg exited ${code}`)
    console.log(destination)
  }
  await writeFile(path.join(output, 'scene.png'), Buffer.from(await frame(11), 'base64'))
  await writeFile(path.join(output, 'own-car.png'), Buffer.from(await frame(11, true), 'base64'))
} finally { await browser.close() }
