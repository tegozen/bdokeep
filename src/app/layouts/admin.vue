<template>
  <div :class="$style.root">
    <SiteHeader>
      <template #actions>
        <SuperadminAuth compact header-nav />
      </template>
    </SiteHeader>

    <div v-if="ready && isStaff" :class="$style.body">
      <nav :class="$style.nav" aria-label="Разделы админки">
        <NuxtLink
          to="/admin/proposals?status=pending"
          :class="[$style.navLink, isProposals && $style.navOn]"
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
          <span v-if="pendingSummary.total > 0" :class="$style.badge">
            {{ pendingSummary.total }}
          </span>
        </NuxtLink>
        <NuxtLink
          to="/admin/feedback"
          :class="[$style.navLink, isFeedback && $style.navOn]"
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
        </NuxtLink>
        <NuxtLink
          to="/admin/banner"
          :class="[$style.navLink, isBanner && $style.navOn]"
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
        </NuxtLink>
        <NuxtLink
          v-if="isSuperadmin"
          to="/admin/users"
          :class="[$style.navLink, isUsers && $style.navOn]"
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
        </NuxtLink>
      </nav>

      <main :class="$style.main">
        <slot />
      </main>
    </div>

    <SiteFooter />

    <component :is="UiConfirm" v-if="UiConfirm" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import SuperadminAuth from '@/features/superadmin-auth/ui/SuperadminAuth.vue'
import { usePendingSummary, useSuperadmin } from '@/shared/lib'
import { SiteFooter } from '@/widgets/site-footer'
import { SiteHeader } from '@/widgets/site-header'

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

.body {
  width: var(--page-width);
  margin: 0 auto;
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  padding: 2rem 0 3rem;
}

@media (min-width: 800px) {
  .body {
    grid-template-columns: 13.5rem 1fr;
    align-items: start;
  }
}

.nav {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0;
}

@media (min-width: 800px) {
  .nav {
    flex-direction: column;
    position: sticky;
    top: 5rem;
  }
}

.navLink {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.35rem;
  color: color-mix(in srgb, var(--color-gold-soft) 88%, var(--color-muted));
  text-decoration: none;
  font-size: 0.92rem;
  white-space: nowrap;
}

.navLink svg {
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
  opacity: 0.92;
}

.navLink:hover {
  border-color: var(--color-border);
  background: var(--color-bg-panel, transparent);
  color: var(--color-gold);
}

.navOn {
  border-color: var(--color-border-strong, var(--color-border));
  background: var(--color-gold-dim, transparent);
  color: var(--color-gold);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  margin-left: 0.1rem;
  padding: 0 0.3rem;
  border: 1px solid color-mix(in srgb, var(--color-gold) 50%, transparent);
  border-radius: 999px;
  background: var(--color-gold-dim);
  color: var(--color-gold);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1;
}

.main {
  min-width: 0;
}

/* Mobile: horizontal tabs with separators, like the reference strip. */
@media (max-width: 799px) {
  .nav {
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 0;
    padding-bottom: 0.15rem;
  }

  .navLink {
    position: relative;
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 0.45rem 1rem;
  }

  .navLink:first-child {
    padding-left: 0;
  }

  .navLink + .navLink::before {
    content: '';
    position: absolute;
    left: 0;
    top: 22%;
    bottom: 22%;
    width: 1px;
    background: color-mix(in srgb, var(--color-gold-soft) 28%, transparent);
  }

  .navLink:hover,
  .navOn {
    border: 0;
    background: transparent;
  }

  .navOn {
    color: var(--color-gold);
  }
}
</style>
