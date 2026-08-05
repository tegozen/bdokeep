import { reactive, watch, type Ref } from 'vue'
import type { Buff, Skill, SkillAddonEffect } from '@/entities/class'
import { resolveCatalogIds } from '@/shared/api/catalogResolve'
import {
  morphPresetFrom,
  resolveAddonLabel,
  type CrystalPresetId,
  type MorphPresetId,
  type MorphSlotLevel,
} from '@/shared/lib'
import type {
  CrystalFill,
  HardeningFill,
  MorphSlotFill,
  RelicFill,
} from '@bdokeep/mf-shared/boards/fills'

export type ProposalPreviewPayload = {
  text?: string
  skill_ids?: string[]
  combos?: Array<{
    title?: string
    notes?: string
    skill_ids: string[]
  }>
  buff_ids?: string[]
  buffs?: Array<{ preset?: string; buff_id: string }>
  crystals?: Array<{ preset?: string; slot: string; item_id: string }>
  relics?: Array<{ preset?: string; slot: string; item_id: string }>
  lightstones?: Array<{ preset?: string; slot: string; item_id: string }>
  hardening?: Array<{ preset?: string; slot: string; item_id: string }>
  videos?: Array<{ title?: string; youtube_url: string; status?: string }>
  morphs?: Array<{
    preset?: string
    slot_level: number
    skill_id: string
    effect_ids: string[]
  }>
  /** Presets wiped on approve (empty ones included). */
  replaced_presets?: string[]
}

export type ProposalPreviewItem = {
  id: string
  section: string
  payload: ProposalPreviewPayload | null
}

function isCombo(section: string) {
  return section === 'combo_awakening' || section === 'combo_succession'
}

