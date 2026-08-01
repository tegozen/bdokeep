-- Add Субботка crystal preset

alter table public.guide_crystals
  drop constraint if exists guide_crystals_preset_check;

alter table public.guide_crystals
  add constraint guide_crystals_preset_check
  check (preset in ('t1', 't2', 'besp', 'sub'));
