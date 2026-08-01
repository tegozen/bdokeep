-- Dual awakening/succession for summary, videos, and class tier.
-- Safe to re-run on existing DBs:
--   docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/027_dual_mode_summary_videos_tier.sql

-- ---------------------------------------------------------------------------
-- class_guides: summary_awakening / summary_succession
-- ---------------------------------------------------------------------------
alter table public.class_guides
  add column if not exists summary_awakening text;

alter table public.class_guides
  add column if not exists summary_succession text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'class_guides'
      and column_name = 'summary'
  ) then
    update public.class_guides
    set
      summary_awakening = coalesce(summary_awakening, summary),
      summary_succession = coalesce(summary_succession, summary);
    alter table public.class_guides drop column summary;
  end if;
end
$$;

-- Migrate section_updates keys summary/videos → *_awakening
update public.class_guides
set section_updates =
  (coalesce(section_updates, '{}'::jsonb) - 'summary' - 'videos')
  || case
    when section_updates ? 'summary' then jsonb_build_object('summary_awakening', section_updates->'summary')
    else '{}'::jsonb
  end
  || case
    when section_updates ? 'videos' then jsonb_build_object('videos_awakening', section_updates->'videos')
    else '{}'::jsonb
  end
where section_updates ? 'summary' or section_updates ? 'videos';

-- ---------------------------------------------------------------------------
-- class_videos.mode
-- ---------------------------------------------------------------------------
alter table public.class_videos
  add column if not exists mode text;

update public.class_videos
set mode = 'awakening'
where mode is null;

alter table public.class_videos
  alter column mode set default 'awakening';

alter table public.class_videos
  alter column mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'class_videos_mode_check'
      and conrelid = 'public.class_videos'::regclass
  ) then
    alter table public.class_videos
      add constraint class_videos_mode_check
      check (mode in ('awakening', 'succession'));
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- classes: tier_awakening / tier_succession
-- ---------------------------------------------------------------------------
alter table public.classes
  add column if not exists tier_awakening smallint null;

alter table public.classes
  add column if not exists tier_succession smallint null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'classes'
      and column_name = 'tier'
  ) then
    update public.classes
    set
      tier_awakening = coalesce(tier_awakening, tier),
      tier_succession = coalesce(tier_succession, tier);
    alter table public.classes drop constraint if exists classes_tier_check;
    alter table public.classes drop column tier;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'classes_tier_awakening_check'
      and conrelid = 'public.classes'::regclass
  ) then
    alter table public.classes
      add constraint classes_tier_awakening_check
      check (tier_awakening is null or tier_awakening between 1 and 5);
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conname = 'classes_tier_succession_check'
      and conrelid = 'public.classes'::regclass
  ) then
    alter table public.classes
      add constraint classes_tier_succession_check
      check (tier_succession is null or tier_succession between 1 and 5);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- guide_proposals sections
-- ---------------------------------------------------------------------------
alter table public.guide_proposals
  drop constraint if exists guide_proposals_section_check;

update public.guide_proposals
set section = 'summary_awakening'
where section = 'summary';

update public.guide_proposals
set section = 'videos_awakening'
where section = 'videos';

alter table public.guide_proposals
  add constraint guide_proposals_section_check
  check (
    section in (
      'summary_awakening',
      'summary_succession',
      'buffs',
      'combo_awakening',
      'combo_succession',
      'crystals',
      'relics',
      'videos_awakening',
      'videos_succession',
      'morphs'
    )
  );
