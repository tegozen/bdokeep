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
    const buffIds = Array.isArray(payload.buff_ids)
      ? payload.buff_ids.map((x) => String(x))
      : []

    if (!buffIds.length || buffIds.some((bid) => !UUID_RE.test(bid))) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный payload забафа' })
    }

    const { error: delErr } = await rest.from('guide_buffs').delete().eq('guide_id', guide.id)
    if (delErr) throw createError({ statusCode: 502, statusMessage: delErr.message })

    const rows = buffIds.map((buff_id, i) => ({
      guide_id: guide.id,
      buff_id,
      sort_order: i,
    }))

    const { error: insErr } = await rest.from('guide_buffs').insert(rows)
    if (insErr) throw createError({ statusCode: 502, statusMessage: insErr.message })
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
