import { createError } from 'h3'
import {
  PROPOSAL_SECTIONS,
  classSummaryField,
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
  finalizeReplacedPresets,
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

function replacedForApply(
  raw: unknown,
  rowPresets: readonly string[],
  isValid: (id: string) => boolean,
): string[] {
  const result = finalizeReplacedPresets(raw, rowPresets, rowPresets, isValid)
  if (!result.ok) {
    // Approve no-op: catalog dropped every row and there are no intentional clears.
    if (result.reason === 'empty' && rowPresets.length === 0) return []
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

/** Apply a proposal to live guide tables (one transaction). */
export async function applyProposal(
  proposal: ProposalRow,
  opts?: { reviewNote?: string | null; reapply?: boolean; allowEmptyVideos?: boolean },
) {
  const reapply = Boolean(opts?.reapply)
  if (reapply) {
    if (proposal.status !== 'approved') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Повторно применить можно только одобренное',
      })
    }
  } else if (proposal.status !== 'pending') {
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
      skipUnknownCatalog: true,
      allowEmptyVideos: Boolean(opts?.allowEmptyVideos),
    }),
  )
  const payload = parsed.payload
  const verifiedVideos: ParsedGuideVideo[] | null = parsed.verifiedVideos

  await withDbError(async () => {
    await sql.begin(async (tx) => {
      if (reapply) {
        const claimed = await tx`
          update guide_proposals
          set
            reviewed_at = now(),
            review_note = coalesce(
              ${opts?.reviewNote ?? null},
              nullif(trim(review_note), ''),
              'повторно применено'
            )
          where id = ${proposal.id} and status = 'approved'
          returning id
        `
        if (!claimed.length) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Повторно применить можно только одобренное',
          })
        }
      } else {
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

      // Serialize concurrent applies for the same class + section (last-write races).
      await tx`
        select pg_advisory_xact_lock(
          hashtext(${proposal.class_id}::text),
          hashtext(${section})
        )
      `

      if (isComboSection(section)) {
        const mode = comboModeFromSection(section)
        const rawKind = payload.kind == null ? 'pvp' : String(payload.kind)
        const kind = rawKind === 'pve' ? 'pve' : 'pvp'
        type ComboEntry = { title?: unknown; notes?: unknown; skill_ids?: unknown }
        let rawCombos: ComboEntry[] = []
        if (Array.isArray(payload.combos)) {
          rawCombos = payload.combos as ComboEntry[]
        } else if (Array.isArray(payload.skill_ids)) {
          rawCombos = [{ skill_ids: payload.skill_ids }]
        }

        await tx`
          delete from guide_combos
          where guide_id = ${guide.id} and mode = ${mode} and kind = ${kind}
        `

        for (let ci = 0; ci < rawCombos.length; ci++) {
          const entry = rawCombos[ci]!
          const skillIds = Array.isArray(entry.skill_ids)
            ? entry.skill_ids.map((x) => String(x))
            : []
          if (!skillIds.length) continue
          const title = String(entry.title ?? '').trim() || null
          const notes = String(entry.notes ?? '').trim() || null
          const inserted = await tx`
            insert into guide_combos (guide_id, mode, kind, sort_order, title, notes)
            values (${guide.id}, ${mode}, ${kind}, ${ci}, ${title}, ${notes})
            returning id
          `
          const comboId = inserted[0]?.id
          if (!comboId) continue
          const rows = skillIds.map((skill_id, i) => ({
            guide_id: guide.id,
            combo_id: comboId,
            skill_id,
            sort_order: i,
          }))
          await tx`
            insert into guide_combo_steps ${tx(rows, 'guide_id', 'combo_id', 'skill_id', 'sort_order')}
          `
        }
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
        const replaced = replacedForApply(
          payload.replaced_presets,
          rows.map((r) => r.preset),
          isCrystalPresetId,
        )

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
        const replaced = replacedForApply(
          payload.replaced_presets,
          rows.map((r) => r.preset),
          isCrystalPresetId,
        )

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

        const replaced = replacedForApply(
          payload.replaced_presets,
          [...relicRows.map((r) => r.preset), ...lightRows.map((r) => r.preset)],
          isCrystalPresetId,
        )

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
        const replaced = replacedForApply(
          payload.replaced_presets,
          rows.map((r) => r.preset),
          isCrystalPresetId,
        )

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
        if (!verifiedVideos) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректные данные видео' })
        }

        const mode = videoModeFromSection(section)
        const prevRows = await tx`
          select youtube_url, status, status_since
          from class_videos
          where class_id = ${proposal.class_id} and mode = ${mode}
        `
        const prevByUrl = new Map(
          prevRows.map((r) => [
            String(r.youtube_url),
            {
              status: String(r.status || 'ready'),
              status_since: r.status_since as Date | string,
            },
          ]),
        )

        const rows = verifiedVideos.map((v) => {
          const prev = prevByUrl.get(v.youtube_url)
          const status = v.status
          let statusSince: Date | string = new Date()
          if (
            status === 'processing' &&
            prev?.status === 'processing' &&
            prev.status_since
          ) {
            statusSince = prev.status_since
          }
          return {
            class_id: proposal.class_id,
            title: v.title,
            youtube_url: v.youtube_url,
            sort_order: v.sort_order,
            mode,
            status,
            status_since: statusSince,
          }
        })

        await tx`
          delete from class_videos
          where class_id = ${proposal.class_id} and mode = ${mode}
        `
        if (rows.length) {
          await tx`
            insert into class_videos ${tx(
              rows,
              'class_id',
              'title',
              'youtube_url',
              'sort_order',
              'mode',
              'status',
              'status_since',
            )}
          `
        }
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
        const replaced = replacedForApply(
          payload.replaced_presets,
          rows.map((r) => r.preset),
          isMorphPresetId,
        )

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
        const rawKind = payload.kind == null ? 'pvp' : String(payload.kind)
        const kind = rawKind === 'pve' ? 'pve' : 'pvp'
        const mode = summaryModeFromSection(section)
        if (kind === 'pve' && mode === 'succession') {
          await tx`
            update class_guides
            set summary_pve_succession = ${text}
            where id = ${guide.id}
          `
        } else if (kind === 'pve') {
          await tx`
            update class_guides
            set summary_pve_awakening = ${text}
            where id = ${guide.id}
          `
        } else if (mode === 'succession') {
          await tx`
            update class_guides
            set summary_pvp_succession = ${text}
            where id = ${guide.id}
          `
        } else {
          await tx`
            update class_guides
            set summary_pvp_awakening = ${text}
            where id = ${guide.id}
          `
        }
      } else {
        throw createError({ statusCode: 400, statusMessage: 'Неизвестная секция' })
      }

      let metaKey = uiSectionFromProposal(section)
      if (isSummarySection(section)) {
        const rawKind = payload.kind == null ? 'pvp' : String(payload.kind)
        const kind = rawKind === 'pve' ? 'pve' : 'pvp'
        metaKey = classSummaryField(kind, summaryModeFromSection(section))
      }
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
