-- Hardening stones (закалки): preset-scoped slots on guide_essence + proposal section.

-- Safe to re-run on existing DBs:
--   docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/028_hardening.sql

alter table public.guide_essence
  add column if not exists preset text not null default 't1';

alter table public.guide_essence
  drop constraint if exists guide_essence_preset_check;

alter table public.guide_essence
  add constraint guide_essence_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub'));

create index if not exists guide_essence_guide_preset_idx
  on public.guide_essence (guide_id, preset, sort_order);

-- One stone per slot per preset (slots h0–h4).
alter table public.guide_essence
  drop constraint if exists guide_essence_guide_preset_slot_key;

alter table public.guide_essence
  add constraint guide_essence_guide_preset_slot_key
  unique (guide_id, preset, slot);

alter table public.guide_proposals
  drop constraint if exists guide_proposals_section_check;

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
      'hardening',
      'videos_awakening',
      'videos_succession',
      'morphs'
    )
  );
