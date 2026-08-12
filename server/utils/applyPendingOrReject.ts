import { applyProposal } from './applyProposal'
import { useDb } from './db'

type ProposalRow = {
  id: string
  class_id: string
  class_slug?: string
  section: string
  payload: Record<string, unknown> | null
  status: string
  author_label?: string | null
}

const MAX_REJECT_NOTE = 500

/** Build review_note for auto-reject after failed apply. Exported for unit tests. */
export function formatApplyRejectNote(err: unknown): string {
  const statusMessage =
    err && typeof err === 'object' && 'statusMessage' in err
      ? String((err as { statusMessage?: unknown }).statusMessage || '').trim()
      : ''
  const message =
    err instanceof Error ? err.message.trim() : statusMessage || String(err || '').trim()
  const detail = (statusMessage || message || 'unknown error').slice(0, 400)
  return `auto-reject: apply failed — ${detail}`.slice(0, MAX_REJECT_NOTE)
}

/**
 * applyProposal for a freshly inserted pending row.
 * If apply fails before/without claiming, mark the row rejected so it is not orphaned.
 */
export async function applyPendingOrReject(
  proposal: ProposalRow,
  opts?: {
    reviewNote?: string | null
    allowEmptyVideos?: boolean
    /** When false, failed apply leaves the row pending (staff auto-approve). Default true. */
    rejectOnFailure?: boolean
  },
) {
  const rejectOnFailure = opts?.rejectOnFailure !== false
  try {
    await applyProposal(proposal, opts)
  } catch (err) {
    if (rejectOnFailure) {
      const note = formatApplyRejectNote(err)
      try {
        const sql = useDb()
        await sql`
          update guide_proposals
          set
            status = 'rejected',
            reviewed_at = now(),
            review_note = ${note}
          where id = ${proposal.id} and status = 'pending'
        `
      } catch {
        // Best-effort cleanup; surface the original apply error.
      }
    }
    throw err
  }
}
