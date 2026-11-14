import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { ClaimStatus, CreateCaseResponse, PairClaim, VehicleProgress } from '../src/product/api-contract'
import { Harness, ORIGIN, PNG } from './harness'

let h: Harness
beforeEach(() => { h = new Harness() })
afterEach(() => { h.close() })

describe('paired case authority', () => {
  test('phone sessions expire after 24 hours and revoked pairs cannot issue phone access', async () => {
    const phone = await h.phone()
    expect(Date.parse(phone.session.expiresAt) - h.now.getTime()).toBe(86_400_000)
    const pair = await h.pair(phone.vehicle)
    const pending = await h.pending(pair)
    expect((await h.request(`/api/cases/${phone.session.caseId}/pairs/${pair.pairId}`, {
      method: 'DELETE', bearer: phone.vehicle.vehicleCredential,
    })).status).toBe(200)
    expect(await (await h.request(`/api/pair-claims/${pending.value.claimId}`, { cookie: pending.cookie })).json()).toEqual({ state: 'cancelled' })
    h.now = new Date(h.now.getTime() + 86_400_001)
    expect((await h.request('/api/session', { cookie: phone.cookie })).status).toBe(401)
    expect((await h.request(`/api/cases/${phone.session.caseId}/progress`, { bearer: phone.vehicle.vehicleCredential })).status).toBe(200)
  })

  test('pair and pending tokens cannot read cases or media; approved phones remain case scoped', async () => {
    const owner = await h.phone()
    expect((await h.photo(owner, 0, 'scene-photo')).status).toBe(200)
    const caseUrl = `/api/cases/${owner.session.caseId}`
    const pair = await h.pair(owner.vehicle)
    const pending = await h.pending(pair)
    const token = new URLSearchParams(new URL(pair.joinUrl).hash.slice(1)).get('pair')
    expect(new URL(pair.joinUrl).search).toBe('')
    for (const path of [caseUrl, `${caseUrl}/assets/asset:scene-photo`]) {
      expect((await h.request(path, { cookie: pending.cookie })).status).toBe(401)
      expect((await h.request(path, { bearer: token ?? '' })).status).toBe(403)
      expect((await h.request(path, { bearer: owner.vehicle.vehicleCredential })).status).toBe(403)
      const stranger = await h.phone()
      const denied = await h.request(path, { cookie: stranger.cookie })
      expect(denied.status).toBe(403)
      expect(await denied.json()).not.toHaveProperty('value')
    }
    const file = await h.request(`${caseUrl}/assets/asset:scene-photo`, { cookie: owner.cookie })
    expect(file.status).toBe(200)
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array(PNG))
  })

  test('the owning pending cookie sees the matching code and one approval cancels all other claims', async () => {
    const vehicle = await h.vehicle()
    const pair = await h.pair(vehicle)
    const first = await h.pending(pair)
    const second = await h.pending(pair)
    const listResponse = await h.request(`/api/pairs/${pair.pairId}/claims`, { bearer: vehicle.vehicleCredential })
    const list: { claims: PairClaim[] } = await listResponse.json()
    expect(list.claims.find(claim => claim.claimId === first.value.claimId)?.verificationCode).toBe(first.value.verificationCode)
    expect(first.value.verificationCode).not.toBe(second.value.verificationCode)
    expect((await h.request(`/api/pair-claims/${first.value.claimId}`, { cookie: second.cookie })).status).toBe(404)
    const approval = { method: 'POST', bearer: vehicle.vehicleCredential, value: { claimId: first.value.claimId } }
    expect((await h.request(`/api/pairs/${pair.pairId}/approve`, approval)).status).toBe(200)
    expect((await h.request(`/api/pairs/${pair.pairId}/approve`, approval)).status).toBe(200)
    const cancelled: ClaimStatus = await (await h.request(`/api/pair-claims/${second.value.claimId}`, { cookie: second.cookie })).json()
    expect(cancelled.state).toBe('cancelled')
    expect((await h.request(`/api/pairs/${pair.pairId}/approve`, { ...approval, value: { claimId: second.value.claimId } })).status).toBe(409)
    expect(await (await h.request(`/api/pairs/${pair.pairId}/claims`, { bearer: vehicle.vehicleCredential })).json()).toEqual({ claims: [] })
    const approved = await h.request(`/api/pair-claims/${first.value.claimId}`, { cookie: first.cookie })
    expect(approved.headers.get('Set-Cookie')).toContain('Secure; HttpOnly; SameSite=Strict')
  })

  test('write origin and CSRF must both match; vehicle bearer cannot use phone change routes', async () => {
    const phone = await h.phone()
    const path = `/api/cases/${phone.session.caseId}/changes`
    const value = { mutationId: 'edit', expectedRevision: 0, commands: [{ type: 'statement-edit', id: 'text', text: '기록', audioEvidenceIds: [] }] }
    expect((await h.request(path, { method: 'POST', value, cookie: phone.cookie, csrf: phone.session.csrfToken, origin: 'https://other.test' })).status).toBe(403)
    expect((await h.request(path, { method: 'POST', value, cookie: phone.cookie, origin: ORIGIN })).status).toBe(403)
    expect((await h.request(path, { method: 'POST', value, cookie: phone.cookie, csrf: phone.session.csrfToken, origin: null })).status).toBe(403)
    expect((await h.request(path, { method: 'POST', value, bearer: phone.vehicle.vehicleCredential })).status).toBe(403)
    expect((await h.current(phone)).statements).toEqual([])
  })

  test('phone status requires a recent real heartbeat, not approval or a stored session', async () => {
    const phone = await h.phone()
    const progress = () => h.request(`/api/cases/${phone.session.caseId}/progress`, { bearer: phone.vehicle.vehicleCredential })
    const initial: VehicleProgress = await (await progress()).json()
    expect(initial.phone.paired).toBe(true)
    expect(initial.phone.online).toBe(false)
    expect(initial.phone.lastSeenAt).toBeNull()
    expect((await h.request('/api/session', { cookie: phone.cookie })).status).toBe(200)
    const online: VehicleProgress = await (await progress()).json()
    expect(online.phone.online).toBe(true)
    h.now = new Date(h.now.getTime() + 31_000)
    const offline: VehicleProgress = await (await progress()).json()
    expect(offline.phone.paired).toBe(true)
    expect(offline.phone.online).toBe(false)
    await h.current(phone)
    expect((await (await progress()).json()).phone.online).toBe(true)
  })

  test('expiry and revocation do not issue a fresh grant for old creation secrets', async () => {
    const phone = await h.phone()
    const pair = await h.pair(phone.vehicle)
    const pending = await h.pending(pair)
    h.now = new Date(h.now.getTime() + 300_001)
    expect(await (await h.request(`/api/pair-claims/${pending.value.claimId}`, { cookie: pending.cookie })).json()).toEqual({ state: 'expired' })
    expect((await h.request(`/api/pairs/${pair.pairId}/approve`, { method: 'POST', bearer: phone.vehicle.vehicleCredential, value: { claimId: pending.value.claimId } })).status).toBe(409)
    expect((await h.request(`/api/cases/${phone.session.caseId}/clients/${phone.session.clientId}`, { method: 'DELETE', bearer: phone.vehicle.vehicleCredential })).status).toBe(200)
    expect((await h.request('/api/session', { cookie: phone.cookie })).status).toBe(401)
    h.now = new Date(h.now.getTime() + 31 * 86_400_000)
    const retry = await h.request('/api/cases', { method: 'POST', value: { creationId: phone.vehicle.creationId, creationSecret: phone.vehicle.creationSecret, deviceLabel: '차량' } })
    expect(retry.status).toBe(401)
    expect(await retry.json()).not.toHaveProperty('vehicleCredential')
  })

  test('creation retry survives restart with the exact credential and rejects creation ID alone', async () => {
    const vehicle = await h.vehicle()
    h.restart()
    const retry = await h.request('/api/cases', { method: 'POST', value: { creationId: vehicle.creationId, creationSecret: vehicle.creationSecret, deviceLabel: '차량' } })
    const same: CreateCaseResponse = await retry.json()
    expect(same.caseId).toBe(vehicle.caseId)
    expect(same.vehicleCredential).toBe(vehicle.vehicleCredential)
    expect((await h.request('/api/cases', { method: 'POST', value: { creationId: vehicle.creationId, creationSecret: 'a'.repeat(64), deviceLabel: '차량' } })).status).toBe(403)
    expect((await h.request('/api/cases', { method: 'POST', value: { creationId: vehicle.creationId, deviceLabel: '차량' } })).status).toBe(400)
  })

  test('private errors are not cached, API misses never receive the SPA, and health contains no case data', async () => {
    const response = await h.request('/api/does-not-exist')
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(await response.text()).not.toContain('<html>')
    expect(await (await h.request('/api/health')).json()).toEqual({ ok: true })
    expect(await (await h.request('/phone')).text()).toContain('product entry')
  })
})
