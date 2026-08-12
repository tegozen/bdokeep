import { createError } from 'h3'
import {
  PROPOSAL_SECTIONS,
  classSummaryField,
  comboModeFromSection,
  comboSectionUpdateKey,
  isComboSection,
  isSummarySection,
  summaryModeFromSection,
  uiSectionFromProposal,
  type ProposalSection,
} from '@domain'
import type { ParsedGuideVideo } from './parseVideosPayload'
import { dispatchApplySection } from './proposals/apply/registry'
import type { ProposalRow } from './proposals/apply/types'
import { comboKindFromPayload } from './proposals/shared/comboKind'

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

  await assertNotDestructiveApply(sql, String(proposal.class_id), section, payload, {
    allowEmptyVideos: Boolean(opts?.allowEmptyVideos),
  })

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

      await dispatchApplySection({
        tx,
        guide: { id: String(guide.id) },
        proposal,
        section,
        payload,
        verifiedVideos,
      })

      let metaKey = uiSectionFromProposal(section)
      if (isSummarySection(section)) {
        metaKey = classSummaryField(
          comboKindFromPayload(payload),
          summaryModeFromSection(section),
        )
      } else if (isComboSection(section)) {
        metaKey = comboSectionUpdateKey(
          comboKindFromPayload(payload),
          comboModeFromSection(section),
        )
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
