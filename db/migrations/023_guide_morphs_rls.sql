-- Tighten guide_morphs public read to published classes only (match guide_combo_steps).
-- Safe to re-run on existing DBs:
--   docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/023_guide_morphs_rls.sql

drop policy if exists "Public read guide_morphs" on public.guide_morphs;
create policy "Public read guide_morphs"
  on public.guide_morphs for select to anon, authenticated
  using (
    exists (
      select 1
      from public.class_guides g
      join public.classes c on c.id = g.class_id
      where g.id = guide_id and c.published = true
    )
  );
