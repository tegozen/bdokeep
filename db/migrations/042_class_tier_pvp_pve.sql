-- Class tier: (pvp|pve) × (awakening|succession).
-- Existing awakening/succession ratings become PvP; PvE starts empty.

alter table public.classes
  add column if not exists tier_pvp_awakening smallint null;

alter table public.classes
  add column if not exists tier_pvp_succession smallint null;

alter table public.classes
  add column if not exists tier_pve_awakening smallint null;

alter table public.classes
  add column if not exists tier_pve_succession smallint null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'classes'
      and column_name = 'tier_awakening'
  ) then
    update public.classes
    set
      tier_pvp_awakening = coalesce(tier_pvp_awakening, tier_awakening),
      tier_pvp_succession = coalesce(tier_pvp_succession, tier_succession);
    alter table public.classes drop constraint if exists classes_tier_awakening_check;
    alter table public.classes drop constraint if exists classes_tier_succession_check;
    alter table public.classes drop column tier_awakening;
    alter table public.classes drop column tier_succession;
  end if;
end
$$;

alter table public.classes
  drop constraint if exists classes_tier_pvp_awakening_check;
alter table public.classes
  add constraint classes_tier_pvp_awakening_check
  check (tier_pvp_awakening is null or tier_pvp_awakening between 1 and 5);

alter table public.classes
  drop constraint if exists classes_tier_pvp_succession_check;
alter table public.classes
  add constraint classes_tier_pvp_succession_check
  check (tier_pvp_succession is null or tier_pvp_succession between 1 and 5);

alter table public.classes
  drop constraint if exists classes_tier_pve_awakening_check;
alter table public.classes
  add constraint classes_tier_pve_awakening_check
  check (tier_pve_awakening is null or tier_pve_awakening between 1 and 5);

alter table public.classes
  drop constraint if exists classes_tier_pve_succession_check;
alter table public.classes
  add constraint classes_tier_pve_succession_check
  check (tier_pve_succession is null or tier_pve_succession between 1 and 5);
