import type { ProposalSection } from '@domain'
import type { Sql } from '../../db'
import type { ParsedGuideVideo, ParseVideosOptions } from '../../parseVideosPayload'

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

/** Resolved deps + body for a single section parse handler. */
export type ParseSectionContext = {
  sql: Sql
  classSlug: string
  section: ProposalSection
  body: Record<string, unknown>
  skipUnknown: boolean
  allowEmptyVideos: boolean
  catalogIdsExist: CatalogIdsExist
  parseVideos: ParseVideosFn
}
