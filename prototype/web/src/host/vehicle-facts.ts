import { useEffect, useSyncExternalStore } from 'react'
import type { SdkFact } from '@/product/api-contract'
import type { CaseCommand, Confirmation, JourneyCase, Source } from '@/journey/case'
import { inPleosApp } from './pleos-host'

type AirbagState = 'deployed' | 'not-deployed' | 'unavailable'
type AirbagFact = { state: AirbagState; source: Source; observedAt: string }
type UnavailableCause = Extract<SdkFact, { kind: 'unavailable' }>['cause']

const observationPrefix = 'sdk-airbag:'
const airbagCopy: Record<AirbagState, { value: string; confirmation: Confirmation }> = {
  deployed: { value: '펼쳐짐', confirmation: 'attention' },
  'not-deployed': { value: '펼쳐지지 않음', confirmation: 'confirmed' },
  unavailable: { value: '신호 확인 불가', confirmation: 'unknown' },
}
const causes: readonly UnavailableCause[] = ['permission-denied', 'capability-missing', 'disconnected', 'read-failed']
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const cause = (value: unknown): value is UnavailableCause => causes.some(item => item === value)

function parseFact(value: unknown): SdkFact | null {
  if (!record(value) || value.signal !== 'seat-airbag-deployed' || value.sdkVersion !== '2.3.2' || typeof value.observedAt !== 'string' ||
    typeof value.seatId !== 'string' || !value.seatId || value.seatId.length > 64) return null
  const observedAt = Date.parse(value.observedAt)
  if (!Number.isFinite(observedAt)) return null
  const common = { signal: 'seat-airbag-deployed', seatId: value.seatId, sdkVersion: '2.3.2', observedAt: new Date(observedAt).toISOString() } as const
  if (value.kind === 'reading' && typeof value.value === 'boolean' && (value.source === 'pleos-sdk' || value.source === 'simulation'))
    return { ...common, kind: 'reading', value: value.value, source: value.source }
  if (value.kind === 'unavailable' && cause(value.cause)) return { ...common, kind: 'unavailable', cause: value.cause }
  return null
}

// One airbag state for the car: any deployed seat wins, then any reading; seats without a reading only matter when none can be read.
function summarize(facts: SdkFact[]): AirbagFact | null {
  const readings = facts.flatMap(fact => fact.kind === 'reading' ? [fact] : [])
  const deployed = readings.filter(fact => fact.value)
  const basis: SdkFact[] = deployed.length ? deployed : readings.length ? readings : facts
  const latest = basis.reduce<SdkFact | null>((found, fact) => !found || fact.observedAt > found.observedAt ? fact : found, null)
  if (!latest) return null
  return { state: deployed.length ? 'deployed' : readings.length ? 'not-deployed' : 'unavailable',
    source: latest.kind === 'reading' && latest.source === 'simulation' ? 'fixture' : 'device', observedAt: latest.observedAt }
}

const seats = new Map<string, SdkFact>()
const listeners = new Set<() => void>()
let airbag: AirbagFact | null = null

// Native replays every seat on each journey announcement, so only a change of the car-level state is published.
if (inPleosApp) window.addEventListener('chabun:vehicle-fact', event => {
  const fact = parseFact(event.detail)
  if (!fact) return
  seats.set(fact.seatId, fact)
  const next = summarize([...seats.values()])
  if (next?.state === airbag?.state && next?.source === airbag?.source) return
  airbag = next
  listeners.forEach(listener => listener())
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useVehicleFacts(value: JourneyCase | null, dispatch: (command: CaseCommand) => void) {
  const fact = useSyncExternalStore(subscribe, () => airbag)
  useEffect(() => {
    if (!value || !fact) return
    const { value: text, confirmation } = airbagCopy[fact.state]
    const last = value.observations.filter(item => item.id.startsWith(observationPrefix)).at(-1)
    if (last?.value === text && last.source === fact.source) return
    dispatch({ type: 'observation', observation: { id: observationPrefix + crypto.randomUUID(), kind: 'seat-airbag-deployed', label: '에어백', value: text,
      source: fact.source, observedAt: fact.observedAt, confirmation, legacyFactId: null, supersedes: null } })
  }, [value, fact, dispatch])
}
