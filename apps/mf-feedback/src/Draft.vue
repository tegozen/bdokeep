<script setup lang="ts">
import ClassFeedbackModal from './ui/ClassFeedbackModal.vue'
defineProps<{ open?: boolean; classSlug?: string | null }>()
defineEmits<{ close: [] }>()
</script>
<template>
  <ClassFeedbackModal :open="!!open" :class-slug="classSlug ?? undefined" @close="$emit('close')" />
</template>
