-- BDO Keep schema: classes, guides, catalogs, RLS
-- Runs on first Postgres init (docker-entrypoint-initdb.d)

create extension if not exists "pgcrypto";

-- ========== Catalog / domain ==========

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ru text not null,
  icon_url text,
  portrait_url text,
  awakening_name text,
  succession_name text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.class_guides (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes (id) on delete cascade,
  summary text,
  updated_at timestamptz not null default now()
);

create table public.class_videos (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  youtube_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  codex_id text unique,
  name_ru text not null,
  icon_url text,
  class_slug text,
  skill_type text,
  level_req int,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.buffs (
  id uuid primary key default gen_random_uuid(),
  codex_id text unique,
  name_ru text not null,
  icon_url text,
  description text,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create type public.item_type as enum (
  'relic',
  'lightstone',
  'crystal',
  'essence',
  'other'
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  codex_id text unique,
  name_ru text not null,
  icon_url text,
  item_type public.item_type not null default 'other',
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ========== Guide recommendations ==========

create table public.guide_buffs (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.class_guides (id) on delete cascade,
  buff_id uuid references public.buffs (id) on delete set null,
  slot text,
  preset text not null default 't1'
    check (preset in ('t1', 't2', 'besp', 'sub')),
  group_name text,
  notes text,
  sort_order int not null default 0
);

create table public.guide_relics (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.class_guides (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  slot text,
  preset text not null default 't1'
    check (preset in ('t1', 't2', 'besp', 'sub')),
  notes text,
  sort_order int not null default 0
);

create table public.guide_lightstones (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.class_guides (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  slot text,
  preset text not null default 't1'
    check (preset in ('t1', 't2', 'besp', 'sub')),
  notes text,
  sort_order int not null default 0
);

create table public.guide_crystals (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.class_guides (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  slot text,
  preset text not null default 't1'
    check (preset in ('t1', 't2', 'besp', 'sub')),
  notes text,
  sort_order int not null default 0
);

create table public.guide_essence (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.class_guides (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  slot text,
  notes text,
  sort_order int not null default 0
);

-- ========== Indexes ==========

create index classes_published_sort_idx on public.classes (published, sort_order);
create index class_videos_class_idx on public.class_videos (class_id, sort_order);
create index skills_class_slug_idx on public.skills (class_slug);
create index items_type_idx on public.items (item_type);
create index guide_buffs_guide_idx on public.guide_buffs (guide_id, sort_order);
create index guide_buffs_guide_preset_idx on public.guide_buffs (guide_id, preset, sort_order);
create index guide_relics_guide_idx on public.guide_relics (guide_id, sort_order);
create index guide_relics_guide_preset_idx on public.guide_relics (guide_id, preset, sort_order);
create index guide_lightstones_guide_idx on public.guide_lightstones (guide_id, sort_order);
create index guide_lightstones_guide_preset_idx on public.guide_lightstones (guide_id, preset, sort_order);
create index guide_crystals_guide_idx on public.guide_crystals (guide_id, sort_order);
create index guide_crystals_guide_preset_idx on public.guide_crystals (guide_id, preset, sort_order);
create index guide_essence_guide_idx on public.guide_essence (guide_id, sort_order);

-- ========== RLS ==========

alter table public.classes enable row level security;
alter table public.class_guides enable row level security;
alter table public.class_videos enable row level security;
alter table public.skills enable row level security;
alter table public.buffs enable row level security;
alter table public.items enable row level security;
alter table public.guide_buffs enable row level security;
alter table public.guide_relics enable row level security;
alter table public.guide_lightstones enable row level security;
alter table public.guide_crystals enable row level security;
alter table public.guide_essence enable row level security;

-- Anon / authenticated: read published content only
create policy "Public read published classes"
  on public.classes for select
  to anon, authenticated
  using (published = true);

create policy "Public read guides of published classes"
  on public.class_guides for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.published = true
    )
  );

create policy "Public read videos of published classes"
  on public.class_videos for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.published = true
    )
  );

create policy "Public read skills"
  on public.skills for select to anon, authenticated using (true);

create policy "Public read buffs"
  on public.buffs for select to anon, authenticated using (true);

create policy "Public read items"
  on public.items for select to anon, authenticated using (true);

create policy "Public read guide_buffs"
  on public.guide_buffs for select to anon, authenticated
  using (
    exists (
      select 1
      from public.class_guides g
      join public.classes c on c.id = g.class_id
      where g.id = guide_id and c.published = true
    )
  );

create policy "Public read guide_relics"
  on public.guide_relics for select to anon, authenticated
  using (
    exists (
      select 1
      from public.class_guides g
      join public.classes c on c.id = g.class_id
      where g.id = guide_id and c.published = true
    )
  );

create policy "Public read guide_lightstones"
  on public.guide_lightstones for select to anon, authenticated
  using (
    exists (
      select 1
      from public.class_guides g
      join public.classes c on c.id = g.class_id
      where g.id = guide_id and c.published = true
    )
  );

create policy "Public read guide_crystals"
  on public.guide_crystals for select to anon, authenticated
  using (
    exists (
      select 1
      from public.class_guides g
      join public.classes c on c.id = g.class_id
      where g.id = guide_id and c.published = true
    )
  );

create policy "Public read guide_essence"
  on public.guide_essence for select to anon, authenticated
  using (
    exists (
      select 1
      from public.class_guides g
      join public.classes c on c.id = g.class_id
      where g.id = guide_id and c.published = true
    )
  );

-- No anon/authenticated write policies → writes only via service_role / Studio as postgres

grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- ========== Seed: all classes (empty guides) ==========

insert into public.classes (slug, name_ru, icon_url, portrait_url, sort_order) values
  ('warrior', 'Воин', '/classes/warrior/icon.svg', '/classes/warrior/portrait-card-360.webp', 1),
  ('ranger', 'Лучница', '/classes/ranger/icon.svg', '/classes/ranger/portrait-card-360.webp', 2),
  ('sorceress', 'Колдунья', '/classes/sorceress/icon.svg', '/classes/sorceress/portrait-card-360.webp', 3),
  ('berserker', 'Варвар', '/classes/berserker/icon.svg', '/classes/berserker/portrait-card-360.webp', 4),
  ('tamer', 'Мистик', '/classes/tamer/icon.svg', '/classes/tamer/portrait-card-360.webp', 5),
  ('musa', 'Мастер меча', '/classes/musa/icon.svg', '/classes/musa/portrait-card-360.webp', 6),
  ('maehwa', 'Маэва', '/classes/maehwa/icon.svg', '/classes/maehwa/portrait-card-360.webp', 7),
  ('valkyrie', 'Валькирия', '/classes/valkyrie/icon.svg', '/classes/valkyrie/portrait-card-360.webp', 8),
  ('kunoichi', 'Куноичи', '/classes/kunoichi/icon.svg', '/classes/kunoichi/portrait-card-360.webp', 9),
  ('ninja', 'Ниндзя', '/classes/ninja/icon.svg', '/classes/ninja/portrait-card-360.webp', 10),
  ('wizard', 'Волшебник', '/classes/wizard/icon.svg', '/classes/wizard/portrait-card-360.webp', 11),
  ('witch', 'Волшебница', '/classes/witch/icon.svg', '/classes/witch/portrait-card-360.webp', 12),
  ('dark-knight', 'Темный рыцарь', '/classes/dark-knight/icon.svg', '/classes/dark-knight/portrait-card-360.webp', 13),
  ('striker', 'Страйкер', '/classes/striker/icon.svg', '/classes/striker/portrait-card-360.webp', 14),
  ('mystic', 'Фурия', '/classes/mystic/icon.svg', '/classes/mystic/portrait-card-360.webp', 15),
  ('lahn', 'Лан', '/classes/lahn/icon.svg', '/classes/lahn/portrait-card-360.webp', 16),
  ('archer', 'Лучник', '/classes/archer/icon.svg', '/classes/archer/portrait-card-360.webp', 17),
  ('shai', 'Шай', '/classes/shai/icon.svg', '/classes/shai/portrait-card-360.webp', 18),
  ('guardian', 'Страж', '/classes/guardian/icon.svg', '/classes/guardian/portrait-card-360.webp', 19),
  ('hashashin', 'Хассашин', '/classes/hashashin/icon.svg', '/classes/hashashin/portrait-card-360.webp', 20),
  ('nova', 'Нова', '/classes/nova/icon.svg', '/classes/nova/portrait-card-360.webp', 21),
  ('sage', 'Мудрец', '/classes/sage/icon.svg', '/classes/sage/portrait-card-360.webp', 22),
  ('corsair', 'Корсар', '/classes/corsair/icon.svg', '/classes/corsair/portrait-card-360.webp', 23),
  ('drakania', 'Драканиа', '/classes/drakania/icon.svg', '/classes/drakania/portrait-card-360.webp', 24),
  ('woosa', 'Уса', '/classes/woosa/icon.svg', '/classes/woosa/portrait-card-360.webp', 25),
  ('maegu', 'Мэгу', '/classes/maegu/icon.svg', '/classes/maegu/portrait-card-360.webp', 26),
  ('scholar', 'Сколария', '/classes/scholar/icon.svg', '/classes/scholar/portrait-card-360.webp', 27),
  ('dosa', 'Тоса', '/classes/dosa/icon.svg', '/classes/dosa/portrait-card-360.webp', 28),
  ('deadeye', 'Мертвый Глаз', '/classes/deadeye/icon.svg', '/classes/deadeye/portrait-card-360.webp', 29),
  ('wukong', 'Вуконг', '/classes/wukong/icon.svg', '/classes/wukong/portrait-card-360.webp', 30),
  ('seraph', 'Сераф', '/classes/seraph/icon.svg', '/classes/seraph/portrait-card-360.webp', 31),
  ('agent', 'Агент', '/classes/agent/icon.svg', '/classes/agent/portrait-card-360.webp', 32);

insert into public.class_guides (class_id, summary)
select id, null from public.classes;
