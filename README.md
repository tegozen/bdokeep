# BDO Keep

Гильдейские гайды по классам Black Desert Online — PvP и PvE (только RU).

Неофициальный фан-ресурс гильдии, **non-commercial**. Не связан с Pearl Abyss / Black Desert.
Игровые изображения (портреты/иконки классов и каталог `/codex/`) © Pearl Abyss.
This is unofficial content which contains copyrighted materials and IP from Pearl Abyss, and is not official/endorsed content.

Исходники: [GitHub](https://github.com/tegozen/bdokeep) · [GitLab](https://gitlab.com/tegozen/bdokeep)

Стек: **Nuxt 4.5+** (FSD) + Postgres. API — Nitro. Один `docker-compose.yml`. Node ≥22.

## Фишки

### Гайд класса

- Сетка классов на главной → страница `/class/[slug]`
- Разделы: **Заметки**, **Комба**, **Морфы**, **Инкрустация**, **Реликвии**, **Закалки**, **Забаф**, **Видео**, **Обратная связь**
- Sticky-хедер: класс, переключатели режима/пресета, тир ★, вход суперадмина
- Пустые секции явно помечены («Пока пусто»), а не выглядят сломанными
- **Тир 1–5 ★** для сочетаний **ПВП/ПВЕ × Пробуждение/Наследие** (в хедере — по текущим табам; всё кроме пресета ПВЕ пишет в ПВП); видят все, ставит только суперадмин
- На главной: фильтр по тиру / «Скрыть пустые»; заполненные классы сортируются от большего тира
- У каждого раздела: «Обновлено ДД.ММ.ГГГГ · ник/админ»; точки у пресетов с данными в хедере

### Режимы и пресеты

- **Пробуждение / Наследие** — отдельные заметки, комба, видео; морфы — пресеты `aw_*` / `succ_*`
- Пресеты гайда: **T1**, **T2**, **Беспорезки**, **Субботка**, **ПВЕ**
- Один переключатель пресета крутит кристаллы, реликвии, закалки, забаф и морфы
- **Заметки** и **Комба** привязаны иначе: у пробуждения/наследия есть варианты **ПВП** и **ПВЕ**; в хедере всё кроме **ПВЕ** показывает ПВП
- В табах пресета — маркер, если в пресете уже есть контент

### Доски как в BDO

- **Инкрустация** — 17 слотов + 6 рассвета, список выбранных кристаллов
- **Реликвии** — 2 реликвии × 2 светящихся камня; подпись набора лайтстоунов из каталога
- **Закалки** — 5 камней закалки оружия Вана (один набор на все оружия)
- **Морфы** — слоты уровней 50–60: скилл + 2 эффекта аддона
- **Комба** — до 6 цепочек иконок скиллов по порядку (с заметками), отдельно для ПВП и ПВЕ

### Контент и медиа

- **Заметки** — Markdown (редактор + превью, санитизация на сервере); отдельно для ПВП и ПВЕ × пробуждение/наследие
- **Видео** — до 3 ссылок YouTube; название подтягивается с YouTube (oEmbed), постеры через same-origin `/api/youtube/thumb/…`; пока ролик без превью — «обрабатывается», раз в час Nitro task помечает ready и добирает заголовки у «Видео N»; через 48ч без превью слот снимается approved-заявкой от `cron`
- **Забаф** — каталог бафов с иконками, группами и заметками (до 20 на пресет)
- **Обратная связь** — кнопка в хедере (слева от макроса): анонимное сообщение админу в модалке; на странице класса привязывается к нему, с главной — общее (не публикуется на сайте)
- **Набор в гильдию** — на главной баннер в сетке (~3 карточки); на `/class/*` — колонка слева от «Заметок»; суперадмин правит в модалке («Баннер» в хедере)
- **Макрос чата** — модалка в хедере: готовая строка + пошаговая настройка с скриншотами

### Краудсорс правок

- У каждой секции кнопка **«Предложить»** (формы подгружаются lazy)
- Каталоги скиллов / бафов / кристаллов / реликвий / лайтстоунов / наборов / закалок / морфов прямо в модалке
- Копирование пресета с того же класса или с другого класса (кристаллы, реликвии, закалки, забаф; морфы — с пресета)
- Drag-and-drop порядка в комбе и забафе
- Игровой ник для гостей, honeypot от ботов, rate limit
- Guard несохранённых правок (confirm + `beforeunload`); Esc закрывает модалки сверху вниз
- Не копируйте чужие гайды целиком без разрешения автора — модерация отклонит

### Модерация

- Очередь заявок `/admin/proposals` (пароль `ADMIN_PASSWORD`)
- Одобрить / отклонить / **переприменить** одобренную заявку; превью секции; правка summary перед approve
- Инбокс ОС `/admin/feedback` — список и удаление
- **Суперадмин** (тот же пароль, cookie-сессия): auto-approve при отправке — правка сразу в живой гайд; баннер набора — модалка («Баннер» в хедере)
- На главной у суперadmin: счётчик pending-заявок на карточках классов и огонёк по периметру (как у inline-черновиков)
- На странице класса: бейджи «на модерации», inline-черновики у секций, счётчики заявок/ОС в хедере
- Автоснятие «залипших» видео без превью (>48ч) — approved-заявка с автором `cron`
- Отклонять заявки с копипастом чужих гайдов целиком

### PWA / оболочка / перф

- Установка как приложение (`@vite-pwa/nuxt`); баннер при новой версии SW
- Offline-чтение уже посещённых `/`, `/class/:slug`, `/admin/proposals`, `/admin/feedback` (HTML/API — NetworkFirst; иконки `/classes`/`/codex`/превью YT — CacheFirst)
- На главной офлайн видны только классы с закэшированным гайдом; «Предложить» и «Обратная связь» скрыты; тост при смене сети
- Админ-кэш заявок/ОС сбрасывается при logout и истечении cookie `bdo_admin`
- Один CSS-бандл (stylesheet); gzip HTML/JSON в Nitro (`NITRO_COMPRESS=0`, если уже жмёт nginx)
- Системные шрифты (`system-ui` / Segoe UI / Roboto) — без webfonts, без CLS от подмены гарнитуры
- Портреты на главной: opaque WebP без alpha, LCP — `fetchpriority=high` + без lazy у первого ряда

### SEO

- Title/description и OG/Twitter на `/` и `/class/[slug]` (PvP и PvE); лёгкий JSON-LD (`WebSite` / `WebPage`)
- `/sitemap.xml` — главная + опубликованные классы; `/robots.txt` — `Disallow: /admin` (админку в индекс не пускаем)
- В production задайте `NUXT_PUBLIC_SITE_URL` (абсолютный origin без trailing slash) — canonical, OG и sitemap

### Ops / безопасность

- Три сервиса: `web` (сайт + API), `migrate` (Drizzle + seed), `db` (Postgres)
- Отдельная роль `bdokeep_app` (не суперпользователь); authz в Nitro — `DATABASE_URL` = break-glass
- Postgres без publish портов (только Docker-сеть `db:5432`); наружу — сайт
- Same-origin / cookie-сессия админа (`ADMIN_SESSION_SECRET` отдельно от пароля); слабые пароли в production запрещены
- CSRF: same-origin на `POST /api/proposals` и `POST /api/feedback` (гости и админ)
- CSP без CDN для JS/CSS и иконок каталога (см. `AGENTS.md`)
- `.npmrc`: `min-release-age=7` + `engine-strict` — не ставить пакеты моложе 7 дней; Node должен совпадать с `engines` (npm ≥ 11.10)
- `web`: `no-new-privileges` + `cap_drop: ALL`
- За reverse proxy — `TRUST_PROXY=1` для корректного rate limit по `X-Forwarded-For`

## Структура (кратко)

| Путь | Назначение |
|------|------------|
| `src/` | FSD: `app` → `pages` → `widgets` → `features` → `entities` → `shared` |
| `domain/` | Общие лимиты/типы proposals, YouTube, комбо (клиент + сервер) |
| `server/` | Nitro API + utils (db, auth, applyProposal, каталоги) |
| `db/schema/` | Drizzle schema по доменам (`index.ts` barrel) |
| `drizzle/` | SQL-миграции схемы |
| `db/seed/sql/` | Каталожные сиды (SQL fixtures + hash ledger) |
| `db/migrate-entry.ts` | Entrypoint сервиса `migrate` |
| `public/classes/`, `public/codex/` | Same-origin арт классов и иконки каталога |
| `LICENSE`, `NOTICE`, `THIRD_PARTY.md` | MIT на код; игровой IP PA исключён; атрибуция deps |

## Сервисы

| Сервис | Зачем | Порт |
|--------|--------|------|
| `web` | сайт Nuxt + Nitro API | `HOST_PORT` (3000) |
| `migrate` | Drizzle migrate + catalog seed при up | — |
| `db` | Postgres | нет (внутренняя сеть) |

## Быстрый старт

```bash
cp .env.example .env
# Заполни POSTGRES_PASSWORD, BDOKEEP_APP_PASSWORD, DATABASE_URL,
# ADMIN_PASSWORD, ADMIN_SESSION_SECRET (openssl rand -base64 48)
# ADMIN_PASSWORD в production не может быть changeme / password / admin / 123456
# NUXT_PUBLIC_SITE_URL=https://your-domain.example (canonical / OG / sitemap)
docker compose up -d --build
```

Остановка: `docker compose down`.

На VPS ~4 CPU / 6G (idle уже ~1 ядро + ~4G) билд Nuxt иначе упирается в потолок. Дефолт: `BUILD_CPU_COUNT=1`, heap `768` МБ; runtime `web`: `WEB_CPUS=1` / `WEB_MEM_LIMIT=512m` (см. `.env.example`).


Env только в корне: `.env` / `.env.example` (Compose сам подхватывает `.env`). Нужны `DATABASE_URL` (роль `bdokeep_app`), `BDOKEEP_APP_PASSWORD` (≠ `POSTGRES_PASSWORD`), `ADMIN_PASSWORD` и `ADMIN_SESSION_SECRET` (≥32 символа, ≠ пароля). В production для SEO ещё `NUXT_PUBLIC_SITE_URL` (напр. `https://example.com`).

SQL к БД: `docker compose exec db psql -h 127.0.0.1 -U postgres -d bdokeep` (порты на хосте не нужны).

### Миграции и каталоги (Drizzle)

- **Схема:** правишь [`db/schema/`](db/schema/) → `npm run db:generate` → коммит `drizzle/`. Единственная ручная db-команда.
- **Накат (авто):** сервис `migrate` при `compose up` / rebuild: Drizzle migrate → seed (ledger `drizzle.__catalog_seeds`) → sync `bdokeep_app`.
- **Сиды:** fixtures в [`db/seed/sql/`](db/seed/sql/); unchanged по sha256 скипаются. Переиграть всё: `FORCE_SEED=1` в `.env` и `compose up`. На существующем volume schema baseline только **stamp** (гайды/proposals не пересоздаются).

Если БД уже была создана со старым общим паролем, достаточно поправить `BDOKEEP_APP_PASSWORD` в `.env` и снова `docker compose up -d` — `migrate` синхронизирует роль `bdokeep_app`.

## Данные и каталоги

Схема — Drizzle (`db/schema` + `drizzle/`). Каталожные данные — [`db/seed/sql/`](db/seed/sql/):

- скиллы / морф-overlays / addon effects
- реликвии, лайтстоуны, наборы, закалка
- кристаллы / бафы (+ prune)
- localize `/codex/` icon URLs

Картинки классов: `public/classes/<slug>/{portrait-card-360.webp,icon.svg}` — © Pearl Abyss (см. `public/classes/README.md`).
Портреты — opaque WebP на фоне `#07080c` (без alpha), уже пережаты под карточки главной.
Иконки каталога (скиллы/бафы/предметы): только локально в `public/codex/…` (в браузере пути `/codex/…`, без CDN-hotlink). CSP `img-src 'self'` это закрепляет. Деплой **обязан** включать `public/codex` (иначе `docker build` упадёт). При первом seed (или после смены `033_localize_…`) migrate переписывает старые `https://bdocodex.com/…` в БД на `/codex/…`. См. `public/codex/README.md`.

На чистом сервере достаточно `docker compose up -d --build`: Drizzle baseline + seed каталогов и картинки уже в репо.


## Nginx (внешний)

Проксируй только сайт (`HOST_PORT`). Postgres наружу не публикуй.

За reverse proxy выставь `TRUST_PROXY=1` в `.env`, иначе rate limit смотрит на TCP peer, а не на `X-Forwarded-For`.

```nginx
gzip on;
gzip_comp_level 5;
gzip_types text/plain text/css text/html application/javascript application/json application/manifest+json image/svg+xml;
gzip_vary on;

location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Приложение само умеет gzip HTML/JSON через `beforeResponse`. Если gzip уже на nginx — поставь `NITRO_COMPRESS=0` в `.env`, чтобы не сжимать дважды.

## Дисклеймер и лицензии

Неофициальный фан-ресурс гильдии, non-commercial. Не связан с Pearl Abyss.
Игровые изображения (классы и каталог) © Pearl Abyss — используются по [Fan Content Guidelines](https://www.pearlabyss.com/legal/detail?_policyNo=42).
При сомнениях: `fancontent@pearlabysscorp.com`.

This is unofficial content which contains copyrighted materials and IP from Pearl Abyss, and is not official/endorsed content.

Код проекта — **MIT** (см. [`LICENSE`](LICENSE)); `public/classes/` и `public/codex/` © Pearl Abyss и **не** под MIT — форки с артом обязаны сохранить дисклеймер PA ([`NOTICE`](NOTICE)). Зависимости: [`THIRD_PARTY.md`](THIRD_PARTY.md).
