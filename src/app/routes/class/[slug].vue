<template>
  <ClassGuidePage
    :bundle="bundle"
    :pending="pending"
    :error="!!error"
  />
</template>

<script setup lang="ts">
import { fetchClassGuideBySlug } from '@/entities/class'
import { ClassGuidePage, useHeaderClass } from '@/pages/class-guide'
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE_PATH,
  SITE_TITLE,
} from '@/shared/lib'

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

const config = useRuntimeConfig()
const siteName = computed(() => String(config.public.siteName || 'BDO Keep'))
const className = computed(() => bundle.value?.class?.name_ru ?? null)

const pageTitle = computed(() =>
  className.value
    ? `${className.value} — гайд BDO (PvP и PvE) | BDO Keep`
    : SITE_TITLE,
)

const pageDescription = computed(() =>
  className.value
    ? `Гайд по классу ${className.value} в Black Desert Online: заметки, комба, морфы, инкрустация, реликвии, закалки, бафы и видео — PvP и PvE.`
    : SITE_DESCRIPTION,
)

const canonical = computed(() => {
  if (!slug.value || !bundle.value?.class) return null
  return absoluteUrl(`/class/${slug.value}`, config.public.siteUrl as string)
})

const ogImage = computed(() => absoluteUrl(SITE_OG_IMAGE_PATH, config.public.siteUrl as string))

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  ogTitle: () => pageTitle.value,
  ogDescription: () => pageDescription.value,
  ogType: 'article',
  ogLocale: 'ru_RU',
  ogSiteName: siteName,
  ogUrl: () => canonical.value || undefined,
  ogImage: () => ogImage.value || undefined,
  twitterCard: 'summary',
  twitterTitle: () => pageTitle.value,
  twitterDescription: () => pageDescription.value,
  twitterImage: () => ogImage.value || undefined,
})

useHead({
  link: () => (canonical.value ? [{ rel: 'canonical', href: canonical.value }] : []),
  script: () => {
    if (!canonical.value || !className.value) return []
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: pageTitle.value,
          description: pageDescription.value,
          url: canonical.value,
          inLanguage: 'ru',
          isPartOf: {
            '@type': 'WebSite',
            name: siteName.value,
          },
        }),
      },
    ]
  },
})
</script>
