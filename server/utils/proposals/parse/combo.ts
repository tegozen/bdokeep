import { createError } from 'h3'
import {
  MAX_COMBO_NOTES_LEN,
  MAX_COMBO_STEPS,
  MAX_COMBO_TITLE_LEN,
  UUID_RE,
  comboModeFromSection,
  isComboKindId,
} from '@domain'
import type { ParseSectionContext, ParsedProposalPayload } from './types'

export async function parseCombo(ctx: ParseSectionContext): Promise<ParsedProposalPayload> {
  const { sql, classSlug, section, body, skipUnknown, catalogIdsExist } = ctx
  const mode = comboModeFromSection(section)
  const rawKind = body.kind == null ? 'pvp' : String(body.kind)
  if (!isComboKindId(rawKind)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный тип комбы' })
  }
  const kind = rawKind

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
    if (!notes) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Укажите заметку для каждой комбы',
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
      // Stale combo — approve as empty replace for this mode+kind.
      return { payload: { mode, kind, combos: [] }, verifiedVideos: null }
    }
    throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один скилл' })
  }

  return { payload: { mode, kind, combos }, verifiedVideos: null }
}
