<template>
  <ClassGuidePage
    :bundle="bundle"
    :pending="pending"
    :error="!!error"
  />
</template>

<script setup lang="ts">
import { fetchClassGuideBySlug } from '@/entities/class'
import { ClassGuidePage } from '@/pages/class-guide'
import { useHeaderClass } from '@/shared/lib'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const headerClass = useHeaderClass()

const { data: bundle, pending, error } = await useAsyncData(
  () => `class-${slug.value}`,
  () => {
    if (!slug.value) return null
    return fetchClassGuideBySlug(slug.value)
  },
  {
    watch: [slug],
    default: () => null,
  },
)

watch(
  bundle,
  (b) => {
    if (b?.class) {
      headerClass.value = {
        slug: b.class.slug,
        name_ru: b.class.name_ru,
        icon_url: b.class.icon_url,
        tier_pvp_awakening: b.class.tier_pvp_awakening ?? null,
        tier_pvp_succession: b.class.tier_pvp_succession ?? null,
        tier_pve_awakening: b.class.tier_pve_awakening ?? null,
        tier_pve_succession: b.class.tier_pve_succession ?? null,
      }
    } else {
      headerClass.value = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  headerClass.value = null
})

useSeoMeta({
  title: () => (bundle.value?.class ? `${bundle.value.class.name_ru} — BDO Keep` : 'BDO Keep'),
})
</script>
