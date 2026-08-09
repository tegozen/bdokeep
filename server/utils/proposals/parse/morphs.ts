import { createError } from 'h3'
import {
  MAX_MORPHS_ALL_PRESETS,
  UUID_RE,
  isMorphPresetId,
  isMorphSlotLevel,
} from '@domain'
import {
  replacedAfterCatalogDrop,
  replacedPresetsOrThrow,
} from '../shared/replacedPresets'
import type { ParseSectionContext, ParsedProposalPayload } from './types'

export async function parseMorphs(ctx: ParseSectionContext): Promise<ParsedProposalPayload> {
  const { sql, classSlug, body, skipUnknown } = ctx
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
