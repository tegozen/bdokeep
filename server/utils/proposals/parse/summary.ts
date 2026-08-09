import { createError } from 'h3'
import { MAX_TEXT_LEN, isComboKindId } from '@domain'
import { sanitizeMarkdown } from '../../sanitizeMarkdown'
import type { ParseSectionContext, ParsedProposalPayload } from './types'

export async function parseSummary(ctx: ParseSectionContext): Promise<ParsedProposalPayload> {
  const { body } = ctx
  const text = sanitizeMarkdown(String(body.text ?? '').trim())
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'Текст пустой' })
  }
  if (text.length > MAX_TEXT_LEN) {
    throw createError({ statusCode: 400, statusMessage: 'Текст слишком длинный' })
  }
  const rawKind = body.kind == null ? 'pvp' : String(body.kind)
  if (!isComboKindId(rawKind)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный тип заметок' })
  }
  return { payload: { text, kind: rawKind }, verifiedVideos: null }
}
