<template>
  <div :class="pinTabs ? $style.split : undefined">
    <div v-if="showPresetTabs" :class="pinTabs && $style.tabsPinned">
      <div :class="$style.tabRow">
        <UiPresetTabs
          v-if="item.section === 'morphs'"
          v-model="morphSpecMode"
          :tabs="morphSpecTabs"
          aria-label="Пробуждение или наследие"
        />
        <UiPresetTabs
          :model-value="activePreset || 't1'"
          :tabs="presets"
          aria-label="Пресет"
          @update:model-value="setPreset"
        >
          <template #tab="{ tab }">
            <span>
              {{ tab.label }}
              <span
                v-if="isGuidePresetCleared(tab.id)"
                :class="$style.clearHint"
              > · очистка</span>
            </span>
          </template>
        </UiPresetTabs>
      </div>
    </div>

    <div :class="pinTabs ? $style.scrollBody : undefined">
      <UiMarkdownPreview
        v-if="isSummary"
        :id="`proposal-summary-${item.id}`"
        :model-value="String(payload.text || '')"
        :class="textClass"
      />

      <template v-else-if="isCombo">
        <template v-if="comboGroups[item.id]?.length">
          <div
            v-for="(group, idx) in comboGroups[item.id]"
            :key="`${item.id}-${idx}`"
            :class="$style.comboGroup"
          >
            <p v-if="group.notes" :class="mutedClass">{{ group.notes }}</p>
            <ComboChain
              :steps="group.steps"
              :label="group.notes || comboLabel || 'Комба'"
            />
          </div>
        </template>
        <p v-else-if="comboGroups[item.id] === undefined" :class="mutedClass">Загрузка…</p>
        <p v-else :class="mutedClass">Нет скиллов</p>
      </template>

      <template v-else-if="item.section === 'buffs'">
        <p v-if="buffByPreset[item.id] === undefined" :class="mutedClass">Загрузка…</p>
        <ul v-else-if="buffsFor(item.id).length" :class="buffListClass">
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
        <p v-else :class="mutedClass">{{ emptyPresetMessage }}</p>
      </template>

      <template v-else-if="item.section === 'crystals'">
        <p v-if="crystalByPreset[item.id] === undefined" :class="mutedClass">Загрузка…</p>
        <div v-else :class="$style.crystalLayout">
          <div :class="$style.picked">
            <p v-if="!crystalPickedList(item.id).length" :class="$style.pickedEmpty">
              {{ emptyPresetMessage }}
            </p>
            <ul v-else :class="$style.pickedList">
              <li
                v-for="row in crystalPickedList(item.id)"
                :key="row.id"
                :class="$style.pickedItem"
              >
                <img
                  v-if="row.icon_url"
                  :src="row.icon_url"
                  alt=""
                  :class="$style.pickedIcon"
                  loading="lazy"
                >
                <span :class="$style.pickedName">{{ row.name_ru }}</span>
                <span v-if="row.count > 1" :class="$style.pickedCount">×{{ row.count }}</span>
              </li>
            </ul>
          </div>
          <div :class="$style.crystalStage">
            <CrystalBoard :filled="crystalFilled(item.id)" />
          </div>
        </div>
      </template>

      <template v-else-if="item.section === 'relics'">
        <p v-if="relicByPreset[item.id] === undefined" :class="mutedClass">Загрузка…</p>
        <template v-else>
          <div
            v-if="Object.keys(relicFilled(item.id)).length"
            :class="$style.relicStage"
          >
            <RelicBoard :filled="relicFilled(item.id)" />
          </div>
          <p v-else :class="mutedClass">{{ emptyPresetMessage }}</p>
        </template>
      </template>

      <template v-else-if="item.section === 'hardening'">
        <p v-if="hardeningByPreset[item.id] === undefined" :class="mutedClass">Загрузка…</p>
        <ul v-else-if="hardeningRows(item.id).length" :class="buffListClass">
          <li
            v-for="row in hardeningRows(item.id)"
            :key="row.id"
            :class="buffItemClass"
          >
            <img
              v-if="row.icon_url"
              :src="row.icon_url"
              alt=""
              :class="iconClass"
              loading="lazy"
            >
            <span>{{ hardeningLabel(row.name_ru) }}</span>
          </li>
        </ul>
        <p v-else :class="mutedClass">{{ emptyPresetMessage }}</p>
      </template>

      <VideoList
        v-else-if="isVideos"
        :videos="videosFor"
      />

      <template v-else-if="item.section === 'morphs'">
        <p v-if="morphByPreset[item.id] === undefined" :class="mutedClass">Загрузка…</p>
        <template v-else>
          <MorphBoard
            v-if="Object.keys(morphFilled(item.id)).length"
            :filled="morphFilled(item.id)"
          />
          <p v-else :class="mutedClass">{{ emptyPresetMessage }}</p>
        </template>
      </template>

      <pre v-else :class="textClass">{{ JSON.stringify(item.payload, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import type { ClassVideo } from '@/entities/class'
import {
  useProposalPreviewHydration,
  type ProposalPreviewItem,
  type ProposalPreviewPayload,
} from '../lib/useProposalPreviewHydration'
import {
  CRYSTAL_ALL_SLOTS,
  CRYSTAL_PRESETS,
  HARDENING_SLOTS,
  isPlaceholderVideoTitle,
  morphPresetFrom,
  type CrystalPresetId,
  type GuideSpecMode,
} from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { ComboChain } from '@/widgets/combo-chain'
import { CrystalBoard } from '@/widgets/crystal-board'
import { MorphBoard } from '@/widgets/morph-board'
import { RelicBoard } from '@/widgets/relic-board'

const UiMarkdownPreview = defineAsyncComponent(
  () => import('@/shared/ui/UiMarkdownPreview.vue'),
)
const VideoList = defineAsyncComponent(
  () => import('@/widgets/video-list/ui/VideoList.vue'),
)
const props = withDefaults(
  defineProps<{
    item: ProposalPreviewItem
    /** Keep preset tabs outside the scrollable body. */
    pinTabs?: boolean
    /** Optional style class hooks from parent module CSS. */
    mutedClass?: string
    textClass?: string
    buffListClass?: string
    buffItemClass?: string
    iconClass?: string
  }>(),
  {
    pinTabs: false,
    mutedClass: '',
    textClass: '',
    buffListClass: '',
    buffItemClass: '',
    iconClass: '',
  },
)

const presets = CRYSTAL_PRESETS
/** Local to this preview — do not depend on class-page header guideSpecMode. */
const morphSpecMode = ref<GuideSpecMode>('awakening')
const morphSpecTabs = [
  { id: 'awakening' as const, label: 'Пробуждение' },
  { id: 'succession' as const, label: 'Наследие' },
]
const items = computed(() => [props.item])

const {
  comboGroups,
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
} = useProposalPreviewHydration(items, { specMode: morphSpecMode })

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

const showPresetTabs = computed(() => {
  const section = props.item.section
  if (section === 'buffs') return !!buffByPreset[props.item.id]
  if (section === 'crystals') return !!crystalByPreset[props.item.id]
  if (section === 'relics') return !!relicByPreset[props.item.id]
  if (section === 'hardening') return !!hardeningByPreset[props.item.id]
  if (section === 'morphs') return !!morphByPreset[props.item.id]
  return false
})

const activePreset = computed((): CrystalPresetId | undefined => {
  const id = props.item.id
  switch (props.item.section) {
    case 'buffs':
      return buffPreset[id]
    case 'crystals':
      return crystalPreset[id]
    case 'relics':
      return relicPreset[id]
    case 'hardening':
      return hardeningPreset[id]
    case 'morphs':
      return morphGuideTab[id]
    default:
      return undefined
  }
})

function setPreset(preset: CrystalPresetId) {
  const id = props.item.id
  switch (props.item.section) {
    case 'buffs':
      buffPreset[id] = preset
      break
    case 'crystals':
      crystalPreset[id] = preset
      break
    case 'relics':
      relicPreset[id] = preset
      break
    case 'hardening':
      hardeningPreset[id] = preset
      break
    case 'morphs':
      morphGuideTab[id] = preset
      break
  }
}

function replacedPresetIds(): Set<string> {
  const raw = payload.value.replaced_presets
  if (!Array.isArray(raw)) return new Set()
  return new Set(raw.map((x) => String(x)))
}

/** Guide tab (t1/…) marked for clear on approve and currently empty in payload. */
function isGuidePresetCleared(guide: CrystalPresetId): boolean {
  const replaced = replacedPresetIds()
  if (!replaced.size) return false
  const id = props.item.id
  switch (props.item.section) {
    case 'buffs':
      return replaced.has(guide) && !(buffByPreset[id]?.[guide]?.length)
    case 'crystals':
      return replaced.has(guide) && !Object.keys(crystalByPreset[id]?.[guide] || {}).length
    case 'relics':
      return replaced.has(guide) && !Object.keys(relicByPreset[id]?.[guide] || {}).length
    case 'hardening':
      return replaced.has(guide) && !Object.keys(hardeningByPreset[id]?.[guide] || {}).length
    case 'morphs': {
      const morphId = morphPresetFrom(morphSpecMode.value, guide)
      if (!replaced.has(morphId)) return false
      const board = morphByPreset[id]?.[morphId]
      return !board || !Object.keys(board).length
    }
    default:
      return false
  }
}

const emptyPresetMessage = computed(() => {
  const guide = activePreset.value || 't1'
  return isGuidePresetCleared(guide) ? 'Будет очищен' : 'Пока пусто'
})

const comboLabel = computed(() => {
  const kindRaw = String(payload.value.kind || 'pvp')
  const kind = kindRaw === 'pve' ? 'ПВЕ' : 'ПВП'
  if (props.item.section === 'combo_awakening') return `Комба · пробуждение · ${kind}`
  if (props.item.section === 'combo_succession') return `Комба · наследие · ${kind}`
  return `Комба · ${kind}`
})

const videosFor = computed((): ClassVideo[] => {
  const mode =
    props.item.section === 'videos_succession' ? 'succession' : 'awakening'
  return (payload.value.videos ?? []).map((v, i) => ({
    id: `${props.item.id}-${i}`,
    class_id: '',
    title: isPlaceholderVideoTitle(v.title) ? `Видео ${i + 1}` : String(v.title).trim(),
    youtube_url: v.youtube_url,
    sort_order: i,
    mode,
    status: v.status === 'processing' ? 'processing' : 'ready',
  }))
})

function crystalPickedList(id: string) {
  const filled = crystalFilled(id)
  const counts = new Map<
    string,
    { id: string; name_ru: string; icon_url: string | null; count: number }
  >()
  for (const slot of CRYSTAL_ALL_SLOTS) {
    const item = filled[slot.id]
    if (!item) continue
    const prev = counts.get(item.id)
    if (prev) {
      prev.count += 1
    } else {
      counts.set(item.id, {
        id: item.id,
        name_ru: item.name_ru,
        icon_url: item.icon_url,
        count: 1,
      })
    }
  }
  return [...counts.values()]
}

function hardeningRows(id: string) {
  const filled = hardeningFilled(id)
  const rows: Array<{ id: string; name_ru: string; icon_url: string | null }> = []
  for (const slot of HARDENING_SLOTS) {
    const item = filled[slot.id]
    if (item) rows.push(item)
  }
  return rows
}

/** Strip catalog prefix «Камень закалки – …» for the list. */
function hardeningLabel(name: string) {
  return name.replace(/^Камень закалки\s*[–—\-]\s*/i, '').trim() || name
}
</script>

<style module>
.split {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.tabsPinned {
  flex-shrink: 0;
  align-self: start;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 0.55rem;
}

.tabRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.65rem;
  min-width: 0;
}

.clearHint {
  font-size: 0.78em;
  font-weight: 500;
  color: var(--color-muted);
  opacity: 0.9;
}

.scrollBody {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 0.15rem;
  padding-bottom: 0.35rem;
}

.comboGroup + .comboGroup {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--color-border);
}

.comboTitle {
  margin: 0 0 0.3rem;
  font-size: 0.92rem;
  font-weight: 600;
}

/* Match ClassGuidePage crystal layout (picked list + board). */
.crystalLayout {
  display: grid;
  grid-template-columns: minmax(11rem, 14rem) minmax(0, 22rem);
  gap: 0.85rem;
  align-items: stretch;
  justify-content: start;
  width: 100%;
  max-width: 100%;
}

.picked {
  min-width: 0;
  min-height: 0;
  max-height: 22rem;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
}

.pickedEmpty {
  margin: 0;
  padding: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.pickedList {
  margin: 0;
  list-style: none;
  padding: 0;
}

.pickedItem {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.4rem 0.5rem;
}

.pickedIcon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.pickedName {
  min-width: 0;
  flex: 1;
  font-size: 0.8rem;
  line-height: 1.25;
  color: var(--color-ink);
}

.pickedCount {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--color-gold);
}

.crystalStage {
  width: 22rem;
  max-width: 100%;
  min-width: 0;
  height: max-content;
  align-self: start;
  justify-self: start;
}

.relicStage {
  width: 100%;
  max-width: 18rem;
}
</style>
