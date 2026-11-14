import { validatePhoto } from './capture'
import type { Evidence, EvidenceReference } from './case'
import type { CaseData } from './case-data'

export async function openEvidence(data: Pick<CaseData, 'readAsset'>, caseId: string, evidence: Evidence, range?: EvidenceReference): Promise<Blob> {
  if (evidence.availability !== 'available' || !evidence.assetId) throw new Error('근거를 열 수 없어요')
  const blob = await data.readAsset(caseId, evidence.assetId)
  if (!blob || !blob.size) throw new Error('근거를 열 수 없어요')
  if (evidence.kind === 'photo') await validatePhoto(blob)
  else {
    const media = document.createElement(evidence.kind)
    const url = URL.createObjectURL(blob)
    let decoder: AudioContext | undefined
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => finish(false), 10000)
        const finish = (valid: boolean) => {
          clearTimeout(timeout); media.onloadeddata = null; media.onerror = null
          if (valid) resolve(); else reject(new Error('근거를 열 수 없어요'))
        }
        media.preload = 'auto'; media.muted = true
        media.onloadeddata = async () => {
          try {
            let duration = media.duration
            if (evidence.kind === 'audio' && duration === Infinity) {
              decoder = new AudioContext()
              duration = (await decoder.decodeAudioData(await blob.arrayBuffer())).duration
            }
            finish(Number.isFinite(duration) && duration > 0 &&
              (!range || range.start === null && range.end === null ||
                range.start !== null && range.end !== null && range.start >= 0 && range.end > range.start && range.end <= duration))
          } catch { finish(false) }
        }
        media.onerror = () => finish(false)
        media.src = url; media.load()
      })
    } finally { media.removeAttribute('src'); media.load(); URL.revokeObjectURL(url); await decoder?.close() }
  }
  return blob
}
