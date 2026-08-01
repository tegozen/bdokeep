-- PvP tier rating for classes (1–5 stars). Set by superadmin only (Nitro).
-- Safe to re-run on existing DBs:
--   docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/024_class_tier.sql

alter table public.classes
  add column if not exists tier smallint null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'classes_tier_check'
      and conrelid = 'public.classes'::regclass
  ) then
    alter table public.classes
      add constraint classes_tier_check
      check (tier is null or tier between 1 and 5);
  end if;
end
$$;
