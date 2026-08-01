-- Relic/lightstone presets (same ids as crystal presets)

alter table public.guide_relics
  add column if not exists preset text not null default 't1';

alter table public.guide_relics
  drop constraint if exists guide_relics_preset_check;

alter table public.guide_relics
  add constraint guide_relics_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub'));

create index if not exists guide_relics_guide_preset_idx
  on public.guide_relics (guide_id, preset, sort_order);

alter table public.guide_lightstones
  add column if not exists preset text not null default 't1';

alter table public.guide_lightstones
  drop constraint if exists guide_lightstones_preset_check;

alter table public.guide_lightstones
  add constraint guide_lightstones_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub'));

create index if not exists guide_lightstones_guide_preset_idx
  on public.guide_lightstones (guide_id, preset, sort_order);

-- Allow relic proposals
alter table public.guide_proposals
  drop constraint if exists guide_proposals_section_check;

alter table public.guide_proposals
  add constraint guide_proposals_section_check
  check (
    section in (
      'summary',
      'buffs',
      'combo_awakening',
      'combo_succession',
      'crystals',
      'relics'
    )
  );
