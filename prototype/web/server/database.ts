import { Database } from 'bun:sqlite'
import { chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { LIMITS, validateCase, type JourneyCase } from '../src/journey/case'
import { referencedAssetIds, validAssetReferences, type StoredAsset } from '../src/journey/case-assets'
import { vehicleProgress } from '../src/product/product-progress'
import type { PhoneSession, VehicleProgress } from '../src/product/api-contract'
import { ApiError, hash } from './security'

export type Grant = { id: string; case_id: string; role: 'phone' | 'vehicle'; token_hash: string; csrf: string;
  device_label: string; expires_at: string; revoked_at: string | null; last_seen_at: string | null }
export type AssetBytes = StoredAsset & { sha256: string; data: Uint8Array<ArrayBuffer> }
type CaseRow = { id: string; revision: number; document: string }
type OperationRow = { intent_hash: string; revision: number; result: string }
export type MutationResult = { value: JourneyCase; duplicate: boolean; ackMutationId: string; ackRevision: number; result: unknown }

export class CaseDatabase {
  readonly sql: Database
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    this.sql = new Database(path, { create: true, strict: true })
    if (path !== ':memory:') chmodSync(path, 0o600)
    this.sql.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS grants (id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), role TEXT NOT NULL CHECK(role IN ('phone','vehicle')),
        token_hash TEXT NOT NULL UNIQUE, csrf TEXT NOT NULL, device_label TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, last_seen_at TEXT);
      CREATE INDEX IF NOT EXISTS grants_case ON grants(case_id,role);
      CREATE TABLE IF NOT EXISTS creations (creation_id TEXT PRIMARY KEY, secret_hash TEXT NOT NULL, case_id TEXT NOT NULL REFERENCES cases(id), grant_id TEXT NOT NULL REFERENCES grants(id));
      CREATE TABLE IF NOT EXISTS pairs (id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), creator_id TEXT NOT NULL REFERENCES grants(id), token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','consumed','revoked')));
      CREATE TABLE IF NOT EXISTS claims (id TEXT PRIMARY KEY, pair_id TEXT NOT NULL REFERENCES pairs(id), pending_hash TEXT NOT NULL UNIQUE, phone_hash TEXT NOT NULL UNIQUE,
        grant_id TEXT NOT NULL, verification_code TEXT NOT NULL, device_label TEXT NOT NULL, expires_at TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','approved','cancelled')));
      CREATE INDEX IF NOT EXISTS claims_pair ON claims(pair_id);
      CREATE TABLE IF NOT EXISTS assets (case_id TEXT NOT NULL REFERENCES cases(id), id TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL,
        data BLOB NOT NULL, PRIMARY KEY(case_id,id));
      CREATE TABLE IF NOT EXISTS asset_ids (case_id TEXT NOT NULL REFERENCES cases(id), id TEXT NOT NULL, PRIMARY KEY(case_id,id));
      INSERT OR IGNORE INTO asset_ids(case_id,id) SELECT case_id,id FROM assets;
      CREATE TABLE IF NOT EXISTS operations (case_id TEXT NOT NULL REFERENCES cases(id), actor_id TEXT NOT NULL REFERENCES grants(id), mutation_id TEXT NOT NULL,
        intent_hash TEXT NOT NULL, revision INTEGER NOT NULL, result TEXT NOT NULL, PRIMARY KEY(case_id,actor_id,mutation_id));
      CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL);`)
  }

  close(): void { this.sql.close() }

  getCase(id: string): JourneyCase {
    const row = this.sql.query<CaseRow, [string]>('SELECT id,revision,document FROM cases WHERE id=?').get(id)
    if (!row) throw new ApiError(404, 'missing', '기록을 찾을 수 없어요.')
    const value: unknown = JSON.parse(row.document)
    if (!validateCase(value) || value.revision !== row.revision) throw new ApiError(503, 'unavailable', '저장된 기록을 확인할 수 없어요.')
    return value
  }

  grantByToken(credential: string, role: Grant['role'], now: string): Grant {
    const grant = this.sql.query<Grant, [string, string]>('SELECT * FROM grants WHERE token_hash=? AND role=?').get(hash(credential), role)
    if (!grant || grant.revoked_at !== null || grant.expires_at <= now) throw new ApiError(401, 'access-required', '연결을 다시 확인해 주세요.')
    return grant
  }

  requireGrant(id: string, caseId: string, now: string): Grant {
    const grant = this.sql.query<Grant, [string, string]>('SELECT * FROM grants WHERE id=? AND case_id=?').get(id, caseId)
    if (!grant || grant.revoked_at !== null || grant.expires_at <= now) throw new ApiError(401, 'access-required', '연결을 다시 확인해 주세요.')
    return grant
  }

  phoneSession(grant: Grant): PhoneSession {
    return { role: 'phone', caseId: grant.case_id, clientId: grant.id, csrfToken: grant.csrf, expiresAt: grant.expires_at }
  }

  heartbeat(grant: Grant, now: string): void {
    this.sql.query('UPDATE grants SET last_seen_at=? WHERE id=? AND revoked_at IS NULL AND expires_at>?').run(now, grant.id, now)
  }

  progress(value: JourneyCase, now: string): VehicleProgress {
    const phone = this.sql.query<Grant, [string, string]>(`SELECT * FROM grants WHERE case_id=? AND role='phone' AND revoked_at IS NULL AND expires_at>?
      ORDER BY last_seen_at DESC, id DESC LIMIT 1`).get(value.id, now)
    const seen = phone?.last_seen_at ?? null
    return vehicleProgress(value, { paired: phone !== null, online: seen !== null && Date.parse(now) - Date.parse(seen) < 30_000,
      lastSeenAt: seen, clientId: phone?.id ?? null })
  }

  rateLimit(key: string, maximum: number, windowMs: number, now: number): void {
    this.sql.transaction(() => {
      const previous = this.sql.query<{ window_start: number; count: number }, [string]>('SELECT window_start,count FROM rate_limits WHERE key=?').get(key)
      if (previous && now - previous.window_start < windowMs) {
        if (previous.count >= maximum) throw new ApiError(429, 'rate-limited', '요청이 많아요. 잠시 후 다시 시도해 주세요.')
        this.sql.query('UPDATE rate_limits SET count=count+1 WHERE key=?').run(key)
      } else {
        this.sql.query('INSERT INTO rate_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,count=1').run(key, now)
      }
      this.sql.query('DELETE FROM rate_limits WHERE window_start<?').run(now - 86_400_000)
    }).immediate()
  }

  mutate(input: { caseId: string; actorId: string; expectedRevision: number; mutationId: string; intentHash: string; now: string;
    assets?: AssetBytes[]; apply: (value: JourneyCase) => { value: JourneyCase; result?: unknown } }): MutationResult {
    return this.sql.transaction(() => {
      this.requireGrant(input.actorId, input.caseId, input.now)
      const current = this.getCase(input.caseId)
      const operation = this.sql.query<OperationRow, [string, string, string]>(
        'SELECT intent_hash,revision,result FROM operations WHERE case_id=? AND actor_id=? AND mutation_id=?').get(input.caseId, input.actorId, input.mutationId)
      if (operation) {
        if (operation.intent_hash !== input.intentHash) throw new ApiError(400, 'invalid-change', '같은 요청 번호에 다른 내용을 사용할 수 없어요.')
        return { value: current, duplicate: true, ackMutationId: input.mutationId, ackRevision: operation.revision, result: JSON.parse(operation.result) as unknown }
      }
      if (current.revision !== input.expectedRevision) throw new ApiError(409, 'conflict', '다른 기기에서 기록이 바뀌었어요. 최신 내용을 확인해 주세요.')
      const applied = input.apply(current)
      const next = { ...applied.value, revision: current.revision + 1, updatedAt: input.now }
      if (next.id !== current.id || !validateCase(next)) throw new ApiError(400, 'invalid-change', '저장할 내용을 확인해 주세요.')
      const assets = input.assets ?? []
      const references = referencedAssetIds(next)
      const stored = this.sql.query<StoredAsset, [string]>('SELECT id,case_id AS caseId,mime,bytes FROM assets WHERE case_id=?').all(input.caseId)
      const retained = stored.filter(asset => references.has(asset.id))
      if ([...retained, ...assets].reduce((bytes, asset) => bytes + asset.bytes, 0) > LIMITS.caseBytes) throw new ApiError(413, 'too-large', '이 기록에 보관할 수 있는 첨부 용량을 넘었어요.')
      if (new Set(assets.map(asset => asset.id)).size !== assets.length || assets.some(asset => asset.caseId !== next.id || !references.has(asset.id) ||
        this.sql.query('SELECT 1 FROM asset_ids WHERE case_id=? AND id=?').get(next.id, asset.id))) throw new ApiError(400, 'invalid-change', '첨부 파일은 새 번호로 저장해야 해요.')
      if (!validAssetReferences(next, [...retained, ...assets])) throw new ApiError(400, 'invalid-change', '기록과 첨부 파일이 일치하지 않아요.')
      for (const asset of assets) {
        this.sql.query('INSERT INTO asset_ids(case_id,id) VALUES(?,?)').run(asset.caseId, asset.id)
        this.sql.query('INSERT INTO assets(case_id,id,mime,bytes,sha256,data) VALUES(?,?,?,?,?,?)')
          .run(asset.caseId, asset.id, asset.mime, asset.bytes, asset.sha256, asset.data)
      }
      for (const asset of stored) if (!references.has(asset.id)) this.sql.query('DELETE FROM assets WHERE case_id=? AND id=?').run(next.id, asset.id)
      const update = this.sql.query('UPDATE cases SET revision=?,document=? WHERE id=? AND revision=?').run(next.revision, JSON.stringify(next), next.id, input.expectedRevision)
      if (update.changes !== 1) throw new ApiError(409, 'conflict', '다른 기기에서 기록이 바뀌었어요.')
      const result = applied.result ?? null
      this.sql.query('INSERT INTO operations(case_id,actor_id,mutation_id,intent_hash,revision,result) VALUES(?,?,?,?,?,?)')
        .run(next.id, input.actorId, input.mutationId, input.intentHash, next.revision, JSON.stringify(result))
      return { value: next, duplicate: false, ackMutationId: input.mutationId, ackRevision: next.revision, result }
    }).immediate()
  }

  readAsset(caseId: string, assetId: string): AssetBytes {
    const asset = this.sql.query<AssetBytes, [string, string]>(
      'SELECT id,case_id AS caseId,mime,bytes,sha256,data FROM assets WHERE case_id=? AND id=?').get(caseId, assetId)
    if (!asset) throw new ApiError(404, 'missing', '첨부 파일을 찾을 수 없어요.')
    return asset
  }
}
