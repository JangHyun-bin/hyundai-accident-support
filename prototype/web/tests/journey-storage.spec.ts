import { test, expect, type Page } from '@playwright/test'
import type { JourneyCase, Evidence } from '../src/journey/case'

declare global {
  interface Window {
    journeyStorageTest: {
      store: typeof import('../src/journey/case-store')
      make: (id: string) => JourneyCase
      photo: (assetId: string, size?: number) => Evidence
      session: typeof import('../src/emergency/session')
    }
  }
}
async function setup(page: Page) {
  await page.goto('/?study=journey-catalog')
  await page.evaluate(async () => {
    const root = '/src/'
    const store = await import(root + 'journey/case-store.ts')
    const domain = await import(root + 'journey/case.ts')
    const session = await import(root + 'emergency/session.ts')
    window.journeyStorageTest = {
      store, session, make: (id: string) => domain.createCase(session.createSession('SC01'), id, '2026-11-10T09:12:00.000Z'),
      photo: (assetId: string, size = 3) => ({ id: 'photo-1', label: '내 차량', kind: 'photo', revision: 1, origin: 'user',
        assetId, availability: 'available', captureTarget: 'own-car', metadata: { mime: 'image/png', bytes: size, duration: null, capturedAt: null, sourceLabel: '직접 촬영' } }),
    }
  })
}
test.beforeEach(async ({ page }) => setup(page))

test('case and immutable asset survive reload together', async ({ page }) => {
  const first = await page.evaluate(async () => {
    const { store, make, photo } = window.journeyStorageTest
    const value = make('persist')
    value.evidence = [photo('original')]
    return store.commitCase(value, null, [{ id: 'original', caseId: value.id, blob: new Blob(['old'], { type: 'image/png' }) }])
  })
  expect(first.ok).toBe(true)
  await setup(page)
  const result = await page.evaluate(async () => {
    const { store } = window.journeyStorageTest
    return { value: await store.loadCase('persist'), text: await (await store.readAsset('persist', 'original'))?.text() }
  })
  expect(result.value?.revision).toBe(1)
  expect(result.value?.evidence[0].assetId).toBe('original')
  expect(result.text).toBe('old')
})

test('transaction abort rolls back both case and media and preserves the failed draft', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, make, photo } = window.journeyStorageTest
    const value = make('abort')
    value.evidence = [photo('aborted-asset')]
    const original = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === 'assets') throw new DOMException('quota during write', 'QuotaExceededError')
      return original.apply(this, args)
    }
    const saved = await store.commitCase(value, null, [{ id: 'aborted-asset', caseId: value.id, blob: new Blob(['old'], { type: 'image/png' }) }])
    IDBObjectStore.prototype.add = original
    return { saved, restored: await store.loadCase(value.id), asset: await store.readAsset(value.id, 'aborted-asset') }
  })
  expect(result.saved).toMatchObject({ ok: false, reason: 'quota', draft: { id: 'abort', evidence: [{ assetId: 'aborted-asset' }] } })
  expect(result.restored).toBeNull()
  expect(result.asset).toBeNull()
})

test('two tabs editing the same revision have exactly one successful commit', async ({ page, context }) => {
  await page.evaluate(async () => { const { store, make } = window.journeyStorageTest; await store.commitCase(make('race'), null) })
  const second = await context.newPage()
  await setup(second)
  const edit = (p: Page, stage: 'record' | 'review') => p.evaluate(async stage => {
    const { store } = window.journeyStorageTest
    const current = await store.loadCase('race')
    if (!current) return null
    return store.commitCase({ ...current, revision: 1, stage }, 1)
  }, stage)
  const results = await Promise.all([edit(page, 'record'), edit(second, 'review')])
  expect(results.filter(r => r?.ok)).toHaveLength(1)
  expect(results.find(r => r && !r.ok)).toMatchObject({ ok: false, reason: 'conflict' })
  await second.close()
})

