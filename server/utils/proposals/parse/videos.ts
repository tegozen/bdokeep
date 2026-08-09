import type { ParseSectionContext, ParsedProposalPayload } from './types'

export async function parseVideos(ctx: ParseSectionContext): Promise<ParsedProposalPayload> {
  const verifiedVideos = await ctx.parseVideos(ctx.body.videos, {
    allowEmpty: Boolean(ctx.allowEmptyVideos),
  })
  return { payload: { videos: verifiedVideos }, verifiedVideos }
}
