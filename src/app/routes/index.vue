<template>
  <HomePage />
</template>

<script setup lang="ts">
import { HomePage } from '@/pages/home'
import { useHeaderClass } from '@/shared/lib'

const headerClass = useHeaderClass()
headerClass.value = null
</script>
