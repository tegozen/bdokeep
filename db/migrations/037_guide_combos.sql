-- Multiple free-form combos per mode (title + notes); steps belong to a combo

create table public.guide_combos (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.class_guides (id) on delete cascade,
  mode text not null check (mode in ('awakening', 'succession')),
  sort_order int not null default 0,
  title text,
  notes text,
  constraint guide_combos_title_len check (title is null or char_length(title) <= 60),
  constraint guide_combos_notes_len check (notes is null or char_length(notes) <= 500)
);

create index guide_combos_guide_mode_idx
  on public.guide_combos (guide_id, mode, sort_order);

-- One combo per existing (guide_id, mode) chain
insert into public.guide_combos (guide_id, mode, sort_order, title, notes)
select distinct gcs.guide_id, gcs.mode, 0, null, null
from public.guide_combo_steps gcs;

alter table public.guide_combo_steps
  add column if not exists combo_id uuid references public.guide_combos (id) on delete cascade;

update public.guide_combo_steps gcs
set combo_id = gc.id
from public.guide_combos gc
where gc.guide_id = gcs.guide_id
  and gc.mode = gcs.mode;

alter table public.guide_combo_steps
  alter column combo_id set not null;

alter table public.guide_combo_steps drop column if exists mode;
alter table public.guide_combo_steps drop column if exists notes;

drop index if exists guide_combo_steps_guide_idx;

create index guide_combo_steps_combo_idx
  on public.guide_combo_steps (combo_id, sort_order);

create index guide_combo_steps_guide_idx
  on public.guide_combo_steps (guide_id, sort_order);

alter table public.guide_combos enable row level security;

create policy "Public read guide_combos"
  on public.guide_combos for select to anon, authenticated
  using (
    exists (
      select 1
      from public.class_guides g
      join public.classes c on c.id = g.class_id
      where g.id = guide_id and c.published = true
    )
  );

grant select on public.guide_combos to anon, authenticated;
grant all on public.guide_combos to service_role;

do $$
begin
  if exists (select from pg_roles where rolname = 'bdokeep_app') then
    grant select, insert, update, delete on public.guide_combos to bdokeep_app;
    execute 'drop policy if exists bdokeep_app_all on public.guide_combos';
    execute 'create policy bdokeep_app_all on public.guide_combos for all to bdokeep_app using (true) with check (true)';
  end if;
end $$;
