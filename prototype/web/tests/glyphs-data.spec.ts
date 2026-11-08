import { expect, test } from '@playwright/test'
import manifest from '../../../specs/emergency-experience/scenarios.json' with { type: 'json' }
import book from '../../../specs/emergency-experience/glyphs.json' with { type: 'json' }

type Part = { d: string; op?: string; paint?: string; width?: number; rule?: string }
const glyphs = book.glyphs as Record<string, Part[]>
const marks = book.marks as Record<string, { shape: string; symbol: string }>

test('every_visible_fact_cue_action_and_tone_has_a_glyph', () => {
  const used = new Set<string>()
  for (const scenario of manifest.scenarios) {
    for (const id of scenario.presentation.visible_facts) {
      expect(book.facts, `fact ${id}`).toHaveProperty(id)
      used.add(book.facts[id as keyof typeof book.facts])
    }
    for (const state of scenario.states) {
      expect(book.cue, `cue ${state.cue.symbol}`).toHaveProperty(state.cue.symbol)
      used.add(book.cue[state.cue.symbol as keyof typeof book.cue])
      expect(marks, `cue tone ${state.cue.status}`).toHaveProperty(state.cue.status)
      for (const action of state.actions) used.add((book.actions as Record<string, string>)[action.id] ?? book.actions.default)
    }
  }
  for (const status of Object.values(manifest.request_statuses)) expect(marks, `tone ${status.tone}`).toHaveProperty(status.tone)
  for (const mark of Object.values(marks)) {
    used.add(mark.symbol)
    if (mark.shape !== 'disc') used.add(mark.shape)
  }
  used.add('arrow-right')
  for (const name of used) expect(glyphs, `glyph ${name}`).toHaveProperty(name)
})

test('no_glyph_for_hidden_facts', () => {
  for (const id of ['road', 'mobility', 'response']) expect(book.facts).not.toHaveProperty(id)
})

test('tone_marks_differ_without_color', () => {
  const symbols = Object.values(marks).map(mark => mark.symbol)
  expect(new Set(symbols).size).toBe(4)
  expect(Object.entries(marks).filter(([, mark]) => mark.shape !== 'disc').map(([tone]) => tone)).toEqual(['attention'])
})

// Arc 의 rotation · flag 를 뺀 모든 좌표가 48 grid 안에 있는지 본다.
function coordinates(d: string) {
  const values: number[] = []
  let command = ''
  let index = 0
  for (const token of d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? []) {
    if (/[A-Za-z]/.test(token)) { command = token; index = 0; continue }
    if (command.toUpperCase() !== 'A' || ![2, 3, 4].includes(index % 7)) values.push(Number(token))
    index++
  }
  return values
}

test('parts_are_well_formed', () => {
  for (const [name, parts] of Object.entries(glyphs)) {
    expect(parts.length, name).toBeGreaterThan(0)
    expect(parts[0].op ?? 'add', `${name} first part`).not.toBe('cut')
    for (const part of parts) {
      expect([undefined, 'add', 'cut'], name).toContain(part.op)
      expect([undefined, 'fill', 'stroke', 'fill+stroke'], name).toContain(part.paint)
      if (part.paint?.includes('stroke')) expect(part.width, `${name} width`).toBeGreaterThan(0)
      for (const d of part.d.match(/[a-z]/g) ?? []) expect(d, `${name} uses relative command`).toBe('')
      for (const value of coordinates(part.d)) {
        expect(value, `${name} coordinate`).toBeGreaterThanOrEqual(0)
        expect(value, `${name} coordinate`).toBeLessThanOrEqual(48)
      }
    }
  }
})
