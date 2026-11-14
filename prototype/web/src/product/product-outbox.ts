import { validateCase, type AssetWrite } from '../journey/case'
import { validatePayload } from '../journey/case-validation'
import type { CaseBatch, CaseOutbox, StoredCaseBatch } from '../journey/case-data'
import { parseStoredEditorDraft, validateEditorDraft, validateSelection, type DraftDurability, type EditorDraftData } from '../journey/editor-drafts'
import { inputId, inputObject, inputRevision, parsePhoneCommand } from './product-commands'

export type ProductOutbox = CaseOutbox & EditorDraftData
export type ProductOutboxOptions = { origin: string; clientId: string; draftId: string; indexedDB?: IDBFactory; databaseName?: string }
type Partition = { origin: string; draftId: string }
type DraftRecord = Partition & { key: string; caseId: string; scope: string; value: unknown; updatedAt: number }
type BatchRecord = Partition & { key: string; caseId: string; scope: string; value: StoredCaseBatch; digest: string }
let memoryTabId: string | undefined

export function tabDraftId(): string {
  if (memoryTabId) return memoryTabId
  try {
    const stored = sessionStorage.getItem('after-care-product-draft-id')
    memoryTabId = inputId(stored) ? stored : crypto.randomUUID()
    sessionStorage.setItem('after-care-product-draft-id', memoryTabId)
  } catch { memoryTabId = crypto.randomUUID() }
  return memoryTabId
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}
function transactionDone(transaction: IDBTransaction): Promise<void> {
  const result = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('Outbox transaction aborted'))
    transaction.onerror = () => reject(transaction.error ?? new Error('Outbox transaction failed'))
  })
  void result.catch(() => {})
  return result
}
function failed(error: unknown): DraftDurability {
  return { durable: false, reason: error instanceof DOMException && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable' }
}
function parseAssets(value: unknown, caseId: string): AssetWrite[] | null {
  if (!Array.isArray(value) || value.length > 100) return null
  const assets: AssetWrite[] = []
  for (const item of value) {
    if (!inputObject(item) || !inputId(item.id) || item.caseId !== caseId || !(item.blob instanceof Blob) || !item.blob.size) return null
    assets.push({ id: item.id, caseId, blob: item.blob })
  }
  return new Set(assets.map(asset => asset.id)).size === assets.length ? assets : null
}
function parseBatch(value: unknown, caseId: string): CaseBatch | null {
  if (!inputObject(value) || !inputId(value.mutationId) || !inputRevision(value.expectedRevision) ||
    !validateCase(value.base) || !validateCase(value.local) || value.base.id !== caseId || value.local.id !== caseId ||
    value.base.emergency.scenarioId !== 'product' || value.local.emergency.scenarioId !== 'product' ||
    value.base.revision !== value.expectedRevision || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) return null
  const assets = parseAssets(value.assets, caseId)
  if (!assets) return null
  const common = { mutationId: value.mutationId, expectedRevision: value.expectedRevision, base: value.base, local: value.local, createdAt: value.createdAt, assets }
  try {
    if (value.kind === 'changes' && Array.isArray(value.commands) && value.commands.length > 0 && value.commands.length <= 100) {
      return { ...common, kind: 'changes', commands: value.commands.map(parsePhoneCommand) }
    }
    const input = value.input
    if (value.kind === 'copy' && inputObject(input) && input.kind === 'share' && inputId(input.id) &&
      typeof input.recipient === 'string' && input.recipient.length <= 100 && typeof input.now === 'string' &&
      Number.isFinite(Date.parse(input.now)) && validateSelection(input.selection) && validatePayload(value.preview) && !assets.length) {
      return { ...common, kind: 'copy', input: { kind: 'share', id: input.id, recipient: input.recipient, now: input.now, selection: input.selection }, preview: value.preview }
    }
  } catch { return null }
  return null
}
function parseRecord(value: unknown, caseId: string): StoredCaseBatch | null {
  if (!inputObject(value) || !['pending', 'conflict', 'recovery'].includes(String(value.status)) ||
    !(value.latest === null || validateCase(value.latest) && value.latest.id === caseId)) return null
  const batch = parseBatch(value.batch, caseId)
  if (!batch || value.status !== 'pending' && value.status !== 'conflict' && value.status !== 'recovery') return null
  return { batch, status: value.status, latest: value.latest }
}

async function batchDigest(batch: CaseBatch): Promise<string> {
  const media = await Promise.all(batch.assets.map(async asset => {
    const digest = await crypto.subtle.digest('SHA-256', await asset.blob.arrayBuffer())
    return { id: asset.id, sha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('') }
  }))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ batch, media })))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export function createProductOutbox(options: ProductOutboxOptions): ProductOutbox {
  const scope = JSON.stringify([options.origin, options.clientId, options.draftId])
  const partition: Partition = { origin: options.origin, draftId: options.draftId }
  const key = (caseId: string, id: string) => JSON.stringify([scope, caseId, id])
  const batches = new Map<string, StoredCaseBatch>()
  const acknowledged = new Set<string>()
  const editor = new Map<string, unknown>()
  let queue: Promise<void> = Promise.resolve()
  const run = <T,>(job: () => Promise<T>): Promise<T> => {
    const result = queue.then(job)
    queue = result.then(() => {}, () => {})
    return result
  }
  async function open(): Promise<IDBDatabase> {
    const factory = options.indexedDB ?? globalThis.indexedDB
    if (!factory) throw new Error('Durable browser storage unavailable')
    return new Promise((resolve, reject) => {
      const request = factory.open(options.databaseName ?? 'after-care-product-outbox-v1', 1)
      let blocked = false
      request.onupgradeneeded = () => {
        for (const name of ['batches', 'drafts']) {
          const store = request.result.createObjectStore(name, { keyPath: 'key' })
          store.createIndex('scopeCase', ['scope', 'caseId'])
          store.createIndex('browserCase', ['origin', 'draftId', 'caseId'])
        }
      }
      request.onsuccess = () => {
        if (blocked) { request.result.close(); return }
        request.result.onversionchange = () => request.result.close()
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
      request.onblocked = () => { blocked = true; reject(new Error('Outbox upgrade blocked')) }
    })
  }
  async function put(store: 'batches' | 'drafts', value: BatchRecord | DraftRecord): Promise<DraftDurability> {
    let db: IDBDatabase | undefined
    try {
      db = await open()
      const transaction = db.transaction(store, 'readwrite')
      const done = transactionDone(transaction)
      const records = transaction.objectStore(store)
      if (store === 'drafts' && inputObject(value.value)) {
        const rows: unknown[] = await requestValue(records.index('browserCase').getAll([options.origin, options.draftId, value.caseId]))
        for (const row of rows) if (inputObject(row) && typeof row.key === 'string' && row.key !== value.key &&
          inputObject(row.value) && row.value.kind === value.value.kind) records.delete(row.key)
      }
      records.put(value)
      await done
      return { durable: true }
    } catch (error) { return failed(error) } finally { db?.close() }
  }
  return {
    stageBatch: batch => {
      const parsed = parseBatch(structuredClone(batch), batch.local.id)
      if (!parsed) return Promise.resolve({ durable: false, reason: 'invalid' })
      const record: StoredCaseBatch = { batch: parsed, status: 'pending', latest: null }
      const recordKey = key(batch.local.id, batch.mutationId)
      const prior = batches.get(recordKey)
      if (prior && JSON.stringify(prior.batch) !== JSON.stringify(record.batch)) return Promise.resolve({ durable: false, reason: 'invalid' })
      if (!prior) batches.set(recordKey, record)
      return run(async () => {
        let db: IDBDatabase | undefined
        try {
          const digest = await batchDigest(record.batch)
          if (prior && await batchDigest(prior.batch) !== digest) return { durable: false, reason: 'invalid' }
          db = await open()
          const transaction = db.transaction('batches', 'readwrite')
          const done = transactionDone(transaction)
          const store = transaction.objectStore('batches')
          const stored: unknown = await requestValue(store.get(recordKey))
          if (stored !== undefined) {
            if (!inputObject(stored) || stored.digest !== digest) { transaction.abort(); await done.catch(() => {}); return { durable: false, reason: 'invalid' } }
          } else store.add({ ...partition, key: recordKey, caseId: batch.local.id, scope, value: record, digest } satisfies BatchRecord)
          await done
          return { durable: true }
        } catch (error) { return failed(error) } finally { db?.close() }
      })
    },
    readBatches: caseId => run(async () => {
      let db: IDBDatabase | undefined
      try {
        db = await open()
        const transaction = db.transaction('batches', 'readonly')
        const done = transactionDone(transaction)
        const rows: unknown[] = await requestValue(transaction.objectStore('batches').index('browserCase').getAll([options.origin, options.draftId, caseId]))
        await done
        const previousActor: StoredCaseBatch[] = []
        for (const row of rows) {
          if (!inputObject(row) || row.origin !== options.origin || row.draftId !== options.draftId || row.caseId !== caseId) throw new Error('Invalid outbox scope')
          const record = parseRecord(row.value, caseId)
          if (!record) throw new Error('Invalid stored operation')
          if (row.scope !== scope) { previousActor.push({ ...record, status: 'recovery' }); continue }
          const recordKey = key(caseId, record.batch.mutationId)
          if (!batches.has(recordKey) && !acknowledged.has(recordKey)) batches.set(recordKey, record)
        }
        return [...batches.entries()].filter(([recordKey]) => !acknowledged.has(recordKey)).map(([, record]) => record).concat(previousActor).filter(record => record.batch.local.id === caseId)
          .sort((a, b) => (a.batch.expectedRevision ?? -1) - (b.batch.expectedRevision ?? -1) || a.batch.createdAt.localeCompare(b.batch.createdAt))
      } finally { db?.close() }
    }),
    acknowledgeBatch: (caseId, mutationId) => {
      const recordKey = key(caseId, mutationId)
      acknowledged.add(recordKey)
      return run(async () => {
        let db: IDBDatabase | undefined
        try {
          db = await open()
          const transaction = db.transaction('batches', 'readwrite')
          const done = transactionDone(transaction)
          transaction.objectStore('batches').delete(recordKey)
          await done
          batches.delete(recordKey)
          return { durable: true }
        } catch (error) { return failed(error) } finally { db?.close() }
      })
    },
    markBatch: (caseId, mutationId, status, latest) => {
      const recordKey = key(caseId, mutationId)
      const previous = batches.get(recordKey)
      if (acknowledged.has(recordKey)) return Promise.resolve({ durable: true })
      if (!previous) return Promise.resolve({ durable: false, reason: 'invalid' })
      const value = { ...previous, status, latest }
      batches.set(recordKey, value)
      return run(async () => acknowledged.has(recordKey) ? { durable: true } : put('batches', { ...partition, key: recordKey, scope, caseId, value, digest: await batchDigest(value.batch) }))
    },
    readEditorDraft: async (caseId, kind) => {
      const recordKey = key(caseId, kind)
      if (editor.has(recordKey)) return parseStoredEditorDraft(editor.get(recordKey), kind)
      return run(async () => {
        if (editor.has(recordKey)) return parseStoredEditorDraft(editor.get(recordKey), kind)
        let db: IDBDatabase | undefined
        try {
          db = await open()
          const transaction = db.transaction('drafts', 'readwrite')
          const done = transactionDone(transaction)
          const store = transaction.objectStore('drafts')
          const rows: unknown[] = await requestValue(store.index('browserCase').getAll([options.origin, options.draftId, caseId]))
          const candidates = rows.flatMap(row => {
            if (!inputObject(row) || typeof row.key !== 'string' || row.origin !== options.origin || row.draftId !== options.draftId || row.caseId !== caseId) return []
            const value = parseStoredEditorDraft(row.value, kind)
            return value ? [{ key: row.key, value, updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : 0 }] : []
          }).sort((a, b) => b.updatedAt - a.updatedAt)
          const selected = candidates[0]
          if (selected) {
            store.put({ ...partition, key: recordKey, caseId, scope, value: selected.value, updatedAt: selected.updatedAt } satisfies DraftRecord)
            for (const candidate of candidates) if (candidate.key !== recordKey) store.delete(candidate.key)
          }
          await done
          if (!editor.has(recordKey)) editor.set(recordKey, selected?.value ?? null)
          return parseStoredEditorDraft(editor.get(recordKey), kind)
        } finally { db?.close() }
      })
    },
    writeEditorDraft: (caseId, draft) => {
      const version = crypto.randomUUID()
      if (!inputId(caseId) || !validateEditorDraft(draft)) return Promise.resolve({ durable: false, reason: 'invalid', version })
      const value = { ...structuredClone(draft), version }
      const recordKey = key(caseId, draft.kind)
      editor.set(recordKey, value)
      return run(async () => ({ ...await put('drafts', { ...partition, key: recordKey, caseId, scope, value, updatedAt: Date.now() }), version }))
    },
    clearEditorDraft: (caseId, kind, expectedVersion) => run(async () => {
      const recordKey = key(caseId, kind)
      const memory = parseStoredEditorDraft(editor.get(recordKey), kind)
      if (expectedVersion && memory && memory.version !== expectedVersion) return { durable: true }
      let db: IDBDatabase | undefined
      try {
        db = await open()
        const transaction = db.transaction('drafts', 'readwrite')
        const done = transactionDone(transaction)
        const store = transaction.objectStore('drafts')
        const rows: unknown[] = await requestValue(store.index('browserCase').getAll([options.origin, options.draftId, caseId]))
        let cleared = false
        for (const row of rows) {
          if (!inputObject(row) || typeof row.key !== 'string') continue
          const stored = parseStoredEditorDraft(row.value, kind)
          if (stored && (!expectedVersion || stored.version === expectedVersion)) { store.delete(row.key); cleared = true }
        }
        if (cleared || !rows.length) {
          const current = parseStoredEditorDraft(editor.get(recordKey), kind)
          if (!current || (!expectedVersion || current.version === expectedVersion) && current.version === memory?.version) editor.set(recordKey, null)
        }
        await done
        return { durable: true }
      } catch (error) {
        const current = parseStoredEditorDraft(editor.get(recordKey), kind)
        if (!current || (!expectedVersion || current.version === expectedVersion) && current.version === memory?.version) editor.set(recordKey, null)
        return failed(error)
      } finally { db?.close() }
    }),
  }
}