test('replacing an image preserves the bytes held by a previously approved snapshot', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, make, photo } = window.journeyStorageTest
    let value = make('replace')
    value.evidence = [photo('old-asset')]
    value.submissions = [{ id: 'approved', kind: 'new', agency: 'insurance', recipient: '보험사',
      approvedAt: value.createdAt, status: 'sent', externalReceipt: null,
      payload: { observations: [], statements: [], evidence: structuredClone(value.evidence), diagram: null, report: null } }]
    value.activeSubmissionIds.insurance = 'approved'
    value.emergency.requests.insurance = 'sent'
    const first = await store.commitCase(value, null, [{ id: 'old-asset', caseId: value.id, blob: new Blob(['old'], { type: 'image/png' }) }])
    if (!first.ok) return { error: first.reason }
    value = first.value
    const overwritten = await store.commitCase(value, 1, [{ id: 'old-asset', caseId: value.id, blob: new Blob(['new'], { type: 'image/png' }) }])
    value.evidence = [{ ...photo('new-asset'), revision: 2 }]
    const replaced = await store.commitCase(value, 1, [{ id: 'new-asset', caseId: value.id, blob: new Blob(['new'], { type: 'image/png' }) }])
    return { overwritten, replaced, old: await (await store.readAsset(value.id, 'old-asset'))?.text(), next: await (await store.readAsset(value.id, 'new-asset'))?.text() }
  })
  expect(result.overwritten).toMatchObject({ ok: false, reason: 'invalid' })
  expect(result.replaced).toMatchObject({ ok: true })
  expect(result.old).toBe('old')
  expect(result.next).toBe('new')
})

test('foreign asset references and asset reads cannot cross case boundaries', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, make, photo } = window.journeyStorageTest
    const first = make('owner'); first.evidence = [photo('private-asset')]
    await store.commitCase(first, null, [{ id: 'private-asset', caseId: first.id, blob: new Blob(['old'], { type: 'image/png' }) }])
    const second = make('other'); second.evidence = [photo('private-asset')]
    return { saved: await store.commitCase(second, null), read: await store.readAsset('other', 'private-asset') }
  })
  expect(result.saved).toMatchObject({ ok: false, reason: 'invalid' })
  expect(result.read).toBeNull()
})

test('legacy import is explicit and never rewrites the old localStorage record', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, session } = window.journeyStorageTest
    const legacy = session.createSession('SC05')
    const key = session.storageKey('SC05')
    const original = JSON.stringify(legacy)
    localStorage.setItem(key, original)
    const saved = await store.importLegacySession(legacy, 'imported', '2026-11-10T09:12:00.000Z')
    return { saved, unchanged: localStorage.getItem(key) === original }
  })
  expect(result.saved).toMatchObject({ ok: true })
  expect(result.unchanged).toBe(true)
})

test('blocked storage reports unavailable and keeps the full in-memory draft', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, make } = window.journeyStorageTest
    const original = IDBFactory.prototype.open
    IDBFactory.prototype.open = () => { throw new DOMException('blocked', 'SecurityError') }
    try { return await store.commitCase(make('blocked'), null) } finally { IDBFactory.prototype.open = original }
  })
  expect(result).toMatchObject({ ok: false, reason: 'unavailable', draft: { id: 'blocked' } })
})

test('corrupted records are not restored or silently deleted', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, make } = window.journeyStorageTest
    await store.commitCase(make('corrupt'), null)
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('after-care-journey-v1', 1)
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('cases', 'readwrite')
      transaction.objectStore('cases').put({ id: 'corrupt', schemaVersion: 999, revision: 1 })
      transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error)
    })
    const restored = await store.loadCase('corrupt')
    const raw = await new Promise<unknown>(resolve => {
      const request = db.transaction('cases').objectStore('cases').get('corrupt')
      request.onsuccess = () => resolve(request.result)
    })
    db.close()
    return { restored, raw }
  })
  expect(result.restored).toBeNull()
  expect(result.raw).toMatchObject({ id: 'corrupt', schemaVersion: 999 })
})

test('photo count and per-file limits reject only the over-limit draft', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, make, photo } = window.journeyStorageTest
    const value = make('photos')
    value.evidence = Array.from({ length: 12 }, (_, i) => ({
      ...photo('unused'), id: 'photo-' + i, assetId: null, availability: 'unavailable' as const,
    }))
    const twelve = await store.commitCase(value, null)
    if (!twelve.ok) return { twelve }
    const tooMany = structuredClone(twelve.value)
    tooMany.evidence.push({ ...photo('unused'), id: 'photo-13', assetId: null, availability: 'unavailable' })
    const thirteen = await store.commitCase(tooMany, 1)
    const tooLarge = structuredClone(twelve.value)
    tooLarge.evidence[0].metadata.bytes = 15 * 1024 * 1024 + 1
    return { twelve, thirteen, tooLarge: await store.commitCase(tooLarge, 1), restored: await store.loadCase(value.id) }
  })
  expect(result.twelve).toMatchObject({ ok: true })
  expect(result.thirteen).toMatchObject({ ok: false, reason: 'invalid' })
  expect(result.tooLarge).toMatchObject({ ok: false, reason: 'invalid' })
  expect(result.restored?.evidence).toHaveLength(12)
})

