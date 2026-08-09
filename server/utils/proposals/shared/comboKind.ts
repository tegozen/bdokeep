import { createError } from 'h3'
import { isComboKindId, type ComboKindId } from '@domain'

/** Strict kind from already-parsed payload (no silent coerce to pvp). */
export function comboKindFromPayload(payload: Record<string, unknown>): ComboKindId {
  const raw = payload.kind == null ? 'pvp' : String(payload.kind)
  if (!isComboKindId(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный тип комбы' })
  }
  return raw
}
