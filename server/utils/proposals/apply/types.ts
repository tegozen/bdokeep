import type { ProposalSection } from '@domain'
import type { Sql } from '../../db'
import type { ParsedGuideVideo } from '../../parseVideosPayload'

export type ProposalRow = {
  id: string
  class_id: string
  class_slug?: string
  section: string
  payload: Record<string, unknown> | null
  status: string
  author_label?: string | null
}

export type ApplySectionContext = {
  tx: Sql
  guide: { id: string }
  proposal: ProposalRow
  section: ProposalSection
  payload: Record<string, unknown>
  verifiedVideos: ParsedGuideVideo[] | null
}
