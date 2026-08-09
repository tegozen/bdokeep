import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CRYSTAL_PRESET_IDS,
  finalizeReplacedPresets,
  isCrystalPresetId,
  resolveReplacedPresets,
  rowsWithinReplaced,
} from './proposal.ts'

describe('resolveReplacedPresets', () => {
  it('prefers explicit valid client ids', () => {
    const out = resolveReplacedPresets(
      ['t1', 't2', 'nope'],
      ['besp'],
      isCrystalPresetId,
    )
    assert.deepEqual(out, ['t1', 't2'])
  })

  it('falls back to row presets when raw empty or invalid', () => {
    assert.deepEqual(
      resolveReplacedPresets([], ['t1', 'besp'], isCrystalPresetId),
      ['t1', 'besp'],
    )
    assert.deepEqual(
      resolveReplacedPresets(undefined, ['sub'], isCrystalPresetId),
      ['sub'],
    )
  })
})

describe('rowsWithinReplaced', () => {
  it('requires every row preset in replaced', () => {
    assert.equal(rowsWithinReplaced(['t1', 't2'], ['t1']), true)
    assert.equal(rowsWithinReplaced(['t1'], ['t1', 't2']), false)
  })
})

describe('finalizeReplacedPresets', () => {
  it('allows replaced ⊃ rows (intentional clears)', () => {
    const result = finalizeReplacedPresets(
      [...CRYSTAL_PRESET_IDS],
      ['t1'],
      ['t1'],
      isCrystalPresetId,
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.deepEqual(result.replaced, [...CRYSTAL_PRESET_IDS])
    }
  })

  it('rejects rows outside replaced', () => {
    const result = finalizeReplacedPresets(
      ['t1'],
      ['t1', 't2'],
      ['t1', 't2'],
      isCrystalPresetId,
    )
    assert.deepEqual(result, { ok: false, reason: 'rows_outside_replaced' })
  })

  it('after catalog drops, keeps intentional empties but drops wiped structural presets', () => {
    // Client replaced all; structural had t1+t2; catalog drop left only t1.
    const result = finalizeReplacedPresets(
      [...CRYSTAL_PRESET_IDS],
      ['t1', 't2'],
      ['t1'],
      isCrystalPresetId,
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.deepEqual(result.replaced, ['t1', 'besp', 'sub', 'pve'])
      assert.ok(!result.replaced.includes('t2'))
    }
  })

  it('legacy: derives replaced from kept rows when raw missing', () => {
    const result = finalizeReplacedPresets(
      undefined,
      ['t1', 'besp'],
      ['t1', 'besp'],
      isCrystalPresetId,
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.deepEqual(result.replaced, ['t1', 'besp'])
    }
  })
})
