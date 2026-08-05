<script setup lang="ts">
import ProposeHardeningForm from './ui/ProposeHardeningForm.vue'
import HardeningBoard from './ui/HardeningBoard.vue'
import type { HardeningFill } from './ui/HardeningBoard.vue'
defineProps<{ classSlug?: string; readOnly?: boolean; filled?: Record<string, HardeningFill> }>()
</script>
<template>
  <HardeningBoard v-if="readOnly" :filled="filled ?? {}" list-only />
  <ProposeHardeningForm v-else-if="classSlug" :class-slug="classSlug" />
</template>
