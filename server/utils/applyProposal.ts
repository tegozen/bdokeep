import {
  PROPOSAL_SECTIONS,
  comboModeFromSection,
  isBuffsSection,
  isComboSection,
  isCrystalPresetId,
  isCrystalsSection,
  isHardeningSection,
  isMorphPresetId,
  isMorphsSection,
  isRelicsSection,
  isSummarySection,
  isVideosSection,
  resolveReplacedPresets,
  summaryModeFromSection,
  uiSectionFromProposal,
  videoModeFromSection,
  type ProposalSection,
} from '@domain'
import type { ParsedGuideVideo } from './parseVideosPayload'

type ProposalRow = {
  id: string
  class_id: string
  class_slug?: string
  section: string
  payload: Record<string, unknown> | null
  status: string
  author_label?: string | null
}

/** Apply a pending proposal to live guide tables and mark approved (one transaction). */
export async function applyProposal(
  proposal: ProposalRow,
  opts?: { reviewNote?: string | null },
) {
  if (proposal.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Уже рассмотрено' })
  }

  if (!(PROPOSAL_SECTIONS as readonly string[]).includes(proposal.section)) {
    throw createError({ statusCode: 400, statusMessage: 'Неизвестная секция' })
  }
  const section = proposal.section as ProposalSection
  const sql = useDb()

  let classSlug = String(proposal.class_slug || '').trim()
  if (!classSlug) {
    const rows = await withDbError(async () => {
      return await sql`
        select slug from classes where id = ${proposal.class_id} limit 1
      `
    })
    classSlug = String(rows[0]?.slug || '')
  }
  if (!classSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Класс не найден' })
  }

  // Re-validate (+ ytimg probe) before claiming the row / holding locks.
  const parsed = await withDbError(() =>
    parseAndValidatePayload({
      sql,
      classSlug,
      section,
      rawPayload: proposal.payload,
    }),
  )
  const payload = parsed.payload
  const verifiedVideos: ParsedGuideVideo[] | null = parsed.verifiedVideos

  await withDbError(async () => {
    await sql.begin(async (tx) => {
      const claimed = await tx`
        update guide_proposals
        set
          status = 'approved',
          reviewed_at = now(),
          review_note = ${opts?.reviewNote ?? null}
        where id = ${proposal.id} and status = 'pending'
        returning id
      `
      if (!claimed.length) {
        throw createError({ statusCode: 409, statusMessage: 'Уже рассмотрено' })
      }

      let guideRows = await tx`
        select id from class_guides where class_id = ${proposal.class_id} limit 1
      `
      let guide = guideRows[0]

      if (!guide) {
        guideRows = await tx`
          insert into class_guides (class_id)
          values (${proposal.class_id})
          returning id
        `
        guide = guideRows[0]
      }

      if (!guide) {
        throw createError({ statusCode: 502, statusMessage: 'Ошибка базы данных' })
      }

      if (isComboSection(section)) {
        const mode = comboModeFromSection(section)
        const skillIds = Array.isArray(payload.skill_ids)
          ? payload.skill_ids.map((x) => String(x))
          : []

        await tx`
          delete from guide_combo_steps
          where guide_id = ${guide.id} and mode = ${mode}
        `

        const rows = skillIds.map((skill_id, i) => ({
          guide_id: guide.id,
          mode,
          skill_id,
          sort_order: i,
        }))
        await tx`
          insert into guide_combo_steps ${tx(rows, 'guide_id', 'mode', 'skill_id', 'sort_order')}
        `
      } else if (isBuffsSection(section)) {
        const rawBuffs = Array.isArray(payload.buffs) ? payload.buffs : []
        const rows = rawBuffs.map((entry, i) => {
          const e = entry as {
            preset?: unknown
            buff_id?: unknown
            sort_order?: unknown
          }
          return {
            guide_id: guide.id,
            buff_id: String(e.buff_id || ''),
            preset: String(e.preset || 't1'),
            sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
          }
        })
        const replaced = resolveReplacedPresets(
          payload.replaced_presets,
          rows.map((r) => r.preset),
          isCrystalPresetId,
        )
        if (!replaced.length) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
        }

        await tx`
          delete from guide_buffs
          where guide_id = ${guide.id} and preset = any(${replaced}::text[])
        `
        if (rows.length) {
          await tx`
            insert into guide_buffs ${tx(rows, 'guide_id', 'buff_id', 'preset', 'sort_order')}
          `
        }
      } else if (isCrystalsSection(section)) {
        const raw = Array.isArray(payload.crystals) ? payload.crystals : []
        const rows = raw.map((entry, i) => {
          const e = entry as {
            preset?: unknown
            slot?: unknown
            item_id?: unknown
            sort_order?: unknown
          }
          return {
            guide_id: guide.id,
            item_id: String(e.item_id || ''),
            slot: String(e.slot || ''),
            preset: String(e.preset || ''),
            sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
          }
        })
        const replaced = resolveReplacedPresets(
          payload.replaced_presets,
          rows.map((r) => r.preset),
          isCrystalPresetId,
        )
        if (!replaced.length) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
        }

        await tx`
          delete from guide_crystals
          where guide_id = ${guide.id} and preset = any(${replaced}::text[])
        `
        if (rows.length) {
          await tx`
            insert into guide_crystals ${tx(rows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
          `
        }
      } else if (isRelicsSection(section)) {
        const rawRelics = Array.isArray(payload.relics) ? payload.relics : []
        const rawLights = Array.isArray(payload.lightstones) ? payload.lightstones : []

        const relicRows = rawRelics.map((entry, i) => {
          const e = entry as {
            preset?: unknown
            slot?: unknown
            item_id?: unknown
            sort_order?: unknown
          }
          return {
            guide_id: guide.id,
            item_id: String(e.item_id || ''),
            slot: String(e.slot || ''),
            preset: String(e.preset || ''),
            sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
          }
        })

        const lightRows = rawLights.map((entry, i) => {
          const e = entry as {
            preset?: unknown
            slot?: unknown
            item_id?: unknown
            sort_order?: unknown
          }
          return {
            guide_id: guide.id,
            item_id: String(e.item_id || ''),
            slot: String(e.slot || ''),
            preset: String(e.preset || ''),
            sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
          }
        })

        const replaced = resolveReplacedPresets(
          payload.replaced_presets,
          [...relicRows.map((r) => r.preset), ...lightRows.map((r) => r.preset)],
          isCrystalPresetId,
        )
        if (!replaced.length) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
        }

        await tx`
          delete from guide_relics
          where guide_id = ${guide.id} and preset = any(${replaced}::text[])
        `
        await tx`
          delete from guide_lightstones
          where guide_id = ${guide.id} and preset = any(${replaced}::text[])
        `

        if (relicRows.length) {
          await tx`
            insert into guide_relics ${tx(relicRows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
          `
        }
        if (lightRows.length) {
          await tx`
            insert into guide_lightstones ${tx(lightRows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
          `
        }
      } else if (isHardeningSection(section)) {
        const raw = Array.isArray(payload.hardening) ? payload.hardening : []
        const rows = raw.map((entry, i) => {
          const e = entry as {
            preset?: unknown
            slot?: unknown
            item_id?: unknown
            sort_order?: unknown
          }
          return {
            guide_id: guide.id,
            item_id: String(e.item_id || ''),
            slot: String(e.slot || ''),
            preset: String(e.preset || ''),
            sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
          }
        })
        const replaced = resolveReplacedPresets(
          payload.replaced_presets,
          rows.map((r) => r.preset),
          isCrystalPresetId,
        )
        if (!replaced.length) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
        }

        await tx`
          delete from guide_essence
          where guide_id = ${guide.id} and preset = any(${replaced}::text[])
        `
        if (rows.length) {
          await tx`
            insert into guide_essence ${tx(rows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
          `
        }
      } else if (isVideosSection(section)) {
        if (!verifiedVideos?.length) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректные данные видео' })
        }

        const mode = videoModeFromSection(section)
        const rows = verifiedVideos.map((v) => ({
          class_id: proposal.class_id,
          title: v.title,
          youtube_url: v.youtube_url,
          sort_order: v.sort_order,
          mode,
        }))

        await tx`
          delete from class_videos
          where class_id = ${proposal.class_id} and mode = ${mode}
        `
        await tx`
          insert into class_videos ${tx(rows, 'class_id', 'title', 'youtube_url', 'sort_order', 'mode')}
        `
      } else if (isMorphsSection(section)) {
        const raw = Array.isArray(payload.morphs) ? payload.morphs : []
        const rows = raw.map((entry, i) => {
          const e = entry as {
            preset?: unknown
            slot_level?: unknown
            skill_id?: unknown
            effect_ids?: unknown
            sort_order?: unknown
          }
          const effectIds = Array.isArray(e.effect_ids) ? e.effect_ids.map((x) => String(x)) : []
          return {
            guide_id: guide.id,
            preset: String(e.preset || ''),
            slot_level: Number(e.slot_level),
            skill_id: String(e.skill_id || ''),
            effect_id_1: effectIds[0]!,
            effect_id_2: effectIds[1]!,
            sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
          }
        })
        const replaced = resolveReplacedPresets(
          payload.replaced_presets,
          rows.map((r) => r.preset),
          isMorphPresetId,
        )
        if (!replaced.length) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
        }

        await tx`
          delete from guide_morphs
          where guide_id = ${guide.id} and preset = any(${replaced}::text[])
        `
        if (rows.length) {
          await tx`
            insert into guide_morphs ${tx(
              rows,
              'guide_id',
              'preset',
              'slot_level',
              'skill_id',
              'effect_id_1',
              'effect_id_2',
              'sort_order',
            )}
          `
        }
      } else if (isSummarySection(section)) {
        const text = String(payload.text || '').trim()
        if (summaryModeFromSection(section) === 'succession') {
          await tx`
            update class_guides
            set summary_succession = ${text}
            where id = ${guide.id}
          `
        } else {
          await tx`
            update class_guides
            set summary_awakening = ${text}
            where id = ${guide.id}
          `
        }
      } else {
        throw createError({ statusCode: 400, statusMessage: 'Неизвестная секция' })
      }

      const metaKey = uiSectionFromProposal(section)
      if (!metaKey) {
        throw createError({ statusCode: 400, statusMessage: 'Неизвестная секция' })
      }
      const updatedBy = String(proposal.author_label || '').trim() || null
      const patch = {
        [metaKey]: {
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        },
      }

      await tx`
        update class_guides
        set
          updated_at = now(),
          section_updates = coalesce(section_updates, '{}'::jsonb) || ${sql.json(patch)}
        where id = ${guide.id}
      `

      await tx`
        update guide_proposals
        set payload = ${sql.json(payload)}
        where id = ${proposal.id}
      `
    })
  })
}
