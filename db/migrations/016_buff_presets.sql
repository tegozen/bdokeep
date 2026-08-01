-- Buff presets (same ids as crystal/relic presets)

alter table public.guide_buffs
  add column if not exists preset text not null default 't1';

alter table public.guide_buffs
  drop constraint if exists guide_buffs_preset_check;

alter table public.guide_buffs
  add constraint guide_buffs_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub'));

create index if not exists guide_buffs_guide_preset_idx
  on public.guide_buffs (guide_id, preset, sort_order);
