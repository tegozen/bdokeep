<script setup lang="ts">
import UiMarkdownPreview from '@/shared/ui/UiMarkdownPreview.vue'
defineProps<{ text: string }>()
</script>
<template>
  <UiMarkdownPreview id="section-summary-live" :model-value="text" />
</template>
