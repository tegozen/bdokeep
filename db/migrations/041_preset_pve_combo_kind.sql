-- Add ПВЕ guide preset + combo kind (pvp | pve).
-- Combos: T1/T2/besp/sub share PvP chains; only `pve` uses PvE chains.

alter table public.guide_crystals
  drop constraint if exists guide_crystals_preset_check;
alter table public.guide_crystals
  add constraint guide_crystals_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub', 'pve'));

alter table public.guide_relics
  drop constraint if exists guide_relics_preset_check;
alter table public.guide_relics
  add constraint guide_relics_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub', 'pve'));

alter table public.guide_lightstones
  drop constraint if exists guide_lightstones_preset_check;
alter table public.guide_lightstones
  add constraint guide_lightstones_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub', 'pve'));

alter table public.guide_buffs
  drop constraint if exists guide_buffs_preset_check;
alter table public.guide_buffs
  add constraint guide_buffs_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub', 'pve'));

alter table public.guide_essence
  drop constraint if exists guide_essence_preset_check;
alter table public.guide_essence
  add constraint guide_essence_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub', 'pve'));

alter table public.guide_morphs
  drop constraint if exists guide_morphs_preset_check;
alter table public.guide_morphs
  add constraint guide_morphs_preset_check
  check (
    preset in (
      'aw_t1', 'aw_t2', 'aw_besp', 'aw_sub', 'aw_pve',
      'succ_t1', 'succ_t2', 'succ_besp', 'succ_sub', 'succ_pve'
    )
  );

alter table public.guide_combos
  add column if not exists kind text not null default 'pvp';

alter table public.guide_combos
  drop constraint if exists guide_combos_kind_check;
alter table public.guide_combos
  add constraint guide_combos_kind_check
  check (kind in ('pvp', 'pve'));

drop index if exists guide_combos_guide_mode_idx;
create index guide_combos_guide_mode_kind_idx
  on public.guide_combos (guide_id, mode, kind, sort_order);
