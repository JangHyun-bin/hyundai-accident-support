import { readAsset } from './case-store'
import { validatePhoto } from './capture'
import type { Evidence, EvidenceReference } from './case'

export async function openEvidence(caseId: string, evidence: Evidence, range?: EvidenceReference): Promise<Blob> {
  if (evidence.availability !== 'available' || !evidence.assetId) throw new Error('근거를 열 수 없어요')
  const blob = await readAsset(caseId, evidence.assetId)
  if (!blob || !blob.size) throw new Error('근거를 열 수 없어요')
  if (evidence.kind === 'photo') await validatePhoto(blob)
  else {
    const media = document.createElement(evidence.kind)
    const url = URL.createObjectURL(blob)
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => finish(false), 10000)
        const finish = (valid: boolean) => {
          clearTimeout(timeout); media.onloadeddata = null; media.onerror = null
          if (valid) resolve(); else reject(new Error('근거를 열 수 없어요'))
        }
        media.preload = 'auto'; media.muted = true
        media.onloadeddata = () => finish(Number.isFinite(media.duration) && media.duration > 0 &&
          (!range || range.start === null && range.end === null ||
            range.start !== null && range.end !== null && range.start >= 0 && range.end > range.start && range.end <= media.duration))
        media.onerror = () => finish(false)
        media.src = url; media.load()
      })
    } finally { media.removeAttribute('src'); media.load(); URL.revokeObjectURL(url) }
  }
  return blob
}
