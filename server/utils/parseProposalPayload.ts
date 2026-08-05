import { createError } from 'h3'
import type { Sql } from './db'
import {
  MAX_BUFFS,
  MAX_BUFFS_ALL_PRESETS,
  MAX_COMBO_NOTES_LEN,
  MAX_COMBO_STEPS,
  MAX_COMBO_TITLE_LEN,
  MAX_COMBOS_PER_MODE,
  MAX_CRYSTALS_ALL_PRESETS,
  MAX_HARDENING_ALL_PRESETS,
  MAX_LIGHTSTONES_ALL_PRESETS,
  MAX_MORPHS_ALL_PRESETS,
  MAX_RELICS_ALL_PRESETS,
  MAX_TEXT_LEN,
  PROPOSAL_SECTIONS,
  UUID_RE,
  comboModeFromSection,
  isBuffsSection,
  isComboSection,
  isCrystalPresetId,
  isCrystalSlotId,
  isCrystalsSection,
  isHardeningSection,
  isHardeningSlotId,
  isLightstoneSlotId,
  isMorphPresetId,
  isMorphSlotLevel,
  isMorphsSection,
  isRelicSlotId,
  isRelicsSection,
  isSummarySection,
  isVideosSection,
  finalizeReplacedPresets,
  type ProposalSection,
} from '@bdokeep/domain'
import type { ParsedGuideVideo, ParseVideosOptions } from './parseVideosPayload'
import { sanitizeMarkdown } from './sanitizeMarkdown'

export type CatalogIdsExist = (
  sql: Sql,
  table: 'skills' | 'buffs' | 'items' | 'skill_addon_effects',
  ids: string[],
  extra?: { classSlug?: string; itemType?: string },
) => Promise<Set<string>>

export type ParseVideosFn = (
  raw: unknown,
  opts?: ParseVideosOptions,
) => Promise<ParsedGuideVideo[]>

export type ParseProposalContext = {
  sql: Sql
  classSlug: string
  section: ProposalSection
  rawPayload: Record<string, unknown> | null | undefined
  /**
   * Approve path: drop rows whose catalog ids no longer exist
   * instead of failing the whole proposal. Structural errors still 400.
   */
  skipUnknownCatalog?: boolean
  /** Cron video TTL cleanup may clear all slots for a mode. */
  allowEmptyVideos?: boolean
  /** Tests / overrides: default loads `idsExist` from catalog queries. */
  catalogIdsExist?: CatalogIdsExist
  /** Tests / overrides: default loads `parseVideosPayload` (ytimg probe). */
  parseVideos?: ParseVideosFn
}

export type ParsedProposalPayload = {
  payload: Record<string, unknown>
  /** Pre-verified videos (network probe done outside DB tx). */
  verifiedVideos: ParsedGuideVideo[] | null
}

function assertSection(section: string): asserts section is ProposalSection {
  if (!(PROPOSAL_SECTIONS as readonly string[]).includes(section)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный раздел' })
  }
}

function replacedPresetsOrThrow(
  raw: unknown,
  structuralPresets: readonly string[],
  keptPresets: readonly string[],
  isValid: (id: string) => boolean,
): string[] {
  const result = finalizeReplacedPresets(raw, structuralPresets, keptPresets, isValid)
  if (!result.ok) {
    throw createError({
      statusCode: 400,
      statusMessage:
        result.reason === 'rows_outside_replaced'
          ? 'Строки вне replaced_presets'
          : 'Некорректный пресет',
    })
  }
  return result.replaced
}

/** Approve path: all catalog rows gone — keep intentional clears only (or []). */
function replacedAfterCatalogDrop(
  raw: unknown,
  structuralPresets: readonly string[],
  isValid: (id: string) => boolean,
): string[] {
  const result = finalizeReplacedPresets(raw, structuralPresets, [], isValid)
  return result.ok ? result.replaced : []
}

/**
 * Single validate path for create + approve.
 * Re-runs catalog `idsExist` so approve does not trust stored JSON blindly.
 */
