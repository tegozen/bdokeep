# BDO Keep: search-index disaster recovery roadmap

Goal: make every *published* class guide reconstructable as far as public search indexes allow after permanent loss of the hosting datacenter. Search-engine indexing and retention are not guaranteed. This plan contains **no backup/export system**.

1. [x] Preserve meaningful class/spec/preset states as crawlable, canonical SSR URLs. Tabs must link to real URLs, without changing their visual design.
2. [x] Publish complete readable, semantic SSR content for each state: notes, combo step order and skill IDs, morph levels/effects/IDs, crystals and exact slots, relics/lightstones, hardening, buffs and video URLs. Avoid crawler-only content.
3. [x] Provide one public, readable, comprehensive HTML view per class with links to states. Do not rely on hidden JS state.
4. [ ] Update sitemap, linking and SEO metadata: include only meaningful published pages, and make canonical/robots consistent.
5. [ ] Upgrade all direct and transitive npm dependencies to compatible current secure versions; audit advisories, resolve vulnerabilities or document unfixable upstream ones. Check build/types and app behavior after updates.
6. [ ] Locally inspect emitted server HTML with JS disabled and validate the build/typecheck. **Do not write tests.** **Do not use Google Search Console or test live search-index coverage** (site is local and indexing takes time).

Commit after each completed implementation step; follow existing English commit subject/body convention. Never claim a search engine guarantees complete recovery.
