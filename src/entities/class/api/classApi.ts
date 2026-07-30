import { getSupabase } from '@/shared/api'
import type { BdoClass, ClassGuideBundle } from '../model/types'

export async function fetchPublishedClasses(): Promise<BdoClass[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('classes')
    .select(
      `
      *,
      class_guides(
        summary,
        pvp_role,
        combo_awakening,
        combo_succession,
        guide_skills(count),
        guide_buffs(count),
        guide_relics(count),
        guide_lightstones(count),
        guide_crystals(count),
        guide_essence(count)
      ),
      class_videos(count)
    `,
    )
    .eq('published', true)
    .order('sort_order', { ascending: true })

  if (error) throw error

  type CountRow = { count: number }
  type GuideEmbed = {
    summary: string | null
    pvp_role: string | null
    combo_awakening: string | null
    combo_succession: string | null
    guide_skills: CountRow[] | null
    guide_buffs: CountRow[] | null
    guide_relics: CountRow[] | null
    guide_lightstones: CountRow[] | null
    guide_crystals: CountRow[] | null
    guide_essence: CountRow[] | null
  }
  type Row = BdoClass & {
    class_guides: GuideEmbed | GuideEmbed[] | null
    class_videos: CountRow[] | null
  }

  const countOf = (rows: CountRow[] | null | undefined) => rows?.[0]?.count ?? 0
  const textFilled = (v: string | null | undefined) => Boolean(v && v.trim())

  const mapped = ((data ?? []) as Row[]).map((row) => {
    const guide = Array.isArray(row.class_guides) ? row.class_guides[0] : row.class_guides
    const has_content = Boolean(
      guide &&
        (textFilled(guide.summary) ||
          textFilled(guide.pvp_role) ||
          textFilled(guide.combo_awakening) ||
          textFilled(guide.combo_succession) ||
          countOf(guide.guide_skills) > 0 ||
          countOf(guide.guide_buffs) > 0 ||
          countOf(guide.guide_relics) > 0 ||
          countOf(guide.guide_lightstones) > 0 ||
          countOf(guide.guide_crystals) > 0 ||
          countOf(guide.guide_essence) > 0),
    ) || countOf(row.class_videos) > 0

    const {
      class_guides: _g,
      class_videos: _v,
      ...klass
    } = row

    return { ...klass, has_content } as BdoClass
  })

  mapped.sort((a, b) => {
    const byContent = Number(Boolean(b.has_content)) - Number(Boolean(a.has_content))
    if (byContent !== 0) return byContent
    return a.sort_order - b.sort_order
  })

  return mapped
}

export async function fetchClassGuideBySlug(slug: string): Promise<ClassGuideBundle | null> {
  const empty = {
    skills: [] as ClassGuideBundle['skills'],
    buffs: [] as ClassGuideBundle['buffs'],
    relics: [] as ClassGuideBundle['relics'],
    lightstones: [] as ClassGuideBundle['lightstones'],
    crystals: [] as ClassGuideBundle['crystals'],
    essence: [] as ClassGuideBundle['essence'],
  }

  const supabase = getSupabase()

  const { data: klass, error: classError } = await supabase
    .from('classes')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (classError) throw classError
  if (!klass) return null

  const [{ data: guide, error: guideError }, { data: videos, error: videosError }] = await Promise.all([
    supabase.from('class_guides').select('*').eq('class_id', klass.id).maybeSingle(),
    supabase
      .from('class_videos')
      .select('*')
      .eq('class_id', klass.id)
      .order('sort_order', { ascending: true }),
  ])

  if (guideError) throw guideError
  if (videosError) throw videosError

  if (!guide) {
    return {
      class: klass as BdoClass,
      guide: null,
      videos: videos ?? [],
      ...empty,
    }
  }

  const guideId = guide.id

  const [skills, buffs, relics, lightstones, crystals, essence] = await Promise.all([
    supabase
      .from('guide_skills')
      .select('id, mode, priority, notes, sort_order, skills(id, name_ru, icon_url, class_slug)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_buffs')
      .select('id, slot, group_name, notes, sort_order, buffs(id, name_ru, icon_url, description)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_relics')
      .select('id, slot, notes, sort_order, items(id, name_ru, icon_url, item_type)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_lightstones')
      .select('id, slot, notes, sort_order, items(id, name_ru, icon_url, item_type)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_crystals')
      .select('id, slot, notes, sort_order, items(id, name_ru, icon_url, item_type)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_essence')
      .select('id, slot, notes, sort_order, items(id, name_ru, icon_url, item_type)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
  ])

  for (const res of [skills, buffs, relics, lightstones, crystals, essence]) {
    if (res.error) throw res.error
  }

  return {
    class: klass as BdoClass,
    guide,
    videos: videos ?? [],
    skills: (skills.data ?? []) as ClassGuideBundle['skills'],
    buffs: (buffs.data ?? []) as ClassGuideBundle['buffs'],
    relics: (relics.data ?? []) as ClassGuideBundle['relics'],
    lightstones: (lightstones.data ?? []) as ClassGuideBundle['lightstones'],
    crystals: (crystals.data ?? []) as ClassGuideBundle['crystals'],
    essence: (essence.data ?? []) as ClassGuideBundle['essence'],
  }
}
