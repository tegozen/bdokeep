<script setup lang="ts">
import ComboChain from './ui/ComboChain.vue'
defineProps<{ steps: unknown[]; label?: string }>()
</script>
<template>
  <ComboChain :steps="(steps as any)" :label="label" />
</template>
