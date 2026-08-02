<template>
  <div>
    <UiMarkdownPreview
      v-if="isSummary"
      :id="`proposal-summary-${item.id}`"
      :model-value="String(payload.text || '')"
      :class="textClass"
    />

    <template v-else-if="isCombo">
      <ComboChain
        v-if="comboSteps[item.id]?.length"
        :steps="comboSteps[item.id]!"
        :label="comboLabel || 'Комба'"
      />
      <p v-else-if="comboSteps[item.id] === undefined" :class="mutedClass">Загрузка…</p>
      <p v-else :class="mutedClass">Нет скиллов</p>
    </template>

    <template v-else-if="item.section === 'buffs'">
      <div v-if="buffByPreset[item.id]" :class="tabsClass" role="tablist">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          role="tab"
          :class="[tabClass, buffPreset[item.id] === p.id && tabOnClass]"
          @click="buffPreset[item.id] = p.id"
        >
          {{ p.label }}
        </button>
      </div>
      <ul v-if="buffsFor(item.id).length" :class="buffListClass">
        <li v-for="row in buffsFor(item.id)" :key="row.id" :class="buffItemClass">
          <img
            v-if="row.buffs?.icon_url"
            :src="row.buffs.icon_url"
            alt=""
            :class="iconClass"
            loading="lazy"
          >
          <span>{{ row.buffs?.name_ru || 'Баф' }}</span>
        </li>
      </ul>
      <p v-else-if="buffByPreset[item.id] === undefined" :class="mutedClass">Загрузка…</p>
      <p v-else :class="mutedClass">Нет бафов в этом пресете</p>
    </template>

    <template v-else-if="item.section === 'crystals'">
      <div v-if="crystalByPreset[item.id]" :class="tabsClass" role="tablist">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          role="tab"
          :class="[tabClass, crystalPreset[item.id] === p.id && tabOnClass]"
          @click="crystalPreset[item.id] = p.id"
        >
          {{ p.label }}
        </button>
      </div>
      <CrystalBoard
        v-if="Object.keys(crystalFilled(item.id)).length"
        :filled="crystalFilled(item.id)"
      />
      <p v-else-if="crystalByPreset[item.id] === undefined" :class="mutedClass">Загрузка…</p>
      <p v-else :class="mutedClass">Нет кристаллов в этом пресете</p>
    </template>

    <template v-else-if="item.section === 'relics'">
      <div v-if="relicByPreset[item.id]" :class="tabsClass" role="tablist">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          role="tab"
          :class="[tabClass, relicPreset[item.id] === p.id && tabOnClass]"
          @click="relicPreset[item.id] = p.id"
        >
          {{ p.label }}
        </button>
      </div>
      <RelicBoard :filled="relicFilled(item.id)" />
    </template>

    <template v-else-if="item.section === 'hardening'">
      <div v-if="hardeningByPreset[item.id]" :class="tabsClass" role="tablist">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          role="tab"
          :class="[tabClass, hardeningPreset[item.id] === p.id && tabOnClass]"
          @click="hardeningPreset[item.id] = p.id"
        >
          {{ p.label }}
        </button>
      </div>
      <HardeningBoard
        v-if="Object.keys(hardeningFilled(item.id)).length"
        :filled="hardeningFilled(item.id)"
      />
      <p v-else-if="hardeningByPreset[item.id] === undefined" :class="mutedClass">Загрузка…</p>
      <p v-else :class="mutedClass">Нет камней закалки в этом пресете</p>
    </template>

    <VideoList
      v-else-if="isVideos"
      :videos="videosFor"
    />

    <template v-else-if="item.section === 'morphs'">
      <div v-if="morphByPreset[item.id]" :class="tabsClass" role="tablist">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          role="tab"
          :class="[tabClass, morphGuideTab[item.id] === p.id && tabOnClass]"
          @click="morphGuideTab[item.id] = p.id"
        >
          {{ p.label }}
        </button>
      </div>
      <MorphBoard
        v-if="Object.keys(morphFilled(item.id)).length"
        :filled="morphFilled(item.id)"
      />
      <p v-else-if="morphByPreset[item.id] === undefined" :class="mutedClass">Загрузка…</p>
      <p v-else :class="mutedClass">Нет морфов в этом пресете</p>
    </template>

    <pre v-else :class="textClass">{{ JSON.stringify(item.payload, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ClassVideo } from '@/entities/class'
import {
  useProposalPreviewHydration,
  type ProposalPreviewItem,
  type ProposalPreviewPayload,
} from '../lib/useProposalPreviewHydration'
import { CRYSTAL_PRESETS, useGuideSpecMode } from '@/shared/lib'
import { UiMarkdownPreview } from '@/shared/ui'
import { ComboChain } from '@/widgets/combo-chain'
import { CrystalBoard } from '@/widgets/crystal-board'
import { HardeningBoard } from '@/widgets/hardening-board'
import { MorphBoard } from '@/widgets/morph-board'
import { RelicBoard } from '@/widgets/relic-board'
import { VideoList } from '@/widgets/video-list'

const props = withDefaults(
  defineProps<{
    item: ProposalPreviewItem
    /** Optional style class hooks from parent module CSS. */
    mutedClass?: string
    textClass?: string
    tabsClass?: string
    tabClass?: string
    tabOnClass?: string
    buffListClass?: string
    buffItemClass?: string
    iconClass?: string
  }>(),
  {
    mutedClass: '',
    textClass: '',
    tabsClass: '',
    tabClass: '',
    tabOnClass: '',
    buffListClass: '',
    buffItemClass: '',
    iconClass: '',
  },
)

const presets = CRYSTAL_PRESETS
const specMode = useGuideSpecMode()
const items = computed(() => [props.item])

const {
  comboSteps,
  buffByPreset,
  buffPreset,
  crystalByPreset,
  crystalPreset,
  relicByPreset,
  relicPreset,
  hardeningByPreset,
  hardeningPreset,
  morphByPreset,
  morphGuideTab,
  buffsFor,
  crystalFilled,
  relicFilled,
  hardeningFilled,
  morphFilled,
} = useProposalPreviewHydration(items, { specMode })

const payload = computed(
  () => (props.item.payload ?? {}) as ProposalPreviewPayload,
)

const isSummary = computed(
  () =>
    props.item.section === 'summary_awakening' ||
    props.item.section === 'summary_succession',
)
const isCombo = computed(
  () =>
    props.item.section === 'combo_awakening' ||
    props.item.section === 'combo_succession',
)
const isVideos = computed(
  () =>
    props.item.section === 'videos_awakening' ||
    props.item.section === 'videos_succession',
)

const comboLabel = computed(() => {
  if (props.item.section === 'combo_awakening') return 'Комба · пробуждение'
  if (props.item.section === 'combo_succession') return 'Комба · наследие'
  return 'Комба'
})

const videosFor = computed((): ClassVideo[] => {
  const mode =
    props.item.section === 'videos_succession' ? 'succession' : 'awakening'
  return (payload.value.videos ?? []).map((v, i) => ({
    id: `${props.item.id}-${i}`,
    class_id: '',
    title: v.title || `Видео ${i + 1}`,
    youtube_url: v.youtube_url,
    sort_order: i,
    mode,
  }))
})
</script>
