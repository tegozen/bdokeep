<script setup lang="ts">
import ProposeVideosForm from './ui/ProposeVideosForm.vue'
import VideoList from './ui/VideoList.vue'
defineProps<{ classSlug?: string; section?: string; readOnly?: boolean; videos?: unknown[] }>()
</script>
<template>
  <VideoList v-if="readOnly" :videos="((videos ?? []) as any)" />
  <ProposeVideosForm v-else-if="classSlug && section" :class-slug="classSlug" :section="section" />
</template>
