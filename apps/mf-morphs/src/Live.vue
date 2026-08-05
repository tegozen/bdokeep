<script setup lang="ts">
import MorphBoard from './ui/MorphBoard.vue'
import type { MorphSlotFill } from './ui/MorphBoard.vue'
defineProps<{ filled: Record<number, MorphSlotFill>; interactive?: boolean }>()
defineEmits<{ select: [id: string]; clear: [id: string] }>()
export type { MorphSlotFill }
</script>
<template>
  <MorphBoard :filled="filled" :interactive="interactive" @select="$emit('select', $event)" @clear="$emit('clear', $event)" />
</template>
