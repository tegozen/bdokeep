<script setup lang="ts">
import RelicBoard from './ui/RelicBoard.vue'
import type { RelicFill } from './ui/RelicBoard.vue'
defineProps<{
  filled?: Record<string, RelicFill | null | undefined>
  lightstoneSetName?: string | null
  interactive?: boolean
}>()
export type { RelicFill }
</script>
<template>
  <RelicBoard :filled="filled" :lightstone-set-name="lightstoneSetName" :interactive="interactive" />
</template>
