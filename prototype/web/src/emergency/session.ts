import source from '../../../../specs/emergency-experience/scenarios.json'

export type Fact = { id: string; label: string; value: string; status: string }
export type Edge = { id: string; label: string; to: string; slot?: string; secondary?: boolean; effect?: string; agency?: string }
export type Scene = {
  id: string; label: string; phase: 'decide' | 'progress' | 'settled'; title: string; voice: string
  instruction?: string; step?: string; panel?: 'scope' | 'record' | 'record_summary' | 'receipt' | 'resume' | 'support'
  cue: { symbol: string; status: string; label: string; detail: string }
  request_overrides: Record<string, string>; fact_overrides: Record<string, Partial<Fact>>
  auto_contact?: { seconds: number; cancel: string; expire: string }
  self_action?: { id: string; condition?: string; now: string; next?: string }
  actions: Edge[]; events: Edge[]; deferred: string[]
}
export type Scenario = {
  id: string; title: string; summary: string; source_nodes: string[]; open_decisions: string[]; initial: string
  facts: Fact[]; requests: { id: string; label: string; status: string }[]
  presentation: { detected: string; visible_facts: string[]; visible_requests: string[] }; states: Scene[]
}
export const manifest = source as { version: string; data_source: string; request_statuses: Record<string, { label: string; tone: string }>; safety_guidance: typeof source.safety_guidance; scenarios: Scenario[] }
export const scopeItems = ['사고 위치', '차량 상태', '사고 기록']
export type Session = {
  version: 1; scenarioId: string; sceneId: string; requests: Record<string, string>; facts: Record<string, Partial<Fact>>
  record: string; savedRecord: string; scope: string[]; approvedScope: string[]; approvedRecord: string; draftApproved: boolean
  requestId: string | null; submissions: number; returnTo: string; suspendedFrom: string | null
}
export const storageKey = (id: string) => `after-care-session-v1-${id}`
export const scenarioFor = (id: string) => manifest.scenarios.find(s => s.id === id)!
export const sceneFor = (session: Session) => scenarioFor(session.scenarioId).states.find(s => s.id === session.sceneId)!
export function createSession(scenarioId: string, sceneId?: string): Session {
  const scenario = scenarioFor(scenarioId)
  const scene = scenario.states.find(s => s.id === sceneId) ?? scenario.states[0]
  const record = scenarioId === 'SC04' || scene.id === 'record_saved' ? '정차 중 충격을 느꼈어요. 정확한 사고 경위는 확인 중이에요.' : ''
  const scope = scenarioId === 'SC04' ? [...scopeItems] : scopeItems.slice(0, 2)
  const seeded = scenarioId === 'SC05'
  return { version: 1, scenarioId, sceneId: scene.id, requests: { ...Object.fromEntries(scenario.requests.map(r => [r.id, r.status])), ...scene.request_overrides }, facts: scene.fact_overrides,
    record, savedRecord: record, scope, approvedScope: seeded ? [...scope] : [], approvedRecord: '', draftApproved: seeded, requestId: seeded ? 'SC05-1' : null, submissions: seeded ? 1 : 0,
    returnTo: scenarioId === 'SC01' ? 'connected' : scenarioId === 'SC02' ? 'waiting' : scenario.initial, suspendedFrom: scene.id === 'suspended' ? 'initial' : null }
}

