import { expect } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { createApp, type CaseApp } from '../server/app'
import { CaseDatabase } from '../server/database'
import { hash } from '../server/security'
import type { ChangeRequest, ClaimResponse, ClaimStatus, CreateCaseResponse, PairResponse, PhoneSession, ProductPhoneCommand } from '../src/product/api-contract'
import type { Evidence, JourneyCase } from '../src/journey/case'

export const ORIGIN = 'https://chabun.test'
export type Vehicle = CreateCaseResponse & { creationId: string; creationSecret: string }
export type Phone = { cookie: string; session: PhoneSession; vehicle: Vehicle }
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG3kAAAAASUVORK5CYII=', 'base64')

export class Harness {
  readonly root = mkdtempSync(join(tmpdir(), 'chabun-server-'))
  readonly path = join(this.root, 'private', 'case.sqlite')
  readonly staticDir = join(this.root, 'public')
  now = new Date('2026-11-14T03:00:00.000Z')
  store: CaseDatabase
  app: CaseApp

  constructor() {
    mkdirSync(this.staticDir)
    writeFileSync(join(this.staticDir, 'index.html'), '<html><body>product entry</body></html>')
    this.store = new CaseDatabase(this.path)
    this.app = createApp({ origin: ORIGIN, staticDir: this.staticDir }, this.store, () => this.now)
  }

  restart(): void {
    this.store.close()
    this.store = new CaseDatabase(this.path)
    this.app = createApp({ origin: ORIGIN, staticDir: this.staticDir }, this.store, () => this.now)
  }

  close(): void {
    this.store.close()
    rmSync(this.root, { recursive: true, force: true })
  }

  request(path: string, options: { method?: string; value?: unknown; cookie?: string; bearer?: string; csrf?: string; origin?: string | null; body?: FormData } = {}): Promise<Response> {
    const method = options.method ?? 'GET'
    const headers = new Headers()
    if (options.cookie) headers.set('Cookie', options.cookie)
    if (options.bearer) headers.set('Authorization', `Bearer ${options.bearer}`)
    if (options.csrf) headers.set('X-CSRF-Token', options.csrf)
    if (options.origin !== null && method !== 'GET') headers.set('Origin', options.origin ?? ORIGIN)
    if (options.origin && method === 'GET') headers.set('Origin', options.origin)
    if (options.value !== undefined) headers.set('Content-Type', 'application/json')
    return this.app.fetch(new Request(`${ORIGIN}${path}`, { method, headers,
      ...(options.body ? { body: options.body } : options.value === undefined ? {} : { body: JSON.stringify(options.value) }) }))
  }

  async vehicle(): Promise<Vehicle> {
    const creationId = randomUUID()
    const creationSecret = randomBytes(32).toString('base64url')
    const response = await this.request('/api/cases', { method: 'POST', origin: null, value: { creationId, creationSecret, deviceLabel: '차량' } })
    expect(response.status).toBe(201)
    const value: CreateCaseResponse = await response.json()
    return { ...value, creationId, creationSecret }
  }

  async pair(vehicle: Vehicle): Promise<PairResponse> {
    const response = await this.request(`/api/cases/${vehicle.caseId}/pairs`, { method: 'POST', origin: null, bearer: vehicle.vehicleCredential })
    expect(response.status).toBe(201)
    return response.json()
  }

  async pending(pair: PairResponse): Promise<{ value: ClaimResponse; cookie: string }> {
    const token = new URLSearchParams(new URL(pair.joinUrl).hash.slice(1)).get('pair')
    const response = await this.request('/api/pair-claims', { method: 'POST', value: { token, deviceLabel: '휴대폰' } })
    expect(response.status).toBe(201)
    const cookie = response.headers.get('Set-Cookie')?.split(';')[0]
    expect(cookie).toBeDefined()
    if (!cookie) throw new Error('Pending cookie missing')
    return { value: await response.json(), cookie }
  }

  async phone(existing?: Vehicle): Promise<Phone> {
    const vehicle = existing ?? await this.vehicle()
    const pair = await this.pair(vehicle)
    const pending = await this.pending(pair)
    const approved = await this.request(`/api/pairs/${pair.pairId}/approve`, { method: 'POST', bearer: vehicle.vehicleCredential, value: { claimId: pending.value.claimId } })
    expect(approved.status).toBe(200)
    const response = await this.request(`/api/pair-claims/${pending.value.claimId}`, { cookie: pending.cookie })
    expect(response.status).toBe(200)
    const status: ClaimStatus = await response.json()
    expect(status.state).toBe('approved')
    if (status.state !== 'approved') throw new Error('Claim not approved')
    const cookie = response.headers.get('Set-Cookie')?.split(';')[0]
    if (!cookie) throw new Error('Phone cookie missing')
    return { cookie, session: status.session, vehicle }
  }

  async current(phone: Phone): Promise<JourneyCase> {
    const response = await this.request(`/api/cases/${phone.session.caseId}`, { cookie: phone.cookie })
    expect(response.status).toBe(200)
    const body: { value: JourneyCase } = await response.json()
    return body.value
  }

  change(phone: Phone, expectedRevision: number, commands: ProductPhoneCommand[], mutationId: string = randomUUID()): Promise<Response> {
    const value: ChangeRequest = { expectedRevision, mutationId, commands }
    return this.request(`/api/cases/${phone.session.caseId}/changes`, { method: 'POST', cookie: phone.cookie, csrf: phone.session.csrfToken, value })
  }

  photo(phone: Phone, expectedRevision: number, id: string = randomUUID(), mutationId: string = randomUUID(), bytes: Uint8Array<ArrayBuffer> = PNG): Promise<Response> {
    const assetId = `asset:${id}`
    const evidence: Evidence = { id, label: '현장 사진', kind: 'photo', revision: 1, origin: 'user', assetId,
      availability: 'available', captureTarget: 'scene', metadata: { mime: 'image/png', bytes: bytes.byteLength, duration: null,
        capturedAt: this.now.toISOString(), sourceLabel: '휴대폰' } }
    const form = new FormData()
    form.set('manifest', JSON.stringify({ expectedRevision, mutationId, commands: [{ type: 'evidence-put', evidence }],
      assets: [{ id: assetId, bytes: bytes.byteLength, mime: 'image/png', sha256: hash(bytes) }] }))
    form.set(`asset:${assetId}`, new Blob([bytes], { type: 'image/png' }), 'scene.png')
    return this.request(`/api/cases/${phone.session.caseId}/changes`, { method: 'POST', cookie: phone.cookie, csrf: phone.session.csrfToken, body: form })
  }
}
