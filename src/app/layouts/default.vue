<template>
  <div :class="$style.root">
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

    <header :class="$style.header">
      <div :class="['mx-auto flex w-[min(100%-2rem,1920px)] flex-wrap items-center gap-x-4 gap-y-2 py-4', $style.headerInner]">
        <div :class="$style.left">
          <NuxtLink to="/" :class="$style.brand">
            <span :class="$style.brandMark">BDO</span>
            <span :class="$style.brandName">Keep</span>
          </NuxtLink>
          <HomeClassFilters v-if="showHomeFilters" />
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
        </div>
        <div :class="$style.auth">
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
          <button
            type="button"
            :class="$style.proposals"
            :title="
              headerClass
                ? 'Анонимное сообщение админу по этому классу'
                : 'Анонимное сообщение админу'
            "
            @click="openClassFeedback"
          >
            Обратная связь
          </button>
          <button
            type="button"
            :class="$style.proposals"
            title="Как настроить макрос чата"
            @click="openChatMacroGuide"
          >
            Макрос чата
          </button>
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
          <NuxtLink
            v-if="isSuperadmin"
            to="/admin/feedback"
            :class="$style.proposals"
          >
            ОС
          </NuxtLink>
          <!-- Logged-in chrome stays in the header; login entry lives in the footer. -->
          <component
            :is="SuperadminAuth"
            v-if="isSuperadmin && SuperadminAuth && authUiReady"
            compact
          />
        </div>
      </div>

      <div
        v-if="headerClass && mobileNavOpen"
        id="mobile-guide-nav"
        :class="[$style.mobilePanel, $style.mobileOnly]"
      >
        <div class="mx-auto w-[min(100%-2rem,1920px)]" :class="$style.mobilePanelInner">
          <GuideModePresetTabs :preset-fill="presetFill" />
        </div>
      </div>
    </header>

    <main :class="$style.main">
      <slot />
    </main>

    <footer :class="$style.footer">
      <div class="mx-auto w-[min(100%-2rem,1920px)]" :class="$style.footerInner">
        <div :class="$style.footerCopy">
          <p :class="$style.disclaimer">
            Неофициальный фан-гайд гильдии, non-commercial. Не связан с Pearl Abyss / Black Desert.
            Игровые изображения (классы и каталог) © Pearl Abyss — для гильдейских справочных целей.
            This is unofficial content which contains copyrighted materials and IP from Pearl Abyss, and is not official/endorsed content.
          </p>
          <p :class="$style.repoLinks">
            Исходники:
            <a
              href="https://github.com/tegozen/bdokeep"
              target="_blank"
              rel="noopener noreferrer"
            >GitHub</a>
            ·
            <a
              href="https://gitlab.com/tegozen/bdokeep"
              target="_blank"
              rel="noopener noreferrer"
            >GitLab</a>
          </p>
        </div>
        <component
          :is="SuperadminAuth"
          v-if="!isSuperadmin && SuperadminAuth && authUiReady"
          compact
          icon-trigger
          :open-login-on-mount="authOpenLoginOnMount"
        />
        <button
          v-else-if="!isSuperadmin && !authUiReady"
          type="button"
          :class="$style.authGate"
          aria-label="Войти как суперадмин"
          title="Войти как суперадмин"
          @click="openAuthLogin"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>
      </div>
    </footer>

    <component :is="UiConfirm" v-if="UiConfirm" />
    <component
      :is="ChatMacroGuideModal"
      v-if="ChatMacroGuideModal"
      :open="chatMacroGuideOpen"
      @close="chatMacroGuideOpen = false"
    />
    <component
      :is="ClassFeedbackModal"
      v-if="ClassFeedbackModal"
      :open="classFeedbackOpen"
      :class-slug="headerClass?.slug"
      @close="classFeedbackOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { type Component, computed, ref, shallowRef, watch } from 'vue'
