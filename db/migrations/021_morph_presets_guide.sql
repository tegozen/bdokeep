-- Morph presets aligned with crystal/relic/buff: t1 / t2 / besp / sub
-- (still prefixed by awakening / succession)

alter table public.guide_morphs
  drop constraint if exists guide_morphs_preset_check;

update public.guide_morphs set preset = 'aw_t1' where preset = 'aw_cut';
update public.guide_morphs set preset = 'succ_t1' where preset = 'succ_cut';

alter table public.guide_morphs
  add constraint guide_morphs_preset_check
  check (
    preset in (
      'aw_t1', 'aw_t2', 'aw_besp', 'aw_sub',
      'succ_t1', 'succ_t2', 'succ_besp', 'succ_sub'
    )
  );
