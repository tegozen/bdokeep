<template>
  <div :class="$style.root">
    <ClientOnly>
      <div v-if="pwa?.needRefresh" :class="$style.updateBanner" role="status">
        <span>Доступно обновление приложения</span>
        <button
          type="button"
          :class="$style.updateBtn"
          @click="pwa?.updateServiceWorker(true)"
        >
          Обновить
        </button>
      </div>
    </ClientOnly>

    <header :class="$style.header">
      <div :class="['mx-auto flex w-[min(100%-2rem,1920px)] flex-wrap items-center gap-x-4 gap-y-2 py-4', $style.headerInner]">
        <div :class="$style.left">
          <NuxtLink to="/" :class="$style.brand">
            <span :class="$style.brandMark">BDO</span>
            <span :class="$style.brandName">Keep</span>
          </NuxtLink>
          <HomeClassFilters v-if="showHomeFilters" />
          <!--
            headerClass is set from the page child after layout render starts on SSR,
            so keep this client-only to avoid hydration mismatches.
          -->
          <ClientOnly>
            <div v-if="headerClass" :class="$style.classBlock">
              <div :class="$style.classMeta">
                <ClassIcon
                  :slug="headerClass.slug"
                  :icon-url="headerClass.icon_url"
                  :label="headerClass.name_ru"
                  size="sm"
                />
                <h1 :class="$style.className">{{ headerClass.name_ru }}</h1>
              </div>
              <ClassTierStars
                v-if="isSuperadmin || headerActiveTier"
                :tier="headerActiveTier"
                :editable="isSuperadmin"
                :saving="tierSaving"
                size="sm"
                @change="onHeaderTierChange"
              />
            </div>
          </ClientOnly>
        </div>
        <div :class="$style.auth">
          <ClientOnly>
            <div v-if="headerClass" :class="[$style.filters, $style.desktopOnly]">
              <GuideModePresetTabs :preset-fill="presetFill" />
            </div>
            <button
              v-if="headerClass"
              type="button"
              :class="[$style.mobileToggle, $style.mobileOnly]"
              :aria-expanded="mobileNavOpen"
              aria-controls="mobile-guide-nav"
              @click="mobileNavOpen = !mobileNavOpen"
            >
              {{ mobileNavOpen ? 'Скрыть' : 'Режим' }}
            </button>
          </ClientOnly>
          <!-- Cookie session known only after client refresh — keep out of SSR HTML. -->
          <ClientOnly>
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
            <!-- Defer auth UI CSS/JS until session or explicit login (keeps home Lighthouse clean). -->
            <component
              :is="SuperadminAuth"
              v-if="SuperadminAuth && authUiReady"
              compact
              :open-login-on-mount="authOpenLoginOnMount"
            />
            <button
              v-else-if="!authUiReady"
              type="button"
              :class="$style.authGate"
              @click="openAuthLogin"
            >
              Войти как суперадмин
            </button>
          </ClientOnly>
        </div>
      </div>

      <ClientOnly>
        <div
          v-if="headerClass && mobileNavOpen"
          id="mobile-guide-nav"
          :class="[$style.mobilePanel, $style.mobileOnly]"
        >
          <div class="mx-auto w-[min(100%-2rem,1920px)]" :class="$style.mobilePanelInner">
            <GuideModePresetTabs :preset-fill="presetFill" />
          </div>
        </div>
      </ClientOnly>
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

    <component :is="UiConfirm" v-if="UiConfirm" />
  </div>
</template>

<script setup lang="ts">
import { type Component, computed, defineAsyncComponent, ref, shallowRef, watch } from 'vue'
import { updateClassTier, type ClassGuideBundle } from '@/entities/class'
import {
  useConfirm,
  useGuideSpecMode,
  useHeaderClass,
  useHeaderPresetFill,
  usePendingSummary,
  useSuperadmin,
} from '@/shared/lib'
import HomeClassFilters from './HomeClassFilters.vue'

/** Keep class-header / auth CSS off the home critical path until needed. */
const ClassIcon = defineAsyncComponent(() => import('@/entities/class/ui/ClassIcon.vue'))
const ClassTierStars = defineAsyncComponent(() => import('@/entities/class/ui/ClassTierStars.vue'))
const GuideModePresetTabs = defineAsyncComponent(() => import('./GuideModePresetTabs.vue'))
/** Loaded on demand — avoid shipping auth CSS on anonymous home Lighthouse runs. */
const SuperadminAuth = shallowRef<Component | null>(null)
const UiConfirm = shallowRef<Component | null>(null)
const { request: confirmRequest } = useConfirm()

