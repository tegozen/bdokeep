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

## Related

- `UiMarkdownEditor` must call `ensureMdEditorConfigured()` before mounting `MdEditor`.
- Do not reintroduce a global warm plugin that pulls md-editor on every page (home LCP).
