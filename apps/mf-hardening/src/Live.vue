<script setup lang="ts">
import HardeningBoard from './ui/HardeningBoard.vue'
import type { HardeningFill } from './ui/HardeningBoard.vue'
defineProps<{ filled: Record<string, HardeningFill>; listOnly?: boolean; interactive?: boolean }>()
defineEmits<{ select: [slotId: string] }>()
export type { HardeningFill }
</script>
<template>
  <HardeningBoard :filled="filled" :list-only="listOnly" :interactive="interactive" @select="$emit('select', $event)" />
</template>
