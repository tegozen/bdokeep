<script setup lang="ts">
import ProposeMorphForm from './ui/ProposeMorphForm.vue'
import MorphBoard from './ui/MorphBoard.vue'
import type { MorphSlotFill } from './ui/MorphBoard.vue'
defineProps<{ classSlug?: string; readOnly?: boolean; filled?: Record<number, MorphSlotFill> }>()
</script>
<template>
  <MorphBoard v-if="readOnly" :filled="filled ?? {}" />
  <ProposeMorphForm v-else-if="classSlug" :class-slug="classSlug" />
</template>
