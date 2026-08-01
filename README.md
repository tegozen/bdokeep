# BDO Keep

Гильдейские PvP-гайды по классам Black Desert Online (только RU).

Неофициальный фан-ресурс гильдии. Не связан с Pearl Abyss. Портреты и иконки классов © Pearl Abyss.

Стек: **Nuxt 4.5+** (FSD) + Postgres. API — Nitro. Один `docker-compose.yml`.

## Фишки

### Гайд класса

- Сетка классов на главной → страница `/class/[slug]`
- Разделы: **Роль на осаде**, **Комба**, **Морфы**, **Инкрустация**, **Реликвии**, **Забаф**, **Видео**
- Sticky-хедер: класс, переключатели режима/пресета, вход суперадмина
- Пустые секции явно помечены («Пока пусто»), а не выглядят сломанными
- **Тир 1–5 ★** — сила класса в гильдейском PvP; видят все, ставит только суперадмин (в хедере «Роль на осаде»)
- На главной: фильтр по тиру / «Скрыть пустые»; заполненные классы сортируются от большего тира
- У каждого раздела: «Обновлено ДД.ММ.ГГГГ · ник/админ»; точки у пресетов с данными в хедере

### Режимы и пресеты

- **Пробуждение / Наследие** — отдельная комба и морфы
- Пресеты гайда: **T1**, **T2**, **Беспорезки**, **Субботка**
- Один переключатель пресета крутит кристаллы, реликвии, забаф и морфы
- В табах пресета — маркер, если в пресете уже есть контент

### Доски как в BDO

- **Инкрустация** — 17 слотов + 6 рассвета, список выбранных кристаллов
- **Реликвии** — 2 реликвии × 2 светящихся камня
- **Морфы** — слоты уровней 50–60: скилл + 2 эффекта аддона
- **Комба** — цепочка иконок скиллов по порядку

### Контент и медиа

- **Роль на осаде** — Markdown (редактор + превью, санитизация на сервере)
- **Видео** — до 3 ссылок YouTube с embed-превью
- **Забаф** — каталог бафов с иконками и категориями

### Краудсорс правок

- У каждой секции кнопка **«Предложить»**
- Каталоги скиллов / бафов / кристаллов / реликвий / морфов прямо в модалке
- Drag-and-drop порядка в комбе и забафе
- Игровой ник для гостей, honeypot от ботов, rate limit
- Guard несохранённых правок (confirm + `beforeunload`)

### Модерация

- Очередь на [`/admin/proposals`](http://127.0.0.1:3000/admin/proposals) (пароль `ADMIN_PASSWORD`)
- Одобрить / отклонить с превью секции
- **Суперадмин** (тот же пароль): auto-approve при отправке — правка сразу в живой гайд
- На странице класса: бейджи «на модерации», черновики у секций, счётчик заявок в хедере

### Ops / безопасность

- Два сервиса: `web` (сайт + API) и `db` (Postgres)
- Отдельная роль `bdokeep_app` (не суперпользователь); authz в Nitro — `DATABASE_URL` = break-glass
- Postgres без publish портов (только Docker-сеть `db:5432`); наружу — сайт
- Same-origin / cookie-сессия админа (`ADMIN_SESSION_SECRET` отдельно от пароля); слабые пароли в production запрещены
- За reverse proxy — `TRUST_PROXY=1` для корректного rate limit по `X-Forwarded-For`

## Сервисы

| Сервис | Зачем | Порт |
|--------|--------|------|
| `web` | сайт Nuxt + Nitro API | `HOST_PORT` (3000) |
| `db` | Postgres | нет (внутренняя сеть); для `npm run dev` — `docker:up:dev` → `127.0.0.1:POSTGRES_PORT` |

## Быстрый старт

```bash
cp .env.example .env
# Заполни POSTGRES_PASSWORD, BDOKEEP_APP_PASSWORD, DATABASE_URL,
# ADMIN_PASSWORD, ADMIN_SESSION_SECRET (openssl rand -base64 48)
# ADMIN_PASSWORD в production не может быть changeme / password / admin / 123456
npm install
npm run docker:up        # прод-подобно: db без портов на хосте
# npm run docker:up:dev  # локальная разработка: Postgres на 127.0.0.1
npm run dev              # нужен docker:up:dev + DATABASE_URL на 127.0.0.1
# или сайт целиком из compose: http://127.0.0.1:3000
```

Env только в корне: `.env` / `.env.example`. Нужны `DATABASE_URL` (роль `bdokeep_app`), `BDOKEEP_APP_PASSWORD` (≠ `POSTGRES_PASSWORD`), `ADMIN_PASSWORD` и `ADMIN_SESSION_SECRET` (≥32 символа, ≠ пароля).

SQL к БД: `docker compose exec db psql -U postgres -d bdokeep` (порты на хосте не нужны).

Если БД уже была создана со старым общим паролем, обнови роль и policy вручную:

```bash
docker compose exec db psql -U postgres -d bdokeep -c "alter role bdokeep_app with password 'YOUR_APP_PASSWORD';"
docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/023_guide_morphs_rls.sql
```

Для уже существующей БД без колонки тира / section_updates:

```bash
docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/024_class_tier.sql
docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/025_section_updates.sql
docker compose exec -T db psql -U postgres -d bdokeep < db/migrations/026_backfill_section_updates.sql
```

Затем выставь тот же пароль в `BDOKEEP_APP_PASSWORD` / `DATABASE_URL` и перезапусти `web`.

## Данные при старте БД

Миграции `db/migrations/` монтируются в `docker-entrypoint-initdb.d` при первом создании volume:

- классы + пустые гайды
- сиды скиллов, бафов, кристаллов, реликвий/лайтстоунов, эффектов аддонов
- схема proposals, пресеты, морфы, RLS

Картинки классов: `public/classes/<slug>/{portrait.png,icon.svg}`.
Иконки каталога (скиллы/бафы/предметы): `public/codex/…` (зеркало bdocodex). После обновления сидов:

```bash
npm run images:codex   # Playwright → public/codex + rewrite DB/SQL
docker compose up -d --build web
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
