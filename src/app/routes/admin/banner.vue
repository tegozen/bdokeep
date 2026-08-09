<template>
  <div :class="$style.page">
    <GuildRecruitBannerModal embedded />
  </div>
</template>

<script setup lang="ts">
import GuildRecruitBannerModal from '@/widgets/guild-banner/ui/GuildRecruitBannerModal.vue'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — баннер | BDO Keep' })
</script>

<style module>
.page {
  display: grid;
  gap: 1rem;
}
</style>
