-- Combo text for awakening / succession (guild PvP chains)
alter table public.class_guides
  add column if not exists combo_awakening text,
  add column if not exists combo_succession text;
