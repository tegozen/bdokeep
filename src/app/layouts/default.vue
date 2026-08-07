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

    <header :class="[$style.header, headerClass && $style.headerClassPage]">
      <div :class="$style.headerInner">
        <NuxtLink to="/" :class="$style.brand">
          <span :class="$style.brandMark">BDO</span>
          <span :class="$style.brandName">Keep</span>
        </NuxtLink>
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
            :key="activeTierField"
            :tier="headerActiveTier"
            :editable="isSuperadmin"
            :saving="tierSaving"
            size="sm"
            @change="onHeaderTierChange"
          />
        </div>
        <div v-if="headerClass" :class="$style.guideModes">
          <GuideModePresetTabs :preset-fill="presetFill" />
        </div>
        <div v-if="showHomeFilters" :class="$style.homeFilters">
          <HomeClassFilters />
        </div>
        <div :class="$style.auth">
          <button
            v-if="online"
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
          <button
            v-if="isSuperadmin && showGuildBannerSlot"
            type="button"
            :class="$style.proposals"
            title="Баннер набора в гильдию"
            @click="openGuildBannerEdit"
          >
            Баннер
          </button>
          <!-- Logged-in chrome stays in the header; login entry lives in the footer. -->
          <component
            :is="SuperadminAuth"
            v-if="isSuperadmin && SuperadminAuth && authUiReady"
            compact
          />
        </div>
      </div>
    </header>

    <main :class="$style.main">
      <slot />
    </main>

    <footer :class="$style.footer">
      <div :class="$style.footerInner">
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
    <component
      :is="GuildRecruitBannerModal"
      v-if="GuildRecruitBannerModal"
      :open="guildBannerEditOpen"
      @close="guildBannerEditOpen = false"
      @saved="onGuildBannerUpdated"
    />
    <component
      :is="UiToast"
      v-if="UiToast"
      :message="connectivityToast"
    />
  </div>
</template>

<script setup lang="ts">
import { type Component, computed, defineAsyncComponent, ref, shallowRef, watch } from 'vue'
import {
  classTierFieldFromGuide,
  comboKindFromPreset,
  type ClassTierField,
} from '@domain'
import {
  fetchClassGuideBySlug,
  updateClassTier,
  type ClassGuideBundle,
} from '@/entities/class'
import ClassIcon from '@/entities/class/ui/ClassIcon.vue'
import ClassTierStars from '@/entities/class/ui/ClassTierStars.vue'
import {
  computePresetFill,
  emptyPresetFill,
  useConfirm,
  useGuidePreset,
  useGuideSpecMode,
  useHeaderClass,
  useHeaderPresetFill,
  useOnlineStatus,
  usePendingSummary,
  useSuperadmin,
} from '@/shared/lib'
import GuideModePresetTabs from './GuideModePresetTabs.vue'
import type { GuildBannerPublic } from '@/widgets/guild-banner/model/types'

/** Home-only — keep filter CSS off /class/* critical CSS. */
const HomeClassFilters = defineAsyncComponent(() => import('./HomeClassFilters.vue'))

/** Loaded on demand — avoid shipping auth CSS on anonymous home Lighthouse runs. */
const SuperadminAuth = shallowRef<Component | null>(null)
const UiConfirm = shallowRef<Component | null>(null)
const UiToast = shallowRef<Component | null>(null)
const ChatMacroGuideModal = shallowRef<Component | null>(null)
const chatMacroGuideOpen = ref(false)
const ClassFeedbackModal = shallowRef<Component | null>(null)
const classFeedbackOpen = ref(false)
const GuildRecruitBannerModal = shallowRef<Component | null>(null)
const guildBannerEditOpen = ref(false)
const connectivityToast = ref('')
const { request: confirmRequest } = useConfirm()
const { online } = useOnlineStatus()
const connectivityToastReady = ref(false)

