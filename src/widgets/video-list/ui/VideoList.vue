<template>
  <VideoListInner :videos="videos" />
</template>

<script setup lang="ts">
import type { ClassVideo } from '@/entities/class'
import VideoListInner from './VideoListInner.vue'

defineProps<{
  videos: ClassVideo[]
}>()
</script>
