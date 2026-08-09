import { createError } from 'h3'
import { PROPOSAL_SECTIONS, type ProposalSection } from '@domain'
import { dispatchParseSection } from './proposals/parse/registry'
import type {
  CatalogIdsExist,
  ParseProposalContext,
  ParseVideosFn,
  ParsedProposalPayload,
} from './proposals/parse/types'

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
  const catalogIdsExist: CatalogIdsExist = async (...args) => {
    const fn = ctx.catalogIdsExist ?? (await import('./queries/catalog')).idsExist
    return fn(...args)
  }
  const parseVideos: ParseVideosFn = async (...args) => {
    const fn = ctx.parseVideos ?? (await import('./parseVideosPayload')).parseVideosPayload
    return fn(...args)
  }

  assertSection(ctx.section)
  return dispatchParseSection({
    sql: ctx.sql,
    classSlug: ctx.classSlug,
    section: ctx.section,
    body: ctx.rawPayload || {},
    skipUnknown: Boolean(ctx.skipUnknownCatalog),
    allowEmptyVideos: Boolean(ctx.allowEmptyVideos),
    catalogIdsExist,
    parseVideos,
  })
}
