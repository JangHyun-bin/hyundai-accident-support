import { LIMITS } from './case'

export async function validatePhoto(blob: Blob): Promise<void> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error('JPEG, PNG, WebP 사진을 선택해주세요.')
  if (blob.size > LIMITS.photoBytes) throw new Error('사진 한 장은 15 MiB 이하여야 해요.')
  if (!blob.size) throw new Error('사진을 열 수 없어요. 다른 사진을 선택해주세요.')
  try {
    const bitmap = await createImageBitmap(blob)
    const valid = bitmap.width > 0 && bitmap.height > 0
    bitmap.close()
    if (!valid) throw new Error('Empty image')
  } catch { throw new Error('사진을 열 수 없어요. 다른 사진을 선택해주세요.') }
}

export async function capturePhoto(stream: MediaStream): Promise<Blob> {
  if (!stream.getVideoTracks().some(track => track.readyState === 'live')) throw new Error('Camera 연결이 끝났어요. 다시 촬영해주세요.')
  const video = document.createElement('video')
  video.muted = true; video.playsInline = true; video.srcObject = stream
  try {
    await video.play()
    if (!video.videoWidth || !video.videoHeight) throw new Error('아직 사진을 찍을 수 없어요. 잠시 뒤 다시 시도해주세요.')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('사진을 만들 수 없어요. 저장된 사진을 선택해주세요.')
    context.drawImage(video, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('사진을 만들 수 없어요.')), 'image/jpeg', .9))
    await validatePhoto(blob)
    return blob
  } finally { video.pause(); video.srcObject = null }
}
