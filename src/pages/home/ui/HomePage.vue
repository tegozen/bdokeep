<template>
  <div :class="$style.page">
    <ClassGrid
      :classes="filteredClasses"
      :pending="pending"
      :error="!!error"
      :pending-by-class="pendingByClass"
      :empty-message="emptyFilterMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { fetchPublishedClasses } from '@/entities/class/api/classApi'
import type { BdoClass } from '@/entities/class/model/types'
import { useHomeClassFilters, usePendingSummary, useSuperadmin } from '@/shared/lib'
import { ClassGrid } from '@/widgets/class-grid'

const { data: classes, pending, error } = await useAsyncData('classes', () => fetchPublishedClasses(), {
  server: true,
  default: () => [] as BdoClass[],
})

const { isSuperadmin } = useSuperadmin()
const { summary, refresh: refreshPending } = usePendingSummary()
const { tierMin, hideEmpty } = useHomeClassFilters()

const pendingByClass = computed(() =>
  isSuperadmin.value ? summary.value.byClass : {},
)

function classTierMax(bdoClass: BdoClass) {
  const a = bdoClass.tier_awakening == null ? 0 : Number(bdoClass.tier_awakening)
  const s = bdoClass.tier_succession == null ? 0 : Number(bdoClass.tier_succession)
  return Math.max(a, s)
}

const filteredClasses = computed(() => {
  const list = classes.value ?? []
  return list.filter((bdoClass) => {
    if (hideEmpty.value && !bdoClass.has_content) return false
    if (tierMin.value === 0) return true
    return classTierMax(bdoClass) >= tierMin.value
  })
})

const emptyFilterMessage = computed(() => {
  if (pending.value || error.value) return null
  if ((classes.value?.length ?? 0) === 0) return null
  if (filteredClasses.value.length > 0) return null
  return 'Нет классов по выбранному фильтру'
})

watch(
  isSuperadmin,
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
