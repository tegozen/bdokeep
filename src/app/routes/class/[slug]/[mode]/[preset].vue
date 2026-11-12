<template>
  <main v-if="bundle" class="indexed-class">
    <nav aria-label="Индексируемые специализации и пресеты">
      <NuxtLink :to="`/class/${slug}`">Обзор класса</NuxtLink>
      <NuxtLink :to="`/class/${slug}/full`">Все данные класса</NuxtLink>
      <template v-for="m in modes" :key="m">
        <NuxtLink v-for="p in presets" :key="`${m}-${p.id}`" :to="`/class/${slug}/${m}/${p.id}`">
          {{ m === 'awakening' ? 'Пробуждение' : 'Наследие' }} — {{ p.label }}
        </NuxtLink>
      </template>
    </nav>
    <ClassGuidePage :bundle="bundle" :pending="pending" :error="!!error" />
    <SeoGuideDetail :bundle="bundle" :mode="mode" :preset="preset" />
  </main>
</template>

<script setup lang="ts">
import { fetchClassGuideBySlug } from '@/entities/class'
import { CRYSTAL_PRESETS, morphPresetFrom } from '@/entities/catalog'
import { classSummaryFieldFromGuide, comboKindFromPreset } from '@domain'
import { ClassGuidePage, useHeaderClass, useGuidePreset, useGuideSpecMode } from '@/pages/class-guide'
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
const specState = useGuideSpecMode()
const presetState = useGuidePreset()
watch([mode,preset], ([m,p]) => { specState.value = m; presetState.value = p }, { immediate:true, flush:'sync' })
const headerClass = useHeaderClass()
const {data:bundle,pending,error} = await useAsyncData(
  () => `class-indexed-${slug.value}`,
  () => fetchClassGuideBySlug(slug.value),
  { watch:[slug], default: () => null },
)
if (!bundle.value && !error.value) throw createError({statusCode:404,statusMessage:'Класс не найден'})
watch(bundle,(b)=> {
  headerClass.value = b?.class ? {
    slug:b.class.slug, name_ru:b.class.name_ru,icon_url:b.class.icon_url,
    tier_pvp_awakening:b.class.tier_pvp_awakening??null,
    tier_pvp_succession:b.class.tier_pvp_succession??null,
    tier_pve_awakening:b.class.tier_pve_awakening??null,
    tier_pve_succession:b.class.tier_pve_succession??null,
  }:null
},{immediate:true})
onBeforeUnmount(()=>{headerClass.value=null})
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
nav { max-width: 1920px; margin: 0 auto 1rem; padding: .75rem 1rem; display: flex; gap: .65rem; flex-wrap: wrap; font-size: .8rem; }
nav a { color: var(--color-gold); text-decoration: underline; }
</style>