watch(
  confirmRequest,
  async (req) => {
    if (!req || UiConfirm.value) return
    UiConfirm.value = (await import('@/shared/ui/UiConfirm.vue')).default
  },
  { flush: 'sync' },
)

watch(online, async (isOnline) => {
  if (!import.meta.client || !connectivityToastReady.value) return
  const msg = isOnline ? 'Сеть снова доступна' : 'Нет сети'
  // Retrigger toast even if the same string was shown earlier.
  connectivityToast.value = ''
  await nextTick()
  connectivityToast.value = msg
})

async function openChatMacroGuide() {
  if (!ChatMacroGuideModal.value) {
    ChatMacroGuideModal.value = (
      await import('@/features/chat-macro-guide/ui/ChatMacroGuideModal.vue')
    ).default
  }
  chatMacroGuideOpen.value = true
}

async function openClassFeedback() {
  if (!online.value) return
  if (!ClassFeedbackModal.value) {
    ClassFeedbackModal.value = (
      await import('@/features/class-feedback/ui/ClassFeedbackModal.vue')
    ).default
  }
  classFeedbackOpen.value = true
}

async function openGuildBannerEdit() {
  if (!GuildRecruitBannerModal.value) {
    GuildRecruitBannerModal.value = (
      await import('@/widgets/guild-banner/ui/GuildRecruitBannerModal.vue')
    ).default
  }
  guildBannerEditOpen.value = true
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
const guidePreset = useGuidePreset()
const presetFill = useHeaderPresetFill()
const { isSuperadmin } = useSuperadmin()
const { summary: pendingSummary, refresh: refreshPending } = usePendingSummary()
const authUiReady = ref(false)
const authOpenLoginOnMount = ref(false)
const tierSaving = ref(false)
const showHomeFilters = computed(() => route.path === '/')
const isClassPage = computed(() => /^\/class\/[^/]+\/?$/.test(route.path))
/** Редактирование баннера с главной и страниц класса. */
const showGuildBannerSlot = computed(() => route.path === '/' || isClassPage.value)

const { data: guildBanner } = await useAsyncData(
  'guild-banner',
  () => $fetch<GuildBannerPublic>('/api/guild-banner'),
  {
    default: () => ({ enabled: false }) as GuildBannerPublic,
  },
)

function onGuildBannerUpdated(next: GuildBannerPublic) {
  guildBanner.value = next
}

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
      if (!route.path.startsWith('/class/')) {
        headerClass.value = null
        // Preset dots live in the layout header — must clear with class header.
        presetFill.value = emptyPresetFill()
      }
      return
    }
    if (bundle?.class) {
      headerClass.value = {
        slug: bundle.class.slug,
        name_ru: bundle.class.name_ru,
        icon_url: bundle.class.icon_url,
        tier_pvp_awakening: bundle.class.tier_pvp_awakening ?? null,
        tier_pvp_succession: bundle.class.tier_pvp_succession ?? null,
        tier_pve_awakening: bundle.class.tier_pve_awakening ?? null,
        tier_pve_succession: bundle.class.tier_pve_succession ?? null,
      }
      // Set before layout render (SSR). Page also syncs; layout must win first paint
      // or header dots hydrate against empty HTML while payload has fills.
      presetFill.value = computePresetFill(bundle)
    } else {
      headerClass.value = null
      presetFill.value = emptyPresetFill()
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

const activeTierField = computed(() =>
  classTierFieldFromGuide(guidePreset.value, specMode.value),
)

const headerActiveTier = computed(() => {
  const hc = headerClass.value
  if (!hc) return null
  return hc[activeTierField.value] ?? null
})

function patchClassTier(tier: number | null, field: ClassTierField) {
  const hc = headerClass.value
  if (!hc) return
  const patch = { [field]: tier } as Partial<typeof hc>
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
  const kind = comboKindFromPreset(guidePreset.value)
  const field = classTierFieldFromGuide(guidePreset.value, mode)
  const prev = hc[field] ?? null

  patchClassTier(tier, field)
  tierSaving.value = true
  try {
    await updateClassTier(hc.slug, tier, mode, kind)
    clearNuxtData('classes')
  } catch {
    patchClassTier(prev, field)
  } finally {
    tierSaving.value = false
  }
}

// SSR + first client paint: include compact auth chrome when session already known
// (loading it only in onMounted grew the sticky header → CLS on main).
if (isSuperadmin.value) {
  await ensureAuthUi()
}

onMounted(async () => {
  if (!UiToast.value) {
    UiToast.value = (await import('@/shared/ui/UiToast.vue')).default
  }
  // Announce connectivity only after mount — skip hydration baseline.
  connectivityToastReady.value = true
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

/* Stable sticky row height on class pages (tabs + actions). */
.headerClassPage .headerInner {
  min-height: 2.75rem;
}

.headerInner {
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  width: min(calc(100% - 2rem), 1920px);
  margin-inline: auto;
  padding-block: 0.85rem;
}

.brand {
  display: inline-flex;
  flex-shrink: 0;
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

.classBlock {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
  min-width: 0;
}

.classMeta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
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

.homeFilters {
  display: flex;
  min-width: 0;
  align-items: center;
}

.guideModes {
  display: flex;
  min-width: 0;
  align-items: center;
}

.guideModes :global([class*='modeFilters']) {
  height: auto;
}

.auth {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-left: auto;
  min-width: 0;
  min-height: 2rem;
}

.proposals {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
  box-sizing: border-box;
  height: 2rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-gold-soft);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  line-height: 1;
  padding: 0 0.65rem;
  text-decoration: none;
  white-space: nowrap;
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

/*
  Phone / tablet: brand + actions on top, class + mode/preset tabs below.
  Home filters stay on the brand/auth row when they fit; wrap only via flex-wrap.
*/
@media (max-width: 1099px) {
  .headerInner {
    align-items: flex-start;
  }

  .brand {
    order: 1;
    min-height: 2rem;
    align-items: center;
  }

  .homeFilters {
    order: 2;
    flex: 0 0 auto;
  }

  .auth {
    order: 3;
    max-width: calc(100% - 7.5rem);
  }

  .classBlock {
    order: 4;
    flex: 1 1 100%;
  }

  .guideModes {
    order: 5;
    flex: 1 1 100%;
  }

  .proposals {
    font-size: 0.78rem;
    padding: 0 0.5rem;
  }
}

/* Narrow phones: actions on their own row under the brand; filters follow. */
@media (max-width: 640px) {
  .brandMark,
  .brandName {
    font-size: 1.25rem;
  }

  .auth {
    order: 2;
    flex: 1 1 100%;
    max-width: none;
    margin-left: 0;
    justify-content: flex-start;
  }

  .homeFilters {
    order: 3;
    flex: 1 1 100%;
  }

  .classBlock {
    order: 4;
  }

  .guideModes {
    order: 5;
  }
}

@media (min-width: 1100px) {
  .headerInner {
    align-items: center;
    padding-block: 1rem;
    gap: 0.75rem 1.25rem;
  }

  .brand {
    order: 1;
  }

  .classBlock {
    order: 2;
    flex: 1 1 auto;
  }

  .homeFilters {
    order: 3;
    flex: 0 0 auto;
  }

  .guideModes {
    order: 3;
    flex: 0 1 auto;
  }

  .guideModes :global([class*='modeFilters']) {
    height: 2rem;
  }

  .auth {
    order: 4;
    flex-wrap: nowrap;
    flex-shrink: 0;
    align-items: stretch;
    gap: 0.85rem;
    height: 2rem;
    max-width: none;
  }
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
  width: min(calc(100% - 2rem), 1920px);
  margin-inline: auto;
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
  transition: opacity 140ms ease;
}

.authGate:hover,
.authGate:focus-visible {
  opacity: 0.85;
  color: var(--color-gold-soft);
  outline: none;
}
</style>
