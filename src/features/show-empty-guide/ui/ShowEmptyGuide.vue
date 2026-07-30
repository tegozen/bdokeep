<template>
  <UiEmptyState :title="title" :description="description" />
</template>

<script setup lang="ts">
import { UiEmptyState } from '@/shared/ui'

withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: 'Данных пока нет',
    description: 'Гайд ещё не заполнен — раздел появится после правок в Studio.',
  },
)
</script>
