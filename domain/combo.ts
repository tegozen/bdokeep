/** Combo editor dividers → proposal payload (and reverse). */

export type ComboEditorSkill = {
  kind: 'skill'
  id: string
  name_ru?: string
  icon_url?: string | null
}

export type ComboEditorDivider = {
  kind: 'divider'
  key: string
  notes: string
}

export type ComboEditorItem = ComboEditorSkill | ComboEditorDivider

export type ComboPayloadEntry = {
  notes: string
  skill_ids: string[]
}

/**
 * Split a flat editor list on dividers into combos.
 * Trailing / empty dividers are dropped (no validation error).
 * Consecutive dividers: last notes before a skill chain wins.
 */
export function combosFromEditorItems(items: readonly ComboEditorItem[]): ComboPayloadEntry[] {
  const result: ComboPayloadEntry[] = []
  let pendingNotes = ''
  let currentSkills: string[] = []

  function flush() {
    if (!currentSkills.length) return
    result.push({
      notes: pendingNotes.trim(),
      skill_ids: [...currentSkills],
    })
    currentSkills = []
    pendingNotes = ''
  }

  for (const item of items) {
    if (item.kind === 'divider') {
      if (currentSkills.length) flush()
      pendingNotes = item.notes
      continue
    }
    currentSkills.push(item.id)
  }
  flush()
  return result
}

/**
 * Rebuild editor tiles from stored/proposed combos.
 * Every combo gets a leading divider plaque (including the first).
 */
export function editorItemsFromCombos(
  combos: readonly {
    notes?: string | null
    title?: string | null
    skill_ids?: string[]
    steps?: ReadonlyArray<{
      skills: { id: string; name_ru: string; icon_url: string | null } | null
    }>
  }[],
): ComboEditorItem[] {
  const items: ComboEditorItem[] = []
  let dividerSeq = 0

  for (const combo of combos) {
    items.push({
      kind: 'divider',
      key: `d-${dividerSeq++}`,
      notes: (combo.notes || '').trim(),
    })

    if (combo.skill_ids?.length) {
      for (const id of combo.skill_ids) {
        items.push({ kind: 'skill', id })
      }
      continue
    }

    for (const step of combo.steps ?? []) {
      const skill = step.skills
      if (!skill) continue
      items.push({
        kind: 'skill',
        id: skill.id,
        name_ru: skill.name_ru,
        icon_url: skill.icon_url,
      })
    }
  }

  return items
}
