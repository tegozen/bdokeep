<template>
  <div :class="$style.page">
    <header :class="$style.header">
      <h1 :class="$style.h1">Баннер набора</h1>
    </header>
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

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.h1 {
  margin: 0;
  font-size: 1.35rem;
}
</style>
