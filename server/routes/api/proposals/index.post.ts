type Body = {
  class_slug?: string
  section?: string
  payload?: Record<string, unknown>
  author_label?: string | null
  website?: string // honeypot
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Body
  const asSuperadmin = isAdminSession(event)

  // Honeypot — bots fill hidden fields
  if (body.website) {
    return { ok: true }
  }

  const ip = clientIp(event)
  if (!asSuperadmin && !checkRateLimit(`proposal:${ip}`)) {
    throw createError({ statusCode: 429, statusMessage: 'Слишком много предложений. Подождите.' })
  }

  const slug = String(body.class_slug || '')
    .trim()
    .toLowerCase()
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный класс' })
  }

  const section = body.section as (typeof PROPOSAL_SECTIONS)[number]
  if (!PROPOSAL_SECTIONS.includes(section)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный раздел' })
  }

  const rest = getServiceRest()

  const { data: klass, error: classErr } = await rest
    .from('classes')
    .select('id, slug, published')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (classErr) throw createError({ statusCode: 502, statusMessage: classErr.message })
  if (!klass) throw createError({ statusCode: 404, statusMessage: 'Класс не найден' })

  let payload: Record<string, unknown>

  if (isComboSection(section)) {
    const mode = comboModeFromSection(section)
    const rawIds = body.payload?.skill_ids
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один скилл' })
    }
    if (rawIds.length > MAX_COMBO_STEPS) {
      throw createError({ statusCode: 400, statusMessage: `Максимум ${MAX_COMBO_STEPS} шагов` })
    }
    const skillIds = rawIds.map((id) => String(id))
    if (skillIds.some((id) => !UUID_RE.test(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный skill id' })
    }

    const { data: skills, error: skillsErr } = await rest
      .from('skills')
      .select('id')
      .eq('class_slug', slug)
      .in('id', skillIds)

    if (skillsErr) throw createError({ statusCode: 502, statusMessage: skillsErr.message })
    const allowed = new Set((skills ?? []).map((s: { id: string }) => s.id))
    if (skillIds.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Скилл не принадлежит этому классу' })
    }

    payload = { mode, skill_ids: skillIds }
  } else if (isBuffsSection(section)) {
    const rawIds = body.payload?.buff_ids
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один баф' })
    }
    if (rawIds.length > MAX_BUFFS) {
      throw createError({ statusCode: 400, statusMessage: `Максимум ${MAX_BUFFS} бафов` })
    }
    const buffIds = rawIds.map((id) => String(id))
    if (buffIds.some((id) => !UUID_RE.test(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный buff id' })
    }

    const { data: buffs, error: buffsErr } = await rest.from('buffs').select('id').in('id', buffIds)
    if (buffsErr) throw createError({ statusCode: 502, statusMessage: buffsErr.message })
    const allowed = new Set((buffs ?? []).map((b: { id: string }) => b.id))
    if (buffIds.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный баф' })
    }

    payload = { buff_ids: buffIds }
  } else {
    const text = String(body.payload?.text ?? '').trim()
    if (!text) {
      throw createError({ statusCode: 400, statusMessage: 'Текст пустой' })
    }
    if (text.length > MAX_TEXT_LEN) {
      throw createError({ statusCode: 400, statusMessage: 'Текст слишком длинный' })
    }
    payload = { text }
  }

  let authorLabel: string | null = null
  if (body.author_label != null && String(body.author_label).trim()) {
    authorLabel = String(body.author_label).trim().slice(0, MAX_AUTHOR_LEN)
  }
  if (asSuperadmin && !authorLabel) {
    authorLabel = 'superadmin'
  }

  const { data: inserted, error: insertErr } = await rest
    .from('guide_proposals')
    .insert({
      class_id: klass.id,
      class_slug: klass.slug,
      section,
      payload,
      author_label: authorLabel,
      status: 'pending',
    })
    .select('id, class_id, section, payload, status')
    .single()

  if (insertErr) throw createError({ statusCode: 502, statusMessage: insertErr.message })

  if (asSuperadmin) {
    await applyProposal(inserted, { reviewNote: 'auto-approved (superadmin)' })
    return { ok: true, id: inserted.id, autoApproved: true }
  }

  return { ok: true, id: inserted.id, autoApproved: false }
})
