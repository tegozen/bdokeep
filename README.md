# BDO Keep

Гильдейские PvP-гайды по классам Black Desert Online (только RU).

Неофициальный фан-ресурс гильдии, **non-commercial**. Не связан с Pearl Abyss / Black Desert.
Игровые изображения (портреты/иконки классов и каталог `/codex/`) © Pearl Abyss.
This is unofficial content which contains copyrighted materials and IP from Pearl Abyss, and is not official/endorsed content.

Исходники: [GitHub](https://github.com/tegozen/bdokeep) · [GitLab](https://gitlab.com/tegozen/bdokeep)

Стек: **Nuxt 4.5+** (FSD, host-shell) + domain microservices + Module Federation remotes + Postgres. Один `docker-compose.yml`, наружу один `HOST_PORT`. Node ≥22.

## Фишки

### Гайд класса

- Сетка классов на главной → страница `/class/[slug]`
- Разделы: **Роль на осаде**, **Комба**, **Морфы**, **Инкрустация**, **Реликвии**, **Закалки**, **Забаф**, **Видео**, **Обратная связь**
- Sticky-хедер: класс, переключатели режима/пресета, тир ★, вход суперадмина
- Пустые секции явно помечены («Пока пусто»), а не выглядят сломанными
- **Тир 1–5 ★** отдельно для Пробуждения и Наследия; видят все, ставит только суперадмин
- На главной: фильтр по тиру / «Скрыть пустые»; заполненные классы сортируются от большего тира
- У каждого раздела: «Обновлено ДД.ММ.ГГГГ · ник/админ»; точки у пресетов с данными в хедере

### Режимы и пресеты

- **Пробуждение / Наследие** — отдельная роль, комба, видео; морфы — пресеты `aw_*` / `succ_*`
- Пресеты гайда: **T1**, **T2**, **Беспорезки**, **Субботка**
- Один переключатель пресета крутит кристаллы, реликвии, закалки, забаф и морфы
- В табах пресета — маркер, если в пресете уже есть контент

### Доски как в BDO

- **Инкрустация** — 17 слотов + 6 рассвета, список выбранных кристаллов
- **Реликвии** — 2 реликвии × 2 светящихся камня; подпись набора лайтстоунов из каталога
- **Закалки** — 5 камней закалки оружия Вана (один набор на все оружия)
- **Морфы** — слоты уровней 50–60: скилл + 2 эффекта аддона
- **Комба** — до 6 цепочек иконок скиллов по порядку (с заметками)

### Контент и медиа

- **Роль на осаде** — Markdown (редактор + превью, санитизация на сервере)
- **Видео** — до 3 ссылок YouTube; название подтягивается с YouTube (oEmbed), постеры через same-origin `/api/youtube/thumb/…`; пока ролик без превью — «обрабатывается», раз в час Nitro task помечает ready и добирает заголовки у «Видео N»; через 48ч без превью слот снимается approved-заявкой от `cron`
- **Забаф** — каталог бафов с иконками, группами и заметками (до 20 на пресет)
- **Обратная связь** — кнопка в хедере (слева от макроса): анонимное сообщение админу в модалке; на странице класса привязывается к нему, с главной — общее (не публикуется на сайте)
- **Макрос чата** — модалка в хедере: готовая строка + пошаговая настройка с скриншотами

### Краудсорс правок

- У каждой секции кнопка **«Предложить»** (формы подгружаются lazy)
- Каталоги скиллов / бафов / кристаллов / реликвий / лайтстоунов / наборов / закалок / морфов прямо в модалке
- Копирование пресета с того же класса или с другого класса (кристаллы, реликвии, закалки, забаф; морфы — с пресета)
- Drag-and-drop порядка в комбе и забафе
- Игровой ник для гостей, honeypot от ботов, rate limit
- Guard несохранённых правок (confirm + `beforeunload`)
- Не копируйте чужие гайды целиком без разрешения автора — модерация отклонит

### Модерация

- Очередь заявок `/admin/proposals` (пароль `ADMIN_PASSWORD`)
- Одобрить / отклонить / **переприменить** одобренную заявку; превью секции; правка summary перед approve
- Инбокс ОС `/admin/feedback` — список и удаление
- **Суперадмин** (тот же пароль, cookie-сессия): auto-approve при отправке — правка сразу в живой гайд
- На странице класса: бейджи «на модерации», inline-черновики у секций, счётчики заявок/ОС в хедере
- Автоснятие «залипших» видео без превью (>48ч) — approved-заявка с автором `cron`
- Отклонять заявки с копипастом чужих гайдов целиком

### PWA / оболочка

- Установка как приложение (`@vite-pwa/nuxt`); баннер при новой версии SW
- Шрифты self-hosted (`@fontsource/cinzel`, `@fontsource/source-sans-3`)

### Архитектура (MFE + микросервисы)

- **Host-shell** — страницы `/`, `/class/[slug]`, `/admin/proposals`, `/admin/feedback` и layout
- **Микрофронты** (`apps/mf-*`) — исходники домена + сборка `remoteEntry.js` (`Live` + `Draft` + `Propose`); shell грузит UI только через `/mf/<name>/assets/remoteEntry.js`
- **Микросервисы** (`svc-*`) — своя зона данных/API на домен; `guide_proposals` — оркестратор
- **Internal nginx (`gateway`)** — единственный publish `HOST_PORT`; внешний reverse proxy не меняется
- Workspace: `@bdokeep/mf-*`, `@bdokeep/mf-shared` (domain + board helpers)

### Ops / безопасность

- Gateway + host-shell + domain services + migrate + db (см. таблицу «Сервисы»)
- Отдельная роль `bdokeep_app` (не суперпользователь); authz в Nitro — `DATABASE_URL` = break-glass
- Postgres без publish портов (только Docker-сеть `db:5432`); наружу — `HOST_PORT` через gateway
- Same-origin / cookie-сессия админа (`ADMIN_SESSION_SECRET` отдельно от пароля); слабые пароли в production запрещены
- CSRF: same-origin на `POST /api/proposals` и `POST /api/feedback` (гости и админ)
- CSP без CDN для JS/CSS и иконок каталога (см. `AGENTS.md`)
- `.npmrc`: `min-release-age=7` + `engine-strict` — не ставить пакеты моложе 7 дней; Node должен совпадать с `engines` (npm ≥ 11.10)
- `web`: `no-new-privileges` + `cap_drop: ALL`
- За reverse proxy — `TRUST_PROXY=1` для корректного rate limit по `X-Forwarded-For`

## Структура (кратко)

| Путь | Назначение |
|------|------------|
| `src/` | Host-shell: pages, layouts, shared chrome, propose kit |
| `apps/mf-shared` | MF tooling + domain contract + board helpers (не UI) |
| `apps/mf-*` | Доменный MFE: исходники + Module Federation remote (`Live`/`Draft`) |
| `apps/svc-*` | Domain microservices |
| `server/modules/` | Apply/read boundaries по секциям |
| `server/` | Host Nitro API (strangler) |
| `nginx/` | Internal gateway |
| `db/migrations/` | Схема и сиды |
| `public/classes/`, `public/codex/` | Same-origin арт |

## Сервисы

| Сервис | Зачем | Порт |
|--------|--------|------|
| `gateway` | internal nginx, единственный publish | `HOST_PORT` (3000) |
| `web` | host-shell Nuxt | внутренний 3000 |
| `svc-youtube` | thumb proxy | 3011 |
| `svc-feedback` | ОС API | 3012 |
| `svc-classes` / `svc-proposals` / `svc-auth` | platform | 3013–3015 |
| `svc-crystals`…`svc-summary` | section reads | 3020–3027 |
| `mf-*` | federation remotes | 80 внутри |
| `migrate` | авто-SQL | — |
| `db` | Postgres (schema-per-service) | нет |

## Быстрый старт

```bash
cp .env.example .env
# Заполни POSTGRES_PASSWORD, BDOKEEP_APP_PASSWORD, DATABASE_URL,
# ADMIN_PASSWORD, ADMIN_SESSION_SECRET (openssl rand -base64 48)
# ADMIN_PASSWORD в production не может быть changeme / password / admin / 123456
npm run build:mf
docker compose up -d --build
```

Остановка: `docker compose down`.

На VPS ~4 CPU / 6G (idle уже ~1 ядро + ~4G) билд Nuxt иначе упирается в потолок. Дефолт: `BUILD_CPU_COUNT=1`, heap `768` МБ; runtime `web`: `WEB_CPUS=1` / `WEB_MEM_LIMIT=512m` (см. `.env.example`).


Env только в корне: `.env` / `.env.example` (Compose сам подхватывает `.env`). Нужны `DATABASE_URL` (роль `bdokeep_app`), `BDOKEEP_APP_PASSWORD` (≠ `POSTGRES_PASSWORD`), `ADMIN_PASSWORD` и `ADMIN_SESSION_SECRET` (≥32 символа, ≠ пароля).

SQL к БД: `docker compose exec db psql -U postgres -d bdokeep` (порты на хосте не нужны).

Миграции накатываются **сами** сервисом `migrate` при каждом `docker compose up` (таблица `schema_migrations`). Новые файлы в `db/migrations/NNN_*.sql` / `.sh` подхватятся на следующем up — вручную `psql -f` не нужен.

Каталоги разделов (скиллы, реликвии/лайтстоуны, закалка, морф-эффекты, кристаллы, бафы) при каждом `up` **перезаливаются** из актуальных SQL-сидов (идемпотентный upsert; кристаллы/бафы ещё и prune). Старый volume на проде не останется с урезанным каталогом.

Если БД уже была создана со старым общим паролем, достаточно поправить `BDOKEEP_APP_PASSWORD` в `.env` и снова `docker compose up -d` — `migrate` синхронизирует роль `bdokeep_app`.

## Данные и каталоги

Миграции `db/migrations/` применяются сервисом `migrate` (не через `docker-entrypoint-initdb.d`):

- классы + пустые гайды
- сиды скиллов, бафов, кристаллов, реликвий/лайтстоунов, эффектов аддонов
- схема proposals, пресеты, морфы, RLS
- обновления каталогов (030+)

Картинки классов: `public/classes/<slug>/{portrait-card-360.webp,icon.svg}` — © Pearl Abyss (см. `public/classes/README.md`).
Иконки каталога (скиллы/бафы/предметы): только локально в `public/codex/…` (в браузере пути `/codex/…`, без CDN-hotlink). CSP `img-src 'self'` это закрепляет. Деплой **обязан** включать `public/codex` (иначе `docker build` упадёт). При `up` migrate сам переписывает старые `https://bdocodex.com/…` в БД на `/codex/…`. См. `public/codex/README.md`.

На чистом сервере: `npm ci && npm run build:mf && docker compose up -d --build` (SQL-сиды и картинки уже в репо; remotes собираются на хосте).


## Nginx (внешний)

Проксируй только **`HOST_PORT`** (internal `gateway`). Postgres и остальные сервисы наружу не публикуй. Конфиг внешнего nginx **не меняется** после выноса MFE/микросервисов.

За reverse proxy выставь `TRUST_PROXY=1` в `.env`, иначе rate limit смотрит на TCP peer, а не на `X-Forwarded-For`.

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Дисклеймер и лицензии

Неофициальный фан-ресурс гильдии, non-commercial. Не связан с Pearl Abyss.
Игровые изображения (классы и каталог) © Pearl Abyss — используются по [Fan Content Guidelines](https://www.pearlabyss.com/legal/detail?_policyNo=42).
При сомнениях: `fancontent@pearlabysscorp.com`.

This is unofficial content which contains copyrighted materials and IP from Pearl Abyss, and is not official/endorsed content.

Код проекта — **MIT** (см. [`LICENSE`](LICENSE)); `public/classes/` и `public/codex/` © Pearl Abyss и **не** под MIT — форки с артом обязаны сохранить дисклеймер PA ([`NOTICE`](NOTICE)). Зависимости и шрифты: [`THIRD_PARTY.md`](THIRD_PARTY.md).
