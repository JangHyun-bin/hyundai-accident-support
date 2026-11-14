import { randomInt, randomUUID } from 'node:crypto'
import { createProductCase } from '../src/product/product-case'
import { inputId, inputObject, inputText } from '../src/product/product-commands'
import type { ClaimResponse, ClaimStatus, CreateCaseResponse, PairClaim, PairResponse } from '../src/product/api-contract'
import { CaseDatabase, type Grant } from './database'
import { ApiError, hash, phoneCredential, sameSecret, token, vehicleCredential } from './security'

type PairRow = { id: string; case_id: string; creator_id: string; token_hash: string; expires_at: string; state: 'pending' | 'consumed' | 'revoked' }
type ClaimRow = { id: string; pair_id: string; pending_hash: string; phone_hash: string; grant_id: string; verification_code: string;
  device_label: string; expires_at: string; state: 'pending' | 'approved' | 'cancelled' }
const expires = (now: string, milliseconds: number) => new Date(Date.parse(now) + milliseconds).toISOString()

export class Pairing {
  constructor(private readonly store: CaseDatabase, private readonly origin: string) {}

  create(value: unknown, now: string): CreateCaseResponse {
    if (!inputObject(value) || Object.keys(value).some(key => !['creationId', 'creationSecret', 'deviceLabel'].includes(key)) ||
      !inputId(value.creationId) || typeof value.creationSecret !== 'string' || !/^(?:[a-fA-F0-9]{64}|[A-Za-z0-9_-]{43})$/.test(value.creationSecret) ||
      !inputText(value.deviceLabel, 80) || !value.deviceLabel.trim()) throw new ApiError(400, 'invalid-request', '차량 연결 정보를 확인해 주세요.')
    const { creationId, creationSecret, deviceLabel } = value
    return this.store.sql.transaction(() => {
      const previous = this.store.sql.query<{ secret_hash: string; case_id: string; grant_id: string }, [string]>(
        'SELECT secret_hash,case_id,grant_id FROM creations WHERE creation_id=?').get(creationId)
      if (previous) {
        if (!sameSecret(previous.secret_hash, hash(creationSecret))) throw new ApiError(403, 'forbidden', '차량 연결 정보를 확인해 주세요.')
        const grant = this.store.requireGrant(previous.grant_id, previous.case_id, now)
        const credential = vehicleCredential(creationSecret, previous.case_id)
        if (!sameSecret(grant.token_hash, hash(credential))) throw new ApiError(403, 'forbidden', '차량 연결 정보를 확인해 주세요.')
        return { caseId: previous.case_id, vehicleCredential: credential, expiresAt: grant.expires_at,
          progress: this.store.progress(this.store.getCase(previous.case_id), now) }
      }
      const caseId = randomUUID()
      const grantId = randomUUID()
      const credential = vehicleCredential(creationSecret, caseId)
      const expiresAt = expires(now, 30 * 86_400_000)
      const product = createProductCase(caseId, now)
      this.store.sql.query('INSERT INTO cases(id,revision,document) VALUES(?,?,?)').run(caseId, product.revision, JSON.stringify(product))
      this.store.sql.query('INSERT INTO grants(id,case_id,role,token_hash,csrf,device_label,expires_at) VALUES(?,?,?,?,?,?,?)')
        .run(grantId, caseId, 'vehicle', hash(credential), '', deviceLabel.trim(), expiresAt)
      this.store.sql.query('INSERT INTO creations(creation_id,secret_hash,case_id,grant_id) VALUES(?,?,?,?)')
        .run(creationId, hash(creationSecret), caseId, grantId)
      return { caseId, vehicleCredential: credential, expiresAt, progress: this.store.progress(product, now) }
    }).immediate()
  }

