<template>
  <UiModal
    :open="open"
    title="Обратная связь"
    aria-label="Обратная связь"
    size="md"
    @close="emit('close')"
  >
    <div :class="$style.body">
      <p :class="$style.lead">{{ lead }}</p>
      <ClassFeedbackForm :class-slug="classSlug" />
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UiModal } from '@/shared/ui'
import ClassFeedbackForm from './ClassFeedbackForm.vue'

const props = defineProps<{
  open: boolean
  classSlug?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const lead = computed(() =>
  props.classSlug
    ? 'Анонимное сообщение админу по этому классу. Публично не отображается.'
    : 'Анонимное сообщение админу. Публично не отображается.',
)
</script>

<style module>
.body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  overflow: auto;
  padding: 1rem 1.1rem 1.25rem;
}

.lead {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--color-muted);
}
</style>
