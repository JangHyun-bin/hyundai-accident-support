import { afterEach, describe, expect, test } from 'bun:test'
import { Harness, ORIGIN, type Phone } from '../server-tests/harness'
import type { ClaimStatus, CreateCaseResponse } from '../src/product/api-contract'
import { createVehicleClient, createVehicleHandoff, type HandoffController, type HandoffStorage, type VehicleRequest } from '../src/product/vehicle-handoff'

const journeyId = 'journey-one'
let harness: Harness

afterEach(() => harness.close())

type MemoryStorage = HandoffStorage & { values: Map<string, string> }
function memoryStorage(): MemoryStorage {
  const values = new Map<string, string>()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) }, removeItem: key => { values.delete(key) } }
}
const serverRequest: VehicleRequest = (path, init) => {
  const headers = new Headers(init?.headers)
  headers.set('Origin', ORIGIN)
  return harness.app.fetch(new Request(ORIGIN + path, { ...init, headers }))
}
function vehicleDisplay(storage: HandoffStorage, request: VehicleRequest = serverRequest): HandoffController {
  return createVehicleHandoff({ client: createVehicleClient(request), storage, journeyId, now: () => harness.now.getTime() })
}
function stored(storage: MemoryStorage): { caseId?: string; vehicleCredential?: string; creationId: string; creationSecret: string } {
  const raw = storage.values.get('chabun-vehicle-handoff:' + journeyId)
  if (!raw) throw new Error('Vehicle case was not stored')
  return JSON.parse(raw)
}
function pairing(handoff: HandoffController) {
  const state = handoff.state
  if (state.kind !== 'pairing') throw new Error(`Expected pairing, got ${state.kind}`)
  return state
}
function connected(handoff: HandoffController) {
  const state = handoff.state
  if (state.kind !== 'connected') throw new Error(`Expected connected, got ${state.kind}`)
  return state
}
async function claimFromPhone(joinUrl: string): Promise<Response> {
  const token = new URLSearchParams(new URL(joinUrl).hash.slice(1)).get('pair')
  return harness.request('/api/pair-claims', { method: 'POST', value: { token, deviceLabel: '휴대폰' } })
}
async function phoneAfterApproval(storage: MemoryStorage, claimId: string, pendingCookie: string): Promise<Phone> {
  const response = await harness.request(`/api/pair-claims/${claimId}`, { cookie: pendingCookie })
  const status: ClaimStatus = await response.json()
  if (status.state !== 'approved') throw new Error('Phone was not approved')
  const cookie = response.headers.get('Set-Cookie')?.split(';')[0]
  if (!cookie) throw new Error('Phone cookie missing')
  const { creationId, creationSecret } = stored(storage)
  const recreated = await harness.request('/api/cases', { method: 'POST', origin: null, value: { creationId, creationSecret, deviceLabel: '차량 화면' } })
  const vehicle: CreateCaseResponse = await recreated.json()
  return { cookie, session: status.session, vehicle: { ...vehicle, creationId, creationSecret } }
}

