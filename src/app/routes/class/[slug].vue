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
import { CLASS_GUIDE_TOC, useHeaderClass, useHeaderToc } from '@/shared/lib'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const headerClass = useHeaderClass()
const headerToc = useHeaderToc()

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
      }
      headerToc.value = CLASS_GUIDE_TOC
    } else {
      headerClass.value = null
      headerToc.value = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  headerClass.value = null
  headerToc.value = null
})

useSeoMeta({
  title: () => (bundle.value?.class ? `${bundle.value.class.name_ru} — BDO Keep` : 'BDO Keep'),
})
</script>
