import { useEffect, useMemo, useRef, useState } from 'react'
import type { Stage } from '../journey/case'
import type { PairClaim, PairResponse, VehicleAction, VehicleActionId, VehicleProgress } from './api-contract'

export type VehicleHandoffState =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'pairing'; pair: PairResponse; claims: PairClaim[]; progress: VehicleProgress }
  | { kind: 'connected'; progress: VehicleProgress }
  | { kind: 'failed'; reason: 'unavailable' | 'expired' | 'access'; progress: VehicleProgress | null }
export type VehicleHandoff = { state: VehicleHandoffState; start(): void; approve(claimId: string): void; renew(): void; retry(): void }
type FailureReason = Extract<VehicleHandoffState, { kind: 'failed' }>['reason']

export class VehicleHandoffError extends Error {
  readonly reason: FailureReason
  constructor(reason: FailureReason) {
    super(reason)
    this.reason = reason
  }
}

function invalid(): never {
  throw new VehicleHandoffError('unavailable')
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 4096
}
function date(value: unknown): value is string {
  return text(value) && Number.isFinite(Date.parse(value))
}
function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function oneOf<T extends string>(values: readonly T[]) {
  return (value: unknown): value is T => values.some(item => item === value)
}
const stage = oneOf<Stage>(['response', 'record', 'review', 'follow-up'])
const actionId = oneOf<VehicleActionId>(['need-help', 'confirm-record-ready', 'defer-recording', 'report-risk', 'resume-recording', 'decline-sharing'])
const draft = oneOf(['empty', 'draft', 'confirmed'] as const)

