<template>
  <section class="seo-guide" :data-class="bundle.class.slug" :data-mode="mode" :data-preset="preset">
    <h2>{{ bundle.class.name_ru }} — {{ modeName }} — {{ presetName }}: полные данные</h2>
    <p>Класс: {{ bundle.class.slug }} · Специализация: {{ mode }} · Пресет: {{ preset }} · PvP/PvE: {{ kind }}</p>
    <p v-if="bundle.guide?.updated_at">Гайд обновлён: <time :datetime="bundle.guide.updated_at">{{ bundle.guide.updated_at }}</time></p>
    <section v-if="summary">
      <h3>Заметки</h3>
      <div class="multiline">{{ summary }}</div>
    </section>
    <section v-if="combos.length">
      <h3>Комбы — {{ kind }}</h3>
      <article v-for="(combo, index) in combos" :key="combo.id">
        <h4>{{ combo.title || `Комба ${index + 1}` }}</h4>
        <p v-if="combo.notes">{{ combo.notes }}</p>
        <p>Combo ID: {{ combo.id }}</p>
        <ol>
          <li v-for="step in combo.steps" :key="step.id">
            {{ step.skills?.name_ru || 'Неизвестный навык' }}
            — Skill ID: {{ step.skills?.id || 'отсутствует' }}
            — Codex ID: {{ step.skills?.codex_id ?? 'не указан' }} — порядок: {{ step.sort_order }}
          </li>
        </ol>
      </article>
    </section>
    <section v-if="morphs.length">
      <h3>Морфы</h3>
      <table>
        <thead><tr><th>Уровень слота</th><th>Навык / ID</th><th>Эффект 1 / ID</th><th>Эффект 2 / ID</th></tr></thead>
        <tbody>
          <tr v-for="row in morphs" :key="row.id">
            <td>{{ row.slot_level }}</td>
            <td>{{ row.skills?.name_ru }} <small>UUID: {{ row.skills?.id }} · Codex ID: {{ row.skills?.codex_id }}</small></td>
            <td>{{ row.effect1?.name_ru }} <small>{{ row.effect1?.id }}</small><span v-if="row.effect1?.tier_labels"> {{ JSON.stringify(row.effect1.tier_labels) }}</span></td>
            <td>{{ row.effect2?.name_ru }} <small>{{ row.effect2?.id }}</small><span v-if="row.effect2?.tier_labels"> {{ JSON.stringify(row.effect2.tier_labels) }}</span></td>
          </tr>
        </tbody>
      </table>
    </section>
    <section v-for="section in itemSections" :key="section.key" v-show="section.rows.length">
      <h3>{{ section.title }}</h3>
      <table>
        <thead><tr><th>Слот</th><th>Предмет</th><th>Catalog ID</th><th>Порядок</th><th>Примечание</th></tr></thead>
        <tbody>
          <tr v-for="row in section.rows" :key="row.id">
            <td>{{ row.slot ?? 'не указан' }}</td>
            <td>{{ row.items?.name_ru ?? 'неизвестен' }}</td>
            <td>UUID: {{ row.items?.id ?? 'отсутствует' }} · Codex ID: {{ row.items?.codex_id ?? 'отсутствует' }}</td>
            <td>{{ row.sort_order }}</td>
            <td>{{ row.notes }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <section v-if="buffs.length">
      <h3>Забаф</h3>
      <ol>
        <li v-for="row in buffs" :key="row.id">
          {{ row.buffs?.name_ru }} · Buff ID: {{ row.buffs?.id }} · Codex ID: {{ row.buffs?.codex_id ?? 'не указан' }} · слот: {{ row.slot ?? 'не указан' }}
          · группа: {{ row.group_name ?? 'нет' }} · {{ row.notes }}
        </li>
      </ol>
    </section>
    <section v-if="videos.length">
      <h3>Видео</h3>
      <ol>
        <li v-for="video in videos" :key="video.id">
          <a :href="video.youtube_url" rel="noopener noreferrer">{{ video.title }}</a>
          · URL: {{ video.youtube_url }} · Video ID: {{ video.id }}
        </li>
      </ol>
    </section>
    <p v-if="!hasContent">Для этой специализации и пресета опубликованных данных пока нет.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { classSummaryFieldFromGuide, comboKindFromPreset } from '@domain'
import { morphPresetFrom, CRYSTAL_PRESETS } from '@/entities/catalog'
import type { ClassGuideBundle } from '@/entities/class'

const props = defineProps<{
  bundle: ClassGuideBundle
  mode: 'awakening' | 'succession'
  preset: 't1' | 't2' | 'besp' | 'sub' | 'pve'
}>()
const modeName = computed(() => props.mode === 'awakening' ? 'Пробуждение' : 'Наследие')
const presetName = computed(() => CRYSTAL_PRESETS.find((x) => x.id === props.preset)?.label || props.preset)
const kind = computed(() => comboKindFromPreset(props.preset))
const summary = computed(() => props.bundle.guide?.[classSummaryFieldFromGuide(props.preset, props.mode)] || null)
const combos = computed(() => props.bundle.combos.filter((c) => c.mode === props.mode && (c.kind || 'pvp') === kind.value))
const morphs = computed(() => props.bundle.morphs.filter((m) => m.preset === morphPresetFrom(props.mode, props.preset)))
const byPreset = <T extends {preset?: string | null}>(rows: T[]) => rows.filter((r) => (r.preset || 't1') === props.preset)
const itemSections = computed(() => [
  {key:'crystals',title:'Инкрустация',rows:byPreset(props.bundle.crystals)},
  {key:'relics',title:'Реликвии',rows:byPreset(props.bundle.relics)},
  {key:'lightstones',title:'Светящиеся камни',rows:byPreset(props.bundle.lightstones)},
  {key:'hardening',title:'Закалки',rows:byPreset(props.bundle.hardening)},
])
const buffs = computed(() => byPreset(props.bundle.buffs))
const videos = computed(() => props.bundle.videos.filter((v) => (v.mode || 'awakening') === props.mode))
const hasContent = computed(() => Boolean(summary.value?.trim() || combos.value.length || morphs.value.length || itemSections.value.some(x=>x.rows.length) || buffs.value.length || videos.value.length))
</script>

<style scoped>
.seo-guide { margin: 2rem 0; border: 1px solid var(--color-border); padding: 1.25rem; color: var(--color-text, #ded6c5); overflow-x: auto; }
.seo-guide h2 { font-size: 1.3rem; margin: 0 0 1rem; }
.seo-guide h3 { font-size: 1.05rem; margin: 1.4rem 0 .7rem; color: var(--color-gold); }
.seo-guide h4 { margin: .7rem 0; }
.seo-guide table { border-collapse: collapse; width: 100%; min-width: 600px; text-align: left; font-size: .875rem; }
.seo-guide th, .seo-guide td { padding: .5rem; border-bottom: 1px solid var(--color-border); vertical-align: top; }
.seo-guide small { display:block; font-size:.75rem; opacity:.75; overflow-wrap:anywhere; }
.seo-guide ol { padding-left: 1.5rem; }
.seo-guide li { margin: .4rem 0; }
.multiline { white-space: pre-wrap; overflow-wrap:anywhere; }
</style>
