-- Ensure morph tables are readable by PostgREST roles (idempotent).
grant select on public.skill_addon_effects to anon, authenticated;
grant all on public.skill_addon_effects to service_role;

grant select on public.guide_morphs to anon, authenticated;
grant all on public.guide_morphs to service_role;

-- Future public tables created by postgres get the same baseline grants
alter default privileges in schema public
  grant select on tables to anon, authenticated;

alter default privileges in schema public
  grant all on tables to service_role;
