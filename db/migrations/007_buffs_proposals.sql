-- Allow free-text buff proposals (structured picker when buff catalog is imported)

alter table public.guide_proposals
  drop constraint if exists guide_proposals_section_check;

alter table public.guide_proposals
  add constraint guide_proposals_section_check
  check (
    section in (
      'summary',
      'buffs',
      'combo_awakening',
      'combo_succession'
    )
  );
