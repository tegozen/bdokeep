<script setup lang="ts">
import ProposeSummaryForm from './ui/ProposeSummaryForm.vue'
import UiMarkdownPreview from '@/shared/ui/UiMarkdownPreview.vue'
defineProps<{ classSlug?: string; section?: string; initialText?: string; readOnly?: boolean; text?: string }>()
</script>
<template>
  <UiMarkdownPreview v-if="readOnly" id="section-summary-draft" :model-value="text || ''" />
  <ProposeSummaryForm
    v-else-if="classSlug && section"
    :class-slug="classSlug"
    :section="section"
    :initial-text="initialText || ''"
  />
</template>
