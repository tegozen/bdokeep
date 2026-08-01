-- Skill Add-On (морфы): catalog, guide slots, proposal section

alter table public.skills
  add column if not exists supports_addon boolean not null default false;

alter table public.skills
  add column if not exists addon_tier smallint not null default 2;

alter table public.skills
  drop constraint if exists skills_addon_tier_check;

alter table public.skills
  add constraint skills_addon_tier_check
  check (addon_tier in (1, 2, 3));

-- Combat class skills can take add-ons (heuristic; tip scrape can refine later)
update public.skills
set
  supports_addon = true,
  addon_tier = 2
where class_slug is not null;

create table if not exists public.skill_addon_effects (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_ru text not null,
  effect_group text not null,
  tier_labels jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists skill_addon_effects_sort_idx
  on public.skill_addon_effects (sort_order, name_ru);

alter table public.skill_addon_effects enable row level security;

drop policy if exists "Public read skill_addon_effects" on public.skill_addon_effects;
create policy "Public read skill_addon_effects"
  on public.skill_addon_effects for select to anon, authenticated using (true);

grant select on public.skill_addon_effects to anon, authenticated;
grant all on public.skill_addon_effects to service_role;

create table if not exists public.guide_morphs (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.class_guides (id) on delete cascade,
  preset text not null,
  slot_level int not null,
  skill_id uuid not null references public.skills (id) on delete restrict,
  effect_id_1 uuid references public.skill_addon_effects (id) on delete set null,
  effect_id_2 uuid references public.skill_addon_effects (id) on delete set null,
  sort_order int not null default 0,
  unique (guide_id, preset, slot_level)
);

alter table public.guide_morphs
  drop constraint if exists guide_morphs_preset_check;

alter table public.guide_morphs
  add constraint guide_morphs_preset_check
  check (preset in ('aw_t1', 'aw_t2', 'aw_besp', 'aw_sub', 'succ_t1', 'succ_t2', 'succ_besp', 'succ_sub'));

alter table public.guide_morphs
  drop constraint if exists guide_morphs_slot_level_check;

alter table public.guide_morphs
  add constraint guide_morphs_slot_level_check
  check (slot_level in (50, 52, 54, 56, 58, 60));

create index if not exists guide_morphs_guide_preset_idx
  on public.guide_morphs (guide_id, preset, slot_level);

alter table public.guide_morphs enable row level security;

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

grant select on public.guide_morphs to anon, authenticated;
grant all on public.guide_morphs to service_role;

alter table public.guide_proposals
  drop constraint if exists guide_proposals_section_check;

alter table public.guide_proposals
  add constraint guide_proposals_section_check
  check (
    section in (
      'summary',
      'buffs',
      'combo_awakening',
      'combo_succession',
      'crystals',
      'relics',
      'videos',
      'morphs'
    )
  );

-- Seed skill add-on effect catalog (from data/codex/skill_addon_effects.json)
insert into public.skill_addon_effects (key, name_ru, effect_group, tier_labels, sort_order) values
  ('monster_ap', 'Доп. урон по монстрам', 'offensive_a', '{"1":"Доп. урон по монстрам +30 на 7 сек.","2":"Доп. урон по монстрам +30 на 12 сек.","3":"Доп. урон по монстрам +30 на 20 сек."}'::jsonb, 1),
  ('human_damage', 'Доп. урон по людям', 'offensive_a', '{"1":"Доп. урон по людям +15 на 5 сек.","2":"Доп. урон по людям +15 на 10 сек.","3":"Доп. урон по людям +15 на 15 сек."}'::jsonb, 2),
  ('crit_rate', 'Потенциал крит. удара', 'offensive_a', '{"1":"Потенциал крит. удара +30% на 7 сек.","2":"Потенциал крит. удара +30% на 12 сек.","3":"Потенциал крит. удара +30% на 20 сек."}'::jsonb, 3),
  ('attack_speed', 'Скорость атаки / каста', 'offensive_a', '{"1":"Скорость атаки / каста +10% на 7 сек.","2":"Скорость атаки / каста +10% на 12 сек.","3":"Скорость атаки / каста +10% на 20 сек."}'::jsonb, 4),
  ('move_speed', 'Скорость передвижения', 'offensive_a', '{"1":"Скорость передвижения +10% на 7 сек.","2":"Скорость передвижения +10% на 12 сек.","3":"Скорость передвижения +10% на 20 сек."}'::jsonb, 5),
  ('accuracy_rate', 'Все попадание', 'offensive_a', '{"1":"Все попадание +5% на 7 сек.","2":"Все попадание +5% на 12 сек.","3":"Все попадание +5% на 20 сек."}'::jsonb, 6),
  ('down_attack', 'Урон в нокдауне', 'offensive_b', '{"1":"Урон в нокдауне +5% на 5 сек.","2":"Урон в нокдауне +5% на 7 сек.","3":"Урон в нокдауне +5% на 10 сек."}'::jsonb, 7),
  ('back_attack', 'Урон в спину', 'offensive_b', '{"1":"Урон в спину +5% на 5 сек.","2":"Урон в спину +5% на 7 сек.","3":"Урон в спину +5% на 10 сек."}'::jsonb, 8),
  ('crit_damage', 'Крит. урон', 'offensive_b', '{"1":"Крит. урон +5% на 5 сек.","2":"Крит. урон +5% на 7 сек.","3":"Крит. урон +5% на 10 сек."}'::jsonb, 9),
  ('air_attack', 'Урон в воздухе', 'offensive_b', '{"1":"Урон в воздухе +5% на 5 сек.","2":"Урон в воздухе +5% на 7 сек.","3":"Урон в воздухе +5% на 10 сек."}'::jsonb, 10),
  ('all_dp', 'Вся защита', 'defensive', '{"1":"Вся защита +20 на 10 сек.","2":"Вся защита +20 на 15 сек.","3":"Вся защита +20 на 25 сек."}'::jsonb, 11),
  ('evasion_rate', 'Все уклонение', 'defensive', '{"1":"Все уклонение +5% на 10 сек.","2":"Все уклонение +5% на 15 сек.","3":"Все уклонение +5% на 25 сек."}'::jsonb, 12),
  ('human_damage_down', 'Доп. урон по людям −', 'debuff_a', '{"1":"Доп. урон по людям −15 на 7 сек.","2":"Доп. урон по людям −15 на 10 сек.","3":"Доп. урон по людям −15 на 12 сек."}'::jsonb, 13),
  ('all_dp_down', 'Вся защита −', 'debuff_a', '{"1":"Вся защита −20 на 7 сек.","2":"Вся защита −20 на 10 сек.","3":"Вся защита −20 на 12 сек."}'::jsonb, 14),
  ('evasion_rate_down', 'Все уклонение −', 'debuff_a', '{"1":"Все уклонение −5% на 7 сек.","2":"Все уклонение −5% на 10 сек.","3":"Все уклонение −5% на 12 сек."}'::jsonb, 15),
  ('accuracy_rate_down', 'Все попадание −', 'debuff_a', '{"1":"Все попадание −5% на 7 сек.","2":"Все попадание −5% на 10 сек.","3":"Все попадание −5% на 12 сек."}'::jsonb, 16),
  ('attack_speed_down', 'Скорость атаки / каста −', 'debuff_b', '{"1":"Скорость атаки / каста −10% на 4 сек.","2":"Скорость атаки / каста −10% на 7 сек.","3":"Скорость атаки / каста −10% на 10 сек."}'::jsonb, 17),
  ('move_speed_down', 'Скорость передвижения −', 'debuff_b', '{"1":"Скорость передвижения −10% на 4 сек.","2":"Скорость передвижения −10% на 7 сек.","3":"Скорость передвижения −10% на 10 сек."}'::jsonb, 18),
  ('bleed', 'Кровотечение', 'other', '{"1":"Кровотечение: 100 урона каждые 3 сек. в течение 9 сек.","2":"Кровотечение: 100 урона каждые 3 сек. в течение 15 сек.","3":"Кровотечение: 100 урона каждые 3 сек. в течение 27 сек."}'::jsonb, 19),
  ('recover_hp', 'Восстановление HP за удар', 'other', '{"1":"Восстановление 10 HP за удар","2":"Восстановление 10 HP за удар","3":"Восстановление 10 HP за удар"}'::jsonb, 20),
  ('recover_resource', 'Восстановление ресурса за удар', 'other', '{"1":"Восстановление 20 MP/WP/SP за удар","2":"Восстановление 20 MP/WP/SP за удар","3":"Восстановление 20 MP/WP/SP за удар"}'::jsonb, 21),
  ('air_smash', 'Шанс Air Smash', 'other', '{"1":"Шанс 15% на Air Smash","2":"Шанс 15% на Air Smash","3":"Шанс 15% на Air Smash"}'::jsonb, 22),
  ('down_smash', 'Шанс Down Smash', 'other', '{"1":"Шанс 15% на Down Smash","2":"Шанс 15% на Down Smash","3":"Шанс 15% на Down Smash"}'::jsonb, 23)
on conflict (key) do update set
  name_ru = excluded.name_ru,
  effect_group = excluded.effect_group,
  tier_labels = excluded.tier_labels,
  sort_order = excluded.sort_order,
  updated_at = now();
