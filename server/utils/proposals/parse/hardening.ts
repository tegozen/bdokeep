import { createError } from 'h3'
import {
  MAX_HARDENING_ALL_PRESETS,
  UUID_RE,
  isCrystalPresetId,
  isHardeningSlotId,
} from '@domain'
import {
  replacedAfterCatalogDrop,
  replacedPresetsOrThrow,
} from '../shared/replacedPresets'
import type { ParseSectionContext, ParsedProposalPayload } from './types'

export async function parseHardening(ctx: ParseSectionContext): Promise<ParsedProposalPayload> {
  const { sql, body, skipUnknown, catalogIdsExist } = ctx
  const raw = body.hardening
  if (!Array.isArray(raw) || raw.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот' })
  }
  if (raw.length > MAX_HARDENING_ALL_PRESETS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Максимум ${MAX_HARDENING_ALL_PRESETS} слотов`,
    })
  }

  const hardening: Array<{
    preset: string
    slot: string
    item_id: string
    sort_order: number
  }> = []
  const usedSlots = new Set<string>()
  const usedItems = new Set<string>()

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
    if (!isHardeningSlotId(slot)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный слот' })
    }
    const slotKey = `${preset}:${slot}`
    if (usedSlots.has(slotKey)) {
      throw createError({ statusCode: 400, statusMessage: 'Дубликат слота в пресете' })
    }
    const itemKey = `${preset}:${itemId}`
    if (usedItems.has(itemKey)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Одинаковые камни закалки в одном пресете нельзя',
      })
    }
    if (!UUID_RE.test(itemId)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный id камня закалки' })
    }
    usedSlots.add(slotKey)
    usedItems.add(itemKey)
    hardening.push({
      preset,
      slot,
      item_id: itemId,
      sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
    })
  }

  const itemIds = hardening.map((c) => c.item_id)
  const allowed = await catalogIdsExist(sql, 'items', itemIds, { itemType: 'essence' })
  const kept = skipUnknown
    ? hardening.filter((c) => allowed.has(c.item_id))
    : hardening
  if (!skipUnknown && itemIds.some((id) => !allowed.has(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Неизвестный камень закалки' })
  }
  if (!kept.length) {
    if (skipUnknown) {
      return {
        payload: {
          hardening: [],
          replaced_presets: replacedAfterCatalogDrop(
            body.replaced_presets,
            hardening.map((c) => c.preset),
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
    hardening.map((c) => c.preset),
    kept.map((c) => c.preset),
    isCrystalPresetId,
  )
  return { payload: { hardening: kept, replaced_presets }, verifiedVideos: null }
}
