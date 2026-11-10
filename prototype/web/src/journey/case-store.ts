import type { Session } from '../emergency/session'
import { createCase, validateCase, LIMITS, type AssetWrite, type CommitResult, type Evidence, type JourneyCase } from './case'

type AssetRecord = { id: string; caseId: string; blob: Blob }
type Failure = Extract<CommitResult, { ok: false }>['reason']
class CommitError extends Error {
  constructor(readonly reason: Failure) { super(reason) }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('after-care-journey-v1', 1)
    let rejected = false
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore('cases', { keyPath: 'id' })
      db.createObjectStore('assets', { keyPath: 'id' }).createIndex('caseId', 'caseId')
      db.createObjectStore('meta').put({ schemaVersion: 1 }, 'schema')
    }
    request.onsuccess = () => {
      if (rejected) request.result.close()
      else { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => { rejected = true; reject(new CommitError('unavailable')) }
  })
}
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
function completed(transaction: IDBTransaction): Promise<void> {
  const promise = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new CommitError('unavailable'))
    transaction.onerror = () => reject(transaction.error ?? new CommitError('unavailable'))
  })
  // Request 처리 중 먼저 abort돼도 reject가 처리되지 않은 Promise로 남지 않게 함.
  void promise.catch(() => {})
  return promise
}
function evidenceReferences(value: JourneyCase): Evidence[] {
  return [...value.evidence, ...value.evidenceHistory,
    ...value.submissions.flatMap(s => s.payload?.evidence ?? []),
    ...value.shares.flatMap(s => s.payload.evidence)]
}
function validReferences(value: JourneyCase, assets: AssetRecord[]) {
  const byId = new Map(assets.map(a => [a.id, a]))
  return evidenceReferences(value).every(e => {
    if (e.availability !== 'available') return true
    const asset = e.assetId ? byId.get(e.assetId) : undefined
    return asset?.caseId === value.id && asset.blob instanceof Blob &&
      asset.blob.size === e.metadata.bytes && asset.blob.type === e.metadata.mime
  })
}
function failure(error: unknown): Failure {
  if (error instanceof CommitError) return error.reason
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') return 'quota'
    if (['ConstraintError', 'DataError', 'DataCloneError'].includes(error.name)) return 'invalid'
  }
  return 'unavailable'
}

export async function loadCase(id: string): Promise<JourneyCase | null> {
  let db: IDBDatabase | undefined
  try {
    db = await openDatabase()
    const transaction = db.transaction(['cases', 'assets'], 'readonly')
    const done = completed(transaction)
    const value: unknown = await result(transaction.objectStore('cases').get(id))
    if (!validateCase(value)) { await done; return null }
    const assets: AssetRecord[] = await result(transaction.objectStore('assets').index('caseId').getAll(id))
    await done
    return validReferences(value, assets) ? value : null
  } catch { return null } finally { db?.close() }
}

export async function commitCase(next: JourneyCase, expectedRevision: number | null, assets: AssetWrite[] = []): Promise<CommitResult> {
  let db: IDBDatabase | undefined
  let transaction: IDBTransaction | undefined
  let done: Promise<void> | undefined
  try {
    if (!validateCase(next) || (expectedRevision === null ? next.revision !== 0 : next.revision !== expectedRevision) ||
      assets.some(a => a.caseId !== next.id || !(a.blob instanceof Blob)) || new Set(assets.map(a => a.id)).size !== assets.length) throw new CommitError('invalid')
    db = await openDatabase()
    transaction = db.transaction(['cases', 'assets', 'meta'], 'readwrite')
    done = completed(transaction)
    const cases = transaction.objectStore('cases')
    const media = transaction.objectStore('assets')
    const previous: unknown = await result(cases.get(next.id))
    if (expectedRevision === null ? previous !== undefined : !validateCase(previous) || previous.revision !== expectedRevision) throw new CommitError('conflict')
    const stored: AssetRecord[] = await result(media.index('caseId').getAll(next.id))
    const referenced = new Set(evidenceReferences(next).map(e => e.assetId).filter((id): id is string => id !== null))
    for (const asset of assets) {
      if (!referenced.has(asset.id) || await result(media.getKey(asset.id)) !== undefined) throw new CommitError('invalid')
    }
    const removed = validateCase(previous)
      ? new Set(evidenceReferences(previous).map(e => e.assetId).filter((id): id is string => id !== null && !referenced.has(id)))
      : new Set<string>()
    const retained = stored.filter(a => !removed.has(a.id))
    const merged = [...retained, ...assets]
    if (merged.reduce((size, asset) => size + asset.blob.size, 0) > LIMITS.caseBytes) throw new CommitError('quota')
    if (!validReferences(next, merged)) throw new CommitError('invalid')
    const value = structuredClone(next)
    value.revision = expectedRevision === null ? 1 : expectedRevision + 1
    value.updatedAt = new Date().toISOString()
    await result(cases.put(value))
    for (const asset of assets) await result(media.add(asset))
    for (const id of removed) await result(media.delete(id))
    await done
    return { ok: true, value }
  } catch (error) {
    try { transaction?.abort() } catch { /* 이미 abort 또는 commit된 transaction. */ }
    await done?.catch(() => {})
    return { ok: false, reason: failure(error), draft: next }
  } finally { db?.close() }
}

export async function readAsset(caseId: string, assetId: string): Promise<Blob | null> {
  let db: IDBDatabase | undefined
  try {
    db = await openDatabase()
    const transaction = db.transaction('assets', 'readonly')
    const done = completed(transaction)
    const asset: AssetRecord | undefined = await result(transaction.objectStore('assets').get(assetId))
    await done
    return asset?.caseId === caseId && asset.blob instanceof Blob ? asset.blob : null
  } catch { return null } finally { db?.close() }
}

export async function deleteCase(id: string, expectedRevision: number): Promise<boolean> {
  let db: IDBDatabase | undefined
  let transaction: IDBTransaction | undefined
  let done: Promise<void> | undefined
  try {
    db = await openDatabase()
    transaction = db.transaction(['cases', 'assets'], 'readwrite')
    done = completed(transaction)
    const cases = transaction.objectStore('cases')
    const value: unknown = await result(cases.get(id))
    if (!validateCase(value) || value.revision !== expectedRevision) throw new CommitError('conflict')
    const media = transaction.objectStore('assets')
    const keys = await result(media.index('caseId').getAllKeys(id))
    for (const key of keys) await result(media.delete(key))
    await result(cases.delete(id))
    await done
    return true
  } catch {
    try { transaction?.abort() } catch { /* 이미 끝난 transaction. */ }
    await done?.catch(() => {})
    return false
  } finally { db?.close() }
}

export async function importLegacySession(session: Session, id: string, now: string): Promise<CommitResult> {
  return commitCase(createCase(session, id, now), null)
}
