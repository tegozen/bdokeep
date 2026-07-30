<template>
  <HomePage />
</template>

<script setup lang="ts">
import { HomePage } from '@/pages/home'
import { useHeaderClass, useHeaderToc } from '@/shared/lib'

const headerClass = useHeaderClass()
const headerToc = useHeaderToc()
headerClass.value = null
headerToc.value = null
</script>
