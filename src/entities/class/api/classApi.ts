import { getSupabase } from '@/shared/api'
import type { BdoClass, Buff, ClassGuideBundle, Item, Skill } from '../model/types'

export async function fetchPublishedClasses(): Promise<BdoClass[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('classes')
    .select(
      `
      *,
      class_guides(
        summary,
        guide_buffs(count),
        guide_relics(count),
        guide_lightstones(count),
        guide_crystals(count),
        guide_essence(count),
        guide_combo_steps(count),
        guide_morphs(count)
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
    guide_buffs: CountRow[] | null
    guide_relics: CountRow[] | null
    guide_lightstones: CountRow[] | null
    guide_crystals: CountRow[] | null
    guide_essence: CountRow[] | null
    guide_combo_steps: CountRow[] | null
    guide_morphs: CountRow[] | null
  }
  type Row = BdoClass & {
    class_guides: GuideEmbed | GuideEmbed[] | null
    class_videos: CountRow[] | null
  }

  const countOf = (rows: CountRow[] | null | undefined) => rows?.[0]?.count ?? 0
  const textFilled = (v: string | null | undefined) => Boolean(v && v.trim())

  const mapped = ((data ?? []) as Row[]).map((row) => {
    const guide = Array.isArray(row.class_guides) ? row.class_guides[0] : row.class_guides
    const has_content =
      Boolean(
        guide &&
          (textFilled(guide.summary) ||
            countOf(guide.guide_buffs) > 0 ||
            countOf(guide.guide_relics) > 0 ||
            countOf(guide.guide_lightstones) > 0 ||
            countOf(guide.guide_crystals) > 0 ||
            countOf(guide.guide_essence) > 0 ||
            countOf(guide.guide_combo_steps) > 0 ||
            countOf(guide.guide_morphs) > 0),
      ) || countOf(row.class_videos) > 0

    const { class_guides: _g, class_videos: _v, ...klass } = row

    return { ...klass, has_content } as BdoClass
  })

  mapped.sort((a, b) => {
    const byContent = Number(Boolean(b.has_content)) - Number(Boolean(a.has_content))
    if (byContent !== 0) return byContent
    return a.sort_order - b.sort_order
  })

  return mapped
}

export async function fetchClassSkills(classSlug: string): Promise<Skill[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('skills')
    .select('id, name_ru, icon_url, class_slug, skill_type, supports_addon, addon_tier')
    .eq('class_slug', classSlug)
    .order('name_ru', { ascending: true })

  if (error) throw error
  return (data ?? []) as Skill[]
}

export async function fetchSkillAddonEffects(): Promise<
  import('../model/types').SkillAddonEffect[]
> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('skill_addon_effects')
    .select('id, key, name_ru, effect_group, tier_labels, sort_order')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as import('../model/types').SkillAddonEffect[]
}

export async function fetchBuffs(): Promise<Buff[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('buffs')
    .select('id, name_ru, icon_url, description')
    .order('name_ru', { ascending: true })

  if (error) throw error
  return (data ?? []) as Buff[]
}

export async function fetchCrystals(): Promise<Item[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('items')
    .select('id, name_ru, icon_url, item_type')
    .eq('item_type', 'crystal')
    .order('name_ru', { ascending: true })

  if (error) throw error
  return (data ?? []) as Item[]
}

export async function fetchRelics(): Promise<Item[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('items')
    .select('id, name_ru, icon_url, item_type')
    .eq('item_type', 'relic')
    .order('name_ru', { ascending: true })

  if (error) throw error
  return (data ?? []) as Item[]
}

export async function fetchLightstones(): Promise<Item[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('items')
    .select('id, name_ru, icon_url, item_type')
    .eq('item_type', 'lightstone')
    .order('name_ru', { ascending: true })

  if (error) throw error
  return (data ?? []) as Item[]
}

export async function fetchClassGuideBySlug(slug: string): Promise<ClassGuideBundle | null> {
  const empty = {
    comboSteps: [] as ClassGuideBundle['comboSteps'],
    buffs: [] as ClassGuideBundle['buffs'],
    relics: [] as ClassGuideBundle['relics'],
    lightstones: [] as ClassGuideBundle['lightstones'],
    crystals: [] as ClassGuideBundle['crystals'],
    essence: [] as ClassGuideBundle['essence'],
    morphs: [] as ClassGuideBundle['morphs'],
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

  const [comboSteps, buffs, relics, lightstones, crystals, essence, morphs] = await Promise.all([
    supabase
      .from('guide_combo_steps')
      .select('id, mode, notes, sort_order, skills(id, name_ru, icon_url, class_slug)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_buffs')
      .select('id, slot, preset, group_name, notes, sort_order, buffs(id, name_ru, icon_url, description)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_relics')
      .select('id, slot, preset, notes, sort_order, items(id, name_ru, icon_url, item_type)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_lightstones')
      .select('id, slot, preset, notes, sort_order, items(id, name_ru, icon_url, item_type)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_crystals')
      .select('id, slot, preset, notes, sort_order, items(id, name_ru, icon_url, item_type)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_essence')
      .select('id, slot, notes, sort_order, items(id, name_ru, icon_url, item_type)')
      .eq('guide_id', guideId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('guide_morphs')
      .select(
        `id, preset, slot_level, sort_order,
         skills(id, name_ru, icon_url, class_slug, skill_type, supports_addon, addon_tier),
         effect1:skill_addon_effects!guide_morphs_effect_id_1_fkey(id, key, name_ru, effect_group, tier_labels),
         effect2:skill_addon_effects!guide_morphs_effect_id_2_fkey(id, key, name_ru, effect_group, tier_labels)`,
      )
      .eq('guide_id', guideId)
      .order('slot_level', { ascending: true }),
  ])

  for (const res of [comboSteps, buffs, relics, lightstones, crystals, essence, morphs]) {
    if (res.error) throw res.error
  }

  return {
    class: klass as BdoClass,
    guide,
    videos: videos ?? [],
    comboSteps: (comboSteps.data ?? []) as ClassGuideBundle['comboSteps'],
    buffs: (buffs.data ?? []) as ClassGuideBundle['buffs'],
    relics: (relics.data ?? []) as ClassGuideBundle['relics'],
    lightstones: (lightstones.data ?? []) as ClassGuideBundle['lightstones'],
    crystals: (crystals.data ?? []) as ClassGuideBundle['crystals'],
    essence: (essence.data ?? []) as ClassGuideBundle['essence'],
    morphs: (morphs.data ?? []) as ClassGuideBundle['morphs'],
  }
}
