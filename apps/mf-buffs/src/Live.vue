<script setup lang="ts">
defineProps<{
  buffs: Array<{ id?: string; notes?: string | null; buffs?: { name_ru?: string; icon_url?: string | null } | null }>
}>()
</script>
<template>
  <ul v-if="buffs.length">
    <li v-for="(b, i) in buffs" :key="b.id ?? i">
      <strong>{{ b.buffs?.name_ru || 'Баф' }}</strong>
      <span v-if="b.notes"> — {{ b.notes }}</span>
    </li>
  </ul>
</template>
