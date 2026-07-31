type ProposalRow = {
  id: string
  class_id: string
  section: string
  payload: Record<string, unknown> | null
  status: string
}

/** Apply a pending proposal to live guide tables and mark approved. */
export async function applyProposal(
  proposal: ProposalRow,
  opts?: { reviewNote?: string | null },
) {
  if (proposal.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Уже рассмотрено' })
  }

  const section = proposal.section as (typeof PROPOSAL_SECTIONS)[number]
  const payload = (proposal.payload || {}) as Record<string, unknown>
  const rest = getServiceRest()

  let { data: guide, error: guideErr } = await rest
    .from('class_guides')
    .select('id')
    .eq('class_id', proposal.class_id)
    .maybeSingle()

  if (guideErr) throw createError({ statusCode: 502, statusMessage: guideErr.message })

  if (!guide) {
    const { data: created, error: createErr } = await rest
      .from('class_guides')
      .insert({ class_id: proposal.class_id })
      .select('id')
      .single()
    if (createErr) throw createError({ statusCode: 502, statusMessage: createErr.message })
    guide = created
  }

  if (isComboSection(section)) {
    const mode = comboModeFromSection(section)
    const skillIds = Array.isArray(payload.skill_ids)
      ? payload.skill_ids.map((x) => String(x))
      : []

    if (!skillIds.length || skillIds.some((sid) => !UUID_RE.test(sid))) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный payload комбы' })
    }

    const { error: delErr } = await rest
      .from('guide_combo_steps')
      .delete()
      .eq('guide_id', guide.id)
      .eq('mode', mode)

    if (delErr) throw createError({ statusCode: 502, statusMessage: delErr.message })

    const rows = skillIds.map((skill_id, i) => ({
      guide_id: guide.id,
      mode,
      skill_id,
      sort_order: i,
    }))

    const { error: insErr } = await rest.from('guide_combo_steps').insert(rows)
    if (insErr) throw createError({ statusCode: 502, statusMessage: insErr.message })
  } else if (isBuffsSection(section)) {
    const rawBuffs = Array.isArray(payload.buffs) ? payload.buffs : null
    const legacyIds = Array.isArray(payload.buff_ids)
      ? payload.buff_ids.map((x) => String(x))
      : []

    const rows: Array<{
      guide_id: string
      buff_id: string
      preset: string
      sort_order: number
    }> = []

    if (rawBuffs?.length) {
      for (let i = 0; i < rawBuffs.length; i++) {
        const entry = rawBuffs[i] as {
          preset?: unknown
          buff_id?: unknown
          sort_order?: unknown
        }
        const preset = String(entry?.preset || 't1')
        const buffId = String(entry?.buff_id || '')
        if (!isCrystalPresetId(preset) || !UUID_RE.test(buffId)) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректный payload забафа' })
        }
        rows.push({
          guide_id: guide.id,
          buff_id: buffId,
          preset,
          sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
        })
      }
    } else if (legacyIds.length && !legacyIds.some((bid) => !UUID_RE.test(bid))) {
      for (let i = 0; i < legacyIds.length; i++) {
        rows.push({
          guide_id: guide.id,
          buff_id: legacyIds[i]!,
          preset: 't1',
          sort_order: i,
        })
      }
    }

    if (!rows.length) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный payload забафа' })
    }

    const { error: delErr } = await rest.from('guide_buffs').delete().eq('guide_id', guide.id)
    if (delErr) throw createError({ statusCode: 502, statusMessage: delErr.message })

    const { error: insErr } = await rest.from('guide_buffs').insert(rows)
    if (insErr) throw createError({ statusCode: 502, statusMessage: insErr.message })
  } else if (isCrystalsSection(section)) {
    const raw = Array.isArray(payload.crystals) ? payload.crystals : []
    if (!raw.length) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный payload инкрустации' })
    }

    const rows: Array<{
      guide_id: string
      item_id: string
      slot: string
      preset: string
      sort_order: number
    }> = []
    for (let i = 0; i < raw.length; i++) {
      const entry = raw[i] as {
        preset?: unknown
        slot?: unknown
        item_id?: unknown
        sort_order?: unknown
      }
      const preset = String(entry?.preset || '')
      const slot = String(entry?.slot || '')
      const itemId = String(entry?.item_id || '')
      if (!isCrystalPresetId(preset) || !isCrystalSlotId(slot) || !UUID_RE.test(itemId)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет, слот или кристалл' })
      }
      rows.push({
        guide_id: guide.id,
        item_id: itemId,
        slot,
        preset,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const { error: delErr } = await rest.from('guide_crystals').delete().eq('guide_id', guide.id)
    if (delErr) throw createError({ statusCode: 502, statusMessage: delErr.message })

    const { error: insErr } = await rest.from('guide_crystals').insert(rows)
    if (insErr) throw createError({ statusCode: 502, statusMessage: insErr.message })
  } else if (isRelicsSection(section)) {
    const rawRelics = Array.isArray(payload.relics) ? payload.relics : []
    const rawLights = Array.isArray(payload.lightstones) ? payload.lightstones : []
    if (!rawRelics.length && !rawLights.length) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный payload реликвий' })
    }

    const relicRows: Array<{
      guide_id: string
      item_id: string
      slot: string
      preset: string
      sort_order: number
    }> = []
    for (let i = 0; i < rawRelics.length; i++) {
      const entry = rawRelics[i] as {
        preset?: unknown
        slot?: unknown
        item_id?: unknown
        sort_order?: unknown
      }
      const preset = String(entry?.preset || '')
      const slot = String(entry?.slot || '')
      const itemId = String(entry?.item_id || '')
      if (!isCrystalPresetId(preset) || !isRelicSlotId(slot) || !UUID_RE.test(itemId)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректная реликвия' })
      }
      relicRows.push({
        guide_id: guide.id,
        item_id: itemId,
        slot,
        preset,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const lightRows: Array<{
      guide_id: string
      item_id: string
      slot: string
      preset: string
      sort_order: number
    }> = []
    for (let i = 0; i < rawLights.length; i++) {
      const entry = rawLights[i] as {
        preset?: unknown
        slot?: unknown
        item_id?: unknown
        sort_order?: unknown
      }
      const preset = String(entry?.preset || '')
      const slot = String(entry?.slot || '')
      const itemId = String(entry?.item_id || '')
      if (!isCrystalPresetId(preset) || !isLightstoneSlotId(slot) || !UUID_RE.test(itemId)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный светящийся камень' })
      }
      lightRows.push({
        guide_id: guide.id,
        item_id: itemId,
        slot,
        preset,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const { error: delR } = await rest.from('guide_relics').delete().eq('guide_id', guide.id)
    if (delR) throw createError({ statusCode: 502, statusMessage: delR.message })
    const { error: delL } = await rest.from('guide_lightstones').delete().eq('guide_id', guide.id)
    if (delL) throw createError({ statusCode: 502, statusMessage: delL.message })

    if (relicRows.length) {
      const { error: insR } = await rest.from('guide_relics').insert(relicRows)
      if (insR) throw createError({ statusCode: 502, statusMessage: insR.message })
    }
    if (lightRows.length) {
      const { error: insL } = await rest.from('guide_lightstones').insert(lightRows)
      if (insL) throw createError({ statusCode: 502, statusMessage: insL.message })
    }
  } else if (section === 'summary') {
    const text = String(payload.text || '').trim()
    if (!text) throw createError({ statusCode: 400, statusMessage: 'Пустой текст' })

    const { error: updErr } = await rest
      .from('class_guides')
      .update({ summary: text, updated_at: new Date().toISOString() })
      .eq('id', guide.id)
    if (updErr) throw createError({ statusCode: 502, statusMessage: updErr.message })
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Неизвестная секция' })
  }

  const { error: statusErr } = await rest
    .from('guide_proposals')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      review_note: opts?.reviewNote ?? null,
    })
    .eq('id', proposal.id)

  if (statusErr) throw createError({ statusCode: 502, statusMessage: statusErr.message })
}
