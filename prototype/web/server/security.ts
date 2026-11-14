import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { ApiErrorCode } from '../src/product/api-contract'

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: ApiErrorCode, message: string) { super(message) }
}

export const token = () => randomBytes(32).toString('base64url')
export const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
export const vehicleCredential = (secret: string, caseId: string) => createHmac('sha256', secret).update(`chabun:vehicle:v1\0${caseId}`).digest('base64url')
export const phoneCredential = (pending: string, claimId: string) => createHmac('sha256', pending).update(`chabun:phone:v1\0${claimId}`).digest('base64url')
export const PHONE_COOKIE = '__Host-chabun-phone'
export const PENDING_COOKIE = '__Host-chabun-pending'

export function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(Reflect.get(value, key))}`).join(',')}}`
}

export function readCookie(request: Request, name: string): string | null {
  const matches = (request.headers.get('Cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`))
  if (matches.length !== 1) return null
  const value = matches[0].slice(name.length + 1)
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null
}

export function sessionCookie(name: string, value: string, expiresAt: string): string {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Expires=${new Date(expiresAt).toUTCString()}`
}

export function requireOrigin(request: Request, allowed: string): void {
  if (request.headers.get('Origin') !== allowed) throw new ApiError(403, 'forbidden', '이 주소에서는 요청할 수 없어요.')
}

export function privateResponse(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  return response
}
