<template>
  <div :class="['mx-auto w-[min(100%-2rem,1920px)]', $style.page]">
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
import { fetchPublishedClasses, type BdoClass } from '@/entities/class'
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

const filteredClasses = computed(() => {
  const list = classes.value ?? []
  return list.filter((klass) => {
    if (hideEmpty.value && !klass.has_content) return false
    if (tierMin.value === 0) return true
    const t = klass.tier == null ? 0 : Number(klass.tier)
    return t >= tierMin.value
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
}
</style>
