<template>
  <HomePage />
</template>

<script setup lang="ts">
import {
  emptyPresetFill,
  useHeaderClass,
  useHeaderPresetFill,
} from '@/pages/class-guide'
import { HomePage } from '@/pages/home'
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE_PATH,
  SITE_TITLE,
} from '@/shared/lib'

const headerClass = useHeaderClass()
const headerPresetFill = useHeaderPresetFill()
headerClass.value = null
headerPresetFill.value = emptyPresetFill()

const config = useRuntimeConfig()
const siteName = computed(() => String(config.public.siteName || 'BDO Keep'))
const canonical = computed(() => absoluteUrl('/', config.public.siteUrl as string))
const ogImage = computed(() => absoluteUrl(SITE_OG_IMAGE_PATH, config.public.siteUrl as string))

useSeoMeta({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  ogTitle: SITE_TITLE,
  ogDescription: SITE_DESCRIPTION,
  ogType: 'website',
  ogLocale: 'ru_RU',
  ogSiteName: siteName,
  ogUrl: () => canonical.value || undefined,
  ogImage: () => ogImage.value || undefined,
  twitterCard: 'summary',
  twitterTitle: SITE_TITLE,
  twitterDescription: SITE_DESCRIPTION,
  twitterImage: () => ogImage.value || undefined,
})

useHead({
  link: () => (canonical.value ? [{ rel: 'canonical', href: canonical.value }] : []),
  script: () => {
    if (!canonical.value) return []
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteName.value,
          url: canonical.value,
          description: SITE_DESCRIPTION,
          inLanguage: 'ru',
        }),
      },
    ]
  },
})
</script>
