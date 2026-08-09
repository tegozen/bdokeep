import { createError } from 'h3'
import { finalizeReplacedPresets } from '@domain'

export function replacedPresetsOrThrow(
  raw: unknown,
  structuralPresets: readonly string[],
  keptPresets: readonly string[],
  isValid: (id: string) => boolean,
): string[] {
  const result = finalizeReplacedPresets(raw, structuralPresets, keptPresets, isValid)
  if (!result.ok) {
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

/** Approve path: all catalog rows gone — keep intentional clears only (or []). */
export function replacedAfterCatalogDrop(
  raw: unknown,
  structuralPresets: readonly string[],
  isValid: (id: string) => boolean,
): string[] {
  const result = finalizeReplacedPresets(raw, structuralPresets, [], isValid)
  return result.ok ? result.replaced : []
}

export function replacedForApply(
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
