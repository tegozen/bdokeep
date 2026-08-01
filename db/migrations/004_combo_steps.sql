-- Ordered combo chains as skill steps (replaces free-text combo_* columns)

create table public.guide_combo_steps (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.class_guides (id) on delete cascade,
  mode text not null check (mode in ('awakening', 'succession')),
  skill_id uuid not null references public.skills (id) on delete restrict,
  sort_order int not null default 0,
  notes text
);

create index guide_combo_steps_guide_idx
  on public.guide_combo_steps (guide_id, mode, sort_order);

alter table public.guide_combo_steps enable row level security;

create policy "Public read guide_combo_steps"
  on public.guide_combo_steps for select to anon, authenticated
  using (
    exists (
      select 1
      from public.class_guides g
      join public.classes c on c.id = g.class_id
      where g.id = guide_id and c.published = true
    )
  );

grant select on public.guide_combo_steps to anon, authenticated;
grant all on public.guide_combo_steps to service_role;

-- Drop legacy free-text combo columns
alter table public.class_guides
  drop column if exists combo_awakening,
  drop column if exists combo_succession;
