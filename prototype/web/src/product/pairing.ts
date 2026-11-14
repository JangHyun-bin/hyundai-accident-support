import type { ClaimResponse, ClaimStatus, PhoneSession } from './api-contract'

type PairToken = { kind: 'absent' } | { kind: 'invalid' } | { kind: 'token'; token: string }
export class PairingError extends Error {
  readonly kind: 'access' | 'expired' | 'unavailable' | 'invalid'
  constructor(kind: 'access' | 'expired' | 'unavailable' | 'invalid') {
    super(kind)
    this.kind = kind
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function text(value: unknown, max = 256): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f]/u.test(value)
}
function date(value: unknown): value is string {
  return text(value, 64) && Number.isFinite(Date.parse(value))
}
export function parsePhoneSession(value: unknown): PhoneSession {
  if (!object(value) || value.role !== 'phone' || !text(value.caseId) || !text(value.clientId) || !text(value.csrfToken, 512) || !date(value.expiresAt)) throw new PairingError('invalid')
  return { role: value.role, caseId: value.caseId, clientId: value.clientId, csrfToken: value.csrfToken, expiresAt: value.expiresAt }
}
export function parseClaim(value: unknown): ClaimResponse {
  if (!object(value) || !text(value.claimId) || !text(value.verificationCode, 32) || !date(value.expiresAt)) throw new PairingError('invalid')
  return { claimId: value.claimId, verificationCode: value.verificationCode, expiresAt: value.expiresAt }
}
export function parseClaimStatus(value: unknown): ClaimStatus {
  if (!object(value)) throw new PairingError('invalid')
  if (value.state === 'approved') return { state: value.state, session: parsePhoneSession(value.session) }
  if (value.state === 'pending' || value.state === 'expired' || value.state === 'cancelled') return { state: value.state }
  throw new PairingError('invalid')
}
export function takePairToken(): PairToken {
  const fragment = location.hash.slice(1)
  if (!fragment) return { kind: 'absent' }
  history.replaceState(history.state, '', location.pathname + location.search)
  const params = new URLSearchParams(fragment)
  const token = params.get('pair')
  if (params.getAll('pair').length !== 1 || !token || !/^[A-Za-z0-9_-]{22,256}$/u.test(token)) return { kind: 'invalid' }
  return { kind: 'token', token }
}
async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetch('/api' + path, { ...init, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) })
  } catch { throw new PairingError('unavailable') }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new PairingError('access')
    if (response.status === 404 || response.status === 410) throw new PairingError('expired')
    throw new PairingError('unavailable')
  }
  try { return await response.json() } catch { throw new PairingError('invalid') }
}
export async function restorePhoneSession(): Promise<PhoneSession | null> {
  try { return parsePhoneSession(await request('/session')) }
  catch (error) { if (error instanceof PairingError && error.kind === 'access') return null; throw error }
}
export async function claimPair(token: string): Promise<ClaimResponse> {
  return parseClaim(await request('/pair-claims', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, deviceLabel: '휴대전화' }) }))
}
export async function claimStatus(claimId: string): Promise<ClaimStatus> {
  return parseClaimStatus(await request('/pair-claims/' + encodeURIComponent(claimId)))
}
const pendingKey = 'cha-bun-pending-pair'
export function rememberClaim(claim: ClaimResponse | null) {
  try {
    if (claim) sessionStorage.setItem(pendingKey, JSON.stringify(claim))
    else sessionStorage.removeItem(pendingKey)
  } catch { /* Pair approval remains available without session storage. */ }
}
export function rememberedClaim(): ClaimResponse | null {
  try {
    const raw = sessionStorage.getItem(pendingKey)
    if (!raw) return null
    const claim = parseClaim(JSON.parse(raw))
    if (Date.parse(claim.expiresAt) > Date.now()) return claim
    rememberClaim(null)
  } catch { rememberClaim(null) }
  return null
}
