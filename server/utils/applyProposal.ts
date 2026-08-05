import { createError } from 'h3'
import {
  PROPOSAL_SECTIONS,
  isBuffsSection,
  isComboSection,
  isCrystalsSection,
  isHardeningSection,
  isMorphsSection,
  isRelicsSection,
  isSummarySection,
  isVideosSection,
  finalizeReplacedPresets,
  uiSectionFromProposal,
  type ProposalSection,
} from '@bdokeep/domain'
import type { ParsedGuideVideo } from './parseVideosPayload'
import { applyBuffsSection } from '../modules/buffs'
import { applyComboSection } from '../modules/combo'
import { applyCrystalsSection } from '../modules/crystals'
import { applyHardeningSection } from '../modules/hardening'
import { applyMorphsSection } from '../modules/morphs'
import { applyRelicsSection } from '../modules/relics'
import { applySummarySection } from '../modules/summary'
import { applyVideosSection } from '../modules/videos'

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

      const applyCtx = {
        guideId: guide.id as string,
        classId: proposal.class_id,
        payload,
        replacedForApply,
      }

      if (isComboSection(section)) {
        await applyComboSection(tx, { ...applyCtx, section })
      } else if (isBuffsSection(section)) {
        await applyBuffsSection(tx, applyCtx)
      } else if (isCrystalsSection(section)) {
        await applyCrystalsSection(tx, applyCtx)
      } else if (isRelicsSection(section)) {
        await applyRelicsSection(tx, applyCtx)
      } else if (isHardeningSection(section)) {
        await applyHardeningSection(tx, applyCtx)
      } else if (isVideosSection(section)) {
        await applyVideosSection(tx, {
          ...applyCtx,
          section,
          verifiedVideos,
        })
      } else if (isMorphsSection(section)) {
        await applyMorphsSection(tx, applyCtx)
      } else if (isSummarySection(section)) {
        await applySummarySection(tx, { ...applyCtx, section })
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
