<script setup lang="ts">
import ProposeBuffsForm from './ui/ProposeBuffsForm.vue'
defineProps<{
  classSlug?: string
  readOnly?: boolean
  buffs?: Array<{ id?: string; notes?: string | null; buffs?: { name_ru?: string } | null }>
}>()
</script>
<template>
  <ul v-if="readOnly && buffs?.length">
    <li v-for="(b, i) in buffs" :key="b.id ?? i">{{ b.buffs?.name_ru || 'Баф' }}<span v-if="b.notes"> — {{ b.notes }}</span></li>
  </ul>
  <ProposeBuffsForm v-else-if="classSlug" :class-slug="classSlug" />
</template>