import {
  fetchClassGuideBySlug,
  updateClassTier,
  type ClassGuideBundle,
} from '@/entities/class'
import ClassIcon from '@/entities/class/ui/ClassIcon.vue'
import ClassTierStars from '@/entities/class/ui/ClassTierStars.vue'
import {
  useConfirm,
  useGuideSpecMode,
  useHeaderClass,
  useHeaderPresetFill,
  usePendingSummary,
  useSuperadmin,
} from '@/shared/lib'
import GuideModePresetTabs from './GuideModePresetTabs.vue'
import HomeClassFilters from './HomeClassFilters.vue'

/** Loaded on demand — avoid shipping auth CSS on anonymous home Lighthouse runs. */
const SuperadminAuth = shallowRef<Component | null>(null)
const UiConfirm = shallowRef<Component | null>(null)
const ChatMacroGuideModal = shallowRef<Component | null>(null)
const chatMacroGuideOpen = ref(false)
const ClassFeedbackModal = shallowRef<Component | null>(null)
const classFeedbackOpen = ref(false)
const { request: confirmRequest } = useConfirm()

watch(
  confirmRequest,
  async (req) => {
    if (!req || UiConfirm.value) return
    UiConfirm.value = (await import('@/shared/ui/UiConfirm.vue')).default
  },
  { flush: 'sync' },
)

async function openChatMacroGuide() {
  if (!ChatMacroGuideModal.value) {
    ChatMacroGuideModal.value = (
      await import('@/features/chat-macro-guide/ui/ChatMacroGuideModal.vue')
    ).default
  }
  chatMacroGuideOpen.value = true
}

async function openClassFeedback() {
  if (!ClassFeedbackModal.value) {
    ClassFeedbackModal.value = (
      await import('@/features/class-feedback/ui/ClassFeedbackModal.vue')
    ).default
  }
  classFeedbackOpen.value = true
}

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

const classSlug = computed(() => {
  const m = route.path.match(/^\/class\/([^/]+)\/?$/)
  return m?.[1] ? decodeURIComponent(m[1]) : ''
})

/** Same key as class/[slug].vue — Nuxt dedupes; fills headerClass before layout paint. */
const { data: classBundle } = await useAsyncData(
  () => (classSlug.value ? `class-${classSlug.value}` : 'class-header-idle'),
  () => {
    if (!classSlug.value) return null
    return fetchClassGuideBySlug(classSlug.value)
  },
  {
    watch: [classSlug],
    default: () => null,
  },
)

watch(
  [classSlug, classBundle],
  ([slug, bundle]) => {
    if (!slug) {
      // Leaving class routes — page onBeforeUnmount also clears; keep in sync on nav.
      if (!route.path.startsWith('/class/')) headerClass.value = null
      return
    }
    if (bundle?.class) {
      headerClass.value = {
        slug: bundle.class.slug,
        name_ru: bundle.class.name_ru,
        icon_url: bundle.class.icon_url,
        tier_awakening: bundle.class.tier_awakening ?? null,
        tier_succession: bundle.class.tier_succession ?? null,
      }
    } else {
      headerClass.value = null
    }
  },
  { immediate: true },
)

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

.mobileToggle {
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

.mobileToggle:hover {
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
  background: transparent;
  color: var(--color-gold-soft);
  cursor: pointer;
  font: inherit;
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

.footerInner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.footerCopy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.disclaimer {
  margin: 0;
}

.repoLinks {
  margin: 0;
  font-size: 0.8125rem;
}

.repoLinks a {
  color: var(--color-gold-soft);
  text-decoration: underline;
  text-underline-offset: 0.12em;
}

.repoLinks a:hover,
.repoLinks a:focus-visible {
  color: var(--color-gold);
  outline: none;
}

.authGate {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 140ms ease, color 140ms ease;
}

.authGate:hover,
.authGate:focus-visible {
  opacity: 0.85;
  color: var(--color-gold-soft);
  outline: none;
}
</style>
