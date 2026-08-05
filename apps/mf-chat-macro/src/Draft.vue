<script setup lang="ts">
import ChatMacroGuideModal from './ui/ChatMacroGuideModal.vue'
defineProps<{ open?: boolean }>()
defineEmits<{ close: [] }>()
</script>
<template>
  <ChatMacroGuideModal :open="!!open" @close="$emit('close')" />
</template>
