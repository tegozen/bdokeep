import { createError } from 'h3'
import {
  MAX_BUFFS,
  MAX_BUFFS_ALL_PRESETS,
  UUID_RE,
  isCrystalPresetId,
} from '@domain'
import {
  replacedAfterCatalogDrop,
  replacedPresetsOrThrow,
} from '../shared/replacedPresets'
import type { ParseSectionContext, ParsedProposalPayload } from './types'

export async function parseBuffs(ctx: ParseSectionContext): Promise<ParsedProposalPayload> {
  const { sql, body, skipUnknown, catalogIdsExist } = ctx
  const raw = body.buffs
  const legacyIds = body.buff_ids
  let entries: Array<{ preset?: unknown; buff_id?: unknown; sort_order?: unknown }> = []
  if (Array.isArray(raw) && raw.length) {
    entries = raw as Array<{ preset?: unknown; buff_id?: unknown; sort_order?: unknown }>
  } else if (Array.isArray(legacyIds) && legacyIds.length) {
    entries = legacyIds.map((id, i) => ({
      preset: 't1',
      buff_id: id,
      sort_order: i,
    }))
  }
  if (!entries.length) {
    throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один баф' })
  }
  if (entries.length > MAX_BUFFS_ALL_PRESETS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Максимум ${MAX_BUFFS_ALL_PRESETS} бафов`,
    })
  }

  const buffsPayload: Array<{ preset: string; buff_id: string; sort_order: number }> = []
  const perPreset = new Map<string, number>()
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    const preset = String(entry?.preset || 't1')
    const buffId = String(entry?.buff_id || '')
    if (!isCrystalPresetId(preset)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
    }
    if (!UUID_RE.test(buffId)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный id бафа' })
    }
    const count = (perPreset.get(preset) || 0) + 1
    if (count > MAX_BUFFS) {
      throw createError({
        statusCode: 400,
        statusMessage: `Максимум ${MAX_BUFFS} бафов на пресет`,
      })
    }
    perPreset.set(preset, count)
    buffsPayload.push({
      preset,
      buff_id: buffId,
      sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
    })
  }

  const buffIds = [...new Set(buffsPayload.map((b) => b.buff_id))]
  const allowed = await catalogIdsExist(sql, 'buffs', buffIds)
  const kept = skipUnknown
    ? buffsPayload.filter((b) => allowed.has(b.buff_id))
    : buffsPayload
  if (!skipUnknown && buffIds.some((id) => !allowed.has(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Неизвестный баф' })
  }
  if (!kept.length) {
    if (skipUnknown) {
      return {
        payload: {
          buffs: [],
          replaced_presets: replacedAfterCatalogDrop(
            body.replaced_presets,
            buffsPayload.map((b) => b.preset),
            isCrystalPresetId,
          ),
        },
        verifiedVideos: null,
      }
    }
    throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один баф' })
  }
  const replaced_presets = replacedPresetsOrThrow(
    body.replaced_presets,
    buffsPayload.map((b) => b.preset),
    kept.map((b) => b.preset),
    isCrystalPresetId,
  )
  return { payload: { buffs: kept, replaced_presets }, verifiedVideos: null }
}
