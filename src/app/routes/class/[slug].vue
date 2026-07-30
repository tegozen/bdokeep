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

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

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

useSeoMeta({
  title: () => (bundle.value?.class ? `${bundle.value.class.name_ru} — BDO Keep` : 'BDO Keep'),
})
</script>