  pair(grant: Grant, now: string): PairResponse {
    return this.store.sql.transaction(() => {
      this.store.requireGrant(grant.id, grant.case_id, now)
      this.store.sql.query("UPDATE claims SET state='cancelled' WHERE state='pending' AND pair_id IN (SELECT id FROM pairs WHERE case_id=? AND state='pending')").run(grant.case_id)
      this.store.sql.query("UPDATE pairs SET state='revoked' WHERE case_id=? AND state='pending'").run(grant.case_id)
      const pairId = randomUUID()
      const secret = token()
      const expiresAt = expires(now, 5 * 60_000)
      this.store.sql.query("INSERT INTO pairs(id,case_id,creator_id,token_hash,expires_at,state) VALUES(?,?,?,?,?,'pending')")
        .run(pairId, grant.case_id, grant.id, hash(secret), expiresAt)
      return { pairId, joinUrl: `${this.origin}/phone#pair=${secret}`, expiresAt }
    }).immediate()
  }

  claim(value: unknown, pending: string | null, now: string): { value: ClaimResponse; pending: string } {
    if (!inputObject(value) || Object.keys(value).some(key => !['token', 'deviceLabel'].includes(key)) || typeof value.token !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(value.token) || !inputText(value.deviceLabel, 80) || !value.deviceLabel.trim()) {
      throw new ApiError(400, 'invalid-request', '연결 코드를 확인해 주세요.')
    }
    const { token: pairToken, deviceLabel } = value
    return this.store.sql.transaction(() => {
      const pair = this.store.sql.query<PairRow, [string]>('SELECT * FROM pairs WHERE token_hash=?').get(hash(pairToken))
      if (!pair || pair.expires_at <= now || pair.state !== 'pending') throw new ApiError(410, 'missing', '연결 코드가 만료됐어요. 차량에서 다시 열어 주세요.')
      this.store.requireGrant(pair.creator_id, pair.case_id, now)
      const existing = pending ? this.store.sql.query<ClaimRow, [string, string]>("SELECT * FROM claims WHERE pending_hash=? AND pair_id=? AND state='pending'").get(hash(pending), pair.id) : null
      if (existing && pending) return { value: this.claimView(existing), pending }
      const count = this.store.sql.query<{ count: number }, [string]>('SELECT COUNT(*) AS count FROM claims WHERE pair_id=?').get(pair.id)
      if ((count?.count ?? 0) >= 8) throw new ApiError(429, 'rate-limited', '연결 시도가 많아요. 차량에서 새 코드를 열어 주세요.')
      const claimId = randomUUID()
      const pendingToken = token()
      let verificationCode: string
      do {
        verificationCode = randomInt(100000, 1000000).toString()
      } while (this.store.sql.query('SELECT 1 FROM claims WHERE pair_id=? AND verification_code=?').get(pair.id, verificationCode))
      this.store.sql.query("INSERT INTO claims(id,pair_id,pending_hash,phone_hash,grant_id,verification_code,device_label,expires_at,state) VALUES(?,?,?,?,?,?,?,?,'pending')")
        .run(claimId, pair.id, hash(pendingToken), hash(phoneCredential(pendingToken, claimId)), randomUUID(), verificationCode, deviceLabel.trim(), pair.expires_at)
      return { value: { claimId, verificationCode, expiresAt: pair.expires_at }, pending: pendingToken }
    }).immediate()
  }

  status(claimId: string, pending: string | null, now: string): { value: ClaimStatus; credential?: string } {
    if (!pending) throw new ApiError(401, 'access-required', '이 휴대폰에서 연결을 다시 시작해 주세요.')
    const claim = this.store.sql.query<ClaimRow, [string, string]>('SELECT * FROM claims WHERE id=? AND pending_hash=?').get(claimId, hash(pending))
    if (!claim) throw new ApiError(404, 'missing', '연결 요청을 찾을 수 없어요.')
    const pair = this.store.sql.query<PairRow, [string]>('SELECT * FROM pairs WHERE id=?').get(claim.pair_id)
    if (!pair || pair.state === 'revoked' || claim.state === 'cancelled') return { value: { state: 'cancelled' } }
    if (claim.state === 'approved') {
      const grant = this.store.requireGrant(claim.grant_id, pair.case_id, now)
      const credential = phoneCredential(pending, claim.id)
      if (!sameSecret(grant.token_hash, hash(credential))) throw new ApiError(401, 'access-required', '연결 정보를 확인해 주세요.')
      return { value: { state: 'approved', session: this.store.phoneSession(grant) }, credential }
    }
    if (claim.expires_at <= now) return { value: { state: 'expired' } }
    return { value: { state: 'pending' } }
  }

