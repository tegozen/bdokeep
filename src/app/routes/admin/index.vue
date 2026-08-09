<script setup lang="ts">
definePageMeta({ layout: 'admin' })

await navigateTo('/admin/proposals?status=pending', { replace: true })
</script>

<template>
  <p>Переход в админку…</p>
</template>
