-- Backfill class_guides.section_updates from latest approved proposals per UI section.
-- Safe to re-run on existing DBs:
--   docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/026_backfill_section_updates.sql

with mapped as (
  select
    p.class_id,
    case
      when p.section in ('combo_awakening', 'combo_succession') then 'combo'
      else p.section
    end as ui_section,
    nullif(trim(p.author_label), '') as updated_by,
    coalesce(p.reviewed_at, p.created_at) as updated_at,
    row_number() over (
      partition by
        p.class_id,
        case
          when p.section in ('combo_awakening', 'combo_succession') then 'combo'
          else p.section
        end
      order by coalesce(p.reviewed_at, p.created_at) desc
    ) as rn
  from public.guide_proposals p
  where p.status = 'approved'
),
latest as (
  select class_id, ui_section, updated_by, updated_at
  from mapped
  where rn = 1
),
agg as (
  select
    class_id,
    jsonb_object_agg(
      ui_section,
      jsonb_build_object(
        'updated_at', to_jsonb(updated_at),
        'updated_by', to_jsonb(updated_by)
      )
    ) as section_updates
  from latest
  group by class_id
)
update public.class_guides g
set section_updates = coalesce(g.section_updates, '{}'::jsonb) || a.section_updates
from agg a
where g.class_id = a.class_id;
