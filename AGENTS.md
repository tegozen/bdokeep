# Agent rules — BDO Keep

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
- Mirror files into `public/codex/` via `npm run images:codex` (Playwright downloads from bdocodex **once**, offline thereafter).
- Scrapers (`garmoth:scrape`) must write local `/codex/items/…` paths, never `https://…`.
- CSP `img-src 'self' data: blob:` blocks accidental remote images. YouTube posters use same-origin `/api/youtube/thumb/…`.
- Helper: [`codexIconSrc`](src/shared/lib/codexIcon.ts) — rejects remote URLs; cache-busts `/codex/`.

## Related

- `UiMarkdownEditor` must call `ensureMdEditorConfigured()` before mounting `MdEditor`.
- Do not reintroduce a global warm plugin that pulls md-editor on every page (home LCP).
