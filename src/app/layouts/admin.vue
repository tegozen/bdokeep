<template>
  <div :class="$style.root">
    <SiteHeader>
      <template #actions>
        <SuperadminAuth compact />
      </template>
    </SiteHeader>

    <div v-if="ready && isStaff" :class="$style.body">
      <nav :class="$style.nav" aria-label="Разделы админки">
        <NuxtLink
          to="/admin/proposals?status=pending"
          :class="[$style.navLink, isProposals && $style.navOn]"
        >
          Заявки
          <span v-if="pendingSummary.total > 0" :class="$style.badge">
            {{ pendingSummary.total }}
          </span>
        </NuxtLink>
        <NuxtLink
          to="/admin/feedback"
          :class="[$style.navLink, isFeedback && $style.navOn]"
        >
          Обратная связь
        </NuxtLink>
        <NuxtLink
          to="/admin/banner"
          :class="[$style.navLink, isBanner && $style.navOn]"
        >
          Баннер
        </NuxtLink>
        <NuxtLink
          v-if="isSuperadmin"
          to="/admin/users"
          :class="[$style.navLink, isUsers && $style.navOn]"
        >
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
  width: min(calc(100% - 2rem), 1920px);
  margin: 0 auto;
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  padding: 2rem 0 3rem;
}

@media (min-width: 800px) {
  .body {
    grid-template-columns: 12.5rem 1fr;
    align-items: start;
  }
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
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
  gap: 0.45rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid transparent;
  border-radius: 0.35rem;
  color: var(--color-ink);
  text-decoration: none;
  font-size: 0.92rem;
}

.navLink:hover {
  border-color: var(--color-border);
  background: var(--color-bg-panel, transparent);
}

.navOn {
  border-color: var(--color-border-strong, var(--color-border));
  background: var(--color-gold-dim, transparent);
  color: var(--color-gold-soft, var(--color-gold));
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--color-gold);
  color: #111;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.main {
  min-width: 0;
}
</style>
