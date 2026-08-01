<template>
  <div :class="['mx-auto w-[min(100%-2rem,1920px)]', $style.page]">
    <ClassGrid
      :classes="classes ?? []"
      :pending="pending"
      :error="!!error"
      :pending-by-class="pendingByClass"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { fetchPublishedClasses } from '@/entities/class'
import { usePendingSummary, useSuperadmin } from '@/shared/lib'
import { ClassGrid } from '@/widgets/class-grid'

const { data: classes, pending, error } = await useAsyncData('classes', () => fetchPublishedClasses(), {
  server: true,
  default: () => [],
})

const { isSuperadmin } = useSuperadmin()
const { summary, refresh: refreshPending } = usePendingSummary()

const pendingByClass = computed(() =>
  isSuperadmin.value ? summary.value.byClass : {},
)

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
