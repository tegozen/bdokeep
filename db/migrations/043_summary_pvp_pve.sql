-- Notes (formerly siege role / summary): (pvp|pve) × (awakening|succession).
-- Existing summary_* become PvP; PvE starts empty.

alter table public.class_guides
  add column if not exists summary_pvp_awakening text;

alter table public.class_guides
  add column if not exists summary_pvp_succession text;

alter table public.class_guides
  add column if not exists summary_pve_awakening text;

alter table public.class_guides
  add column if not exists summary_pve_succession text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'class_guides'
      and column_name = 'summary_awakening'
  ) then
    update public.class_guides
    set
      summary_pvp_awakening = coalesce(summary_pvp_awakening, summary_awakening),
      summary_pvp_succession = coalesce(summary_pvp_succession, summary_succession);
    alter table public.class_guides drop column summary_awakening;
    alter table public.class_guides drop column summary_succession;
  end if;
end
$$;

-- Remap section_updates keys to PvP buckets
update public.class_guides
set section_updates =
  (coalesce(section_updates, '{}'::jsonb)
    - 'summary_awakening'
    - 'summary_succession')
  || case
    when section_updates ? 'summary_awakening'
      then jsonb_build_object('summary_pvp_awakening', section_updates->'summary_awakening')
    else '{}'::jsonb
  end
  || case
    when section_updates ? 'summary_succession'
      then jsonb_build_object('summary_pvp_succession', section_updates->'summary_succession')
    else '{}'::jsonb
  end
where section_updates ? 'summary_awakening'
   or section_updates ? 'summary_succession';
