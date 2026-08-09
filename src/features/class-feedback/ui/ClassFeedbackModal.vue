<template>
  <UiModal
    :open="open"
    title="Обратная связь"
    aria-label="Обратная связь"
    size="lg"
    @close="emit('close')"
  >
    <div :class="$style.body">
      <ClassFeedbackForm :class-slug="classSlug" />
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { UiModal } from '@/shared/ui'
import ClassFeedbackForm from './ClassFeedbackForm.vue'

defineProps<{
  open: boolean
  classSlug?: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<style module>
.body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  overflow: auto;
  padding: 1rem 1.1rem 1.25rem;
}
</style>
