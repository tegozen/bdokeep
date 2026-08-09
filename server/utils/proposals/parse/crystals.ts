import { createError } from 'h3'
import {
  MAX_CRYSTALS_ALL_PRESETS,
  UUID_RE,
  isCrystalPresetId,
  isCrystalSlotId,
} from '@domain'
import {
  replacedAfterCatalogDrop,
  replacedPresetsOrThrow,
} from '../shared/replacedPresets'
import type { ParseSectionContext, ParsedProposalPayload } from './types'

export async function parseCrystals(ctx: ParseSectionContext): Promise<ParsedProposalPayload> {
  const { sql, body, skipUnknown, catalogIdsExist } = ctx
  const raw = body.crystals
  if (!Array.isArray(raw) || raw.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот' })
  }
  if (raw.length > MAX_CRYSTALS_ALL_PRESETS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Максимум ${MAX_CRYSTALS_ALL_PRESETS} слотов`,
    })
  }

  const crystals: Array<{
    preset: string
    slot: string
    item_id: string
    sort_order: number
  }> = []
  const usedKeys = new Set<string>()
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i] as {
      preset?: unknown
      slot?: unknown
      item_id?: unknown
      sort_order?: unknown
    }
    const preset = String(entry?.preset || '')
    const slot = String(entry?.slot || '')
    const itemId = String(entry?.item_id || '')
    if (!isCrystalPresetId(preset)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
    }
    if (!isCrystalSlotId(slot)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный слот' })
    }
    const key = `${preset}:${slot}`
    if (usedKeys.has(key)) {
      throw createError({ statusCode: 400, statusMessage: 'Дубликат слота в пресете' })
    }
    if (!UUID_RE.test(itemId)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный id кристалла' })
    }
    usedKeys.add(key)
    crystals.push({
      preset,
      slot,
      item_id: itemId,
      sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
    })
  }

  const itemIds = crystals.map((c) => c.item_id)
  const allowed = await catalogIdsExist(sql, 'items', itemIds, { itemType: 'crystal' })
  const kept = skipUnknown
    ? crystals.filter((c) => allowed.has(c.item_id))
    : crystals
  if (!skipUnknown && itemIds.some((id) => !allowed.has(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Неизвестный кристалл' })
  }
  if (!kept.length) {
    if (skipUnknown) {
      return {
        payload: {
          crystals: [],
          replaced_presets: replacedAfterCatalogDrop(
            body.replaced_presets,
            crystals.map((c) => c.preset),
            isCrystalPresetId,
          ),
        },
        verifiedVideos: null,
      }
    }
    throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот' })
  }
  const replaced_presets = replacedPresetsOrThrow(
    body.replaced_presets,
    crystals.map((c) => c.preset),
    kept.map((c) => c.preset),
    isCrystalPresetId,
  )
  return { payload: { crystals: kept, replaced_presets }, verifiedVideos: null }
}
