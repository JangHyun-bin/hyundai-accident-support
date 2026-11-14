import { LIMITS, type Evidence, type JourneyCase } from './case'

export type StoredAsset = { id: string; caseId: string; mime: string; bytes: number }

export function evidenceReferences(value: JourneyCase): Evidence[] {
  return [...value.evidence, ...value.evidenceHistory,
    ...value.submissions.flatMap(item => item.payload?.evidence ?? []),
    ...value.shares.flatMap(item => item.payload.evidence)]
}

export function referencedAssetIds(value: JourneyCase): Set<string> {
  return new Set(evidenceReferences(value).flatMap(item => item.assetId === null ? [] : [item.assetId]))
}

export function validAssetReferences(value: JourneyCase, assets: StoredAsset[]): boolean {
  const byId = new Map(assets.map(asset => [asset.id, asset]))
  if (byId.size !== assets.length || assets.some(asset => asset.caseId !== value.id || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) ||
    assets.reduce((bytes, asset) => bytes + asset.bytes, 0) > LIMITS.caseBytes) return false
  return evidenceReferences(value).every(evidence => {
    if (evidence.availability !== 'available') return true
    const asset = evidence.assetId === null ? undefined : byId.get(evidence.assetId)
    return asset !== undefined && asset.bytes === evidence.metadata.bytes && asset.mime === evidence.metadata.mime
  })
}
