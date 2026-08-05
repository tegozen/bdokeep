<script setup lang="ts">
import ProposeRelicForm from './ui/ProposeRelicForm.vue'
import RelicBoard from './ui/RelicBoard.vue'
import type { RelicFill } from './ui/RelicBoard.vue'
defineProps<{
  classSlug?: string
  readOnly?: boolean
  filled?: Record<string, RelicFill | null | undefined>
  lightstoneSetName?: string | null
}>()
</script>
<template>
  <RelicBoard v-if="readOnly" :filled="filled ?? {}" :lightstone-set-name="lightstoneSetName" />
  <ProposeRelicForm v-else-if="classSlug" :class-slug="classSlug" />
</template>
