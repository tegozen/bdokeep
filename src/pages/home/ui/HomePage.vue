<template>
  <div :class="['mx-auto w-[min(100%-2rem,1920px)]', $style.page]">
    <ClassGrid :classes="classes ?? []" :pending="pending" :error="!!error" />
  </div>
</template>

<script setup lang="ts">
import { fetchPublishedClasses } from '@/entities/class'
import { ClassGrid } from '@/widgets/class-grid'

const { data: classes, pending, error } = await useAsyncData('classes', () => fetchPublishedClasses(), {
  server: true,
  default: () => [],
})
</script>

<style module>
.page {
}
</style>
