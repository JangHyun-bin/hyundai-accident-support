import { useCallback, useEffect, useRef, useState } from 'react'
import { commitCase, loadCase } from './case-store'
import { reduceCase, type AssetWrite, type CaseCommand, type CommitResult, type JourneyCase } from './case'

type SaveState = 'saved' | 'saving' | 'conflict' | 'unavailable' | 'quota' | 'invalid'

export function useJourneyCase(initialId: string | null) {
  const [value, setValue] = useState<JourneyCase | null>(null)
  const [loading, setLoading] = useState(!!initialId)
  const [missing, setMissing] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [recovery, setRecovery] = useState<{ value: JourneyCase; assets: AssetWrite[] } | null>(null)
  const current = useRef<JourneyCase | null>(null)
  const persistedRevision = useRef<number | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const pendingAssets = useRef(new Map<string, AssetWrite>())
  const change = useRef(0)
  const savedChange = useRef(0)
  const conflicted = useRef(false)

  const adopt = useCallback((record: JourneyCase) => {
    current.current = record
    persistedRevision.current = record.revision || null
    change.current = 0
    savedChange.current = record.revision ? 0 : -1
    conflicted.current = false
    pendingAssets.current.clear()
    setValue(record); setMissing(false); setSaveState('saved')
  }, [])

  useEffect(() => {
    if (!initialId) return
    let cancelled = false
    void loadCase(initialId).then(record => {
      if (cancelled) return
      if (record) adopt(record)
      else setMissing(true)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [initialId, adopt])

  const flush = useCallback((): Promise<CommitResult> => {
    const job = queue.current.then(async (): Promise<CommitResult> => {
      const snapshot = current.current
      if (!snapshot) throw new Error('No incident is open')
      if (conflicted.current) return { ok: false, reason: 'conflict', draft: snapshot }
      if (change.current === savedChange.current && snapshot.revision > 0) return { ok: true, value: snapshot }
      const generation = change.current
      const writes = [...pendingAssets.current.values()]
      setSaveState('saving')
      const result = await commitCase(snapshot, persistedRevision.current, writes)
      if (current.current?.id !== snapshot.id) return result
      if (result.ok) {
        persistedRevision.current = result.value.revision
        savedChange.current = generation
        for (const write of writes) pendingAssets.current.delete(write.id)
        // 저장 중 들어온 위험 event나 새 입력은 과거 snapshot으로 되돌리지 않음.
        const latest = current.current === snapshot ? result.value
          : { ...current.current, revision: result.value.revision, updatedAt: result.value.updatedAt }
        current.current = latest
        setValue(latest)
        setSaveState(change.current === generation ? 'saved' : 'saving')
      } else {
        conflicted.current = result.reason === 'conflict'
        setSaveState(result.reason)
      }
      return result
    })
    queue.current = job.then(() => {}, () => {})
    return job
  }, [])

  const save = useCallback((command: CaseCommand, assets: AssetWrite[] = []): Promise<CommitResult> => {
    const previous = current.current
    if (!previous) return Promise.reject(new Error('No incident is open'))
    const next = reduceCase(previous, command)
    if (next === previous && assets.length) return Promise.resolve({ ok: false, reason: 'invalid', draft: previous })
    if (next !== previous) {
      for (const asset of assets) pendingAssets.current.set(asset.id, asset)
      current.current = next
      change.current += 1
      setValue(next); setSaveState('saving')
    }
    return flush()
  }, [flush])

  const dispatch = useCallback((command: CaseCommand) => { void save(command) }, [save])

  const start = useCallback(async (record: JourneyCase) => {
    if (current.current) {
      const saved = await flush()
      if (!saved.ok) return saved
    }
    adopt(record)
    return flush()
  }, [adopt, flush])

  const reload = useCallback(async () => {
    if (!current.current) return
    setRecovery({ value: structuredClone(current.current), assets: [...pendingAssets.current.values()] })
    const latest = await loadCase(current.current.id)
    if (latest) adopt(latest)
    else setMissing(true)
  }, [adopt])

  return { value, loading, missing, saveState, recovery, dispatch, save, flush, start, reload }
}
