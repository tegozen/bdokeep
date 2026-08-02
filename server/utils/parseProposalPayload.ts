import type { Sql } from './db'
import {
  MAX_BUFFS,
  MAX_BUFFS_ALL_PRESETS,
  MAX_COMBO_STEPS,
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
  type ProposalSection,
} from '@domain'
import { idsExist } from './queries/catalog'
import { parseVideosPayload, type ParsedGuideVideo } from './parseVideosPayload'
import { sanitizeMarkdown } from './sanitizeMarkdown'

export type ParseProposalContext = {
  sql: Sql
  classSlug: string
  section: ProposalSection
  rawPayload: Record<string, unknown> | null | undefined
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

/**
 * Single validate path for create + approve.
 * Re-runs catalog `idsExist` so approve does not trust stored JSON blindly.
 */
export async function parseAndValidatePayload(
  ctx: ParseProposalContext,
): Promise<ParsedProposalPayload> {
  const { sql, classSlug } = ctx
  assertSection(ctx.section)
  const section = ctx.section
  const body = ctx.rawPayload || {}

  if (isComboSection(section)) {
    const mode = comboModeFromSection(section)
    const rawIds = body.skill_ids
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один скилл' })
    }
    if (rawIds.length > MAX_COMBO_STEPS) {
      throw createError({ statusCode: 400, statusMessage: `Максимум ${MAX_COMBO_STEPS} шагов` })
    }
    const skillIds = rawIds.map((id) => String(id))
    if (skillIds.some((id) => !UUID_RE.test(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный id скилла' })
    }
    const allowed = await idsExist(sql, 'skills', skillIds, { classSlug })
    if (skillIds.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Скилл не принадлежит этому классу' })
    }
    return { payload: { mode, skill_ids: skillIds }, verifiedVideos: null }
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
    const allowed = await idsExist(sql, 'buffs', buffIds)
    if (buffIds.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный баф' })
    }
    return { payload: { buffs: buffsPayload }, verifiedVideos: null }
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
      usedKeys.add(key)
      if (!UUID_RE.test(itemId)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный id кристалла' })
      }
      crystals.push({
        preset,
        slot,
        item_id: itemId,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const itemIds = crystals.map((c) => c.item_id)
    const allowed = await idsExist(sql, 'items', itemIds, { itemType: 'crystal' })
    if (itemIds.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный кристалл' })
    }
    return { payload: { crystals }, verifiedVideos: null }
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

    if (relics.length) {
      const ids = relics.map((r) => r.item_id)
      const allowed = await idsExist(sql, 'items', ids, { itemType: 'relic' })
      if (ids.some((id) => !allowed.has(id))) {
        throw createError({ statusCode: 400, statusMessage: 'Неизвестная реликвия' })
      }
    }
    if (lightstones.length) {
      const ids = lightstones.map((r) => r.item_id)
      const allowed = await idsExist(sql, 'items', ids, { itemType: 'lightstone' })
      if (ids.some((id) => !allowed.has(id))) {
        throw createError({ statusCode: 400, statusMessage: 'Неизвестный светящийся камень' })
      }
    }

    return { payload: { relics, lightstones }, verifiedVideos: null }
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
      usedSlots.add(slotKey)
      const itemKey = `${preset}:${itemId}`
      if (usedItems.has(itemKey)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Одинаковые камни закалки в одном пресете нельзя',
        })
      }
      usedItems.add(itemKey)
      if (!UUID_RE.test(itemId)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный id камня закалки' })
      }
      hardening.push({
        preset,
        slot,
        item_id: itemId,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const itemIds = hardening.map((c) => c.item_id)
    const allowed = await idsExist(sql, 'items', itemIds, { itemType: 'essence' })
    if (itemIds.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный камень закалки' })
    }
    return { payload: { hardening }, verifiedVideos: null }
  }

  if (isVideosSection(section)) {
    const verifiedVideos = await parseVideosPayload(body.videos)
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
      used.add(key)
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
      morphs.push({
        preset,
        slot_level: slotLevel,
        skill_id: skillId,
        effect_ids: [effectIds[0]!, effectIds[1]!],
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const skillIds = [...new Set(morphs.map((m) => m.skill_id))]
    const allowedSkills = await idsExist(sql, 'skills', skillIds, { classSlug })
    if (skillIds.some((id) => !allowedSkills.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный скилл класса' })
    }

    const effectIds = [...new Set(morphs.flatMap((m) => m.effect_ids))]
    const allowedFx = await idsExist(sql, 'skill_addon_effects', effectIds)
    if (effectIds.some((id) => !allowedFx.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный эффект морфа' })
    }

    return { payload: { morphs }, verifiedVideos: null }
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
