-- Site-wide anonymous feedback (no class) + keep class-scoped rows

alter table public.guide_feedback
  alter column class_id drop not null,
  alter column class_slug drop not null;

grant select, insert, update, delete on public.guide_feedback to bdokeep_app;
