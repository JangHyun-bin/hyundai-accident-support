import { LIMITS, makeShare, makeSubmission, preparePayload, reduceCase, type ApprovalInput, type ApprovalCommitResult, type AssetWrite, type CaseCommand, type CommitResult, type JourneyCase, type PayloadSnapshot } from './case'
import type { CaseBatch, CaseChangeBatch, CaseCopyBatch, CaseData, CaseDataFailure, CaseWriteResult, StoredCaseBatch } from './case-data'
import type { DraftDurability } from './editor-drafts'
import { openEvidence } from './evidence-media'
import { parsePhoneCommand } from '../product/product-commands'

export type SaveState = 'saved' | 'saving' | CaseDataFailure
export type LocalRecoveryDraft = { commands: CaseCommand[]; assets: AssetWrite[] }
export type Recovery = { value: JourneyCase; assets: AssetWrite[]; commands: CaseCommand[]; base?: JourneyCase | null; latest?: JourneyCase | null }
export type CaseSyncSnapshot = {
  value: JourneyCase | null; loading: boolean; missing: boolean; saveState: SaveState
  recoveries: Recovery[]; reloadVersion: number; durable: boolean
}
type Pending = { batch: CaseBatch; generation: number; persisted: Promise<DraftDurability>; durability: DraftDurability | null; attempted: boolean; revertOnFailure: boolean }

function recovery(record: StoredCaseBatch): Recovery {
  return { value: record.batch.local, assets: record.batch.assets, commands: record.batch.kind === 'changes' ? record.batch.commands : [], base: record.batch.base, latest: record.latest }
}
function domainFailure(reason: CaseDataFailure, draft: JourneyCase): CommitResult {
  return { ok: false, reason: reason === 'access-required' || reason === 'forbidden' ? 'unavailable' : reason, draft }
}
function project(head: JourneyCase, pending: Pending[], conflicted: boolean): JourneyCase {
  let value = head
  for (const entry of pending) {
    if (entry.batch.kind !== 'changes') continue
    const changedBase = conflicted || head.revision > (entry.batch.expectedRevision ?? -1)
    for (const command of entry.batch.commands) {
      if (changedBase && (command.type === 'statement-confirm' || command.type === 'diagram-confirm' || command.type === 'paragraph-confirm' ||
        command.type === 'resume' || command.type === 'safety-action' && command.action.id === 'record-ready' ||
        command.type === 'navigate' && command.stage !== 'response' && command.stage !== 'follow-up')) continue
      value = reduceCase(value, command)
    }
  }
  return value
}

export class JourneyCaseSync {
  private snapshot: CaseSyncSnapshot = { value: null, loading: false, missing: false, saveState: 'saved', recoveries: [], reloadVersion: 0, durable: true }
  private listeners = new Set<() => void>()
  private head: JourneyCase | null = null
  private pending: Pending[] = []
  private queue: Promise<void> = Promise.resolve()
  private epoch = 0
  private change = 0
  private savedChange = 0
  private conflicted = false
  private inFlight: string | null = null
  private refreshing = false

