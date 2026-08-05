<script setup lang="ts">
/** Inbox list — shell mounts on /admin/feedback */
defineProps<{
  items: Array<{ id: string; body: string; class_slug?: string | null; created_at?: string }>
}>()
defineEmits<{ remove: [id: string] }>()
</script>
<template>
  <ul class="feedback-inbox">
    <li v-for="item in items" :key="item.id">
      <p>{{ item.body }}</p>
      <small v-if="item.class_slug">{{ item.class_slug }}</small>
      <button type="button" @click="$emit('remove', item.id)">Удалить</button>
    </li>
  </ul>
</template>
