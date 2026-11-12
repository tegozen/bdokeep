import { absoluteUrl, normalizeSiteUrl } from '@/shared/lib/siteUrl'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = normalizeSiteUrl(String(config.public.siteUrl || ''))

  if (!siteUrl) {
    setResponseStatus(event, 503)
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return 'Sitemap requires NUXT_PUBLIC_SITE_URL (absolute site origin, no trailing slash).'
  }

  const sql = useDb()
  const classes = await withDbError(() => listPublishedClasses(sql))
  // A single SQL pass finds meaningful, published combinations of specialization
  // and preset. This avoids advertising empty pages or crawling client-only tabs.
  const states = await withDbError(() => sql`
    select c.slug, mode.name as mode, preset.name as preset
    from classes c
    left join class_guides g on g.class_id = c.id
    cross join (values ('awakening'), ('succession')) as mode(name)
    cross join (values ('t1'), ('t2'), ('besp'), ('sub'), ('pve')) as preset(name)
    where c.published = true and (
      case
        when preset.name = 'pve' and mode.name = 'awakening'
          then nullif(btrim(g.summary_pve_awakening), '') is not null
        when preset.name = 'pve' and mode.name = 'succession'
          then nullif(btrim(g.summary_pve_succession), '') is not null
        when mode.name = 'awakening'
          then nullif(btrim(g.summary_pvp_awakening), '') is not null
        else nullif(btrim(g.summary_pvp_succession), '') is not null
      end
      or exists (
        select 1 from guide_combos cb
        where cb.guide_id = g.id and cb.mode = mode.name
          and cb.kind = case when preset.name = 'pve' then 'pve' else 'pvp' end
      )
      or exists (
        select 1 from guide_morphs gm
        where gm.guide_id = g.id
          and gm.preset = (case when mode.name = 'awakening' then 'aw_' else 'succ_' end || preset.name)
      )
      or exists (select 1 from guide_crystals x where x.guide_id = g.id and x.preset = preset.name)
      or exists (select 1 from guide_relics x where x.guide_id = g.id and x.preset = preset.name)
      or exists (select 1 from guide_lightstones x where x.guide_id = g.id and x.preset = preset.name)
      or exists (select 1 from guide_essence x where x.guide_id = g.id and x.preset = preset.name)
      or exists (select 1 from guide_buffs x where x.guide_id = g.id and x.preset = preset.name)
      or exists (select 1 from class_videos v where v.class_id = c.id and v.mode = mode.name)
    )
    order by c.slug, mode.name, preset.name
  `)
  const paths = [
    '/',
    ...classes.map((c) => `/class/${c.slug}`),
    ...classes.filter((c) => c.has_content).map((c) => `/class/${c.slug}/full`),
    ...states.map((s) => `/class/${s.slug}/${s.mode}/${s.preset}`),
  ]

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.flatMap((path) => {
      const loc = absoluteUrl(path, siteUrl)
      return loc ? [`  <url><loc>${escapeXml(loc)}</loc></url>`] : []
    }),
    '</urlset>',
    '',
  ].join('\n')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return body
})
