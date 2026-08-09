import { classTierField, type ComboKindId, type GuideSpecMode } from '@domain'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const slug = String(getRouterParam(event, 'slug') || '')
    .trim()
    .toLowerCase()
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный класс' })
  }

  const body = await readBody<{
    tier?: unknown
    mode?: unknown
    kind?: unknown
  } | null>(event).catch(() => null)

  const modeRaw = String(body?.mode || '').trim()
  if (modeRaw !== 'awakening' && modeRaw !== 'succession') {
    throw createError({ statusCode: 400, statusMessage: 'Укажите mode: awakening или succession' })
  }
  const mode = modeRaw as GuideSpecMode

  const kindRaw = body?.kind == null ? 'pvp' : String(body.kind).trim()
  if (kindRaw !== 'pvp' && kindRaw !== 'pve') {
    throw createError({ statusCode: 400, statusMessage: 'Укажите kind: pvp или pve' })
  }
  const kind = kindRaw as ComboKindId

  const raw = body?.tier

  let tier: number | null
  if (raw === null || raw === undefined || raw === '') {
    tier = null
  } else {
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw createError({ statusCode: 400, statusMessage: 'Тир должен быть от 1 до 5' })
    }
    tier = n
  }

  const col = classTierField(kind, mode)
  const sql = useDb()
  const updated = await withDbError(async () => {
    const rows = await sql`
      update classes
      set ${sql(col)} = ${tier}
      where slug = ${slug} and published = true
      returning
        id, slug,
        tier_pvp_awakening, tier_pvp_succession,
        tier_pve_awakening, tier_pve_succession
    `
    return rows[0] ?? null
  })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Класс не найден' })
  }

  const num = (v: unknown) => (v == null ? null : Number(v))

  return {
    ok: true,
    slug: String(updated.slug),
    mode,
    kind,
    tier,
    tier_pvp_awakening: num(updated.tier_pvp_awakening),
    tier_pvp_succession: num(updated.tier_pvp_succession),
    tier_pve_awakening: num(updated.tier_pve_awakening),
    tier_pve_succession: num(updated.tier_pve_succession),
  }
})
