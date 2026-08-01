-- Guide change proposals (pending → approve/reject via Nitro admin API)

create table public.guide_proposals (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  class_slug text not null,
  section text not null check (
    section in (
      'summary',
      'buffs',
      'combo_awakening',
      'combo_succession'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  author_label text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text
);

create index guide_proposals_status_idx
  on public.guide_proposals (status, created_at desc);

create index guide_proposals_class_idx
  on public.guide_proposals (class_id, created_at desc);

alter table public.guide_proposals enable row level security;

-- No anon/authenticated policies → only service_role / postgres via Nitro

grant all on public.guide_proposals to service_role;
