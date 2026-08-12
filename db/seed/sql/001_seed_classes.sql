-- Class roster for home grid (names/sort as on production).
-- Guide content (notes/combos/…) is NOT seeded — only slug/name/art/sort + empty class_guides.
-- Safe on prod: upsert by slug, never deletes classes or guide_* rows.

insert into public.classes (
  slug, name_ru, icon_url, portrait_url, sort_order, published
) values
  ('warrior', 'Воин', '/classes/warrior/icon.svg', '/classes/warrior/portrait-card-360.webp', 1, true),
  ('ranger', 'Лучница', '/classes/ranger/icon.svg', '/classes/ranger/portrait-card-360.webp', 2, true),
  ('sorceress', 'Колдунья', '/classes/sorceress/icon.svg', '/classes/sorceress/portrait-card-360.webp', 3, true),
  ('berserker', 'Варвар', '/classes/berserker/icon.svg', '/classes/berserker/portrait-card-360.webp', 4, true),
  ('tamer', 'Мистик', '/classes/tamer/icon.svg', '/classes/tamer/portrait-card-360.webp', 5, true),
  ('musa', 'Мастер меча', '/classes/musa/icon.svg', '/classes/musa/portrait-card-360.webp', 6, true),
  ('maehwa', 'Маэва', '/classes/maehwa/icon.svg', '/classes/maehwa/portrait-card-360.webp', 7, true),
  ('valkyrie', 'Валькирия', '/classes/valkyrie/icon.svg', '/classes/valkyrie/portrait-card-360.webp', 8, true),
  ('kunoichi', 'Куноичи', '/classes/kunoichi/icon.svg', '/classes/kunoichi/portrait-card-360.webp', 9, true),
  ('ninja', 'Ниндзя', '/classes/ninja/icon.svg', '/classes/ninja/portrait-card-360.webp', 10, true),
  ('wizard', 'Волшебник', '/classes/wizard/icon.svg', '/classes/wizard/portrait-card-360.webp', 11, true),
  ('witch', 'Волшебница', '/classes/witch/icon.svg', '/classes/witch/portrait-card-360.webp', 12, true),
  ('dark-knight', 'Темный рыцарь', '/classes/dark-knight/icon.svg', '/classes/dark-knight/portrait-card-360.webp', 13, true),
  ('striker', 'Страйкер', '/classes/striker/icon.svg', '/classes/striker/portrait-card-360.webp', 14, true),
  ('mystic', 'Фурия', '/classes/mystic/icon.svg', '/classes/mystic/portrait-card-360.webp', 15, true),
  ('lahn', 'Лан', '/classes/lahn/icon.svg', '/classes/lahn/portrait-card-360.webp', 16, true),
  ('archer', 'Лучник', '/classes/archer/icon.svg', '/classes/archer/portrait-card-360.webp', 17, true),
  ('shai', 'Шай', '/classes/shai/icon.svg', '/classes/shai/portrait-card-360.webp', 18, true),
  ('guardian', 'Страж', '/classes/guardian/icon.svg', '/classes/guardian/portrait-card-360.webp', 19, true),
  ('hashashin', 'Хассашин', '/classes/hashashin/icon.svg', '/classes/hashashin/portrait-card-360.webp', 20, true),
  ('nova', 'Нова', '/classes/nova/icon.svg', '/classes/nova/portrait-card-360.webp', 21, true),
  ('sage', 'Мудрец', '/classes/sage/icon.svg', '/classes/sage/portrait-card-360.webp', 22, true),
  ('corsair', 'Корсар', '/classes/corsair/icon.svg', '/classes/corsair/portrait-card-360.webp', 23, true),
  ('drakania', 'Драканиа', '/classes/drakania/icon.svg', '/classes/drakania/portrait-card-360.webp', 24, true),
  ('woosa', 'Уса', '/classes/woosa/icon.svg', '/classes/woosa/portrait-card-360.webp', 25, true),
  ('maegu', 'Мэгу', '/classes/maegu/icon.svg', '/classes/maegu/portrait-card-360.webp', 26, true),
  ('scholar', 'Сколария', '/classes/scholar/icon.svg', '/classes/scholar/portrait-card-360.webp', 27, true),
  ('dosa', 'Тоса', '/classes/dosa/icon.svg', '/classes/dosa/portrait-card-360.webp', 28, true),
  ('deadeye', 'Мертвый Глаз', '/classes/deadeye/icon.svg', '/classes/deadeye/portrait-card-360.webp', 29, true),
  ('wukong', 'Вуконг', '/classes/wukong/icon.svg', '/classes/wukong/portrait-card-360.webp', 30, true),
  ('seraph', 'Сераф', '/classes/seraph/icon.svg', '/classes/seraph/portrait-card-360.webp', 31, true),
  ('agent', 'Агент', '/classes/agent/icon.svg', '/classes/agent/portrait-card-360.webp', 32, true)
on conflict (slug) do update set
  name_ru = excluded.name_ru,
  icon_url = excluded.icon_url,
  portrait_url = excluded.portrait_url,
  sort_order = excluded.sort_order,
  published = excluded.published;

insert into public.class_guides (class_id)
select c.id
from public.classes c
where not exists (
  select 1 from public.class_guides g where g.class_id = c.id
);
