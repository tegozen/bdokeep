-- Multiple crystal presets per guide (T1 / T2 / Беспорезки)

alter table public.guide_crystals
  add column if not exists preset text not null default 't1';

alter table public.guide_crystals
  drop constraint if exists guide_crystals_preset_check;

alter table public.guide_crystals
  add constraint guide_crystals_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub'));

create index if not exists guide_crystals_guide_preset_idx
  on public.guide_crystals (guide_id, preset, sort_order);