// Storage is untrusted and versioned. A partial or stale snapshot never supplies a state.
export function restoreSession(scenarioId: string, sceneId?: string): Session {
  const fallback = createSession(scenarioId, sceneId)
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(scenarioId)) ?? 'null')
    if (!value || typeof value !== 'object') return fallback
    const s = value as Session
    const scenario = scenarioFor(scenarioId)
    const validScene = (id: unknown) => typeof id === 'string' && scenario.states.some(scene => scene.id === id)
    const validScope = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 3 && v.every(x => scopeItems.includes(x)) && new Set(v).size === v.length
    if (typeof s.draftApproved !== 'boolean' || s.version !== 1 || s.scenarioId !== scenarioId || !validScene(s.sceneId) || (sceneId && sceneId !== s.sceneId) || !validScene(s.returnTo) || (s.suspendedFrom !== null && !validScene(s.suspendedFrom))) return fallback
    if (![s.record, s.savedRecord, s.approvedRecord].every(v => typeof v === 'string' && v.length <= 500) || !validScope(s.scope) || !validScope(s.approvedScope)) return fallback
    if (!Number.isSafeInteger(s.submissions) || s.submissions < 0 || s.submissions > 10000 || !(s.requestId === null || (typeof s.requestId === 'string' && /^SC0[1-5]-\d+$/.test(s.requestId)))) return fallback
    if (!s.requests || Object.keys(s.requests).length !== 3 || !scenario.requests.every(r => Object.hasOwn(manifest.request_statuses, s.requests[r.id]))) return fallback
    if (!s.facts || typeof s.facts !== 'object' || Array.isArray(s.facts) || !Object.entries(s.facts).every(([id, f]) => scenario.facts.some(x => x.id === id) && f && typeof f.value === 'string' && f.value.length < 80 && ['neutral', 'confirmed', 'unknown', 'attention'].includes(f.status ?? ''))) return fallback
    return s
  } catch { return fallback }
}
export function saveSession(session: Session) {
  try { localStorage.setItem(storageKey(session.scenarioId), JSON.stringify(session)); return true } catch { return false }
}
export function updateDraft(session: Session, change: { record?: string; scope?: string[] }): Session {
  return { ...session, ...change, draftApproved: false }
}
export function transition(session: Session, edge: Edge): Session {
  const scene = sceneFor(session)
  // Only current scene edges are executable. A queued second click cannot resubmit.
  if (![...scene.actions, ...scene.events].some(e => e.id === edge.id && e.to === edge.to)) return session
  let target = edge.to
  let next = { ...session, requests: { ...session.requests }, facts: { ...session.facts } }
  const agency = edge.agency ?? (session.scenarioId === 'SC04' ? 'insurance' : 'vehicle')
  if (edge.effect === 'submit') {
    if (!session.scope.length || (session.scope.includes('사고 기록') && !session.savedRecord) || !['not_sent', 'deferred', 'declined', 'failed', 'not_received'].includes(session.requests[agency])) return session
    next = { ...next, submissions: session.submissions + 1, requestId: `${session.scenarioId}-${session.submissions + 1}`, approvedScope: [...session.scope], approvedRecord: session.savedRecord, draftApproved: true }
  }
  if (edge.effect === 'save_record') {
    if (!session.record.trim()) return session
    next.savedRecord = session.record.trim()
  }
  if (edge.effect === 'handoff') next.facts.handoff = { value: '인계 확인', status: 'confirmed' }
  if (edge.effect === 'risk') next.facts.risk = { value: '위험 감지', status: 'attention' }
  if (edge.effect === 'suspend') next.suspendedFrom = scene.id
  if (edge.effect === 'resume') {
    target = session.requests.vehicle === 'received' ? (['arrived', 'handoff'].includes(session.suspendedFrom ?? '') ? session.suspendedFrom! : 'received') : 'checking'
    next.suspendedFrom = null
  }
  if (edge.effect === 'return') target = session.returnTo
  if (edge.effect === 'receive') next.requests[agency] = 'received'
  if (edge.effect === 'not_received') next.requests[agency] = 'not_received'
  if (edge.to === 'record' && !['record', 'record_saved'].includes(scene.id)) next.returnTo = scene.id
  const dest = scenarioFor(session.scenarioId).states.find(s => s.id === target)
  if (!dest) return session
  if (target === 'review') next.draftApproved = false
  next.sceneId = target
  // A known receipt survives record navigation and delayed unknown/lookup events.
  for (const [id, status] of Object.entries(dest.request_overrides)) {
    if (next.requests[id] !== 'received' || status === 'received') next.requests[id] = status
  }
  next.facts = { ...next.facts, ...dest.fact_overrides }
  if (session.scenarioId === 'SC04') next.facts.consent = { value: next.requests.insurance === 'declined' ? '전송 거절' : next.requests.insurance === 'deferred' ? '전송 보류' : next.draftApproved ? '승인 확인' : '승인 전', status: next.draftApproved ? 'confirmed' : 'unknown' }
  return next
}
