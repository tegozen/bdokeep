<template>
  <div :class="$style.root">
    <SiteHeader stable-height brand-end hide-class-on-mobile>
      <template #class>
        <h1 :class="$style.pageTitle">{{ pageTitle }}</h1>
      </template>
      <template #trailing>
        <SuperadminAuth compact header-nav />
      </template>
      <template #actions="{ badgeClass }">
        <UiButton
          :variant="isProposals ? 'primary' : 'ghost'"
          size="sm"
          rounded
          :color="isProposals ? undefined : 'var(--color-gold-soft)'"
          :icon-color="isProposals ? undefined : 'var(--color-gold-soft)'"
          :hover-color="isProposals ? undefined : 'var(--color-gold)'"
          to="/admin/proposals?status=pending"
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
          </svg>
          Заявки
          <span v-if="pendingSummary.total > 0" :class="badgeClass">
            {{ pendingSummary.total }}
          </span>
        </UiButton>
        <UiButton
          :variant="isFeedback ? 'primary' : 'ghost'"
          size="sm"
          rounded
          :color="isFeedback ? undefined : 'var(--color-gold-soft)'"
          :icon-color="isFeedback ? undefined : 'var(--color-gold-soft)'"
          :hover-color="isFeedback ? undefined : 'var(--color-gold)'"
          to="/admin/feedback"
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
          </svg>
          Обратная связь
        </UiButton>
        <UiButton
          :variant="isBanner ? 'primary' : 'ghost'"
          size="sm"
          rounded
          :color="isBanner ? undefined : 'var(--color-gold-soft)'"
          :icon-color="isBanner ? undefined : 'var(--color-gold-soft)'"
          :hover-color="isBanner ? undefined : 'var(--color-gold)'"
          to="/admin/banner"
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
            <path d="M5 21V4" />
            <path d="M5 4h11l-1.5 3L16 10H5" />
          </svg>
          Баннер
        </UiButton>
        <UiButton
          v-if="isSuperadmin"
          :variant="isUsers ? 'primary' : 'ghost'"
          size="sm"
          rounded
          :color="isUsers ? undefined : 'var(--color-gold-soft)'"
          :icon-color="isUsers ? undefined : 'var(--color-gold-soft)'"
          :hover-color="isUsers ? undefined : 'var(--color-gold)'"
          to="/admin/users"
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Пользователи
        </UiButton>
        <SuperadminAuth compact header-nav />
      </template>
      <template v-if="isProposals" #filters>
        <AdminProposalFilters />
      </template>
    </SiteHeader>

    <main v-if="ready && isStaff" :class="$style.main">
      <slot />
    </main>

    <SiteFooter />

    <component :is="UiConfirm" v-if="UiConfirm" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import SuperadminAuth from '@/features/superadmin-auth/ui/SuperadminAuth.vue'
import { usePendingSummary, useSuperadmin } from '@/features/superadmin-auth'
import { UiButton } from '@/shared/ui'
import { SiteFooter } from '@/widgets/site-footer'
import { SiteHeader } from '@/widgets/site-header'
import AdminProposalFilters from './AdminProposalFilters.vue'

const UiConfirm = defineAsyncComponent(() => import('@/shared/ui/UiConfirm.vue'))

const route = useRoute()
const { isStaff, isSuperadmin, refresh } = useSuperadmin()
const { summary: pendingSummary, refresh: refreshPending } = usePendingSummary()

const ready = ref(false)

const path = computed(() => String(route.path || ''))
const isProposals = computed(() => path.value.startsWith('/admin/proposals'))
const isFeedback = computed(() => path.value.startsWith('/admin/feedback'))
const isBanner = computed(() => path.value.startsWith('/admin/banner'))
const isUsers = computed(() => path.value.startsWith('/admin/users'))

const pageTitle = computed(() => {
  if (isProposals.value) return 'Заявки'
  if (isFeedback.value) return 'Обратная связь'
  if (isBanner.value) return 'Баннер набора'
  if (isUsers.value) return 'Пользователи'
  return 'Админка'
})

await refresh()
ready.value = true
if (!isStaff.value) {
  await navigateTo('/', { replace: true })
} else {
  await refreshPending()
}

watch(isStaff, (ok) => {
  if (!ready.value) return
  if (!ok) void navigateTo('/', { replace: true })
  else void refreshPending()
})
</script>

<style module>
.root {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.pageTitle {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-gold);
}

.main {
  width: var(--page-width);
  margin: 0 auto;
  flex: 1;
  min-width: 0;
  padding: 2rem 0 3rem;
}
</style>
