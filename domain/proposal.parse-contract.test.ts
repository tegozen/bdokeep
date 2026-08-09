/**
 * Contract tests mirroring parseAndValidatePayload + applyProposal
 * replaced_presets handling (without Nitro createError / DB).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CRYSTAL_PRESET_IDS,
  finalizeReplacedPresets,
  isCrystalPresetId,
  isMorphPresetId,
  MORPH_PRESET_IDS,
} from './proposal.ts'

type ParseOutcome =
  | { ok: true; replaced: string[] }
  | { ok: false; reason: 'empty' | 'rows_outside_replaced' }

/** After structural validate (+ optional catalog filter) in parse. */
function parseReplaced(
  bodyReplaced: unknown,
  structuralPresets: readonly string[],
  keptPresets: readonly string[],
  isValid: (id: string) => boolean = isCrystalPresetId,
): ParseOutcome {
  return finalizeReplacedPresets(bodyReplaced, structuralPresets, keptPresets, isValid)
}

/** applyProposal: rows already filtered; structural === kept. */
function applyReplaced(
  payloadReplaced: unknown,
  rowPresets: readonly string[],
  isValid: (id: string) => boolean = isCrystalPresetId,
): ParseOutcome {
  return finalizeReplacedPresets(payloadReplaced, rowPresets, rowPresets, isValid)
}

describe('parseAndValidatePayload replaced contract', () => {
  it('submit: UI full-replace with only t1 filled keeps intentional clears', () => {
    const out = parseReplaced([...CRYSTAL_PRESET_IDS], ['t1'], ['t1'])
    assert.equal(out.ok, true)
    if (out.ok) assert.deepEqual(out.replaced, [...CRYSTAL_PRESET_IDS])
  })

  it('submit: rows outside replaced → 400 rows_outside_replaced', () => {
    const out = parseReplaced(['t1'], ['t1', 't2'], ['t1', 't2'])
    assert.deepEqual(out, { ok: false, reason: 'rows_outside_replaced' })
  })

  it('approve skipUnknown: catalog drop removes wiped structural preset from replaced', () => {
    const structural = ['t1', 't2']
    const keptAfterCatalog = ['t1']
    const out = parseReplaced([...CRYSTAL_PRESET_IDS], structural, keptAfterCatalog)
    assert.equal(out.ok, true)
    if (out.ok) {
      assert.deepEqual(out.replaced, ['t1', 'besp', 'sub', 'pve'])
      assert.ok(!out.replaced.includes('t2'))
    }
  })

  it('approve skipUnknown: kept empty but intentional empties remain in replaced', () => {
    const out = parseReplaced([...CRYSTAL_PRESET_IDS], ['t1', 't2'], [])
    assert.equal(out.ok, true)
    if (out.ok) {
      assert.deepEqual(out.replaced, ['besp', 'sub', 'pve'])
    }
  })

  it('approve skipUnknown: all rows stale and no intentional clears → empty replaced (apply no-op)', () => {
    const out = parseReplaced(['t1', 't2'], ['t1', 't2'], [])
    assert.deepEqual(out, { ok: false, reason: 'empty' })
  })

  it('morphs: full MORPH_PRESET_IDS with partial kept narrows other-mode wipe after catalog drop', () => {
    const structural = ['aw_t1', 'succ_t1']
    const kept = ['aw_t1']
    const out = parseReplaced([...MORPH_PRESET_IDS], structural, kept, isMorphPresetId)
    assert.equal(out.ok, true)
    if (out.ok) {
      assert.ok(out.replaced.includes('aw_t1'))
      assert.ok(!out.replaced.includes('succ_t1'))
      assert.ok(out.replaced.includes('aw_t2'))
      assert.ok(out.replaced.includes('succ_t2'))
    }
  })
})

describe('applyProposal replaced contract', () => {
  it('accepts narrowed payload from parse and rejects smuggled extra-row presets', () => {
    const parsed = parseReplaced([...CRYSTAL_PRESET_IDS], ['t1', 't2'], ['t1'])
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return

    const applyOk = applyReplaced(parsed.replaced, ['t1'])
    assert.equal(applyOk.ok, true)

    const smuggled = applyReplaced(parsed.replaced, ['t1', 't2'])
    assert.deepEqual(smuggled, { ok: false, reason: 'rows_outside_replaced' })
  })

  it('empty replaced + no row presets → apply no-op (catalog wipe, no intentional clears)', () => {
    // After parse skipUnknown emptied replaced_presets, apply sees [] rows + [] replaced.
    const out = applyReplaced([], [])
    assert.deepEqual(out, { ok: false, reason: 'empty' })
    // applyProposal.replacedForApply maps this to [] (no delete), not 400
  })
})
