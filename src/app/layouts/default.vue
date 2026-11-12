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

    <SiteHeader :stable-height="!!headerClass" brand-end>
      <template v-if="headerClass" #class>
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
          v-if="isStaff || headerActiveTier"
          :key="activeTierField"
          :tier="headerActiveTier"
          :editable="isStaff"
          :saving="tierSaving"
          size="sm"
          @change="onHeaderTierChange"
        />
      </template>
      <template v-if="showHomeFilters" #filters>
        <HomeClassFilters />
      </template>
      <template v-else-if="headerClass" #filters>
        <GuideModePresetTabs :preset-fill="presetFill" />
      </template>
      <template #trailing>
        <component
          :is="SuperadminAuth"
          v-if="SuperadminAuth && authUiReady"
          compact
          header-nav
          after-login-to="/admin"
          :open-login-on-mount="authOpenLoginOnMount"
        />
        <UiButton
          v-else-if="!isStaff"
          variant="ghost"
          size="sm"
          rounded
          color="var(--color-gold-soft)"
          icon-color="var(--color-gold-soft)"
          hover-color="var(--color-gold)"
          title="Войти"
          aria-label="Войти"
          data-header-auth
          @click="openAuthLogin"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Войти
        </UiButton>
      </template>
      <template #actions="{ badgeClass }">
        <UiButton
          v-if="online"
          variant="ghost"
          size="sm"
          rounded
          color="var(--color-gold-soft)"
          icon-color="var(--color-gold-soft)"
          hover-color="var(--color-gold)"
          :title="
            headerClass
              ? 'Анонимное сообщение админу по этому классу'
              : 'Анонимное сообщение админу'
          "
          @click="openClassFeedback"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            <path d="M12 11v.01M8.5 11v.01M15.5 11v.01" />
          </svg>
          Обратная связь
        </UiButton>
        <UiButton
          variant="ghost"
          size="sm"
          rounded
          color="var(--color-gold-soft)"
          icon-color="var(--color-gold-soft)"
          hover-color="var(--color-gold)"
          title="Как настроить макрос чата"
          @click="openChatMacroGuide"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
          </svg>
          Макрос чата
        </UiButton>
        <UiButton
          v-if="isStaff"
          variant="ghost"
          size="sm"
          rounded
          color="var(--color-gold-soft)"
          icon-color="var(--color-gold-soft)"
          hover-color="var(--color-gold)"
          to="/admin"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z" />
            <path d="M9.5 12.5 11 14l3.5-3.5" />
          </svg>
          Админка
          <span v-if="pendingSummary.total > 0" :class="badgeClass">
            {{ pendingSummary.total }}
          </span>
        </UiButton>
        <component
          :is="SuperadminAuth"
          v-if="SuperadminAuth && authUiReady"
          compact
          header-nav
          after-login-to="/admin"
        />
        <UiButton
          v-else-if="!isStaff"
          variant="ghost"
          size="sm"
          rounded
          color="var(--color-gold-soft)"
          icon-color="var(--color-gold-soft)"
          hover-color="var(--color-gold)"
          title="Войти"
          aria-label="Войти"
          data-header-auth
          @click="openAuthLogin"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Войти
        </UiButton>
      </template>
    </SiteHeader>

    <main :class="$style.main">
      <slot />
    </main>

    <SiteFooter />

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
import { ClassIcon, ClassTierStars } from '@/entities/class'
import { usePendingSummary, useSuperadmin } from '@/features/superadmin-auth'
import {
  computePresetFill,
  useGuidePreset,
  useGuideSpecMode,
  useHeaderClass,
} from '@/pages/class-guide'
import { parseApiError, useConfirm, useOnlineStatus } from '@/shared/lib'
import { UiButton } from '@/shared/ui'
import { SiteFooter } from '@/widgets/site-footer'
import { SiteHeader } from '@/widgets/site-header'
import GuideModePresetTabs from './GuideModePresetTabs.vue'

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
const connectivityToast = ref('')
const { request: confirmRequest, alert } = useConfirm()
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
      await import('@/features/chat-macro-guide')
    ).ChatMacroGuideModal
  }
  chatMacroGuideOpen.value = true
}

async function openClassFeedback() {
  if (!online.value) return
  if (!ClassFeedbackModal.value) {
    ClassFeedbackModal.value = (
      await import('@/features/class-feedback')
    ).ClassFeedbackModal
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
const guidePreset = useGuidePreset()
const { isStaff } = useSuperadmin()
const { summary: pendingSummary, refresh: refreshPending } = usePendingSummary()
const authUiReady = ref(false)
const authOpenLoginOnMount = ref(false)
const tierSaving = ref(false)
const showHomeFilters = computed(() => route.path === '/')

const classSlug = computed(() => {
  const m = route.path.match(/^\/class\/([^/]+)(?:\/|$)/)
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

// Fill indicators (gold dots) derive from the class data, not from shared
// mutable state. Switching SSR preset routes must not clear their visibility.
const presetFill = computed(() => computePresetFill(classBundle.value))

watch(
  [classSlug, classBundle],
  ([slug, bundle]) => {
    if (!slug) {
      // Clear class metadata and preset markers only when leaving class routes.
      if (!route.path.startsWith('/class/')) {
        headerClass.value = null
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
    } else {
      headerClass.value = null
    }
  },
  { immediate: true },
)

async function ensureAuthUi() {
  if (!SuperadminAuth.value) {
    SuperadminAuth.value = (
      await import('@/features/superadmin-auth')
    ).SuperadminAuth
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
  if (!hc || !isStaff.value || tierSaving.value) return

  const mode = specMode.value
  const kind = comboKindFromPreset(guidePreset.value)
  const field = classTierFieldFromGuide(guidePreset.value, mode)
  const prev = hc[field] ?? null

  patchClassTier(tier, field)
  tierSaving.value = true
  try {
    await updateClassTier(hc.slug, tier, mode, kind)
    clearNuxtData('classes')
  } catch (e: unknown) {
    patchClassTier(prev, field)
    await alert({
      title: 'Ошибка',
      message: parseApiError(e, 'Не удалось сохранить тир'),
    })
  } finally {
    tierSaving.value = false
  }
}

// SSR + first client paint: include compact auth chrome when session already known
// (loading it only in onMounted grew the sticky header → CLS on main).
if (isStaff.value) {
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

watch(isStaff, (ok) => {
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

.main {
  flex: 1;
  padding: 2rem 0 3rem;
}
</style>