  claims(pairId: string, grant: Grant, now: string): PairClaim[] {
    const pair = this.ownedPair(pairId, grant, now)
    if (pair.state !== 'pending' || pair.expires_at <= now) return []
    return this.store.sql.query<ClaimRow, [string, string]>("SELECT * FROM claims WHERE pair_id=? AND state='pending' AND expires_at>? ORDER BY id").all(pairId, now)
      .map(claim => ({ ...this.claimView(claim), deviceLabel: claim.device_label }))
  }

  approve(pairId: string, claimId: string, grant: Grant, now: string): void {
    this.store.sql.transaction(() => {
      const pair = this.ownedPair(pairId, grant, now)
      const claim = this.store.sql.query<ClaimRow, [string, string]>('SELECT * FROM claims WHERE id=? AND pair_id=?').get(claimId, pairId)
      if (claim?.state === 'approved' && pair.state === 'consumed') {
        this.store.requireGrant(claim.grant_id, pair.case_id, now)
        return
      }
      if (pair.state !== 'pending' || pair.expires_at <= now || !claim || claim.state !== 'pending' || claim.expires_at <= now) {
        throw new ApiError(409, 'conflict', '이 연결 요청은 더 이상 승인할 수 없어요.')
      }
      this.store.sql.query('INSERT INTO grants(id,case_id,role,token_hash,csrf,device_label,expires_at) VALUES(?,?,?,?,?,?,?)')
        .run(claim.grant_id, pair.case_id, 'phone', claim.phone_hash, token(), claim.device_label, expires(now, 86_400_000))
      this.store.sql.query("UPDATE claims SET state=CASE WHEN id=? THEN 'approved' ELSE 'cancelled' END WHERE pair_id=?").run(claimId, pairId)
      this.store.sql.query("UPDATE pairs SET state='consumed' WHERE id=?").run(pairId)
    }).immediate()
  }

  revokePair(pairId: string, grant: Grant, now: string): void {
    this.store.sql.transaction(() => {
      this.ownedPair(pairId, grant, now)
      this.store.sql.query("UPDATE pairs SET state='revoked' WHERE id=?").run(pairId)
      this.store.sql.query("UPDATE claims SET state='cancelled' WHERE pair_id=? AND state='pending'").run(pairId)
    }).immediate()
  }

  revokeClient(clientId: string, grant: Grant, now: string): void {
    this.store.sql.transaction(() => {
      this.store.requireGrant(grant.id, grant.case_id, now)
      const target = this.store.sql.query<Grant, [string, string]>('SELECT * FROM grants WHERE id=? AND case_id=?').get(clientId, grant.case_id)
      if (!target) throw new ApiError(404, 'missing', '연결된 기기를 찾을 수 없어요.')
      if (grant.role === 'phone' && clientId !== grant.id) throw new ApiError(403, 'forbidden', '이 기기의 연결만 해제할 수 있어요.')
      this.store.sql.query('UPDATE grants SET revoked_at=? WHERE id=?').run(now, clientId)
      this.store.sql.query("UPDATE pairs SET state='revoked' WHERE creator_id=? AND state='pending'").run(clientId)
      this.store.sql.query("UPDATE claims SET state='cancelled' WHERE grant_id=? OR pair_id IN (SELECT id FROM pairs WHERE creator_id=? AND state='revoked')").run(clientId, clientId)
    }).immediate()
  }

  private ownedPair(pairId: string, grant: Grant, now: string): PairRow {
    this.store.requireGrant(grant.id, grant.case_id, now)
    const pair = this.store.sql.query<PairRow, [string, string]>('SELECT * FROM pairs WHERE id=? AND case_id=?').get(pairId, grant.case_id)
    if (!pair) throw new ApiError(404, 'missing', '연결 코드를 찾을 수 없어요.')
    return pair
  }

  private claimView(claim: ClaimRow): ClaimResponse {
    return { claimId: claim.id, verificationCode: claim.verification_code, expiresAt: claim.expires_at }
  }
}
