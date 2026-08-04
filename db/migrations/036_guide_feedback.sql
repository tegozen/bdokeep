-- Anonymous guide feedback (admin-only inbox; no visitor identity)

create table public.guide_feedback (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  class_slug text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint guide_feedback_body_len check (char_length(body) between 1 and 2000)
);

create index guide_feedback_created_idx
  on public.guide_feedback (created_at desc);

create index guide_feedback_class_idx
  on public.guide_feedback (class_slug, created_at desc);

alter table public.guide_feedback enable row level security;

-- No anon/authenticated policies → only bdokeep_app / service_role via Nitro

grant all on public.guide_feedback to service_role;
