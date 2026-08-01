-- Per-section last update meta on class guides (date + author nick / admin).
-- Safe to re-run on existing DBs:
--   docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/025_section_updates.sql

alter table public.class_guides
  add column if not exists section_updates jsonb not null default '{}'::jsonb;