  constructor(private readonly data: CaseData) {}
  getSnapshot = (): CaseSyncSnapshot => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(patch: Partial<CaseSyncSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of this.listeners) listener()
  }
  private stage(batch: CaseBatch, revertOnFailure = false): Pending {
    const entry: Pending = { batch, generation: ++this.change, persisted: Promise.resolve({ durable: false }), durability: null, attempted: false, revertOnFailure }
    entry.persisted = this.data.stageBatch(batch).catch((): DraftDurability => ({ durable: false, reason: 'unavailable' })).then(result => {
      entry.durability = result
      if (this.pending.includes(entry)) this.update({ durable: this.pending.every(pending => pending.durability?.durable) })
      return result
    })
    this.pending.push(entry)
    return entry
  }
  private async conflict(latest?: JourneyCase) {
    this.conflicted = true
    if (latest && (!this.head || latest.revision >= this.head.revision)) this.head = latest
    const live = this.snapshot.value
    this.update({ value: this.head ? project(this.head, this.pending, true) : live, saveState: 'conflict' })
    await Promise.all(this.pending.map(entry => this.data.markBatch(entry.batch.local.id, entry.batch.mutationId, 'conflict', this.head).catch(() => ({ durable: false }))))
  }
  private async revert(entry: Pending, head: JourneyCase, reason: CaseDataFailure) {
    this.pending = this.pending.filter(pending => pending !== entry)
    this.update({ value: project(head, this.pending, this.conflicted), saveState: reason, durable: this.pending.every(pending => pending.durability?.durable) })
    await this.data.acknowledgeBatch(entry.batch.local.id, entry.batch.mutationId).catch(() => ({ durable: false }))
  }
  private expectedRevision(): number | null {
    const tail = this.pending.at(-1)
    return tail ? (tail.batch.expectedRevision ?? 0) + 1 : this.head?.revision ?? null
  }

  open = async (caseId: string | null): Promise<void> => {
    const requestedEpoch = ++this.epoch
    this.head = null; this.pending = []; this.conflicted = false; this.change = 0; this.savedChange = 0
    this.update({ value: null, loading: !!caseId, missing: false, saveState: 'saved', recoveries: [], durable: true })
    if (!caseId) return
    const [loaded, stored] = await Promise.all([
      this.data.load(caseId).catch(() => ({ kind: 'unavailable' as const })),
      this.data.readBatches(caseId).then(records => ({ ok: true as const, records }), () => ({ ok: false as const, records: [] })),
    ])
    if (this.epoch !== requestedEpoch) return
    const records = stored.records
    const recoveries = records.filter(record => record.status === 'recovery').map(recovery)
    if (loaded.kind !== 'found') {
      this.update({ loading: false, missing: loaded.kind === 'missing', saveState: loaded.kind === 'missing' ? 'unavailable' : loaded.kind,
        recoveries: [...recoveries, ...records.filter(record => record.status !== 'recovery').map(recovery)], durable: stored.ok })
      return
    }
    this.head = loaded.value
    this.pending = records.filter(record => record.status !== 'recovery').map(record => ({ batch: record.batch, generation: ++this.change,
      persisted: Promise.resolve({ durable: true }), durability: { durable: true }, attempted: false, revertOnFailure: false }))
    this.conflicted = records.some(record => record.status === 'conflict')
    this.update({ value: project(loaded.value, this.pending, this.conflicted), loading: false, recoveries,
      saveState: this.conflicted ? 'conflict' : !stored.ok ? 'unavailable' : this.pending.length ? 'saving' : 'saved', durable: stored.ok })
    if (stored.ok && this.pending.length && !this.conflicted) void this.flush()
  }

  save = (command: CaseCommand, assets: AssetWrite[] = []): Promise<CommitResult> => {
    const previous = this.snapshot.value
    if (!previous) return Promise.reject(new Error('No incident is open'))
    let immutable: CaseCommand
    try { immutable = structuredClone(this.data.mode === 'remote' ? parsePhoneCommand(command) : command) }
    catch { return Promise.resolve({ ok: false, reason: 'invalid', draft: previous }) }
    const next = reduceCase(previous, immutable)
    if (next === previous && immutable.type === 'paragraph-edit') {
      const full = !previous.report?.paragraphs.some(paragraph => paragraph.id === immutable.id) && (previous.report?.paragraphs.length ?? 0) >= LIMITS.reportParagraphs
      return Promise.resolve({ ok: false, reason: 'invalid', rejection: full ? 'paragraph-limit' : 'invalid-command', draft: previous })
    }
    if (next === previous) return assets.length ? Promise.resolve({ ok: false, reason: 'invalid', draft: previous }) : this.flush()
    if (assets.some(asset => asset.caseId !== previous.id || !(asset.blob instanceof Blob))) return Promise.resolve({ ok: false, reason: 'invalid', draft: previous })
    const expectedRevision = this.expectedRevision()
    const batch: CaseChangeBatch = { kind: 'changes', mutationId: crypto.randomUUID(), expectedRevision, base: { ...previous, revision: expectedRevision ?? 0 },
      local: { ...next, revision: expectedRevision ?? 0 }, commands: [immutable], assets: assets.map(asset => ({ ...asset })), createdAt: new Date().toISOString() }
    this.stage(batch, assets.length > 0 || immutable.type === 'voice-save')
    this.update({ value: next, saveState: this.conflicted ? 'conflict' : 'saving', durable: false })
    if (this.conflicted) {
      void this.data.markBatch(previous.id, batch.mutationId, 'conflict', this.head).catch(() => {})
      return Promise.resolve({ ok: false, reason: 'conflict', draft: next })
    }
    return this.flush()
  }
  dispatch = (command: CaseCommand) => { void this.save(command).catch(() => {}) }

  flush = (): Promise<CommitResult> => {
    const requestedEpoch = this.epoch
    const target = this.pending.at(-1)?.batch.mutationId
    const job = this.queue.then(async (): Promise<CommitResult> => {
      const initial = this.snapshot.value
      if (!initial) throw new Error('No incident is open')
      if (requestedEpoch !== this.epoch || this.conflicted) return { ok: false, reason: 'conflict', draft: initial }
      if (!target) return { ok: true, value: initial }
      while (this.pending.length) {
        if (requestedEpoch !== this.epoch || this.conflicted) return { ok: false, reason: 'conflict', draft: this.snapshot.value ?? initial }
        const entry = this.pending[0]!
        if (this.data.mode === 'study' && entry.batch.kind === 'changes' && this.head) {
          const base = this.head
          entry.batch = { ...entry.batch, expectedRevision: base.revision, base, local: { ...project(base, [entry], false), revision: base.revision } }
        }
        if (entry.attempted && entry.durability && !entry.durability.durable) {
          entry.persisted = this.data.stageBatch(entry.batch).catch((): DraftDurability => ({ durable: false, reason: 'unavailable' })).then(result => { entry.durability = result; return result })
        }
        const durable = await entry.persisted
        entry.attempted = true
        if (requestedEpoch !== this.epoch) return { ok: false, reason: 'conflict', draft: this.snapshot.value ?? initial }
        if (!durable.durable && this.data.mode === 'remote') {
          const reason = durable.reason ?? 'unavailable'
          this.update({ saveState: reason, durable: false })
          return { ok: false, reason, draft: this.snapshot.value ?? initial }
        }
        this.inFlight = entry.batch.mutationId
        this.update({ saveState: 'saving', durable: this.pending.every(pending => pending.durability?.durable) })
        let result: CaseWriteResult
        try { result = entry.batch.kind === 'copy' ? await this.data.approveCopy(entry.batch) : await this.data.apply(entry.batch) }
        catch { result = { ok: false, reason: 'unavailable' } }
        this.inFlight = null
        if (!result.ok) {
          if (requestedEpoch !== this.epoch) return domainFailure(result.reason, this.snapshot.value ?? initial)
          if (result.reason === 'conflict') await this.conflict(result.latest)
          else if (this.data.mode === 'study' && entry.revertOnFailure && this.head) await this.revert(entry, this.head, result.reason)
          else this.update({ saveState: result.reason, durable: this.pending.every(pending => pending.durability?.durable) })
          return domainFailure(result.reason, this.snapshot.value ?? initial)
        }
        if (result.ackMutationId !== entry.batch.mutationId || !Number.isSafeInteger(result.ackRevision) || result.ackRevision > result.value.revision ||
          result.value.id !== entry.batch.local.id || result.ackRevision <= (entry.batch.expectedRevision ?? -1)) {
          this.update({ saveState: 'unavailable' })
          return { ok: false, reason: 'unavailable', draft: this.snapshot.value ?? initial }
        }
        await this.data.acknowledgeBatch(result.value.id, result.ackMutationId).catch(() => ({ durable: false }))
        if (requestedEpoch !== this.epoch) {
          if (this.head?.id === result.value.id && result.value.revision > this.head.revision) {
            this.head = result.value
            this.update({ value: project(result.value, this.pending, this.conflicted) })
          }
          return { ok: true, value: this.snapshot.value ?? result.value }
        }
        this.pending = this.pending.filter(pending => pending.batch.mutationId !== result.ackMutationId)
        this.savedChange = Math.max(this.savedChange, entry.generation)
        if (!this.head || result.value.revision >= this.head.revision) this.head = result.value
        const head = this.head
        if (this.pending.length && head.revision !== result.ackRevision) {
          await this.conflict(head)
          return { ok: false, reason: 'conflict', draft: this.snapshot.value ?? initial }
        }
        this.conflicted = false
        const value = project(head, this.pending, false)
        this.update({ value, saveState: this.pending.length || this.change !== this.savedChange ? 'saving' : 'saved', durable: this.pending.every(pending => pending.durability?.durable) })
        if (entry.batch.mutationId === target) return { ok: true, value }
      }
      return { ok: true, value: this.snapshot.value ?? initial }
    })
    this.queue = job.then(() => {}, () => {})
    return job
  }

  private async approveInternal(input: ApprovalInput, preview: PayloadSnapshot): Promise<ApprovalCommitResult> {
    const approvalEpoch = this.epoch
    const caseId = this.snapshot.value?.id
    const saved = await this.flush()
    if (!saved.ok) return saved
    const source = this.snapshot.value
    if (!source || this.epoch !== approvalEpoch || source.id !== caseId || this.conflicted || this.pending.length) return { ok: false, reason: 'unreviewed-content' }
    const generation = this.change
    const selected = preparePayload(source, input.selection)
    if (!selected.ok) return selected
    if (JSON.stringify(selected.value) !== JSON.stringify(preview)) return { ok: false, reason: 'unreviewed-content' }
    try {
      for (const evidence of selected.value.evidence) await openEvidence(this.data, source.id, evidence)
      for (const paragraph of selected.value.report?.paragraphs ?? []) for (const reference of paragraph.references) {
        const evidence = selected.value.evidence.find(item => item.id === reference.evidenceId)
        if (!evidence) return { ok: false, reason: 'missing-evidence' }
        await openEvidence(this.data, source.id, evidence, reference)
      }
    } catch { return { ok: false, reason: 'missing-evidence' } }
    const latest = this.snapshot.value
    if (!latest || this.epoch !== approvalEpoch || latest.id !== source.id || generation !== this.change || this.conflicted || this.pending.length) return { ok: false, reason: 'unreviewed-content' }
    const payload = preparePayload(latest, input.selection)
    if (!payload.ok) return payload
    if (JSON.stringify(payload.value) !== JSON.stringify(preview)) return { ok: false, reason: 'unreviewed-content' }
    const approval = input.kind === 'submission' ? makeSubmission(latest, input) : makeShare(latest, input)
    if (!approval.ok) return approval
    const expectedRevision = this.head?.revision ?? null
    const batch: CaseCopyBatch = { kind: 'copy', mutationId: crypto.randomUUID(), expectedRevision, base: latest,
      local: { ...approval.value, revision: expectedRevision ?? 0 }, input: structuredClone(input), preview: structuredClone(preview), assets: [], createdAt: new Date().toISOString() }
    this.stage(batch, true)
    this.update({ saveState: 'saving', durable: false })
    return this.flush()
  }
  approve = (input: ApprovalInput, preview: PayloadSnapshot): Promise<ApprovalCommitResult> => {
    return this.data.mode === 'study' ? this.approveInternal(input, preview) : Promise.resolve({ ok: false, reason: 'unreviewed-content' })
  }
  approveCopy = (input: ApprovalInput, preview: PayloadSnapshot): Promise<ApprovalCommitResult> => {
    return input.kind === 'share' ? this.approveInternal(input, preview) : Promise.resolve({ ok: false, reason: 'unreviewed-content' })
  }

  start = async (record: JourneyCase): Promise<CommitResult> => {
    if (this.data.mode !== 'study') return { ok: false, reason: 'invalid', draft: record }
    if (this.snapshot.value) { const saved = await this.flush(); if (!saved.ok) return saved }
    this.epoch += 1; this.head = null; this.pending = []; this.conflicted = false; this.change = 0; this.savedChange = 0
    this.stage({ kind: 'start', mutationId: crypto.randomUUID(), expectedRevision: null, base: null, local: record, assets: [], createdAt: new Date().toISOString() })
    this.update({ value: record, loading: false, missing: false, saveState: 'saving', durable: false })
    return this.flush()
  }

  reload = async (draft: LocalRecoveryDraft = { commands: [], assets: [] }): Promise<void> => {
    const source = this.snapshot.value
    if (!source) return
    const requestedEpoch = this.epoch
    const loaded = await this.data.load(source.id).catch(() => ({ kind: 'unavailable' as const }))
    if (this.epoch !== requestedEpoch || this.snapshot.value?.id !== source.id) return
    if (loaded.kind !== 'found') { this.update({ missing: loaded.kind === 'missing', saveState: loaded.kind === 'missing' ? 'unavailable' : loaded.kind }); return }
    const pending = [...this.pending]
    const live = this.snapshot.value
    const commands = [...pending.flatMap(entry => entry.batch.kind === 'changes' ? entry.batch.commands : []), ...draft.commands]
    const value = draft.commands.reduce(reduceCase, live)
    const assets = [...new Map([...pending.flatMap(entry => entry.batch.assets), ...draft.assets].map(asset => [asset.id, asset])).values()]
    this.epoch += 1; this.pending = []; this.head = loaded.value; this.conflicted = false; this.change = 0; this.savedChange = 0
    const retained: Recovery = { value, assets, commands, base: pending[0]?.batch.base ?? source, latest: loaded.value }
    this.update({ value: loaded.value, missing: false, saveState: 'saved', reloadVersion: this.snapshot.reloadVersion + 1,
      recoveries: commands.length || assets.length || pending.some(entry => entry.batch.kind === 'copy') ? [...this.snapshot.recoveries, retained] : this.snapshot.recoveries })
    const saved = await Promise.all(pending.map(entry => this.data.markBatch(source.id, entry.batch.mutationId, 'recovery', loaded.value).catch((): DraftDurability => ({ durable: false, reason: 'unavailable' }))))
    if (draft.commands.length) {
      const batch: CaseChangeBatch = { kind: 'changes', mutationId: crypto.randomUUID(), expectedRevision: source.revision, base: source, local: value,
        commands: structuredClone(draft.commands), assets: draft.assets, createdAt: new Date().toISOString() }
      const durable = await this.data.stageBatch(batch).catch((): DraftDurability => ({ durable: false, reason: 'unavailable' }))
      saved.push(durable)
      if (durable.durable || this.data.mode === 'study') saved.push(await this.data.markBatch(source.id, batch.mutationId, 'recovery', loaded.value))
    }
    if (this.epoch === requestedEpoch + 1) this.update({ durable: saved.every(result => result.durable) })
  }

  refresh = async (): Promise<void> => {
    const source = this.head
    if (!source || this.refreshing) return
    const requestedEpoch = this.epoch
    this.refreshing = true
    try {
      const loaded = await this.data.load(source.id)
      if (this.epoch !== requestedEpoch || this.head?.id !== source.id) return
      if (loaded.kind !== 'found') {
        this.update({ missing: loaded.kind === 'missing', saveState: loaded.kind === 'missing' ? 'unavailable' : loaded.kind })
        return
      }
      if (loaded.value.revision <= this.head.revision) {
        if (!this.pending.length && !this.conflicted) this.update({ missing: false, saveState: 'saved' })
        return
      }
      this.head = loaded.value
      if (this.pending.length && !this.inFlight) await this.conflict(loaded.value)
      else this.update({ value: project(loaded.value, this.pending, this.conflicted), missing: false,
        saveState: this.conflicted ? 'conflict' : this.pending.length ? 'saving' : 'saved' })
    } catch { if (this.epoch === requestedEpoch) this.update({ saveState: 'unavailable' }) }
    finally { this.refreshing = false }
  }
}
