-- Drop unused pvp_role; summary is the only text caption for the class guide.

alter table public.class_guides
  drop column if exists pvp_role;

-- Reject leftover role proposals before tightening the check constraint
update public.guide_proposals
set
  status = 'rejected',
  reviewed_at = coalesce(reviewed_at, now()),
  review_note = coalesce(review_note, 'section pvp_role removed')
where section = 'pvp_role'
  and status = 'pending';

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
