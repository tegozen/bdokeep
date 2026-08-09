import type { Item } from '@/entities/catalog'
import type {
  ClassGuideBundle,
  GuideBuffRow,
  GuideItemRow,
} from '@/entities/class'
import {
  CRYSTAL_PRESET_IDS,
  isCrystalPresetId,
  isHardeningSlotId,
  isLightstoneSlotId,
  isRelicSlotId,
  type CrystalPresetId,
} from '@/shared/lib'

export type CopyFromClassSection = 'crystals' | 'relics' | 'hardening' | 'buffs'

export type ItemPresetBoards = Record<CrystalPresetId, Record<string, Item>>

export type BuffPickItem = { id: string; name_ru: string; icon_url: string | null }

export type BuffPresetBoards = Record<CrystalPresetId, BuffPickItem[]>

export function emptyItemPresetBoards(): ItemPresetBoards {
  const next = {} as ItemPresetBoards
  for (const id of CRYSTAL_PRESET_IDS) next[id] = {}
  return next
}

export function emptyBuffPresetBoards(): BuffPresetBoards {
  const next = {} as BuffPresetBoards
  for (const id of CRYSTAL_PRESET_IDS) next[id] = []
  return next
}

export function extractCrystalPresets(rows: readonly GuideItemRow[]): ItemPresetBoards {
  const next = emptyItemPresetBoards()
  for (const row of rows) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.slot || !row.items) continue
    next[presetRaw][row.slot] = row.items
  }
  return next
}

export function extractHardeningPresets(rows: readonly GuideItemRow[]): ItemPresetBoards {
  const next = emptyItemPresetBoards()
  for (const row of rows) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.slot || !row.items) continue
    if (!isHardeningSlotId(row.slot)) continue
    next[presetRaw][row.slot] = row.items
  }
  return next
}

export function extractRelicPresets(
  relics: readonly GuideItemRow[],
  lightstones: readonly GuideItemRow[],
): ItemPresetBoards {
  const next = emptyItemPresetBoards()
  for (const row of relics) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.slot || !row.items) continue
    if (!isRelicSlotId(row.slot)) continue
    next[presetRaw][row.slot] = row.items
  }
  for (const row of lightstones) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.slot || !row.items) continue
    if (!isLightstoneSlotId(row.slot)) continue
    next[presetRaw][row.slot] = row.items
  }
  return next
}

export function extractBuffPresets(rows: readonly GuideBuffRow[]): BuffPresetBoards {
  const next = emptyBuffPresetBoards()
  for (const row of rows) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.buffs) continue
    next[presetRaw].push({
      id: row.buffs.id,
      name_ru: row.buffs.name_ru,
      icon_url: row.buffs.icon_url,
    })
  }
  return next
}

export function extractSectionFromBundle(
  section: CopyFromClassSection,
  bundle: ClassGuideBundle,
): ItemPresetBoards | BuffPresetBoards {
  switch (section) {
    case 'crystals':
      return extractCrystalPresets(bundle.crystals)
    case 'relics':
      return extractRelicPresets(bundle.relics, bundle.lightstones)
    case 'hardening':
      return extractHardeningPresets(bundle.hardening)
    case 'buffs':
      return extractBuffPresets(bundle.buffs)
  }
}

export function isItemBoardEmpty(board: Record<string, Item>): boolean {
  return Object.keys(board).length === 0
}

export function isBuffListEmpty(list: readonly BuffPickItem[]): boolean {
  return list.length === 0
}

export function isSectionPresetEmpty(
  section: CopyFromClassSection,
  boards: ItemPresetBoards | BuffPresetBoards,
  preset: CrystalPresetId,
): boolean {
  if (section === 'buffs') {
    return isBuffListEmpty((boards as BuffPresetBoards)[preset])
  }
  return isItemBoardEmpty((boards as ItemPresetBoards)[preset])
}

export function hasAnyFilledSectionPreset(
  section: CopyFromClassSection,
  boards: ItemPresetBoards | BuffPresetBoards,
): boolean {
  return CRYSTAL_PRESET_IDS.some((id) => !isSectionPresetEmpty(section, boards, id))
}

export function pickDefaultFilledPreset(
  section: CopyFromClassSection,
  boards: ItemPresetBoards | BuffPresetBoards,
): CrystalPresetId {
  return (
    CRYSTAL_PRESET_IDS.find((id) => !isSectionPresetEmpty(section, boards, id)) ?? 't1'
  )
}
