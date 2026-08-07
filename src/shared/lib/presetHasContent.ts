import type { ClassGuideBundle } from '@/entities/class'
import { CRYSTAL_PRESET_IDS, type CrystalPresetId } from './crystalPresets'
import { isMorphPresetId, morphGuidePreset } from './morphPresets'

export type PresetFillMap = Record<CrystalPresetId, boolean>

export function emptyPresetFill(): PresetFillMap {
  const out = {} as PresetFillMap
  for (const id of CRYSTAL_PRESET_IDS) out[id] = false
  return out
}

/** Whether a guide preset has any filled crystals / relics / lightstones / hardening / buffs / morphs.
 * Combos: only the ПВЕ tab lights from `kind=pve` chains (PvP combos are shared across gear presets). */
export function computePresetFill(bundle: ClassGuideBundle | null | undefined): PresetFillMap {
  const out = emptyPresetFill()
  if (!bundle) return out

  for (const id of CRYSTAL_PRESET_IDS) {
    const hasCrystal = bundle.crystals.some(
      (row) => (row.preset || 't1') === id && Boolean(row.items),
    )
    const hasRelic = bundle.relics.some(
      (row) => (row.preset || 't1') === id && Boolean(row.items),
    )
    const hasLightstone = bundle.lightstones.some(
      (row) => (row.preset || 't1') === id && Boolean(row.items),
    )
    const hasHardening = bundle.hardening.some(
      (row) => (row.preset || 't1') === id && Boolean(row.items),
    )
    const hasBuff = bundle.buffs.some(
      (row) => (row.preset || 't1') === id && Boolean(row.buffs),
    )
    const hasMorph = bundle.morphs.some((row) => {
      const preset = String(row.preset)
      if (!row.skills || !isMorphPresetId(preset)) return false
      return morphGuidePreset(preset) === id
    })
    const hasCombo =
      id === 'pve' &&
      bundle.combos.some((c) => (c.kind || 'pvp') === 'pve' && c.steps?.length)
    out[id] =
      hasCrystal ||
      hasRelic ||
      hasLightstone ||
      hasHardening ||
      hasBuff ||
      hasMorph ||
      hasCombo
  }

  return out
}