export async function parseAndValidatePayload(
  ctx: ParseProposalContext,
): Promise<ParsedProposalPayload> {
  const { sql, classSlug } = ctx
  const skipUnknown = Boolean(ctx.skipUnknownCatalog)

  const catalogIdsExist: CatalogIdsExist = async (...args) => {
    const fn = ctx.catalogIdsExist ?? (await import('./queries/catalog')).idsExist
    return fn(...args)
  }
  const parseVideos: ParseVideosFn = async (...args) => {
    const fn = ctx.parseVideos ?? (await import('./parseVideosPayload')).parseVideosPayload
    return fn(...args)
  }

  assertSection(ctx.section)
  const section = ctx.section
  const body = ctx.rawPayload || {}

  if (isComboSection(section)) {
    const mode = comboModeFromSection(section)

    type RawCombo = { title?: unknown; notes?: unknown; skill_ids?: unknown }
    let rawCombos: RawCombo[] = []
    if (Array.isArray(body.combos) && body.combos.length) {
      rawCombos = body.combos as RawCombo[]
    } else if (Array.isArray(body.skill_ids) && body.skill_ids.length) {
      // Legacy single-chain payload
      rawCombos = [{ skill_ids: body.skill_ids }]
    }

    if (!rawCombos.length) {
      throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один скилл' })
    }
    if (rawCombos.length > MAX_COMBOS_PER_MODE) {
      throw createError({
        statusCode: 400,
        statusMessage: `Максимум ${MAX_COMBOS_PER_MODE} комб`,
      })
    }

    const allIds: string[] = []
    const staged: Array<{ title: string; notes: string; skill_ids: string[] }> = []

    for (const entry of rawCombos) {
      const title = String(entry.title ?? '').trim()
      const notes = String(entry.notes ?? '').trim()
      if (title.length > MAX_COMBO_TITLE_LEN) {
        throw createError({
          statusCode: 400,
          statusMessage: `Заголовок комбы: максимум ${MAX_COMBO_TITLE_LEN} символов`,
        })
      }
      if (notes.length > MAX_COMBO_NOTES_LEN) {
        throw createError({
          statusCode: 400,
          statusMessage: `Заметка комбы: максимум ${MAX_COMBO_NOTES_LEN} символов`,
        })
      }
      const rawIds = entry.skill_ids
      if (!Array.isArray(rawIds) || !rawIds.length) continue
      if (rawIds.length > MAX_COMBO_STEPS) {
        throw createError({
          statusCode: 400,
          statusMessage: `Максимум ${MAX_COMBO_STEPS} шагов в одной комбе`,
        })
      }
      const skillIds = rawIds.map((id) => String(id))
      if (skillIds.some((id) => !UUID_RE.test(id))) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный id скилла' })
      }
      allIds.push(...skillIds)
      staged.push({ title, notes, skill_ids: skillIds })
    }

    if (!staged.length) {
      throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один скилл' })
    }

    const allowed = await catalogIdsExist(sql, 'skills', allIds, { classSlug })
    const combos: Array<{ title: string; notes: string; skill_ids: string[] }> = []
    for (const entry of staged) {
      let skillIds = entry.skill_ids
      if (skipUnknown) {
        skillIds = skillIds.filter((id) => allowed.has(id))
      } else if (skillIds.some((id) => !allowed.has(id))) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Скилл не принадлежит этому классу',
        })
      }
      if (!skillIds.length) continue
      combos.push({ title: entry.title, notes: entry.notes, skill_ids: skillIds })
    }

    if (!combos.length) {
      if (skipUnknown) {
        // Stale combo — approve as empty replace for this mode.
        return { payload: { mode, combos: [] }, verifiedVideos: null }
      }
      throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один скилл' })
    }

    return { payload: { mode, combos }, verifiedVideos: null }
  }

  if (isBuffsSection(section)) {
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

  if (isCrystalsSection(section)) {
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

  if (isRelicsSection(section)) {
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

  if (isHardeningSection(section)) {
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

  if (isVideosSection(section)) {
    const verifiedVideos = await parseVideos(body.videos, {
      allowEmpty: Boolean(ctx.allowEmptyVideos),
    })
    return { payload: { videos: verifiedVideos }, verifiedVideos }
  }

  if (isMorphsSection(section)) {
    const raw = body.morphs
    if (!Array.isArray(raw) || raw.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот морфа' })
    }
    if (raw.length > MAX_MORPHS_ALL_PRESETS) {
      throw createError({
        statusCode: 400,
        statusMessage: `Максимум ${MAX_MORPHS_ALL_PRESETS} слотов`,
      })
    }

    const morphs: Array<{
      preset: string
      slot_level: number
      skill_id: string
      effect_ids: [string, string]
      sort_order: number
    }> = []
    const used = new Set<string>()

    for (let i = 0; i < raw.length; i++) {
      const entry = raw[i] as {
        preset?: unknown
        slot_level?: unknown
        skill_id?: unknown
        effect_ids?: unknown
        sort_order?: unknown
      }
      const preset = String(entry?.preset || '')
      const slotLevel = Number(entry?.slot_level)
      const skillId = String(entry?.skill_id || '')
      const effectIds = Array.isArray(entry?.effect_ids)
        ? entry.effect_ids.map((x) => String(x))
        : []
      if (!isMorphPresetId(preset)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет морфов' })
      }
      if (!isMorphSlotLevel(slotLevel)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный слот морфа' })
      }
      const key = `${preset}:${slotLevel}`
      if (used.has(key)) {
        throw createError({ statusCode: 400, statusMessage: 'Дубликат слота морфа' })
      }
      if (!UUID_RE.test(skillId)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный id скилла' })
      }
      if (
        effectIds.length !== 2 ||
        effectIds[0] === effectIds[1] ||
        !effectIds.every((id) => UUID_RE.test(id))
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Нужно ровно 2 разных эффекта на слот',
        })
      }
      used.add(key)
      morphs.push({
        preset,
        slot_level: slotLevel,
        skill_id: skillId,
        effect_ids: [effectIds[0]!, effectIds[1]!],
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const skillIds = [...new Set(morphs.map((m) => m.skill_id))]
    const skillRows = skillIds.length
      ? await sql`
          select id, supports_addon, addon_effect_keys
          from skills
          where class_slug = ${classSlug} and id = any(${skillIds}::uuid[])
        `
      : []
    const skillById = new Map(
      skillRows.map((r) => [
        String(r.id),
        {
          supports_addon: Boolean(r.supports_addon),
          keys: Array.isArray(r.addon_effect_keys)
            ? (r.addon_effect_keys as string[])
            : [],
        },
      ]),
    )
    if (
      !skipUnknown &&
      skillIds.some((id) => !skillById.has(id) || !skillById.get(id)!.supports_addon)
    ) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный скилл класса' })
    }

    const effectIds = [...new Set(morphs.flatMap((m) => m.effect_ids))]
    const fxRows = effectIds.length
      ? await sql`
          select id, key from skill_addon_effects where id = any(${effectIds}::uuid[])
        `
      : []
    const fxKeyById = new Map(fxRows.map((r) => [String(r.id), String(r.key)]))
    if (!skipUnknown && effectIds.some((id) => !fxKeyById.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный эффект морфа' })
    }

    const kept = morphs.filter((m) => {
      const skill = skillById.get(m.skill_id)
      if (!skill) return false
      // Submit: require addon support. Approve skipUnknown: skill still in catalog is enough.
      if (!skipUnknown && !skill.supports_addon) return false
      const allow = new Set(skill.keys)
      for (const eid of m.effect_ids) {
        const key = fxKeyById.get(eid)
        if (!key) return false
        if (allow.size && !allow.has(key)) return false
      }
      return true
    })

    if (!skipUnknown) {
      for (const m of morphs) {
        const skill = skillById.get(m.skill_id)!
        const allow = new Set(skill.keys)
        for (const eid of m.effect_ids) {
          const key = fxKeyById.get(eid)!
          if (allow.size && !allow.has(key)) {
            throw createError({
              statusCode: 400,
              statusMessage: 'Эффект недоступен для выбранного скилла',
            })
          }
        }
      }
    }

    if (!kept.length) {
      if (skipUnknown) {
        return {
          payload: {
            morphs: [],
            replaced_presets: replacedAfterCatalogDrop(
              body.replaced_presets,
              morphs.map((m) => m.preset),
              isMorphPresetId,
            ),
          },
          verifiedVideos: null,
        }
      }
      throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот морфа' })
    }

    const replaced_presets = replacedPresetsOrThrow(
      body.replaced_presets,
      morphs.map((m) => m.preset),
      kept.map((m) => m.preset),
      isMorphPresetId,
    )
    return { payload: { morphs: kept, replaced_presets }, verifiedVideos: null }
  }

  if (isSummarySection(section)) {
    const text = sanitizeMarkdown(String(body.text ?? '').trim())
    if (!text) {
      throw createError({ statusCode: 400, statusMessage: 'Текст пустой' })
    }
    if (text.length > MAX_TEXT_LEN) {
      throw createError({ statusCode: 400, statusMessage: 'Текст слишком длинный' })
    }
    return { payload: { text }, verifiedVideos: null }
  }

  throw createError({ statusCode: 400, statusMessage: 'Неизвестная секция' })
}
