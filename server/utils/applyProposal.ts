type ProposalRow = {
  id: string
  class_id: string
  section: string
  payload: Record<string, unknown> | null
  status: string
}

/** Apply a pending proposal to live guide tables and mark approved (one transaction). */
export async function applyProposal(
  proposal: ProposalRow,
  opts?: { reviewNote?: string | null },
) {
  if (proposal.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Уже рассмотрено' })
  }

  const section = proposal.section as (typeof PROPOSAL_SECTIONS)[number]
  const payload = (proposal.payload || {}) as Record<string, unknown>
  const sql = useDb()

  await withDbError(async () => {
    await sql.begin(async (tx) => {
      let guideRows = await tx`
        select id from class_guides where class_id = ${proposal.class_id} limit 1
      `
      let guide = guideRows[0]

      if (!guide) {
        guideRows = await tx`
          insert into class_guides (class_id)
          values (${proposal.class_id})
          returning id
        `
        guide = guideRows[0]
      }

      if (!guide) {
        throw createError({ statusCode: 502, statusMessage: 'Ошибка базы данных' })
      }

      if (isComboSection(section)) {
        const mode = comboModeFromSection(section)
        const skillIds = Array.isArray(payload.skill_ids)
          ? payload.skill_ids.map((x) => String(x))
          : []

        if (!skillIds.length || skillIds.some((sid) => !UUID_RE.test(sid))) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректные данные комбы' })
        }

        await tx`
          delete from guide_combo_steps
          where guide_id = ${guide.id} and mode = ${mode}
        `

        const rows = skillIds.map((skill_id, i) => ({
          guide_id: guide.id,
          mode,
          skill_id,
          sort_order: i,
        }))
        await tx`
          insert into guide_combo_steps ${tx(rows, 'guide_id', 'mode', 'skill_id', 'sort_order')}
        `
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
              throw createError({ statusCode: 400, statusMessage: 'Некорректные данные забафа' })
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
          throw createError({ statusCode: 400, statusMessage: 'Некорректные данные забафа' })
        }

        await tx`delete from guide_buffs where guide_id = ${guide.id}`
        await tx`
          insert into guide_buffs ${tx(rows, 'guide_id', 'buff_id', 'preset', 'sort_order')}
        `
      } else if (isCrystalsSection(section)) {
        const raw = Array.isArray(payload.crystals) ? payload.crystals : []
        if (!raw.length) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректные данные инкрустации' })
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
            throw createError({
              statusCode: 400,
              statusMessage: 'Некорректный пресет, слот или кристалл',
            })
          }
          rows.push({
            guide_id: guide.id,
            item_id: itemId,
            slot,
            preset,
            sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
          })
        }

        await tx`delete from guide_crystals where guide_id = ${guide.id}`
        await tx`
          insert into guide_crystals ${tx(rows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
        `
      } else if (isRelicsSection(section)) {
        const rawRelics = Array.isArray(payload.relics) ? payload.relics : []
        const rawLights = Array.isArray(payload.lightstones) ? payload.lightstones : []
        if (!rawRelics.length && !rawLights.length) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректные данные реликвий' })
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
            throw createError({
              statusCode: 400,
              statusMessage: 'Некорректный светящийся камень',
            })
          }
          lightRows.push({
            guide_id: guide.id,
            item_id: itemId,
            slot,
            preset,
            sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
          })
        }

        await tx`delete from guide_relics where guide_id = ${guide.id}`
        await tx`delete from guide_lightstones where guide_id = ${guide.id}`

        if (relicRows.length) {
          await tx`
            insert into guide_relics ${tx(relicRows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
          `
        }
        if (lightRows.length) {
          await tx`
            insert into guide_lightstones ${tx(lightRows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
          `
        }
      } else if (isVideosSection(section)) {
        const raw = Array.isArray(payload.videos) ? payload.videos : []
        if (!raw.length || raw.length > MAX_VIDEOS) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректные данные видео' })
        }

        const rows: Array<{
          class_id: string
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
          rows.push({
            class_id: proposal.class_id,
            title: titleRaw.slice(0, 120) || `Видео ${i + 1}`,
            youtube_url: safe,
            sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
          })
        }

        await tx`delete from class_videos where class_id = ${proposal.class_id}`
        await tx`
          insert into class_videos ${tx(rows, 'class_id', 'title', 'youtube_url', 'sort_order')}
        `
      } else if (isMorphsSection(section)) {
        const raw = Array.isArray(payload.morphs) ? payload.morphs : []
        if (!raw.length) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректные данные морфов' })
        }

        const rows: Array<{
          guide_id: string
          preset: string
          slot_level: number
          skill_id: string
          effect_id_1: string
          effect_id_2: string
          sort_order: number
        }> = []

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
          if (
            !isMorphPresetId(preset) ||
            !isMorphSlotLevel(slotLevel) ||
            !UUID_RE.test(skillId) ||
            effectIds.length !== 2 ||
            !UUID_RE.test(effectIds[0] || '') ||
            !UUID_RE.test(effectIds[1] || '')
          ) {
            throw createError({ statusCode: 400, statusMessage: 'Некорректный слот морфа' })
          }
          rows.push({
            guide_id: guide.id,
            preset,
            slot_level: slotLevel,
            skill_id: skillId,
            effect_id_1: effectIds[0]!,
            effect_id_2: effectIds[1]!,
            sort_order: typeof entry.sort_order === 'number' ? entry.sort_order : i,
          })
        }

        await tx`delete from guide_morphs where guide_id = ${guide.id}`
        await tx`
          insert into guide_morphs ${tx(
            rows,
            'guide_id',
            'preset',
            'slot_level',
            'skill_id',
            'effect_id_1',
            'effect_id_2',
            'sort_order',
          )}
        `
      } else if (section === 'summary') {
        const text = String(payload.text || '').trim()
        if (!text) throw createError({ statusCode: 400, statusMessage: 'Пустой текст' })

        await tx`
          update class_guides
          set summary = ${text}, updated_at = now()
          where id = ${guide.id}
        `
      } else {
        throw createError({ statusCode: 400, statusMessage: 'Неизвестная секция' })
      }

      await tx`
        update guide_proposals
        set
          status = 'approved',
          payload = ${sql.json(payload)},
          reviewed_at = now(),
          review_note = ${opts?.reviewNote ?? null}
        where id = ${proposal.id}
      `
    })
  })
}