function parseAction(value: unknown): VehicleAction {
  if (!object(value) || !actionId(value.id) || !text(value.label)) invalid()
  return { id: value.id, label: value.label }
}
export function parseProgress(value: unknown): VehicleProgress {
  if (!object(value) || value.schemaVersion !== 1 || !text(value.caseId) || !count(value.revision) || !date(value.updatedAt) || !stage(value.stage) ||
    !(value.returnStage === null || stage(value.returnStage)) || typeof value.suspended !== 'boolean' || typeof value.riskCheckRequired !== 'boolean') invalid()
  const { scene, phone, record, copy, insurance } = value
  if (!object(scene) || !text(scene.id) || !text(scene.title) || typeof scene.body !== 'string' || !Array.isArray(scene.actions)) invalid()
  if (!object(phone) || typeof phone.paired !== 'boolean' || typeof phone.online !== 'boolean' ||
    !(phone.lastSeenAt === null || date(phone.lastSeenAt)) || !(phone.clientId === null || text(phone.clientId))) invalid()
  if (!object(record) || !count(record.photos) || !count(record.audio) || !count(record.video) || !draft(record.statement) || !draft(record.report)) invalid()
  if (!object(copy) || !(copy.id === null || text(copy.id)) || !(copy.preparedAt === null || date(copy.preparedAt))) invalid()
  if (!object(insurance) || insurance.integration !== 'unavailable' || insurance.receipt !== null) invalid()
  return { schemaVersion: 1, caseId: value.caseId, revision: value.revision, updatedAt: value.updatedAt, stage: value.stage,
    returnStage: value.returnStage, suspended: value.suspended, riskCheckRequired: value.riskCheckRequired,
    scene: { id: scene.id, title: scene.title, body: scene.body, actions: scene.actions.map(parseAction) },
    phone: { paired: phone.paired, online: phone.online, lastSeenAt: phone.lastSeenAt, clientId: phone.clientId },
    record: { photos: record.photos, audio: record.audio, video: record.video, statement: record.statement, report: record.report },
    copy: { id: copy.id, preparedAt: copy.preparedAt }, insurance: { integration: 'unavailable', receipt: null } }
}
function parsePair(value: unknown): PairResponse {
  if (!object(value) || !text(value.pairId) || !text(value.joinUrl) || !date(value.expiresAt) || !/^https?:\/\//u.test(value.joinUrl)) invalid()
  return { pairId: value.pairId, joinUrl: value.joinUrl, expiresAt: value.expiresAt }
}
function parseClaim(value: unknown): PairClaim {
  if (!object(value) || !text(value.claimId) || typeof value.verificationCode !== 'string' || !/^\d{6}$/u.test(value.verificationCode) ||
    !text(value.deviceLabel) || !date(value.expiresAt)) invalid()
  return { claimId: value.claimId, verificationCode: value.verificationCode, deviceLabel: value.deviceLabel, expiresAt: value.expiresAt }
}

export type VehicleCredentials = { caseId: string; vehicleCredential: string }
type Creation = { creationId: string; creationSecret: string }
export type VehicleRequest = (path: string, init?: RequestInit) => Promise<Response>
export type VehicleClient = {
  createCase(creation: Creation): Promise<VehicleCredentials>
  progress(vehicle: VehicleCredentials): Promise<VehicleProgress>
  pair(vehicle: VehicleCredentials): Promise<PairResponse>
  claims(vehicle: VehicleCredentials, pairId: string): Promise<PairClaim[]>
  approve(vehicle: VehicleCredentials, pairId: string, claimId: string): Promise<void>
}

export function createVehicleClient(request: VehicleRequest): VehicleClient {
  async function call(path: string, options: { method?: 'POST'; vehicle?: VehicleCredentials; body?: unknown; pairRoute?: true } = {}): Promise<unknown> {
    const headers = new Headers()
    if (options.vehicle) headers.set('Authorization', `Bearer ${options.vehicle.vehicleCredential}`)
    if (options.body !== undefined) headers.set('Content-Type', 'application/json')
    let response: Response
    try {
      response = await request('/api' + path, { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
    } catch { throw new VehicleHandoffError('unavailable') }
    if (response.status === 401 || response.status === 403) throw new VehicleHandoffError('access')
    if (options.pairRoute && (response.status === 404 || response.status === 409 || response.status === 410)) throw new VehicleHandoffError('expired')
    if (!response.ok) throw new VehicleHandoffError('unavailable')
    try { return await response.json() } catch { throw new VehicleHandoffError('unavailable') }
  }
  return {
    async createCase(creation: Creation): Promise<VehicleCredentials> {
      const value = await call('/cases', { method: 'POST', body: { ...creation, deviceLabel: '차량 화면' } })
      if (!object(value) || !text(value.caseId) || !text(value.vehicleCredential)) invalid()
      return { caseId: value.caseId, vehicleCredential: value.vehicleCredential }
    },
    async progress(vehicle: VehicleCredentials): Promise<VehicleProgress> {
      return parseProgress(await call(`/cases/${encodeURIComponent(vehicle.caseId)}/progress`, { vehicle }))
    },
    async pair(vehicle: VehicleCredentials): Promise<PairResponse> {
      return parsePair(await call(`/cases/${encodeURIComponent(vehicle.caseId)}/pairs`, { method: 'POST', vehicle }))
    },
    async claims(vehicle: VehicleCredentials, pairId: string): Promise<PairClaim[]> {
      const value = await call(`/pairs/${encodeURIComponent(pairId)}/claims`, { vehicle, pairRoute: true })
      if (!object(value) || !Array.isArray(value.claims)) invalid()
      return value.claims.map(parseClaim)
    },
    async approve(vehicle: VehicleCredentials, pairId: string, claimId: string): Promise<void> {
      const value = await call(`/pairs/${encodeURIComponent(pairId)}/approve`, { method: 'POST', vehicle, body: { claimId }, pairRoute: true })
      if (!object(value) || value.ok !== true) invalid()
    },
  }
}

export type HandoffStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type Stored = { creation: Creation; vehicle: VehicleCredentials | null }

function newCreation(): Creation {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const creationSecret = btoa(String.fromCharCode(...bytes)).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
  return { creationId: crypto.randomUUID(), creationSecret }
}
function parseStored(raw: string | null): Stored | null {
  if (raw === null) return null
  let value: unknown
  try { value = JSON.parse(raw) } catch { return null }
  if (!object(value) || !text(value.creationId) || !text(value.creationSecret)) return null
  const creation = { creationId: value.creationId, creationSecret: value.creationSecret }
  return { creation, vehicle: text(value.caseId) && text(value.vehicleCredential) ? { caseId: value.caseId, vehicleCredential: value.vehicleCredential } : null }
}

export type HandoffOptions = { client: VehicleClient; storage: HandoffStorage; journeyId: string; now?: () => number; onChange?: (state: VehicleHandoffState) => void }
export type HandoffController = {
  readonly state: VehicleHandoffState
  start(): Promise<void>
  renew(): Promise<void>
  retry(): Promise<void>
  approve(claimId: string): Promise<void>
  poll(): Promise<void>
  resume(): Promise<void>
  close(): void
}
type PairMode = 'resume' | 'recover' | 'renew'

export function createVehicleHandoff({ client, storage, journeyId, now = Date.now, onChange }: HandoffOptions): HandoffController {
  const key = 'chabun-vehicle-handoff:' + journeyId
  let state: VehicleHandoffState = { kind: 'idle' }
  let vehicle: VehicleCredentials | null = null
  let pair: PairResponse | null = null
  let epoch = 0
  let inflight = 0
  let closed = false

  // Storage can be blocked by the browser; the handoff still works for this page, only reload reuse is lost.
  function read(): Stored | null {
    try { return parseStored(storage.getItem(key)) } catch { return null }
  }
  function write(value: Creation | (Creation & VehicleCredentials)) {
    try { storage.setItem(key, JSON.stringify(value)) } catch { /* see read() */ }
  }
  function forget() {
    try { storage.removeItem(key) } catch { /* see read() */ }
    vehicle = null
    pair = null
  }
  function set(next: VehicleHandoffState) {
    if (closed) return
    state = next
    onChange?.(next)
  }

  async function openCase(): Promise<VehicleCredentials> {
    if (vehicle) return vehicle
    const stored = read()
    if (stored?.vehicle) return vehicle = stored.vehicle
    const creation = stored?.creation ?? newCreation()
    write(creation)
    const created = await client.createCase(creation)
    write({ ...creation, ...created })
    return vehicle = created
  }
  async function settle(mode: PairMode): Promise<VehicleHandoffState> {
    const owned = await openCase()
    const progress = await client.progress(owned)
    if (progress.phone.paired) return { kind: 'connected', progress }
    const current = mode === 'renew' ? null : pair
    if (current && now() < Date.parse(current.expiresAt)) return { kind: 'pairing', pair: current, claims: await client.claims(owned, current.pairId), progress }
    if (current && mode === 'resume') return { kind: 'failed', reason: 'expired', progress }
    return { kind: 'pairing', pair: await client.pair(owned), claims: [], progress }
  }
  async function execute(ticket: number, work: () => Promise<VehicleHandoffState>) {
    inflight++
    let next: VehicleHandoffState
    try {
      next = await work()
    } catch (error) {
      if (!(error instanceof VehicleHandoffError)) throw error
      next = { kind: 'failed', reason: error.reason, progress: 'progress' in state ? state.progress : null }
    } finally { inflight-- }
    if (ticket !== epoch) return
    if (next.kind === 'pairing') pair = next.pair
    if (next.kind === 'connected') pair = null
    set(next)
  }
  function command(work: () => Promise<VehicleHandoffState>, pending?: VehicleHandoffState) {
    const ticket = ++epoch
    if (pending) set(pending)
    return execute(ticket, work)
  }
  const start = () => command(() => settle('recover'), { kind: 'starting' })

  return {
    get state() { return state },
    start,
    renew: () => command(() => settle('renew')),
    retry() {
      if (state.kind === 'failed' && state.reason === 'access') forget()
      return command(() => settle('recover'), { kind: 'starting' })
    },
    approve(claimId: string) {
      if (state.kind !== 'pairing') return Promise.resolve()
      const pairId = state.pair.pairId
      return command(async () => {
        const owned = await openCase()
        await client.approve(owned, pairId, claimId)
        return { kind: 'connected', progress: await client.progress(owned) }
      })
    },
    poll() {
      if (inflight > 0 || closed) return Promise.resolve()
      if (state.kind === 'pairing' || state.kind === 'connected') return execute(epoch, () => settle('resume'))
      if (state.kind === 'failed' && state.reason === 'unavailable') return execute(epoch, () => settle('recover'))
      return Promise.resolve()
    },
    resume: () => read() ? start() : Promise.resolve(),
    close() {
      closed = true
      epoch++
    },
  }
}

const POLL_MS = 3000
const browserRequest: VehicleRequest = (path, init) => fetch(path, { ...init, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10_000) })

export function useVehicleHandoff(journeyId: string): VehicleHandoff {
  const [state, setState] = useState<VehicleHandoffState>({ kind: 'idle' })
  const controller = useRef<HandoffController | null>(null)
  useEffect(() => {
    const handoff = createVehicleHandoff({ client: createVehicleClient(browserRequest), storage: localStorage, journeyId, onChange: setState })
    controller.current = handoff
    setState(handoff.state)
    void handoff.resume()
    const tick = () => { if (document.visibilityState === 'visible') void handoff.poll() }
    const timer = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      handoff.close()
      controller.current = null
    }
  }, [journeyId])
  return useMemo(() => ({
    state,
    start: () => { void controller.current?.start() },
    approve: (claimId: string) => { void controller.current?.approve(claimId) },
    renew: () => { void controller.current?.renew() },
    retry: () => { void controller.current?.retry() },
  }), [state])
}
