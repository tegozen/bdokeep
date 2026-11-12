<template>
  <main v-if="bundle" class="full-class">
    <header>
      <h1>{{ bundle.class.name_ru }} — полные опубликованные данные BDO Keep</h1>
      <p>Класс: {{ bundle.class.slug }} · Updated: {{ bundle.guide?.updated_at || 'не указано' }}</p>
      <NuxtLink :to="`/class/${slug}`">Обычная страница класса</NuxtLink>
    </header>
    <nav aria-label="Индексируемые пресеты">
      <template v-for="mode in modes" :key="mode">
        <NuxtLink v-for="preset in presets" :key="`${mode}-${preset.id}`" :to="`/class/${slug}/${mode}/${preset.id}`">
          {{ mode==='awakening' ? 'Пробуждение':'Наследие' }} — {{ preset.label }}
        </NuxtLink>
      </template>
    </nav>
    <template v-for="mode in modes" :key="mode">
      <SeoGuideDetail v-for="preset in presets" :key="`${mode}-${preset.id}`" :bundle="bundle" :mode="mode" :preset="preset.id" />
    </template>
  </main>
</template>

<script setup lang="ts">
import { fetchClassGuideBySlug } from '@/entities/class'
import { CRYSTAL_PRESETS } from '@/entities/catalog'
import SeoGuideDetail from '@/pages/class-guide/ui/SeoGuideDetail.vue'
import { absoluteUrl } from '@/shared/lib'
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const {data:bundle,error} = await useAsyncData(() => `class-full-${slug.value}`,
  () => fetchClassGuideBySlug(slug.value), {watch:[slug],default:()=>null})
if (!bundle.value && !error.value) throw createError({statusCode:404,statusMessage:'Класс не найден'})
const modes = ['awakening','succession'] as const
const presets = CRYSTAL_PRESETS
const config = useRuntimeConfig()
const canonical = computed(() => absoluteUrl(`/class/${slug.value}/full`, String(config.public.siteUrl||'')))
const title = computed(() => `${bundle.value?.class.name_ru||slug.value} — все специализации и пресеты | BDO Keep`)
const fullHasContent = computed(() => {
  const b = bundle.value
  if (!b) return false
  const g = b.guide
  const hasNotes = Boolean(g && [g.summary_pvp_awakening, g.summary_pvp_succession,
    g.summary_pve_awakening, g.summary_pve_succession].some(s => s?.trim()))
  return hasNotes || Boolean(b.combos.length || b.crystals.length || b.relics.length ||
    b.lightstones.length || b.hardening.length || b.morphs.length || b.buffs.length || b.videos.length)
})
useSeoMeta({robots:()=>fullHasContent.value?'index,follow':'noindex,follow',title:()=>title.value,description:()=>`Полный справочник по всем опубликованным пресетам ${bundle.value?.class.name_ru||slug.value}: навыки, морфы, инкрустация, реликвии, закалки, бафы и видео.`,ogUrl:()=>canonical.value||undefined,ogTitle:()=>title.value})
useHead({link:()=>canonical.value?[{rel:'canonical',href:canonical.value}]:[]})
</script>
<style scoped>
.full-class { width:min(calc(100% - 2rem),1200px); margin:1rem auto; }
header,nav {padding:1rem;border:1px solid var(--color-border);margin-bottom:1rem;}
h1 {font-size:1.5rem;margin-bottom:.5rem;color:var(--color-gold);}
nav {display:flex;flex-wrap:wrap;gap:1rem;}
a {color:var(--color-gold);text-decoration:underline;}
</style>
