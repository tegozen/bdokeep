<template>
  <div :class="$style.page">
    <ClassGrid
      :classes="filteredClasses"
      :pending="pending"
      :error="!!error"
      :pending-by-class="pendingByClass"
      :empty-message="emptyFilterMessage"
    >
      <template v-if="guildBanner?.enabled" #lead>
        <GuildRecruitBanner :data="guildBanner" :span="3" />
      </template>
    </ClassGrid>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fetchPublishedClasses, type BdoClass } from '@/entities/class'
import { usePendingSummary, useSuperadmin } from '@/features/superadmin-auth'
import { useOnlineStatus } from '@/shared/lib'
import { listCachedGuideSlugs } from '../lib/listCachedGuideSlugs'
import { useHomeClassFilters } from '../lib/useHomeClassFilters'
import { ClassGrid } from '@/widgets/class-grid'
import { GuildRecruitBanner, type GuildBannerPublic } from '@/widgets/guild-banner'

const { data: classes, pending, error } = await useAsyncData('classes', () => fetchPublishedClasses(), {
  server: true,
  default: () => [] as BdoClass[],
})

const { data: guildBanner } = await useAsyncData(
  'guild-banner',
  () => $fetch<GuildBannerPublic>('/api/guild-banner'),
  {
    default: () => ({ enabled: false }) as GuildBannerPublic,
  },
)

const { isStaff } = useSuperadmin()
const { summary, refresh: refreshPending } = usePendingSummary()
const { tierMin, hideEmpty, showProposals } = useHomeClassFilters()
const { online } = useOnlineStatus()

const cachedGuideSlugs = ref<Set<string>>(new Set())

async function refreshCachedSlugs() {
  if (!import.meta.client || online.value) {
    cachedGuideSlugs.value = new Set()
    return
  }
  cachedGuideSlugs.value = await listCachedGuideSlugs()
}

watch(
  online,
  () => {
    void refreshCachedSlugs()
  },
  { immediate: true },
)

const pendingByClass = computed(() =>
  isStaff.value ? summary.value.byClass : {},
)

function classTierMax(bdoClass: BdoClass) {
  const vals = [
    bdoClass.tier_pvp_awakening,
    bdoClass.tier_pvp_succession,
    bdoClass.tier_pve_awakening,
    bdoClass.tier_pve_succession,
  ].map((v) => (v == null ? 0 : Number(v)))
  return Math.max(0, ...vals)
}

const filteredClasses = computed(() => {
  const list = classes.value ?? []
  return list.filter((bdoClass) => {
    if (hideEmpty.value && !bdoClass.has_content) return false
    if (tierMin.value !== 0 && classTierMax(bdoClass) < tierMin.value) return false
    if (
      isStaff.value &&
      showProposals.value &&
      !(summary.value.byClass[bdoClass.slug] > 0)
    ) {
      return false
    }
    if (!online.value && !cachedGuideSlugs.value.has(bdoClass.slug)) return false
    return true
  })
})

const emptyFilterMessage = computed(() => {
  if (pending.value || error.value) return null
  if ((classes.value?.length ?? 0) === 0) return null
  if (filteredClasses.value.length > 0) return null
  if (!online.value) return 'Нет сохранённых классов для просмотра офлайн'
  if (isStaff.value && showProposals.value) return 'Нет классов с предложениями'
  return 'Нет классов по выбранному фильтру'
})

watch(
  isStaff,
  (ok) => {
    if (ok) void refreshPending()
  },
  { immediate: true },
)
</script>

<style module>
.page {
  width: min(calc(100% - 2rem), 1920px);
  margin-inline: auto;
}
</style>
