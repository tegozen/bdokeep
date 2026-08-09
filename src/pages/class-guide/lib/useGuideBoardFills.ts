import { computed, type Ref } from 'vue'
import type { ClassGuideBundle } from '@/entities/class'
import {
  CRYSTAL_ALL_SLOTS,
  resolveAddonLabel,
  type CrystalFill,
  type CrystalPresetId,
  type HardeningFill,
  type MorphPresetId,
  type MorphSlotFill,
  type RelicFill,
} from '@/shared/lib'

/** Map live guide bundle rows → board `filled` props for the active preset/mode. */
export function useGuideBoardFills(
  bundle: Ref<ClassGuideBundle | null | undefined>,
  guidePreset: Ref<CrystalPresetId>,
  activeMorphPreset: Ref<MorphPresetId>,
) {
  const crystalFilled = computed(() => {
    const map: Record<string, CrystalFill> = {}
    for (const row of bundle.value?.crystals ?? []) {
      const preset = row.preset || 't1'
      if (preset !== guidePreset.value) continue
      const slot = row.slot
      const item = row.items
      if (!slot || !item) continue
      map[slot] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
    }
    return map
  })

  const crystalPickedList = computed(() => {
    const filled = crystalFilled.value
    const counts = new Map<
      string,
      { id: string; name_ru: string; icon_url: string | null; count: number }
    >()
    for (const slot of CRYSTAL_ALL_SLOTS) {
      const item = filled[slot.id]
      if (!item) continue
      const prev = counts.get(item.id)
      if (prev) {
        prev.count += 1
      } else {
        counts.set(item.id, {
          id: item.id,
          name_ru: item.name_ru,
          icon_url: item.icon_url,
          count: 1,
        })
      }
    }
    return [...counts.values()]
  })

  const relicFilled = computed(() => {
    const map: Record<string, RelicFill> = {}
    for (const row of [
      ...(bundle.value?.relics ?? []),
      ...(bundle.value?.lightstones ?? []),
    ]) {
      const preset = row.preset || 't1'
      if (preset !== guidePreset.value) continue
      const slot = row.slot
      const item = row.items
      if (!slot || !item) continue
      map[slot] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
    }
    return map
  })

  const morphFilled = computed(() => {
    const map: Partial<Record<50 | 52 | 54 | 56 | 58 | 60, MorphSlotFill>> = {}
    for (const row of bundle.value?.morphs ?? []) {
      if (row.preset !== activeMorphPreset.value) continue
      const level = row.slot_level as 50 | 52 | 54 | 56 | 58 | 60
      const tier = row.skills?.addon_tier ?? 2
      map[level] = {
        skill: row.skills
          ? {
              id: row.skills.id,
              name_ru: row.skills.name_ru,
              icon_url: row.skills.icon_url,
              addon_tier: row.skills.addon_tier,
            }
          : null,
        effect1Label: row.effect1
          ? resolveAddonLabel(row.effect1.tier_labels, tier, row.effect1.name_ru)
          : null,
        effect2Label: row.effect2
          ? resolveAddonLabel(row.effect2.tier_labels, tier, row.effect2.name_ru)
          : null,
      }
    }
    return map
  })

  const hardeningFilled = computed(() => {
    const map: Record<string, HardeningFill> = {}
    for (const row of bundle.value?.hardening ?? []) {
      const preset = row.preset || 't1'
      if (preset !== guidePreset.value) continue
      const slot = row.slot
      const item = row.items
      if (!slot || !item) continue
      map[slot] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
    }
    return map
  })

  return { crystalFilled, crystalPickedList, relicFilled, morphFilled, hardeningFilled }
}