describe('vehicle display hands the record step to a phone', () => {
  test('create, pair, phone claim, approve, then follow the phone record', async () => {
    harness = new Harness()
    const storage = memoryStorage()
    const handoff = vehicleDisplay(storage)
    expect(handoff.state.kind).toBe('idle')

    await handoff.start()
    const { pair, progress } = pairing(handoff)
    expect(pair.joinUrl.startsWith(`${ORIGIN}/phone#pair=`)).toBe(true)
    expect(progress.phone.paired).toBe(false)
    expect(stored(storage).caseId).toBe(progress.caseId)

    const claim = await claimFromPhone(pair.joinUrl)
    expect(claim.status).toBe(201)
    const claimed: { claimId: string; verificationCode: string } = await claim.json()
    await handoff.poll()
    expect(pairing(handoff).claims.map(item => item.verificationCode)).toEqual([claimed.verificationCode])

    await handoff.approve(claimed.claimId)
    expect(connected(handoff).progress.phone.paired).toBe(true)

    const pendingCookie = claim.headers.get('Set-Cookie')?.split(';')[0] ?? ''
    const phone = await phoneAfterApproval(storage, claimed.claimId, pendingCookie)
    expect(phone.vehicle.caseId).toBe(progress.caseId)
    const current = await harness.current(phone)
    expect((await harness.photo(phone, current.revision)).status).toBe(200)
    const after = await harness.current(phone)
    expect((await harness.change(phone, after.revision, [{ type: 'statement-edit', id: 'statement-one', text: '신호 대기 중 뒤에서 충돌', audioEvidenceIds: [] }])).status).toBe(200)

    await handoff.poll()
    const { record, phone: presence } = connected(handoff).progress
    expect(record.photos).toBe(1)
    expect(record.statement).toBe('draft')
    expect(presence.online).toBe(true)
  })

  test('a reload reuses the stored case and a failed creation retries with the same creation', async () => {
    harness = new Harness()
    const storage = memoryStorage()
    let offline = true
    const flaky: VehicleRequest = (path, init) => offline ? Promise.reject(new TypeError('network down')) : serverRequest(path, init)
    const first = vehicleDisplay(storage, flaky)

    await first.start()
    expect(first.state).toEqual({ kind: 'failed', reason: 'unavailable', progress: null })
    const creation = stored(storage)
    expect(creation.caseId).toBeUndefined()

    offline = false
    await first.retry()
    const caseId = pairing(first).progress.caseId
    expect(stored(storage)).toEqual({ ...creation, caseId, vehicleCredential: expect.any(String) })

    const reloaded = vehicleDisplay(storage)
    await reloaded.resume()
    expect(pairing(reloaded).progress.caseId).toBe(caseId)

    const claim = await claimFromPhone(pairing(reloaded).pair.joinUrl)
    const claimed: { claimId: string } = await claim.json()
    await reloaded.poll()
    await reloaded.approve(claimed.claimId)
    expect(connected(reloaded).progress.caseId).toBe(caseId)

    const again = vehicleDisplay(storage)
    await again.resume()
    expect(connected(again).progress).toMatchObject({ caseId, phone: { paired: true } })

    const fresh = vehicleDisplay(memoryStorage())
    await fresh.resume()
    expect(fresh.state.kind).toBe('idle')
  })

  test('a host without the API reports unavailable instead of a fake connection', async () => {
    harness = new Harness()
    const devServer: VehicleRequest = async (_path, init) => init?.method === 'POST' ? new Response(null, { status: 404 }) : new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } })
    const handoff = vehicleDisplay(memoryStorage(), devServer)
    await handoff.start()
    expect(handoff.state).toEqual({ kind: 'failed', reason: 'unavailable', progress: null })
  })

  test('an expired pair is reported, renewed, and still connects', async () => {
    harness = new Harness()
    const storage = memoryStorage()
    const handoff = vehicleDisplay(storage)
    await handoff.start()
    const expired = pairing(handoff).pair

    harness.now = new Date(harness.now.getTime() + 6 * 60_000)
    await handoff.poll()
    expect(handoff.state).toMatchObject({ kind: 'failed', reason: 'expired', progress: { phone: { paired: false } } })
    expect((await claimFromPhone(expired.joinUrl)).status).toBe(410)

    await handoff.renew()
    const renewed = pairing(handoff).pair
    expect(renewed.pairId).not.toBe(expired.pairId)
    expect(Date.parse(renewed.expiresAt)).toBeGreaterThan(harness.now.getTime())

    const claim = await claimFromPhone(renewed.joinUrl)
    expect(claim.status).toBe(201)
    const claimed: { claimId: string } = await claim.json()
    harness.now = new Date(harness.now.getTime() + 6 * 60_000)
    await handoff.approve(claimed.claimId)
    expect(handoff.state).toMatchObject({ kind: 'failed', reason: 'expired' })

    await handoff.renew()
    const last = await claimFromPhone(pairing(handoff).pair.joinUrl)
    const lastClaim: { claimId: string } = await last.json()
    await handoff.approve(lastClaim.claimId)
    expect(connected(handoff).progress.phone.paired).toBe(true)
  })
})
