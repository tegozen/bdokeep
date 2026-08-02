# BDO Keep

Гильдейские PvP-гайды по классам Black Desert Online (только RU).

Неофициальный фан-ресурс гильдии. Не связан с Pearl Abyss. Портреты и иконки классов © Pearl Abyss.

Стек: **Nuxt 4.5+** (FSD) + Postgres. API — Nitro. Один `docker-compose.yml`.

## Фишки

### Гайд класса

- Сетка классов на главной → страница `/class/[slug]`
- Разделы: **Роль на осаде**, **Комба**, **Морфы**, **Инкрустация**, **Реликвии**, **Закалки**, **Забаф**, **Видео**
- Sticky-хедер: класс, переключатели режима/пресета, вход суперадмина
- Пустые секции явно помечены («Пока пусто»), а не выглядят сломанными
- **Тир 1–5 ★** — сила класса в гильдейском PvP; видят все, ставит только суперадмин (в хедере «Роль на осаде»)
- На главной: фильтр по тиру / «Скрыть пустые»; заполненные классы сортируются от большего тира
- У каждого раздела: «Обновлено ДД.ММ.ГГГГ · ник/админ»; точки у пресетов с данными в хедере

### Режимы и пресеты

- **Пробуждение / Наследие** — отдельная комба и морфы
- Пресеты гайда: **T1**, **T2**, **Беспорезки**, **Субботка**
- Один переключатель пресета крутит кристаллы, реликвии, закалки, забаф и морфы
- В табах пресета — маркер, если в пресете уже есть контент

### Доски как в BDO

- **Инкрустация** — 17 слотов + 6 рассвета, список выбранных кристаллов
- **Реликвии** — 2 реликвии × 2 светящихся камня
- **Закалки** — 5 камней закалки оружия Вана (один набор на все оружия)
- **Морфы** — слоты уровней 50–60: скилл + 2 эффекта аддона
- **Комба** — цепочка иконок скиллов по порядку

### Контент и медиа

- **Роль на осаде** — Markdown (редактор + превью, санитизация на сервере)
- **Видео** — до 3 ссылок YouTube с embed-превью
- **Забаф** — каталог бафов с иконками и категориями

### Краудсорс правок

- У каждой секции кнопка **«Предложить»**
- Каталоги скиллов / бафов / кристаллов / реликвий / закалок / морфов прямо в модалке
- Drag-and-drop порядка в комбе и забафе
- Игровой ник для гостей, honeypot от ботов, rate limit
- Guard несохранённых правок (confirm + `beforeunload`)

### Модерация

- Очередь на [`/admin/proposals`](http://127.0.0.1:3000/admin/proposals) (пароль `ADMIN_PASSWORD`)
- Одобрить / отклонить с превью секции
- **Суперадмин** (тот же пароль): auto-approve при отправке — правка сразу в живой гайд
- На странице класса: бейджи «на модерации», черновики у секций, счётчик заявок в хедере

### Ops / безопасность

- Три сервиса: `web` (сайт + API), `migrate` (авто-SQL), `db` (Postgres)
- Отдельная роль `bdokeep_app` (не суперпользователь); authz в Nitro — `DATABASE_URL` = break-glass
- Postgres без publish портов (только Docker-сеть `db:5432`); наружу — сайт
- Same-origin / cookie-сессия админа (`ADMIN_SESSION_SECRET` отдельно от пароля); слабые пароли в production запрещены
- За reverse proxy — `TRUST_PROXY=1` для корректного rate limit по `X-Forwarded-For`

## Сервисы

| Сервис | Зачем | Порт |
|--------|--------|------|
| `web` | сайт Nuxt + Nitro API | `HOST_PORT` (3000) |
| `migrate` | накат `db/migrations` при up | — |
| `db` | Postgres | нет (внутренняя сеть) |

## Быстрый старт

```bash
cp .env.example .env
# Заполни POSTGRES_PASSWORD, BDOKEEP_APP_PASSWORD, DATABASE_URL,
# ADMIN_PASSWORD, ADMIN_SESSION_SECRET (openssl rand -base64 48)
# ADMIN_PASSWORD в production не может быть changeme / password / admin / 123456
npm install
npm run docker:up        # db + migrate + web
# или: docker compose --env-file .env up -d --build
```

Env только в корне: `.env` / `.env.example`. Нужны `DATABASE_URL` (роль `bdokeep_app`), `BDOKEEP_APP_PASSWORD` (≠ `POSTGRES_PASSWORD`), `ADMIN_PASSWORD` и `ADMIN_SESSION_SECRET` (≥32 символа, ≠ пароля).

SQL к БД: `docker compose exec db psql -U postgres -d bdokeep` (порты на хосте не нужны).

Миграции накатываются **сами** сервисом `migrate` при каждом `docker compose up` (таблица `schema_migrations`). Новые файлы в `db/migrations/NNN_*.sql` / `.sh` подхватятся на следующем up — вручную `psql -f` не нужен.

Если БД уже была создана со старым общим паролем, достаточно поправить `BDOKEEP_APP_PASSWORD` в `.env` и снова `docker compose up -d` — `migrate` синхронизирует роль `bdokeep_app`.

## Данные и каталоги

Миграции `db/migrations/` применяются сервисом `migrate` (не через `docker-entrypoint-initdb.d`):

- классы + пустые гайды
- сиды скиллов, бафов, кристаллов, реликвий/лайтстоунов, эффектов аддонов
- схема proposals, пресеты, морфы, RLS
- обновления каталогов (030+)

Картинки классов: `public/classes/<slug>/{portrait.png,icon.svg}`.
Иконки каталога (скиллы/бафы/предметы): только локально в `public/codex/…` (зеркало bdocodex; в браузере пути `/codex/…`, без CDN-hotlink). CSP `img-src 'self'` это закрепляет.

Каталоги кристаллов / забафа / морфов / скиллов обновляются с [Garmoth](https://garmoth.com) (`region=ru&lang=ru` — официальные RU-строки в поле `lang`; skill-addons даёт карту скилл→доступные морфы):

```bash
npm run garmoth:scrape              # dump API → merge → data/codex + SQL seeds
# npx tsx scripts/scrape-garmoth-catalog.ts --merge-only
npm run images:codex                # Playwright → public/codex
docker compose --env-file .env up -d --build   # migrate подхватит новые NNN_*.sql
```

## Nginx (внешний)

Проксируй только сайт (`HOST_PORT`). Postgres наружу не публикуй.

За reverse proxy выставь `TRUST_PROXY=1` в `.env`, иначе rate limit смотрит на TCP peer, а не на `X-Forwarded-For`.

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Дисклеймер

Неофициальный фан-ресурс гильдии. Не связан с Pearl Abyss. Портреты/иконки классов © Pearl Abyss.
