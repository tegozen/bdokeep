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
    const raw = body.payload?.buffs
    // Legacy: buff_ids → treat as t1
    const legacyIds = body.payload?.buff_ids
    let entries: Array<{ preset?: unknown; buff_id?: unknown; sort_order?: unknown }> = []
    if (Array.isArray(raw) && raw.length) {
      entries = raw as Array<{ preset?: unknown; buff_id?: unknown; sort_order?: unknown }>
    } else if (Array.isArray(legacyIds) && legacyIds.length) {
      entries = legacyIds.map((id, i) => ({
        preset: 't1',
        buff_id: id,
        sort_order: i,
      }))
    }
    if (!entries.length) {
      throw createError({ statusCode: 400, statusMessage: 'Выберите хотя бы один баф' })
    }
    if (entries.length > MAX_BUFFS_ALL_PRESETS) {
      throw createError({
        statusCode: 400,
        statusMessage: `Максимум ${MAX_BUFFS_ALL_PRESETS} бафов`,
      })
    }

    const buffsPayload: Array<{
      preset: string
      buff_id: string
      sort_order: number
    }> = []
    const perPreset = new Map<string, number>()
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!
      const preset = String(entry?.preset || 't1')
      const buffId = String(entry?.buff_id || '')
      if (!isCrystalPresetId(preset)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
      }
      if (!UUID_RE.test(buffId)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный buff id' })
      }
      const count = (perPreset.get(preset) || 0) + 1
      if (count > MAX_BUFFS) {
        throw createError({
          statusCode: 400,
          statusMessage: `Максимум ${MAX_BUFFS} бафов на пресет`,
        })
      }
      perPreset.set(preset, count)
      buffsPayload.push({
        preset,
        buff_id: buffId,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const buffIds = [...new Set(buffsPayload.map((b) => b.buff_id))]
    const { data: buffs, error: buffsErr } = await rest.from('buffs').select('id').in('id', buffIds)
    if (buffsErr) throw createError({ statusCode: 502, statusMessage: buffsErr.message })
    const allowed = new Set((buffs ?? []).map((b: { id: string }) => b.id))
    if (buffIds.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный баф' })
    }

    payload = { buffs: buffsPayload }
  } else if (isCrystalsSection(section)) {
    const raw = body.payload?.crystals
    if (!Array.isArray(raw) || raw.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот' })
    }
    if (raw.length > MAX_CRYSTALS_ALL_PRESETS) {
      throw createError({
        statusCode: 400,
        statusMessage: `Максимум ${MAX_CRYSTALS_ALL_PRESETS} слотов`,
      })
    }

    const crystals: Array<{
      preset: string
      slot: string
      item_id: string
      sort_order: number
    }> = []
    const usedKeys = new Set<string>()
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
      if (!isCrystalPresetId(preset)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
      }
      if (!isCrystalSlotId(slot)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный слот' })
      }
      const key = `${preset}:${slot}`
      if (usedKeys.has(key)) {
        throw createError({ statusCode: 400, statusMessage: 'Дубликат слота в пресете' })
      }
      usedKeys.add(key)
      if (!UUID_RE.test(itemId)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный crystal id' })
      }
      crystals.push({
        preset,
        slot,
        item_id: itemId,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const itemIds = crystals.map((c) => c.item_id)
    const { data: items, error: itemsErr } = await rest
      .from('items')
      .select('id')
      .eq('item_type', 'crystal')
      .in('id', itemIds)

    if (itemsErr) throw createError({ statusCode: 502, statusMessage: itemsErr.message })
    const allowed = new Set((items ?? []).map((x: { id: string }) => x.id))
    if (itemIds.some((id) => !allowed.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный кристалл' })
    }

    payload = { crystals }
  } else if (isRelicsSection(section)) {
    const rawRelics = body.payload?.relics
    const rawLights = body.payload?.lightstones
    if (!Array.isArray(rawRelics) && !Array.isArray(rawLights)) {
      throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот' })
    }
    const relicRows = Array.isArray(rawRelics) ? rawRelics : []
    const lightRows = Array.isArray(rawLights) ? rawLights : []
    if (!relicRows.length && !lightRows.length) {
      throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот' })
    }
    if (relicRows.length > MAX_RELICS_ALL_PRESETS) {
      throw createError({ statusCode: 400, statusMessage: 'Слишком много реликвий' })
    }
    if (lightRows.length > MAX_LIGHTSTONES_ALL_PRESETS) {
      throw createError({ statusCode: 400, statusMessage: 'Слишком много светящихся камней' })
    }

    const relics: Array<{
      preset: string
      slot: string
      item_id: string
      sort_order: number
    }> = []
    const lightstones: Array<{
      preset: string
      slot: string
      item_id: string
      sort_order: number
    }> = []
    const usedRelic = new Set<string>()
    const usedLight = new Set<string>()

    for (let i = 0; i < relicRows.length; i++) {
      const entry = relicRows[i] as {
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
      const key = `${preset}:${slot}`
      if (usedRelic.has(key)) {
        throw createError({ statusCode: 400, statusMessage: 'Дубликат слота реликвии' })
      }
      usedRelic.add(key)
      relics.push({
        preset,
        slot,
        item_id: itemId,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    for (let i = 0; i < lightRows.length; i++) {
      const entry = lightRows[i] as {
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
      const key = `${preset}:${slot}`
      if (usedLight.has(key)) {
        throw createError({ statusCode: 400, statusMessage: 'Дубликат слота камня' })
      }
      usedLight.add(key)
      lightstones.push({
        preset,
        slot,
        item_id: itemId,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    if (relics.length) {
      const ids = relics.map((r) => r.item_id)
      const { data: items, error: itemsErr } = await rest
        .from('items')
        .select('id')
        .eq('item_type', 'relic')
        .in('id', ids)
      if (itemsErr) throw createError({ statusCode: 502, statusMessage: itemsErr.message })
      const allowed = new Set((items ?? []).map((x: { id: string }) => x.id))
      if (ids.some((id) => !allowed.has(id))) {
        throw createError({ statusCode: 400, statusMessage: 'Неизвестная реликвия' })
      }
    }
    if (lightstones.length) {
      const ids = lightstones.map((r) => r.item_id)
      const { data: items, error: itemsErr } = await rest
        .from('items')
        .select('id')
        .eq('item_type', 'lightstone')
        .in('id', ids)
      if (itemsErr) throw createError({ statusCode: 502, statusMessage: itemsErr.message })
      const allowed = new Set((items ?? []).map((x: { id: string }) => x.id))
      if (ids.some((id) => !allowed.has(id))) {
        throw createError({ statusCode: 400, statusMessage: 'Неизвестный светящийся камень' })
      }
    }

    payload = { relics, lightstones }
  } else if (isVideosSection(section)) {
    const raw = body.payload?.videos
    if (!Array.isArray(raw) || raw.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Добавьте хотя бы одно видео' })
    }
    if (raw.length > MAX_VIDEOS) {
      throw createError({ statusCode: 400, statusMessage: `Максимум ${MAX_VIDEOS} видео` })
    }

    const videos: Array<{
      title: string
      youtube_url: string
      sort_order: number
    }> = []
    for (let i = 0; i < raw.length; i++) {
      const entry = raw[i] as {
        title?: unknown
        youtube_url?: unknown
        sort_order?: unknown
      }
      const urlRaw = String(entry?.youtube_url || '').trim()
      const safe = sanitizeYoutubeUrl(urlRaw)
      if (!safe || !youtubeEmbedUrl(urlRaw)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректная ссылка на YouTube' })
      }
      const titleRaw = String(entry?.title || '').trim()
      videos.push({
        title: titleRaw.slice(0, 120) || `Видео ${i + 1}`,
        youtube_url: safe,
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    payload = { videos }
  } else if (isMorphsSection(section)) {
    const raw = body.payload?.morphs
    if (!Array.isArray(raw) || raw.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Заполните хотя бы один слот морфа' })
    }
    if (raw.length > MAX_MORPHS_ALL_PRESETS) {
      throw createError({
        statusCode: 400,
        statusMessage: `Максимум ${MAX_MORPHS_ALL_PRESETS} слотов`,
      })
    }

    const morphs: Array<{
      preset: string
      slot_level: number
      skill_id: string
      effect_ids: [string, string]
      sort_order: number
    }> = []
    const used = new Set<string>()

    for (let i = 0; i < raw.length; i++) {
      const entry = raw[i] as {
        preset?: unknown
        slot_level?: unknown
        skill_id?: unknown
        effect_ids?: unknown
        sort_order?: unknown
      }
      const preset = String(entry?.preset || '')
      const slotLevel = Number(entry?.slot_level)
      const skillId = String(entry?.skill_id || '')
      const effectIds = Array.isArray(entry?.effect_ids)
        ? entry.effect_ids.map((x) => String(x))
        : []
      if (!isMorphPresetId(preset)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный пресет морфов' })
      }
      if (!isMorphSlotLevel(slotLevel)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный слот морфа' })
      }
      const key = `${preset}:${slotLevel}`
      if (used.has(key)) {
        throw createError({ statusCode: 400, statusMessage: 'Дубликат слота морфа' })
      }
      used.add(key)
      if (!UUID_RE.test(skillId)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный skill id' })
      }
      if (
        effectIds.length !== 2 ||
        effectIds[0] === effectIds[1] ||
        !effectIds.every((id) => UUID_RE.test(id))
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Нужно ровно 2 разных эффекта на слот',
        })
      }
      morphs.push({
        preset,
        slot_level: slotLevel,
        skill_id: skillId,
        effect_ids: [effectIds[0]!, effectIds[1]!],
        sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
      })
    }

    const skillIds = [...new Set(morphs.map((m) => m.skill_id))]
    const { data: skillRows, error: skillErr } = await rest
      .from('skills')
      .select('id')
      .eq('class_slug', slug)
      .in('id', skillIds)
    if (skillErr) throw createError({ statusCode: 502, statusMessage: skillErr.message })
    const allowedSkills = new Set((skillRows ?? []).map((s: { id: string }) => s.id))
    if (skillIds.some((id) => !allowedSkills.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный скилл класса' })
    }

    const effectIds = [...new Set(morphs.flatMap((m) => m.effect_ids))]
    const { data: fxRows, error: fxErr } = await rest
      .from('skill_addon_effects')
      .select('id')
      .in('id', effectIds)
    if (fxErr) throw createError({ statusCode: 502, statusMessage: fxErr.message })
    const allowedFx = new Set((fxRows ?? []).map((s: { id: string }) => s.id))
    if (effectIds.some((id) => !allowedFx.has(id))) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный эффект морфа' })
    }

    payload = { morphs }
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
