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
