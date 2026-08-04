# Agent rules — BDO Keep

## Keep README features in sync (hard rule)

**Любое продуктовое изменение → обновить [`README.md`](README.md) в том же PR/коммите.**

Триггеры (неполный список — ориентир «увидит ли пользователь?»):

- новая или удалённая user-facing фича / раздел гайда / админ-экран
- смена поведения режимов, пресетов, досок, proposals, модерации, ОС, макроса чата, PWA
- новый публичный API-эндпоинт или заметная смена контракта
- новый npm-скрипт / сервис docker-compose / существенный ops-шаг
- смена стека или структуры слоёв (`src/`, `domain/`, `server/`)

Где править в README:

1. Секция **«Фишки»** — коротко, по делу, на русском, в стиле существующих буллетов.
2. При необходимости: **«Структура»**, таблица скриптов, **«Сервисы»**, ops/безопасность.
3. Не раздувать README кодом и внутренними деталями реализации — только то, что помогает понять продукт и запуск.

Если изменение **только** внутреннее (рефактор без смены UX/API/ops), README трогать не нужно. В сомнении — одна строка в «Фишки» лучше, чем устаревший список.

Перед финальным ответом по задаче с продуктовым диффом: глянуть README и убедиться, что описание всё ещё правдиво.

## No CDN for app libraries (hard rule)

**Never load application JS/CSS from CDNs** (unpkg, jsDelivr, cdnjs, esm.sh, etc.).

- All runtime libraries must come from **local npm packages** bundled by Vite/Nuxt (`import('…')` / static imports).
- CSP is intentional: `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'` — CDN scripts/styles are blocked and will break the app.
- **md-editor-v3** (edit forms only — [`UiMarkdownEditor.vue`](src/shared/ui/UiMarkdownEditor.vue)):
  - For extensions we **use**: pass local npm `instance`s (`highlight`, `screenfull`).
  - For extensions we **do not use** (`katex`, `mermaid`, `echarts`, `prettier`, `cropper`): clear their CDN `js`/`css` urls in `editorExtensions` **and** set `noKatex` / `noMermaid` / `noEcharts`.
  - Never omit both `instance` and url overrides — md-editor will fall back to `https://unpkg.com/...`.
- **Read-only markdown** ([`UiMarkdownPreview.vue`](src/shared/ui/UiMarkdownPreview.vue)): use local `markdown-it` + `xss`, **not** md-editor `MdPreview` (keeps class pages light).
- Setup for the editor lives in [`src/shared/ui/mdEditorSetup.client.ts`](src/shared/ui/mdEditorSetup.client.ts).
- Icons/fonts already self-hosted (`@fontsource/*`, `public/`). Keep it that way.

## No CDN for catalog images (hard rule)

**Never hotlink skill/buff/item icons from bdocodex, Garmoth, or other CDNs in the browser.**

- DB `icon_url` and UI `<img src>` must be same-origin: `/codex/…` (catalog) or `/classes/…` (class art).
- Icons live in committed `public/codex/` and `public/classes/`; seed SQL in `db/migrations/`. New catalog rows must use local `/codex/…` paths, never `https://…`.
- CSP `img-src 'self' data: blob:` blocks accidental remote images. YouTube posters use same-origin `/api/youtube/thumb/…`.
- Helper: [`codexIconSrc`](src/shared/lib/codexIcon.ts) — rejects remote URLs; cache-busts `/codex/`.

## Related

- `UiMarkdownEditor` must call `ensureMdEditorConfigured()` before mounting `MdEditor`.
- Do not reintroduce a global warm plugin that pulls md-editor on every page (home LCP).
