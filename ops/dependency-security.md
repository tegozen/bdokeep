# npm dependency security status — 2026-11-12

Scope: BDO Keep package.json/package-lock.json, local npm audit using registry advisories.
Direct dependencies upgraded to the latest eligible versions (min-release-age is 7 days via .npmrc); `npm audit fix` applied safe transitive fixes.

Before: 40 findings (4 critical, 15 high, 18 moderate, 3 low).
After direct upgrades and npm audit fix: 19 findings (0 critical, 0 high, 13 moderate, 6 low).
After narrow transitive overrides for patched glob/minimatch releases: **14 findings (0 critical, 0 high, 4 moderate, 10 low)**.
The initial post-upgrade `npm audit --omit=dev` reported 15 findings (0 critical / high; 9 moderate, 6 low), including PWA/build-only dependency chains; recheck after each lockfile update.

Outstanding packages now: Nuxt/Nitro and @vite-pwa/nuxt/Workbox (low), deepmerge (low with no patched release), plus @esbuild-kit and drizzle-kit (moderate; old esbuild development-server advisory). No published compatible fix is available for every upstream chain.
Automated `npm audit fix --force` proposes downgrading current Nuxt/PWA/Drizzle Kit to older incompatible versions; do NOT apply this blindly. These require supported upstream releases or isolated dependency upgrades followed by rebuild/runtime verification.

Validation: `npm run build` succeeded, Docker build of web/migrate succeeded, migrate ran against local DB without reapplying seeds, HTTP GET for /, /class/dosa/awakening/t1, /class/dosa/full, /api/classes/dosa/guide, /sitemap.xml all returned 200.
No new tests were written or run.

Full `vue-tsc` typecheck is not available with TypeScript 7 in the current upstream combination. Plain `tsc --build` reports existing app-wide errors (including third-party type regressions); these are not covered by the successful production build.

The two overrides are pinned to eligible patched versions `glob@14.0.3` and `minimatch@11.0.4`; both remain build-tool-only concerns. The exact version pins avoid pulling releases still in the npm seven-day cooldown.
