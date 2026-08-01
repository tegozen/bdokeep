import type { ClassGuideBundle } from '@/entities/class'
import { CRYSTAL_PRESET_IDS, type CrystalPresetId } from './crystalPresets'
import { isMorphPresetId, morphGuidePreset } from './morphPresets'

export type PresetFillMap = Record<CrystalPresetId, boolean>

export function emptyPresetFill(): PresetFillMap {
  return { t1: false, t2: false, besp: false, sub: false }
}

/** Whether a guide preset has any filled crystals / relics / lightstones / buffs / morphs. */
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
    const hasBuff = bundle.buffs.some(
      (row) => (row.preset || 't1') === id && Boolean(row.buffs),
    )
    const hasMorph = bundle.morphs.some((row) => {
      const preset = String(row.preset)
      if (!row.skills || !isMorphPresetId(preset)) return false
      return morphGuidePreset(preset) === id
    })
    out[id] = hasCrystal || hasRelic || hasLightstone || hasBuff || hasMorph
  }

  return out
}
