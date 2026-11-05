import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const file = new URL('./scenarios.json', import.meta.url)
const readManifest = () => {
  assert.ok(existsSync(file), 'Executable scenario manifest must exist')
  return JSON.parse(readFileSync(file, 'utf8'))
}

test('all storyboard transitions and source references resolve', () => {
  const manifest = readManifest()
  const graph = JSON.parse(readFileSync(new URL('../../e2e/integrated-graph.json', import.meta.url)))
  assert.equal(manifest.simulation_only, true)
  assert.equal(new Set(manifest.scenarios.map(s => s.id)).size, manifest.scenarios.length)
  for (const scenario of manifest.scenarios) {
    for (const node of scenario.source_nodes) assert.ok(graph.nodes[node], `Unknown source node ${node}`)
    for (const decision of scenario.open_decisions) assert.match(decision, /^D0[1-5]$/)
    const states = new Set(scenario.states.map(s => s.id))
    assert.equal(states.size, scenario.states.length)
    assert.ok(states.has(scenario.initial))
    for (const state of scenario.states) {
      assert.ok(state.voice && state.title && state.cue.label)
      assert.ok(['person', 'phone', 'vehicle'].includes(state.cue.symbol))
      assert.ok(['attention', 'unknown', 'confirmed'].includes(state.cue.status))
      assert.ok(state.actions.length <= 1)
      for (const edge of [...state.actions, ...state.events]) assert.ok(states.has(edge.to), `${scenario.id}.${state.id} -> ${edge.to}`)
      for (const status of Object.values(state.request_overrides)) assert.ok(['not_sent', 'connection_unknown', 'connected', 'checking', 'unknown', 'received'].includes(status))
    }
  }
})

test('response and connection cannot imply unobserved outcomes', () => {
  const scenarios = readManifest().scenarios
  const injury = scenarios.find(s => s.id === 'SC01')
  assert.ok(injury.facts.some(f => f.id === 'mobility' && f.status === 'confirmed'))
  assert.ok(injury.facts.some(f => f.id === 'driver' && f.status === 'unknown'))
  assert.ok(injury.facts.some(f => f.id === 'route' && f.status === 'unknown'))
  const connected = injury.states.find(s => s.id === 'connected')
  assert.equal(connected.request_overrides.rescue, 'connected')
  assert.notEqual(connected.request_overrides.rescue, 'received')
  const response = scenarios.find(s => s.id === 'SC03')
  const unanswered = response.states.find(s => s.id === 'unanswered')
  assert.ok(unanswered.actions.some(a => a.to === 'responded'))
  assert.equal(unanswered.fact_overrides.injury, undefined)
  assert.equal(unanswered.fact_overrides.consciousness, undefined)
  assert.ok(response.facts.filter(f => ['injury', 'consciousness'].includes(f.id)).every(f => f.status === 'unknown'))
})

test('receipt applies only to the named agency', () => {
  const scenario = readManifest().scenarios.find(s => s.id === 'SC05')
  assert.equal(scenario.requests.find(r => r.id === 'rescue').status, 'received')
  assert.equal(scenario.requests.find(r => r.id === 'insurance').status, 'not_sent')
  for (const state of scenario.states) {
    assert.equal(state.request_overrides.rescue, undefined)
    assert.equal(state.request_overrides.insurance, undefined)
  }
  assert.equal(scenario.states.find(s => s.id === 'received').request_overrides.vehicle, 'received')
})
