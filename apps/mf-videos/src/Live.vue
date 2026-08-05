<script setup lang="ts">
import VideoList from './ui/VideoList.vue'
defineProps<{ videos: unknown[] }>()
</script>
<template>
  <VideoList :videos="(videos as any)" />
</template>
