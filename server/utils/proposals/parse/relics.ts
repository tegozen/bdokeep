import { createError } from 'h3'
import {
  MAX_LIGHTSTONES_ALL_PRESETS,
  MAX_RELICS_ALL_PRESETS,
  UUID_RE,
  isCrystalPresetId,
  isLightstoneSlotId,
  isRelicSlotId,
} from '@domain'
import {
  replacedAfterCatalogDrop,
  replacedPresetsOrThrow,
} from '../shared/replacedPresets'
import type { ParseSectionContext, ParsedProposalPayload } from './types'

export async function parseRelics(ctx: ParseSectionContext): Promise<ParsedProposalPayload> {
  const { sql, body, skipUnknown, catalogIdsExist } = ctx
  const rawRelics = body.relics
  const rawLights = body.lightstones
  if (!Array.isArray(rawRelics) && !Array.isArray(rawLights)) {
    throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот' })
  }
  const relicRows = Array.isArray(rawRelics) ? rawRelics : []
  const lightRows = Array.isArray(rawLights) ? rawLights : []
  if (!relicRows.length && !lightRows.length) {
    throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот' })
  }
  if (relicRows.length > MAX_RELICS_ALL_PRESETS) {
    throw createError({ statusCode: 400, statusMessage: 'Слишком много реликвий' })
  }
  if (lightRows.length > MAX_LIGHTSTONES_ALL_PRESETS) {
    throw createError({ statusCode: 400, statusMessage: 'Слишком много светящихся камней' })
  }

  const relics: Array<{
    preset: string
    slot: string
    item_id: string
    sort_order: number
  }> = []
  const lightstones: Array<{
    preset: string
    slot: string
    item_id: string
    sort_order: number
  }> = []
  const usedRelic = new Set<string>()
  const usedLight = new Set<string>()

  for (let i = 0; i < relicRows.length; i++) {
    const entry = relicRows[i] as {
      preset?: unknown
      slot?: unknown
      item_id?: unknown
      sort_order?: unknown
    }
    const preset = String(entry?.preset || '')
    const slot = String(entry?.slot || '')
    const itemId = String(entry?.item_id || '')
    if (!isCrystalPresetId(preset) || !isRelicSlotId(slot) || !UUID_RE.test(itemId)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректная реликвия' })
    }
    const key = `${preset}:${slot}`
    if (usedRelic.has(key)) {
      throw createError({ statusCode: 400, statusMessage: 'Дубликат слота реликвии' })
    }
    usedRelic.add(key)
    relics.push({
      preset,
      slot,
      item_id: itemId,
      sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
    })
  }

  for (let i = 0; i < lightRows.length; i++) {
    const entry = lightRows[i] as {
      preset?: unknown
      slot?: unknown
      item_id?: unknown
      sort_order?: unknown
    }
    const preset = String(entry?.preset || '')
    const slot = String(entry?.slot || '')
    const itemId = String(entry?.item_id || '')
    if (!isCrystalPresetId(preset) || !isLightstoneSlotId(slot) || !UUID_RE.test(itemId)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный светящийся камень' })
    }
    const key = `${preset}:${slot}`
    if (usedLight.has(key)) {
      throw createError({ statusCode: 400, statusMessage: 'Дубликат слота камня' })
    }
    usedLight.add(key)
    lightstones.push({
      preset,
      slot,
      item_id: itemId,
      sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
    })
  }

  let keptRelics = relics
  let keptLights = lightstones
  if (relics.length) {
    const ids = relics.map((r) => r.item_id)
    const allowed = await catalogIdsExist(sql, 'items', ids, { itemType: 'relic' })
    if (skipUnknown) {
      keptRelics = relics.filter((r) => allowed.has(r.item_id))
    } else if (ids.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестная реликвия' })
    }
  }
  if (lightstones.length) {
    const ids = lightstones.map((r) => r.item_id)
    const allowed = await catalogIdsExist(sql, 'items', ids, { itemType: 'lightstone' })
    if (skipUnknown) {
      keptLights = lightstones.filter((r) => allowed.has(r.item_id))
    } else if (ids.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный светящийся камень' })
    }
  }
  if (!keptRelics.length && !keptLights.length) {
    if (skipUnknown) {
      return {
        payload: {
          relics: [],
          lightstones: [],
          replaced_presets: replacedAfterCatalogDrop(
            body.replaced_presets,
            [
              ...relics.map((r) => r.preset),
              ...lightstones.map((r) => r.preset),
            ],
            isCrystalPresetId,
          ),
        },
        verifiedVideos: null,
      }
    }
    throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот' })
  }

  const structuralPresets = [
    ...relics.map((r) => r.preset),
    ...lightstones.map((r) => r.preset),
  ]
  const keptPresets = [
    ...keptRelics.map((r) => r.preset),
    ...keptLights.map((r) => r.preset),
  ]
  const replaced_presets = replacedPresetsOrThrow(
    body.replaced_presets,
    structuralPresets,
    keptPresets,
    isCrystalPresetId,
  )
  return {
    payload: { relics: keptRelics, lightstones: keptLights, replaced_presets },
    verifiedVideos: null,
  }
}