/** Shared catalog hydrate for admin queue + inline pending drafts. */
export function useProposalPreviewHydration(
  items: Ref<ProposalPreviewItem[]>,
  opts?: { specMode?: Ref<'awakening' | 'succession'> },
) {
  const comboGroups = reactive<
    Record<
      string,
      Array<{
        title: string
        notes: string
        steps: Array<{ id: string; skills: Skill | null }>
      }> | null
    >
  >({})
  const buffByPreset = reactive<
    Record<
      string,
      Partial<Record<CrystalPresetId, Array<{ id: string; buffs: Buff | null }>>> | null
    >
  >({})
  const buffPreset = reactive<Record<string, CrystalPresetId>>({})
  const crystalByPreset = reactive<
    Record<string, Partial<Record<CrystalPresetId, Record<string, CrystalFill>>> | null>
  >({})
  const crystalPreset = reactive<Record<string, CrystalPresetId>>({})
  const relicByPreset = reactive<
    Record<string, Partial<Record<CrystalPresetId, Record<string, RelicFill>>> | null>
  >({})
  const relicPreset = reactive<Record<string, CrystalPresetId>>({})
  const hardeningByPreset = reactive<
    Record<string, Partial<Record<CrystalPresetId, Record<string, HardeningFill>>> | null>
  >({})
  const hardeningPreset = reactive<Record<string, CrystalPresetId>>({})
  const morphByPreset = reactive<
    Record<
      string,
      Partial<Record<MorphPresetId, Partial<Record<MorphSlotLevel, MorphSlotFill>>>> | null
    >
  >({})
  const morphGuideTab = reactive<Record<string, CrystalPresetId>>({})

  function payloadOf(item: ProposalPreviewItem): ProposalPreviewPayload {
    return (item.payload ?? {}) as ProposalPreviewPayload
  }

  function buffsFor(id: string) {
    return buffByPreset[id]?.[buffPreset[id] || 't1'] || []
  }

  function crystalFilled(id: string): Record<string, CrystalFill> {
    return crystalByPreset[id]?.[crystalPreset[id] || 't1'] || {}
  }

  function relicFilled(id: string): Record<string, RelicFill> {
    return relicByPreset[id]?.[relicPreset[id] || 't1'] || {}
  }

  function hardeningFilled(id: string): Record<string, HardeningFill> {
    return hardeningByPreset[id]?.[hardeningPreset[id] || 't1'] || {}
  }

  function morphFilled(id: string): Partial<Record<MorphSlotLevel, MorphSlotFill>> {
    const mode = opts?.specMode?.value || 'awakening'
    const preset = morphPresetFrom(mode, morphGuideTab[id] || 't1')
    return morphByPreset[id]?.[preset] || {}
  }

  async function hydrateCombo(item: ProposalPreviewItem) {
    const p = payloadOf(item)
    const rawCombos =
      p.combos?.length
        ? p.combos
        : p.skill_ids?.length
          ? [{ title: '', notes: '', skill_ids: p.skill_ids }]
          : []
    if (!rawCombos.length) {
      comboGroups[item.id] = []
      return
    }
    const ids = rawCombos.flatMap((c) => c.skill_ids || [])
    try {
      const { skills } = await resolveCatalogIds({ skills: ids })
      const byId = new Map(skills.map((s) => [s.id, s as Skill]))
      comboGroups[item.id] = rawCombos
        .filter((c) => (c.skill_ids || []).length)
        .map((c) => ({
          title: (c.title || '').trim(),
          notes: (c.notes || '').trim(),
          steps: (c.skill_ids || []).map((id) => ({
            id,
            skills: byId.get(id) ?? null,
          })),
        }))
    } catch {
      comboGroups[item.id] = []
    }
  }

  async function hydrateBuffs(item: ProposalPreviewItem) {
    buffPreset[item.id] = 't1'
    const p = payloadOf(item)
    const entries = p.buffs?.length
      ? p.buffs
      : (p.buff_ids ?? []).map((id) => ({ preset: 't1' as const, buff_id: id }))
    if (!entries.length) {
      buffByPreset[item.id] = {}
      return
    }
    try {
      const { buffs } = await resolveCatalogIds({
        buffs: entries.map((e) => e.buff_id),
      })
      const byId = new Map(buffs.map((b) => [b.id, b as Buff]))
      const byPreset: Partial<
        Record<CrystalPresetId, Array<{ id: string; buffs: Buff | null }>>
      > = {}
      for (const entry of entries) {
        const preset = (entry.preset || 't1') as CrystalPresetId
        if (!byPreset[preset]) byPreset[preset] = []
        byPreset[preset]!.push({
          id: entry.buff_id,
          buffs: byId.get(entry.buff_id) ?? null,
        })
      }
      buffByPreset[item.id] = byPreset
    } catch {
      buffByPreset[item.id] = {}
    }
  }

  async function hydrateCrystals(item: ProposalPreviewItem) {
    crystalPreset[item.id] = 't1'
    const entries = payloadOf(item).crystals ?? []
    if (!entries.length) {
      crystalByPreset[item.id] = {}
      return
    }
    try {
      const { items: catalog } = await resolveCatalogIds({
        items: entries.map((e) => e.item_id),
      })
      const byId = new Map(
        catalog
          .filter((c) => c.item_type === 'crystal')
          .map((c) => [
            c.id,
            { id: c.id, name_ru: c.name_ru, icon_url: c.icon_url } as CrystalFill,
          ]),
      )
      const byPreset: Partial<Record<CrystalPresetId, Record<string, CrystalFill>>> = {}
      for (const entry of entries) {
        const fill = byId.get(entry.item_id)
        if (!fill) continue
        const preset = (entry.preset || 't1') as CrystalPresetId
        if (!byPreset[preset]) byPreset[preset] = {}
        byPreset[preset]![entry.slot] = fill
      }
      crystalByPreset[item.id] = byPreset
    } catch {
      crystalByPreset[item.id] = {}
    }
  }

  async function hydrateRelics(item: ProposalPreviewItem) {
    relicPreset[item.id] = 't1'
    const p = payloadOf(item)
    const entries = [...(p.relics ?? []), ...(p.lightstones ?? [])]
    if (!entries.length) {
      relicByPreset[item.id] = {}
      return
    }
    try {
      const { items: catalog } = await resolveCatalogIds({
        items: entries.map((e) => e.item_id),
      })
      const byId = new Map(
        catalog
          .filter((c) => c.item_type === 'relic' || c.item_type === 'lightstone')
          .map((c) => [
            c.id,
            { id: c.id, name_ru: c.name_ru, icon_url: c.icon_url } as RelicFill,
          ]),
      )
      const byPreset: Partial<Record<CrystalPresetId, Record<string, RelicFill>>> = {}
      for (const entry of entries) {
        const fill = byId.get(entry.item_id)
        if (!fill) continue
        const preset = (entry.preset || 't1') as CrystalPresetId
        if (!byPreset[preset]) byPreset[preset] = {}
        byPreset[preset]![entry.slot] = fill
      }
      relicByPreset[item.id] = byPreset
    } catch {
      relicByPreset[item.id] = {}
    }
  }

  async function hydrateHardening(item: ProposalPreviewItem) {
    hardeningPreset[item.id] = 't1'
    const entries = payloadOf(item).hardening ?? []
    if (!entries.length) {
      hardeningByPreset[item.id] = {}
      return
    }
    try {
      const { items: catalog } = await resolveCatalogIds({
        items: entries.map((e) => e.item_id),
      })
      const byId = new Map(
        catalog
          .filter((c) => c.item_type === 'essence')
          .map((c) => [
            c.id,
            { id: c.id, name_ru: c.name_ru, icon_url: c.icon_url } as HardeningFill,
          ]),
      )
      const byPreset: Partial<Record<CrystalPresetId, Record<string, HardeningFill>>> = {}
      for (const entry of entries) {
        const fill = byId.get(entry.item_id)
        if (!fill) continue
        const preset = (entry.preset || 't1') as CrystalPresetId
        if (!byPreset[preset]) byPreset[preset] = {}
        byPreset[preset]![entry.slot] = fill
      }
      hardeningByPreset[item.id] = byPreset
    } catch {
      hardeningByPreset[item.id] = {}
    }
  }

  async function hydrateMorphs(item: ProposalPreviewItem) {
    morphGuideTab[item.id] = 't1'
    const entries = payloadOf(item).morphs ?? []
    if (!entries.length) {
      morphByPreset[item.id] = {}
      return
    }
    try {
      const skillIds = [...new Set(entries.map((e) => e.skill_id))]
      const effectIds = [...new Set(entries.flatMap((e) => e.effect_ids ?? []))]
      const { skills, skill_addon_effects: fx } = await resolveCatalogIds({
        skills: skillIds,
        skill_addon_effects: effectIds,
      })
      const skillById = new Map(skills.map((s) => [s.id, s as Skill]))
      const fxById = new Map(fx.map((e) => [e.id, e as SkillAddonEffect]))
      const byPreset: Partial<
        Record<MorphPresetId, Partial<Record<MorphSlotLevel, MorphSlotFill>>>
      > = {}
      for (const entry of entries) {
        const preset = (entry.preset || 'aw_t1') as MorphPresetId
        const level = entry.slot_level as MorphSlotLevel
        const skill = skillById.get(entry.skill_id) ?? null
        const tier = skill?.addon_tier ?? 2
        const e1 = fxById.get(entry.effect_ids?.[0] || '')
        const e2 = fxById.get(entry.effect_ids?.[1] || '')
        if (!byPreset[preset]) byPreset[preset] = {}
        byPreset[preset]![level] = {
          skill: skill
            ? {
                id: skill.id,
                name_ru: skill.name_ru,
                icon_url: skill.icon_url,
                addon_tier: skill.addon_tier,
              }
            : null,
          effect1Label: e1 ? resolveAddonLabel(e1.tier_labels, tier, e1.name_ru) : null,
          effect2Label: e2 ? resolveAddonLabel(e2.tier_labels, tier, e2.name_ru) : null,
        }
      }
      morphByPreset[item.id] = byPreset
    } catch {
      morphByPreset[item.id] = {}
    }
  }

  async function hydrate() {
    for (const key of Object.keys(comboGroups)) delete comboGroups[key]
    for (const key of Object.keys(buffByPreset)) delete buffByPreset[key]
    for (const key of Object.keys(crystalByPreset)) delete crystalByPreset[key]
    for (const key of Object.keys(relicByPreset)) delete relicByPreset[key]
    for (const key of Object.keys(hardeningByPreset)) delete hardeningByPreset[key]
    for (const key of Object.keys(morphByPreset)) delete morphByPreset[key]

    await Promise.all(
      items.value.map(async (item) => {
        if (isCombo(item.section)) await hydrateCombo(item)
        else if (item.section === 'buffs') await hydrateBuffs(item)
        else if (item.section === 'crystals') await hydrateCrystals(item)
        else if (item.section === 'relics') await hydrateRelics(item)
        else if (item.section === 'hardening') await hydrateHardening(item)
        else if (item.section === 'morphs') await hydrateMorphs(item)
      }),
    )
  }

  watch(
    items,
    () => {
      void hydrate()
    },
    { immediate: true, deep: true },
  )

  return {
    comboGroups,
    buffByPreset,
    buffPreset,
    crystalByPreset,
    crystalPreset,
    relicByPreset,
    relicPreset,
    hardeningByPreset,
    hardeningPreset,
    morphByPreset,
    morphGuideTab,
    buffsFor,
    crystalFilled,
    relicFilled,
    hardeningFilled,
    morphFilled,
    hydrate,
  }
}
