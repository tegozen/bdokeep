<template>
  <ClassGuidePage
    :bundle="bundle"
    :pending="pending"
    :error="!!error"
    @tier-change="onTierChange"
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
        tier: b.class.tier ?? null,
      }
    } else {
      headerClass.value = null
    }
  },
  { immediate: true },
)

function onTierChange(tier: number | null) {
  if (!bundle.value?.class) return
  bundle.value = {
    ...bundle.value,
    class: { ...bundle.value.class, tier },
  }
}

onBeforeUnmount(() => {
  headerClass.value = null
})

useSeoMeta({
  title: () => (bundle.value?.class ? `${bundle.value.class.name_ru} — BDO Keep` : 'BDO Keep'),
})
</script>
