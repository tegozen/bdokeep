<script setup lang="ts">
import ProposeComboForm from './ui/ProposeComboForm.vue'
import ComboChain from './ui/ComboChain.vue'
defineProps<{ classSlug?: string; section?: string; readOnly?: boolean; steps?: unknown[]; label?: string }>()
</script>
<template>
  <ComboChain v-if="readOnly" :steps="((steps ?? []) as any)" :label="label" />
  <ProposeComboForm v-else-if="classSlug && section" :class-slug="classSlug" :section="section" />
</template>
