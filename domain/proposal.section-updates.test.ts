import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { comboSectionUpdateKey } from './proposal.ts'

describe('comboSectionUpdateKey', () => {
  it('scopes combo updates by kind and mode', () => {
    assert.equal(comboSectionUpdateKey('pvp', 'awakening'), 'combo_pvp_awakening')
    assert.equal(comboSectionUpdateKey('pve', 'succession'), 'combo_pve_succession')
  })
})
