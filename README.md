# BDO Keep

Гильдейские PvP-гайды по классам Black Desert Online (только RU).

Стек: **Nuxt 4.5+** (FSD) + Postgres + PostgREST. Один `docker-compose.yml`.

## Сервисы (всего 3)

| Сервис | Зачем | Порт |
|--------|--------|------|
| `web` | сайт Nuxt | `HOST_PORT` (3000) |
| `rest` | PostgREST API для фронта | `API_PORT` (8000) |
| `db` | Postgres | внутренний (без публикации) |

Полный self-hosted Supabase (Kong, Auth, Realtime, Storage, Studio…) **не используем** — для гайда это оверхед.

## Быстрый старт

```bash
cp .env.example .env
npm install
npm run docker:up
npm run dev   # или сразу сайт с compose: http://127.0.0.1:3000
```

Env только в корне: `.env` / `.env.example`.

SQL к БД при необходимости: `docker compose exec db psql -U postgres -d bdokeep`.

## Модерация предложений

Посетители могут предложить правки (суть, забаф из каталога, комба из скиллов класса) со страницы класса.

Модерация: [`/admin/proposals`](http://127.0.0.1:3000/admin/proposals) — пароль из `ADMIN_PASSWORD` в `.env`.

Если войти как суперадмин (тот же пароль) в форме «Предложить» или на `/admin/proposals`, правки публикуются сразу без очереди.

## Данные при старте БД

- классы + пустые гайды
- скиллы из `supabase/migrations/002_seed_skills.sql` (в git)
- бафы из `supabase/migrations/008_seed_buffs.sql` (в git)

Картинки: `public/classes/<slug>/{portrait.png,icon.svg}`.

## Nginx (внешний)

Проксируй только сайт (`HOST_PORT`). Postgres наружу не отдавай.

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
