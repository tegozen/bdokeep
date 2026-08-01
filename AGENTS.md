# Agent rules — BDO Keep

## No CDN for app libraries (hard rule)

**Never load application JS/CSS from CDNs** (unpkg, jsDelivr, cdnjs, esm.sh, etc.).

- All runtime libraries must come from **local npm packages** bundled by Vite/Nuxt (`import('…')` / static imports).
- CSP is intentional: `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'` — CDN scripts/styles are blocked and will break the app.
- **md-editor-v3**: always pass local `instance`s in `editorExtensions` for every built-in extension it may auto-load (`highlight`, `screenfull`, `katex`, `mermaid`, `echarts`, `prettier`). If `instance` is omitted, md-editor falls back to `https://unpkg.com/...` and CSP errors appear in the console.
- Setup lives in [`src/shared/ui/mdEditorSetup.client.ts`](src/shared/ui/mdEditorSetup.client.ts). Do not “optimize” by removing katex/mermaid/echarts wiring unless you also disable those code paths inside md-editor without CDN fallback.
- Icons/fonts already self-hosted (`@fontsource/*`, `public/`). Keep it that way.

## Related

- Markdown UI must call `ensureMdEditorConfigured()` before mounting `MdEditor` / `MdPreview`.
- Do not reintroduce a global warm plugin that pulls md-editor on every page (home LCP); keep init inside the markdown components.
