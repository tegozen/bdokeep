<template>
  <HomePage />
</template>

<script setup lang="ts">
import { HomePage } from '@/pages/home'
import { emptyPresetFill, useHeaderClass, useHeaderPresetFill } from '@/shared/lib'

const headerClass = useHeaderClass()
const headerPresetFill = useHeaderPresetFill()
headerClass.value = null
headerPresetFill.value = emptyPresetFill()
</script>
