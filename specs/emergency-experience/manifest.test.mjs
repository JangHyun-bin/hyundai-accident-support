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
  const review = JSON.parse(readFileSync(new URL('../../assets/flow-review-v1.2.json', import.meta.url)))
  const decisions = new Set(review.decisions.map(decision => decision.id))
  assert.equal(manifest.simulation_only, true)
  assert.equal(new Set(manifest.scenarios.map(s => s.id)).size, manifest.scenarios.length)
  for (const scenario of manifest.scenarios) {
    for (const node of scenario.source_nodes) assert.ok(graph.nodes[node], `Unknown source node ${node}`)
    for (const decision of scenario.open_decisions) assert.ok(decisions.has(decision), `Unknown decision ${decision}`)
    const factIds = new Set(scenario.facts.map(fact => fact.id))
    const requestIds = new Set(scenario.requests.map(request => request.id))
    for (const id of scenario.presentation.visible_facts) assert.ok(factIds.has(id), `Unknown visible fact ${id}`)
    for (const id of scenario.presentation.visible_requests) assert.ok(requestIds.has(id), `Unknown visible request ${id}`)
    for (const request of scenario.requests) assert.ok(manifest.request_statuses[request.status])
    const states = new Set(scenario.states.map(s => s.id))
    assert.equal(states.size, scenario.states.length)
    assert.ok(states.has(scenario.initial))
    for (const state of scenario.states) {
      assert.ok(state.voice && state.title && state.cue.label)
      assert.ok(['person', 'phone', 'vehicle'].includes(state.cue.symbol))
      assert.ok(['attention', 'unknown', 'confirmed'].includes(state.cue.status))
      assert.ok(state.actions.length <= 1)
      for (const edge of [...state.actions, ...state.events]) assert.ok(states.has(edge.to), `${scenario.id}.${state.id} -> ${edge.to}`)
      if (state.auto_contact) for (const to of [state.auto_contact.cancel, state.auto_contact.expire]) assert.ok(states.has(to), `${scenario.id}.${state.id} auto -> ${to}`)
      for (const id of Object.keys(state.request_overrides)) assert.ok(requestIds.has(id))
      for (const id of Object.keys(state.fact_overrides)) assert.ok(factIds.has(id))
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
  assert.ok(unanswered.actions.some(a => a.slot === 'self' && a.to === 'contact_unknown'))
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

const rescueOf = (scenario, state) => state.request_overrides.rescue ?? scenario.requests.find(r => r.id === 'rescue').status
const statusOf = (scenario, state, id) => state.request_overrides[id] ?? scenario.requests.find(r => r.id === id).status
const allStates = () => readManifest().scenarios.flatMap(scenario => scenario.states.map(state => ({ scenario, state })))

test('auto_contact_only_where_rescue_is_not_sent_and_only_rescue_changes', () => {
  let countdowns = 0
  for (const { scenario, state } of allStates()) {
    if (!state.auto_contact) continue
    countdowns++
    const where = `${scenario.id}.${state.id}`
    const find = id => scenario.states.find(s => s.id === id)
    assert.equal(rescueOf(scenario, state), 'not_sent', where)
    assert.ok(state.auto_contact.seconds > 0, where)
    assert.ok(state.actions[0], `${where} needs a connect action`)
    assert.equal(rescueOf(scenario, find(state.auto_contact.expire)), 'connection_unknown', `${where} expire`)
    assert.equal(rescueOf(scenario, find(state.auto_contact.cancel)), 'not_sent', `${where} cancel`)
    for (const id of ['vehicle', 'insurance']) for (const to of [state.auto_contact.expire, state.auto_contact.cancel]) {
      assert.equal(statusOf(scenario, find(to), id), statusOf(scenario, state, id), `${where} -> ${to} changed ${id}`)
    }
  }
  assert.ok(countdowns >= 2)
})

test('decide_phase_means_countdown', () => {
  for (const { scenario, state } of allStates()) {
    assert.ok(['decide', 'progress', 'settled'].includes(state.phase), `${scenario.id}.${state.id} phase`)
    assert.equal(state.phase === 'decide', Boolean(state.auto_contact), `${scenario.id}.${state.id}`)
  }
})

test('connecting_rescue_never_returns_to_not_sent', () => {
  for (const { scenario, state } of allStates()) {
    if (rescueOf(scenario, state) === 'not_sent') continue
    const targets = [...state.actions, ...state.events].map(edge => edge.to)
    if (state.auto_contact) targets.push(state.auto_contact.cancel, state.auto_contact.expire)
    for (const to of targets) assert.notEqual(rescueOf(scenario, scenario.states.find(s => s.id === to)), 'not_sent', `${scenario.id}.${state.id} -> ${to}`)
  }
})

test('self_action_now_is_three_words_or_fewer', () => {
  for (const { scenario, state } of allStates()) {
    if (!state.self_action) continue
    assert.ok(state.self_action.now.trim().split(/\s+/).length <= 3, `${scenario.id}.${state.id}: ${state.self_action.now}`)
  }
})

test('scene_copy_never_says_unconscious', () => {
  for (const { scenario, state } of allStates()) {
    const copy = [state.title, state.instruction, state.cue.label, ...Object.values(state.self_action ?? {}), ...state.actions.map(a => a.label)]
    for (const text of copy) assert.ok(!String(text ?? '').includes('의식 없음'), `${scenario.id}.${state.id}: ${text}`)
  }
})

test('every_scenario_shows_three_agencies_and_detected_label', () => {
  const manifest = readManifest()
  assert.ok(manifest.safety_guidance?.source && manifest.safety_guidance.urls.length > 0)
  for (const scenario of manifest.scenarios) {
    assert.deepEqual(scenario.presentation.visible_requests, ['rescue', 'vehicle', 'insurance'], scenario.id)
    assert.ok(scenario.presentation.detected, scenario.id)
  }
})

// 자동 연결 뒤에는 운전자가 실제로 응답할 때까지 `응답할 수 있어요`가 ③에 남아야 한다.
// 외부 event 로 응답 없이 다른 장면에 가면 응답한 것처럼 보인다.
test('auto_connected_scene_keeps_respond_button_until_driver_responds', () => {
  for (const { scenario, state } of allStates()) {
    if (!state.auto_contact) continue
    const expired = scenario.states.find(s => s.id === state.auto_contact.expire)
    const where = `${scenario.id}.${expired.id}`
    assert.ok(expired.actions.some(action => action.slot === 'self'), `${where} needs a respond button`)
    for (const event of expired.events) {
      const next = scenario.states.find(s => s.id === event.to)
      assert.ok(next.id === state.id || next.actions.some(action => action.slot === 'self'), `${where} --${event.id}--> ${next.id} drops the respond button`)
    }
  }
})
