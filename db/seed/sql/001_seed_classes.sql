-- Class roster for home grid. Guide content (notes/combos/…) is NOT seeded —
-- only slug/name/art/sort + empty class_guides row. Safe on prod: upsert by slug,
-- never deletes classes or guide_* rows.

insert into public.classes (
  slug, name_ru, icon_url, portrait_url, sort_order, published
) values
  ('warrior', 'Воин', '/classes/warrior/icon.svg', '/classes/warrior/portrait-card-360.webp', 10, true),
  ('ranger', 'Следопыт', '/classes/ranger/icon.svg', '/classes/ranger/portrait-card-360.webp', 20, true),
  ('sorceress', 'Чародейка', '/classes/sorceress/icon.svg', '/classes/sorceress/portrait-card-360.webp', 30, true),
  ('berserker', 'Берсерк', '/classes/berserker/icon.svg', '/classes/berserker/portrait-card-360.webp', 40, true),
  ('tamer', 'Укротительница', '/classes/tamer/icon.svg', '/classes/tamer/portrait-card-360.webp', 50, true),
  ('musa', 'Муса', '/classes/musa/icon.svg', '/classes/musa/portrait-card-360.webp', 60, true),
  ('maehwa', 'Мэхва', '/classes/maehwa/icon.svg', '/classes/maehwa/portrait-card-360.webp', 70, true),
  ('valkyrie', 'Валькирия', '/classes/valkyrie/icon.svg', '/classes/valkyrie/portrait-card-360.webp', 80, true),
  ('kunoichi', 'Куноичи', '/classes/kunoichi/icon.svg', '/classes/kunoichi/portrait-card-360.webp', 90, true),
  ('ninja', 'Ниндзя', '/classes/ninja/icon.svg', '/classes/ninja/portrait-card-360.webp', 100, true),
  ('wizard', 'Волшебник', '/classes/wizard/icon.svg', '/classes/wizard/portrait-card-360.webp', 110, true),
  ('witch', 'Ведьма', '/classes/witch/icon.svg', '/classes/witch/portrait-card-360.webp', 120, true),
  ('dark-knight', 'Тёмный рыцарь', '/classes/dark-knight/icon.svg', '/classes/dark-knight/portrait-card-360.webp', 130, true),
  ('striker', 'Страйкер', '/classes/striker/icon.svg', '/classes/striker/portrait-card-360.webp', 140, true),
  ('mystic', 'Мистик', '/classes/mystic/icon.svg', '/classes/mystic/portrait-card-360.webp', 150, true),
  ('lahn', 'Лан', '/classes/lahn/icon.svg', '/classes/lahn/portrait-card-360.webp', 160, true),
  ('archer', 'Лучник', '/classes/archer/icon.svg', '/classes/archer/portrait-card-360.webp', 170, true),
  ('hashashin', 'Хашашин', '/classes/hashashin/icon.svg', '/classes/hashashin/portrait-card-360.webp', 180, true),
  ('guardian', 'Страж', '/classes/guardian/icon.svg', '/classes/guardian/portrait-card-360.webp', 190, true),
  ('nova', 'Нова', '/classes/nova/icon.svg', '/classes/nova/portrait-card-360.webp', 200, true),
  ('sage', 'Мудрец', '/classes/sage/icon.svg', '/classes/sage/portrait-card-360.webp', 210, true),
  ('corsair', 'Корсар', '/classes/corsair/icon.svg', '/classes/corsair/portrait-card-360.webp', 220, true),
  ('drakania', 'Дракания', '/classes/drakania/icon.svg', '/classes/drakania/portrait-card-360.webp', 230, true),
  ('woosa', 'Вуса', '/classes/woosa/icon.svg', '/classes/woosa/portrait-card-360.webp', 240, true),
  ('maegu', 'Мэгу', '/classes/maegu/icon.svg', '/classes/maegu/portrait-card-360.webp', 250, true),
  ('scholar', 'Учёный', '/classes/scholar/icon.svg', '/classes/scholar/portrait-card-360.webp', 260, true),
  ('shai', 'Шай', '/classes/shai/icon.svg', '/classes/shai/portrait-card-360.webp', 270, true),
  ('wukong', 'Вуконг', '/classes/wukong/icon.svg', '/classes/wukong/portrait-card-360.webp', 280, true),
  ('dosa', 'Доса', '/classes/dosa/icon.svg', '/classes/dosa/portrait-card-360.webp', 290, true),
  ('deadeye', 'Сорвиголова', '/classes/deadeye/icon.svg', '/classes/deadeye/portrait-card-360.webp', 300, true),
  ('seraph', 'Сераф', '/classes/seraph/icon.svg', '/classes/seraph/portrait-card-360.webp', 310, true)
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
