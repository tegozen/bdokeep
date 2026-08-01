-- Remove skill-guide section (priority skill list per class guide).
-- Catalog table public.skills is kept for combo picker.

drop policy if exists "Public read guide_skills" on public.guide_skills;
drop index if exists public.guide_skills_guide_idx;
drop table if exists public.guide_skills;
