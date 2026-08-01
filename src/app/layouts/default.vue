<template>
  <div :class="$style.root">
    <header :class="$style.header">
      <div :class="['mx-auto flex w-[min(100%-2rem,1920px)] flex-wrap items-center gap-x-4 gap-y-2 py-4', $style.headerInner]">
        <div :class="$style.left">
          <NuxtLink to="/" :class="$style.brand">
            <span :class="$style.brandMark">BDO</span>
            <span :class="$style.brandName">Keep</span>
          </NuxtLink>
          <!--
            headerClass is set from the page child after layout render starts on SSR,
            so keep this client-only to avoid hydration mismatches.
          -->
          <ClientOnly>
            <a
              v-if="headerClass"
              href="#summary"
              :class="$style.classMeta"
              :aria-label="`${headerClass.name_ru} — суть`"
            >
              <ClassIcon
                :slug="headerClass.slug"
                :icon-url="headerClass.icon_url"
                :label="headerClass.name_ru"
                size="sm"
              />
              <h1 :class="$style.className">{{ headerClass.name_ru }}</h1>
            </a>
            <nav
              v-if="headerToc?.length"
              :class="$style.toc"
              aria-label="Разделы гайда"
            >
              <a v-for="item in headerToc" :key="item.id" :href="`#${item.id}`">{{ item.label }}</a>
            </nav>
          </ClientOnly>
        </div>
        <div :class="$style.auth">
          <ClientOnly>
            <div v-if="headerClass" :class="$style.filters">
              <div
                :class="$style.modeTabs"
                role="tablist"
                aria-label="Пробуждение или наследие"
              >
                <button
                  type="button"
                  role="tab"
                  :aria-selected="specMode === 'awakening'"
                  :class="[$style.modeTab, specMode === 'awakening' && $style.modeTabOn]"
                  @click="specMode = 'awakening'"
                >
                  Пробуждение
                </button>
                <button
                  type="button"
                  role="tab"
                  :aria-selected="specMode === 'succession'"
                  :class="[$style.modeTab, specMode === 'succession' && $style.modeTabOn]"
                  @click="specMode = 'succession'"
                >
                  Наследие
                </button>
              </div>
              <div
                :class="$style.modeTabs"
                role="tablist"
                aria-label="Пресет гайда"
              >
                <button
                  v-for="p in guidePresets"
                  :key="p.id"
                  type="button"
                  role="tab"
                  :aria-selected="guidePreset === p.id"
                  :class="[$style.modeTab, guidePreset === p.id && $style.modeTabOn]"
                  @click="guidePreset = p.id"
                >
                  {{ p.label }}
                </button>
              </div>
            </div>
          </ClientOnly>
          <NuxtLink
            v-if="isSuperadmin"
            to="/admin/proposals?status=pending"
            :class="$style.proposals"
          >
            Заявки
            <span v-if="pendingSummary.total > 0" :class="$style.proposalsBadge">
              {{ pendingSummary.total }}
            </span>
          </NuxtLink>
          <SuperadminAuth compact />
        </div>
      </div>
    </header>

    <main :class="$style.main">
      <slot />
    </main>

    <footer :class="$style.footer">
      <div class="mx-auto w-[min(100%-2rem,1920px)]">
        <p :class="$style.disclaimer">
          Неофициальный фан-гайд гильдии. Не связан с Pearl Abyss / Black Desert.
          Портреты и иконки классов © Pearl Abyss — используются для гильдейских справочных целей.
        </p>
      </div>
    </footer>

    <UiConfirm />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { ClassIcon } from '@/entities/class'
import { SuperadminAuth } from '@/features/superadmin-auth'
import {
  CRYSTAL_PRESETS,
  useGuidePreset,
  useGuideSpecMode,
  useHeaderClass,
  useHeaderToc,
  usePendingSummary,
  useSuperadmin,
} from '@/shared/lib'
import { UiConfirm } from '@/shared/ui'

const headerClass = useHeaderClass()
const headerToc = useHeaderToc()
const specMode = useGuideSpecMode()
const guidePreset = useGuidePreset()
const guidePresets = CRYSTAL_PRESETS
const { isSuperadmin, refresh } = useSuperadmin()
const { summary: pendingSummary, refresh: refreshPending } = usePendingSummary()

onMounted(async () => {
  await refresh()
  await refreshPending()
})

watch(isSuperadmin, () => {
  void refreshPending()
})
</script>

<style module>
.root {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  background: linear-gradient(180deg, rgba(10, 11, 16, 0.95), rgba(10, 11, 16, 0.7));
}

.headerInner {
  justify-content: space-between;
}

.left {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.25rem;
  min-width: 0;
  flex: 1;
}

.toc {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 0.9rem;
  row-gap: 0.35rem;
  font-size: 0.9rem;
}

.toc a {
  color: var(--color-gold-soft);
  white-space: nowrap;
}

.toc a:hover {
  color: var(--color-gold);
}

.auth {
  margin-left: auto;
  display: inline-flex;
  align-items: stretch;
  gap: 0.85rem;
  flex-shrink: 0;
  height: 2rem;
}

.filters {
  display: inline-flex;
  align-items: stretch;
  gap: 0.85rem;
  height: 100%;
  margin-right: 0.15rem;
  padding-right: 0.85rem;
  border-right: 1px solid var(--color-border);
}

/* Segmented control: Пробуждение / Наследие */
.modeTabs {
  display: inline-flex;
  align-items: stretch;
  height: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, #000 35%, transparent);
  padding: 2px;
}

.modeTab {
  box-sizing: border-box;
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  line-height: 1;
  padding: 0 0.75rem;
}

.modeTab:hover {
  color: var(--color-gold-soft);
}

.modeTabOn {
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.proposals {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  box-sizing: border-box;
  height: 100%;
  border: 1px solid var(--color-border);
  color: var(--color-gold-soft);
  font-size: 0.82rem;
  line-height: 1;
  padding: 0 0.65rem;
  text-decoration: none;
}

.proposals:hover {
  border-color: var(--color-border-strong);
  color: var(--color-gold);
}

.proposalsBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--color-gold) 50%, transparent);
  border-radius: 999px;
  background: var(--color-gold-dim);
  color: var(--color-gold);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 0.15rem 0.35rem;
  text-align: center;
  pointer-events: none;
}

.brand {
  display: inline-flex;
  align-items: baseline;
  gap: 0.375rem;
  color: var(--color-ink);
  text-decoration: none;
}

.brand:hover {
  color: var(--color-ink);
}

.brandMark {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 0.12em;
  color: var(--color-gold);
}

.brandName {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 0.05em;
}

.classMeta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: inherit;
  text-decoration: none;
}

.classMeta:hover .className {
  color: var(--color-gold-soft);
}

.className {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-gold);
}

.main {
  flex: 1;
  padding: 2rem 0 3rem;
}

.footer {
  border-top: 1px solid var(--color-border);
  padding: 1.25rem 0;
  font-size: 0.875rem;
  color: var(--color-muted);
}

.disclaimer {
  margin: 0;
}
</style>
