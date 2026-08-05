<script setup lang="ts">
import CrystalBoard from './ui/CrystalBoard.vue'
import type { CrystalFill } from './ui/CrystalBoard.vue'

defineProps<{
  filled: Record<string, CrystalFill>
  interactive?: boolean
  selectedId?: string | null
  fill?: boolean
  fillWidth?: number | null
}>()

defineEmits<{
  select: [slotId: string]
}>()

export type { CrystalFill }
</script>

<template>
  <CrystalBoard
    :filled="filled"
    :interactive="interactive"
    :selected-id="selectedId"
    :fill="fill"
    :fill-width="fillWidth"
    @select="$emit('select', $event)"
  />
</template>
