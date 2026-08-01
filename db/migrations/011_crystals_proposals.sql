-- Allow crystal/incrustation proposals

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
      'crystals'
    )
  );
