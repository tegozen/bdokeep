/** Shallow-clone a slot → item board (crystals / relics / hardening). */
export function cloneItemBoard<T extends object>(
  board: Record<string, T>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(board).map(([slot, item]) => [slot, { ...item }]),
  )
}

/** Shallow-clone an ordered list (buffs). */
export function cloneItemList<T extends object>(items: readonly T[]): T[] {
  return items.map((item) => ({ ...item }))
}

type MorphSlotClone = {
  skill: object
  effectIds: [string | null, string | null]
}

/** Clone a morph board (skill + effect id tuple per level). */
export function cloneMorphBoard<T extends MorphSlotClone>(
  board: Partial<Record<number, T>>,
  levels: readonly number[],
): Partial<Record<number, T>> {
  const next: Partial<Record<number, T>> = {}
  for (const level of levels) {
    const slot = board[level]
    if (!slot?.skill) continue
    next[level] = {
      ...slot,
      skill: { ...slot.skill },
      effectIds: [slot.effectIds[0], slot.effectIds[1]],
    } as T
  }
  return next
}

/** Payload helper: UI always full-replaces the given preset id list. */
export function fullReplacedPresets<T extends string>(ids: readonly T[]): T[] {
  return [...ids]
}
