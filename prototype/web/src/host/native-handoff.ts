import { useEffect, useMemo, useState } from 'react'
import { parseClaim, parsePair, parseProgress, useVehicleHandoff, VehicleHandoffError, type VehicleHandoff, type VehicleHandoffState } from '@/product/vehicle-handoff'
import { hasNativeBridge, sendHandoff } from './pleos-host'

type FailureReason = Extract<VehicleHandoffState, { kind: 'failed' }>['reason']

const idle: VehicleHandoffState = { kind: 'idle' }
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const failureReason = (value: unknown): value is FailureReason => value === 'unavailable' || value === 'expired' || value === 'access'

// A state the web cannot read is shown as a server failure so the panel offers 다시 시도 instead of freezing.
export function parseNativeHandoff(value: unknown): VehicleHandoffState {
  try {
    if (record(value)) switch (value.kind) {
      case 'idle': return idle
      case 'starting': return { kind: 'starting' }
      case 'pairing':
        if (Array.isArray(value.claims)) return { kind: 'pairing', pair: parsePair(value.pair), claims: value.claims.map(parseClaim), progress: parseProgress(value.progress) }
        break
      case 'connected': return { kind: 'connected', progress: parseProgress(value.progress) }
      case 'failed':
        if (failureReason(value.reason)) return { kind: 'failed', reason: value.reason, progress: value.progress === null ? null : parseProgress(value.progress) }
    }
  } catch (error) {
    if (!(error instanceof VehicleHandoffError)) throw error
  }
  return { kind: 'failed', reason: 'unavailable', progress: null }
}

function useNativeVehicleHandoff(journeyId: string): VehicleHandoff {
  const [received, setReceived] = useState<{ journeyId: string; state: VehicleHandoffState } | null>(null)
  useEffect(() => {
    if (!journeyId) return
    const receive = (event: CustomEvent<unknown>) => setReceived({ journeyId, state: parseNativeHandoff(event.detail) })
    const announce = () => sendHandoff('journey', { journeyId })
    window.addEventListener('chabun:handoff', receive)
    window.addEventListener('chabun:host-ready', announce)
    announce()
    return () => {
      window.removeEventListener('chabun:handoff', receive)
      window.removeEventListener('chabun:host-ready', announce)
    }
  }, [journeyId])
  const state = received?.journeyId === journeyId ? received.state : idle
  return useMemo(() => ({
    state,
    start: () => sendHandoff('start'),
    approve: (claimId: string) => sendHandoff('approve', { claimId }),
    renew: () => sendHandoff('renew'),
    retry: () => sendHandoff('retry'),
  }), [state])
}

export const useJourneyHandoff = hasNativeBridge ? useNativeVehicleHandoff : useVehicleHandoff