watch(
  confirmRequest,
  async (req) => {
    if (!req || UiConfirm.value) return
    UiConfirm.value = (await import('@/shared/ui/UiConfirm.vue')).default
  },
  { flush: 'sync' },
)

const route = useRoute()
/** @vite-pwa/nuxt injects $pwa at runtime; types may be absent until prepare. */
type PwaClient = {
  needRefresh: boolean
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>
}
const pwa = computed(() => useNuxtApp().$pwa as PwaClient | undefined)
const headerClass = useHeaderClass()
const specMode = useGuideSpecMode()
const presetFill = useHeaderPresetFill()
const { isSuperadmin } = useSuperadmin()
const { summary: pendingSummary, refresh: refreshPending } = usePendingSummary()
const mobileNavOpen = ref(false)
const authUiReady = ref(false)
const authOpenLoginOnMount = ref(false)
const tierSaving = ref(false)
const showHomeFilters = computed(() => route.path === '/')

async function ensureAuthUi() {
  if (!SuperadminAuth.value) {
    SuperadminAuth.value = (
      await import('@/features/superadmin-auth/ui/SuperadminAuth.vue')
    ).default
  }
  authUiReady.value = true
}

function openAuthLogin() {
  authOpenLoginOnMount.value = true
  void ensureAuthUi()
}

const headerActiveTier = computed(() => {
  const hc = headerClass.value
  if (!hc) return null
  return specMode.value === 'succession'
    ? (hc.tier_succession ?? null)
    : (hc.tier_awakening ?? null)
})

function patchClassTier(tier: number | null, mode: 'awakening' | 'succession') {
  const hc = headerClass.value
  if (!hc) return
  const patch =
    mode === 'succession' ? { tier_succession: tier } : { tier_awakening: tier }
  headerClass.value = { ...hc, ...patch }

  const cached = useNuxtData<ClassGuideBundle | null>(`class-${hc.slug}`)
  const bundle = cached.data.value
  if (bundle?.class) {
    cached.data.value = {
      ...bundle,
      class: { ...bundle.class, ...patch },
    }
  }
}

async function onHeaderTierChange(tier: number | null) {
  const hc = headerClass.value
  if (!hc || !isSuperadmin.value || tierSaving.value) return

  const mode = specMode.value
  const prev =
    mode === 'succession' ? (hc.tier_succession ?? null) : (hc.tier_awakening ?? null)

  patchClassTier(tier, mode)
  tierSaving.value = true
  try {
    await updateClassTier(hc.slug, tier, mode)
    clearNuxtData('classes')
  } catch {
    patchClassTier(prev, mode)
  } finally {
    tierSaving.value = false
  }
}

watch(headerClass, (v) => {
  if (!v) mobileNavOpen.value = false
})

onMounted(async () => {
  // Session is resolved in plugins/superadmin-session.ts before pages paint.
  if (isSuperadmin.value) await ensureAuthUi()
  await refreshPending()
})

watch(isSuperadmin, (ok) => {
  if (ok) void ensureAuthUi()
  void refreshPending()
})
</script>

<style module>
.root {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.updateBanner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem 1rem;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-gold-dim) 80%, var(--color-bg-deep));
  color: var(--color-gold);
  font-size: 0.875rem;
}

.updateBtn {
  border: 1px solid var(--color-border-strong);
  background: transparent;
  color: var(--color-gold);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  line-height: 1;
  padding: 0.35rem 0.75rem;
}

.updateBtn:hover {
  background: var(--color-gold-dim);
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

.classBlock {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
  min-width: 0;
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

.mobileToggle,
.authGate {
  box-sizing: border-box;
  height: 100%;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-gold-soft);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  line-height: 1;
  padding: 0 0.65rem;
}

.mobileToggle:hover,
.authGate:hover {
  border-color: var(--color-border-strong);
  color: var(--color-gold);
}

.mobilePanel {
  border-top: 1px solid var(--color-border);
  background: rgba(10, 11, 16, 0.96);
  padding: 0.85rem 0 1rem;
}

.mobilePanelInner {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.mobilePanelInner :global([class*='modeFilters']) {
  height: auto;
}

.desktopOnly {
  display: none;
}

.mobileOnly {
  display: inline-flex;
}

@media (min-width: 768px) {
  .desktopOnly {
    display: inline-flex;
  }

  .filters.desktopOnly {
    display: inline-flex;
  }

  .mobileOnly {
    display: none !important;
  }
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
