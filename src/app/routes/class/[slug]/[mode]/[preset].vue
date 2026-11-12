<template>
  <main v-if="bundle" class="indexed-class">
    <ClassGuidePage :bundle="bundle" :pending="pending" :error="!!error" />
    <details class="indexed-details">
      <summary>Полные данные пресета (текст и идентификаторы)</summary>
      <SeoGuideDetail :bundle="bundle" :mode="mode" :preset="preset" />
    </details>
  </main>
</template>

<script setup lang="ts">
import { fetchClassGuideBySlug } from '@/entities/class'
import { CRYSTAL_PRESETS, morphPresetFrom } from '@/entities/catalog'
import { classSummaryFieldFromGuide, comboKindFromPreset } from '@domain'
import { ClassGuidePage } from '@/pages/class-guide'
import SeoGuideDetail from '@/pages/class-guide/ui/SeoGuideDetail.vue'
import { absoluteUrl, SITE_OG_IMAGE_PATH } from '@/shared/lib'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const modes = ['awakening','succession'] as const
const presets = CRYSTAL_PRESETS
const rawMode = computed(() => String(route.params.mode))
const rawPreset = computed(() => String(route.params.preset))
if (!modes.some((m) => m === rawMode.value) || !presets.some((p) => p.id === rawPreset.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Неверный пресет' })
}
const mode = computed(() => rawMode.value as 'awakening' | 'succession')
const preset = computed(() => rawPreset.value as 't1' | 't2' | 'besp' | 'sub' | 'pve')
const {data:bundle,pending,error} = await useAsyncData(
  () => `class-indexed-${slug.value}`,
  () => fetchClassGuideBySlug(slug.value),
  { watch:[slug], default: () => null },
)
if (!bundle.value && !error.value) throw createError({statusCode:404,statusMessage:'Класс не найден'})
const config = useRuntimeConfig()
const path = computed(() => `/class/${slug.value}/${mode.value}/${preset.value}`)
const canonical = computed(() => absoluteUrl(path.value, String(config.public.siteUrl || '')))
const name = computed(() => bundle.value?.class.name_ru || slug.value)
const label = computed(() => presets.find(p=>p.id===preset.value)?.label || preset.value)
const title = computed(() => `${name.value} — ${mode.value==='awakening'?'Пробуждение':'Наследие'} ${label.value} — гайд BDO Keep`)
const description = computed(() => `Полные данные BDO ${name.value}: ${mode.value}, ${label.value}. Комбы, морфы, кристаллы, слоты, реликвии, закалки и видео.`)

const isMeaningful = computed(() => {
  const b = bundle.value
  if (!b) return false
  const summaryField = classSummaryFieldFromGuide(preset.value, mode.value)
  const hasNotes = Boolean(b.guide?.[summaryField]?.trim())
  const hasCombo = b.combos.some(c => c.mode === mode.value && (c.kind || 'pvp') === comboKindFromPreset(preset.value))
  const hasMorph = b.morphs.some(m => m.preset === morphPresetFrom(mode.value,preset.value))
  const hasGear = [b.crystals,b.relics,b.lightstones,b.hardening,b.buffs]
    .some(rows => rows.some(row => (row.preset || 't1') === preset.value))
  const hasVideo = b.videos.some(v => (v.mode || 'awakening') === mode.value)
  return hasNotes || hasCombo || hasMorph || hasGear || hasVideo
})

useSeoMeta({
  robots:()=>isMeaningful.value?'index,follow':'noindex,follow',
  title:()=>title.value,description:()=>description.value,
  ogTitle:()=>title.value,ogDescription:()=>description.value,
  ogUrl:()=>canonical.value||undefined,ogType:'article',
  ogImage:()=>absoluteUrl(SITE_OG_IMAGE_PATH,String(config.public.siteUrl||''))||undefined,
  ogLocale:'ru_RU',
})
useHead({
  link:()=>canonical.value?[{rel:'canonical',href:canonical.value}]:[],
  script:()=>canonical.value?[{type:'application/ld+json',children:JSON.stringify({
    '@context':'https://schema.org','@type':'WebPage',name:title.value,
    url:canonical.value,description:description.value,inLanguage:'ru',
    dateModified:bundle.value?.guide?.updated_at||undefined,
  })}]:[],
})
</script>

<style scoped>
.indexed-class { width: 100%; }
.indexed-details { width: min(calc(100% - 2rem), 1920px); margin: 1rem auto; }
.indexed-details > summary { color: var(--color-gold); cursor: pointer; font-size: .85rem; padding: .5rem 0; }
</style>