test('the case media budget includes assets retained by an approved payload', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, make } = window.journeyStorageTest
    const blob = new Blob([new Uint8Array(80 * 1024 * 1024)], { type: 'video/mp4' })
    const value = make('budget')
    value.evidence = [{ id: 'clip', label: '전방 영상', kind: 'video', revision: 1, origin: 'sample',
      assetId: 'old-clip', availability: 'available', captureTarget: null,
      metadata: { mime: blob.type, bytes: blob.size, duration: 20, capturedAt: null, sourceLabel: '합성 영상' } }]
    value.shares = [{ id: 'shared', recipient: '상대방', approvedAt: value.createdAt, status: 'confirmed',
      payload: { observations: [], statements: [], evidence: structuredClone(value.evidence), diagram: null, report: null } }]
    const first = await store.commitCase(value, null, [{ id: 'old-clip', caseId: value.id, blob }])
    if (!first.ok) return { first }
    const edited = first.value
    edited.evidence = [{ ...edited.evidence[0], assetId: 'new-clip', revision: 2 }]
    const second = await store.commitCase(edited, 1, [{ id: 'new-clip', caseId: value.id, blob }])
    return { first: first.ok, second, restored: (await store.loadCase(value.id))?.evidence[0].assetId,
      uncommitted: await store.readAsset(value.id, 'new-clip') }
  })
  expect(result.first).toBe(true)
  expect(result.second).toMatchObject({ ok: false, reason: 'quota' })
  expect(result.restored).toBe('old-clip')
  expect(result.uncommitted).toBeNull()
})

test('deletion is revision guarded and removes only the selected case and its media', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, make, photo } = window.journeyStorageTest
    const value = make('remove'); value.evidence = [photo('remove-photo')]
    await store.commitCase(value, null, [{ id: 'remove-photo', caseId: value.id, blob: new Blob(['old'], { type: 'image/png' }) }])
    await store.commitCase(make('keep'), null)
    localStorage.setItem('after-care-session-v1-SC01', 'legacy-unchanged')
    const stale = await store.deleteCase('remove', 0)
    const deleted = await store.deleteCase('remove', 1)
    return { stale, deleted, removed: await store.loadCase('remove'), asset: await store.readAsset('remove', 'remove-photo'),
      kept: await store.loadCase('keep'), legacy: localStorage.getItem('after-care-session-v1-SC01') }
  })
  expect(result).toMatchObject({ stale: false, deleted: true, removed: null, asset: null, kept: { id: 'keep' }, legacy: 'legacy-unchanged' })
})

test('missing snapshot media rejects restoration without deleting the stored text, approval or another case', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { store, make, photo } = window.journeyStorageTest
    const value = make('missing-media')
    value.evidence = [photo('lost-asset')]
    value.statements = [{ id: 'story', text: '보존해야 할 사고 기록', audioEvidenceIds: [], revision: 1, confirmedRevision: 1 }]
    value.shares = [{ id: 'original-share', recipient: '상대방', approvedAt: value.createdAt, status: 'confirmed', payload: {
      observations: [], statements: structuredClone(value.statements), evidence: structuredClone(value.evidence), report: null, diagram: null,
    } }]
    const saved = await store.commitCase(value, null, [{ id: 'lost-asset', caseId: value.id, blob: new Blob(['old'], { type: 'image/png' }) }])
    if (!saved.ok) throw new Error(saved.reason)
    await store.commitCase(make('unaffected'), null)
    const request = indexedDB.open('after-care-journey-v1', 1)
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    const transaction = db.transaction('assets', 'readwrite')
    transaction.objectStore('assets').delete('lost-asset')
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error) })
    const restored = await store.loadCase(value.id)
    const read = db.transaction('cases').objectStore('cases').get(value.id)
    const raw = await new Promise<JourneyCase>(resolve => { read.onsuccess = () => resolve(read.result) })
    db.close()
    return { restored, original: saved.value, raw, other: await store.loadCase('unaffected') }
  })
  expect(result.restored).toBeNull()
  expect(result.raw).toEqual(result.original)
  expect(result.other?.id).toBe('unaffected')
  await page.goto('/?study=journey&case=missing-media&device=mobile')
  await expect(page.getByRole('heading', { name: '이 기기에서 기록을 찾지 못했어요', exact: true })).toBeVisible()
  await expect(page.locator('[data-case-id]')).toHaveCount(0)
})
