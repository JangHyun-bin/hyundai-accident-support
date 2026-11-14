import { useCallback, useEffect, useRef, useState } from 'react'
import { useCaseData } from '@/journey/case-data'
import type { EditorDraft } from '@/journey/editor-drafts'

type DraftFor<K extends EditorDraft['kind']> = Extract<EditorDraft, { kind: K }>
export function useEditorDraft<K extends EditorDraft['kind']>({ caseId, kind, restore }: { caseId: string; kind: K; restore: (draft: DraftFor<K>) => void }) {
  const data = useCaseData()
  const [ready, setReady] = useState(data.mode === 'study')
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const restored = useRef(restore)
  restored.current = restore
  const version = useRef<string | undefined>(undefined)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  useEffect(() => {
    if (data.mode === 'study') return
    let cancelled = false
    setReady(false)
    void data.readEditorDraft(caseId, kind).then(draft => {
      if (cancelled) return
      if (draft) { version.current = draft.version; restored.current(draft) }
      setFailed(false); setReady(true)
    }).catch(() => { if (!cancelled) { setFailed(true); setReady(false) } })
    return () => { cancelled = true }
  }, [data, caseId, kind, attempt])
  const preserve = useCallback((draft: DraftFor<K> | null): Promise<boolean> => {
    if (data.mode === 'study') return Promise.resolve(true)
    const work = queue.current.then(async () => {
      try {
        if (draft) {
          const result = await data.writeEditorDraft(caseId, draft)
          if (!result.durable) { setFailed(true); return false }
          version.current = result.version
        } else {
          const result = await data.clearEditorDraft(caseId, kind, version.current)
          if (!result.durable) { setFailed(true); return false }
          version.current = undefined
        }
        setFailed(false)
        return true
      } catch { setFailed(true); return false }
    })
    queue.current = work
    return work
  }, [data, caseId, kind])
  return { ready, failed, preserve, retry: () => setAttempt(previous => previous + 1) }
}
