<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить реликвии"
    :trigger-label="triggerLabel"
    :submitting="submitting"
    :form-error="formError"
    :obscured="obscured"
    :is-superadmin="isSuperadmin"
    :request-close="requestClose"
    size="lg"
    fill-body
    @submit="onSubmit"
  >
    <template #headerExtra>
      <UiPresetTabs
        v-model="activePreset"
        :tabs="guidePresets"
        aria-label="Пресет реликвий"
      />
    </template>

    <div :class="$style.workspace">
      <div :class="$style.left">
        <RelicBoard
          :filled="filledMap"
          :selected-id="activeSlot"
          interactive
          lightstones-as-set
          @select="onSelectSlot"
        />
      </div>

      <div :class="$style.rightMain">
        <CatalogPicker
          v-if="catalogTab === 'relics'"
          v-model:query="query"
          fill
          :items="filteredRelics"
          :pending="catalogPending"
          :error="catalogError"
          :disabled="!relicSlotSelected"
          :catalog-off="!relicSlotSelected"
          placeholder="Название реликвии"
          aria-label="Поиск реликвии"
          pending-text="Загрузка каталога…"
          :show-empty="
            Boolean(relicSlotSelected) &&
              !catalogPending &&
              !catalogError &&
              !filteredRelics.length
          "
          :empty-text="`Нет реликвий${query ? ' по поиску' : ''}.`"
          @pick="assignRelic"
        >
          <template #tabs>
            <UiPresetTabs
              v-model="catalogTab"
              :tabs="catalogTabs"
              aria-label="Каталог"
              size="sm"
            />
          </template>
        </CatalogPicker>

        <LightstoneSetPicker
          v-else
          v-model:query="query"
          fill
          :sets="lightstoneSets"
          :pending="catalogPending"
          :error="catalogError"
          placeholder="Поиск набора"
          aria-label="Поиск набора камней"
          pending-text="Загрузка наборов…"
          :empty-text="`Нет наборов${query ? ' по поиску' : ''}.`"
          @apply="applySet"
        >
          <template #tabs>
            <UiPresetTabs
              v-model="catalogTab"
              :tabs="catalogTabs"
              aria-label="Каталог"
              size="sm"
            />
          </template>
        </LightstoneSetPicker>
      </div>
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  fetchLightstoneSets,
  fetchRelics,
  type GuideItemRow,
  type Item,
  type LightstoneSet,
  type LightstoneSetStone,
} from '@/entities/class'
import {
  CRYSTAL_PRESET_IDS,
  CRYSTAL_PRESETS,
  isCrystalPresetId,
  isLightstoneSlotId,
  isRelicSlotId,
  LIGHTSTONE_SLOT_IDS,
  type CrystalPresetId,
} from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { RelicBoard, type RelicFill } from '@/widgets/relic-board'
import { submitGuideProposal } from '../api/submitProposal'
import { useProposeModal } from '../lib/useProposeModal'
import CatalogPicker from './CatalogPicker.vue'
import LightstoneSetPicker from './LightstoneSetPicker.vue'
import ProposeModalShell from './ProposeModalShell.vue'

type CatalogTab = 'relics' | 'sets'
type PresetBoards = Record<CrystalPresetId, Record<string, Item>>

const catalogTabs = [
  { id: 'relics' as const, label: 'Реликвии' },
  { id: 'sets' as const, label: 'Наборы' },
]

function emptyPresets(): PresetBoards {
  return { t1: {}, t2: {}, besp: {}, sub: {} }
}

function stoneToItem(stone: LightstoneSetStone): Item {
  return {
    id: stone.id,
    name_ru: stone.name_ru,
    icon_url: stone.icon_url,
    item_type: 'lightstone',
  }
}

const props = withDefaults(
  defineProps<{
    classSlug: string
    triggerLabel?: string
    initialRelics?: GuideItemRow[]
    initialLightstones?: GuideItemRow[]
  }>(),
  {
    triggerLabel: 'Предложить',
    initialRelics: () => [],
    initialLightstones: () => [],
  },
)

const query = ref('')
const catalogTab = ref<CatalogTab>('relics')
const guidePresets = CRYSTAL_PRESETS
const activePreset = ref<CrystalPresetId>('t1')
const activeSlot = ref<string | null>(null)
const presets = ref<PresetBoards>(emptyPresets())
const relics = ref<Item[]>([])
const lightstoneSets = ref<LightstoneSet[]>([])
const catalogPending = ref(false)
const catalogError = ref(false)

function serializeState() {
  return JSON.stringify(
    Object.fromEntries(
      CRYSTAL_PRESET_IDS.map((p) => [
        p,
        Object.fromEntries(
          Object.entries(presets.value[p]).map(([slot, item]) => [slot, item.id]),
        ),
      ]),
    ),
  )
}

function hydrateFromInitial() {
  const next = emptyPresets()
  for (const row of props.initialRelics ?? []) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.slot || !row.items) continue
    if (!isRelicSlotId(row.slot)) continue
    next[presetRaw][row.slot] = row.items
  }
  for (const row of props.initialLightstones ?? []) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.slot || !row.items) continue
    if (!isLightstoneSlotId(row.slot)) continue
    next[presetRaw][row.slot] = row.items
  }
  presets.value = next
  activePreset.value = 't1'
}

const {
  open,
  honeypot,
  author,
  submitting,
  formError,
  obscured,
  requestClose,
  isSuperadmin,
  runSubmit,
} = useProposeModal({
  classSlug: () => props.classSlug,
  serialize: serializeState,
  onOpen: async () => {
    hydrateFromInitial()
    if (relics.value.length && lightstoneSets.value.length) return
    catalogPending.value = true
    catalogError.value = false
    try {
      const [r, sets] = await Promise.all([fetchRelics(), fetchLightstoneSets()])
      relics.value = r
      lightstoneSets.value = sets
    } catch {
      catalogError.value = true
    } finally {
      catalogPending.value = false
    }
  },
  onReset: () => {
    query.value = ''
    activeSlot.value = null
    catalogTab.value = 'relics'
    activePreset.value = 't1'
    presets.value = emptyPresets()
  },
})

function currentSlots(): Record<string, Item> {
  return presets.value[activePreset.value]
}

function setCurrentSlots(next: Record<string, Item>) {
  presets.value = { ...presets.value, [activePreset.value]: next }
}

const filledMap = computed(() => {
  const map: Record<string, RelicFill> = {}
  for (const [id, item] of Object.entries(currentSlots())) {
    map[id] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
  }
  return map
})

const relicSlotSelected = computed(
  () => Boolean(activeSlot.value && isRelicSlotId(activeSlot.value)),
)

const filteredRelics = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return relics.value
  return relics.value.filter((item) => item.name_ru.toLowerCase().includes(q))
})

watch(activePreset, () => {
  activeSlot.value = null
  query.value = ''
})

watch(catalogTab, () => {
  query.value = ''
})

function onSelectSlot(id: string) {
  activeSlot.value = id
  formError.value = ''
  if (isRelicSlotId(id)) catalogTab.value = 'relics'
  else if (isLightstoneSlotId(id)) catalogTab.value = 'sets'
}

function assignRelic(item: Item) {
  if (!activeSlot.value || !isRelicSlotId(activeSlot.value)) {
    formError.value = 'Выберите слот реликвии на доске'
    return
  }
  formError.value = ''
  setCurrentSlots({ ...currentSlots(), [activeSlot.value]: item })
}

function applySet(set: LightstoneSet, variant: 'normal' | 'enhanced') {
  const stones = variant === 'enhanced' ? set.enhanced : set.normal
  if (!stones.length) {
    formError.value = 'В наборе нет камней (каталог неполный)'
    return
  }
  formError.value = ''
  const next = { ...currentSlots() }
  for (const slot of LIGHTSTONE_SLOT_IDS) delete next[slot]
  const limit = Math.min(stones.length, LIGHTSTONE_SLOT_IDS.length)
  for (let i = 0; i < limit; i++) {
    const slot = LIGHTSTONE_SLOT_IDS[i]
    const stone = stones[i]
    if (!slot || !stone) continue
    next[slot] = stoneToItem(stone)
  }
  setCurrentSlots(next)
  catalogTab.value = 'sets'
  activeSlot.value = null
}

async function onSubmit() {
  await runSubmit(async () => {
    const relicsPayload: Array<{
      preset: CrystalPresetId
      slot: string
      item_id: string
      sort_order: number
    }> = []
    const lightstonesPayload: Array<{
      preset: CrystalPresetId
      slot: string
      item_id: string
      sort_order: number
    }> = []
    let order = 0
    for (const preset of CRYSTAL_PRESET_IDS) {
      for (const [slot, item] of Object.entries(presets.value[preset])) {
        if (isRelicSlotId(slot)) {
          relicsPayload.push({
            preset,
            slot,
            item_id: item.id,
            sort_order: order++,
          })
        } else if (isLightstoneSlotId(slot)) {
          lightstonesPayload.push({
            preset,
            slot,
            item_id: item.id,
            sort_order: order++,
          })
        }
      }
    }
    if (!relicsPayload.length && !lightstonesPayload.length) {
      formError.value = 'Заполните хотя бы один слот'
      return null
    }
    return submitGuideProposal({
      class_slug: props.classSlug,
      section: 'relics',
      payload: { relics: relicsPayload, lightstones: lightstonesPayload },
      author_label: author.value || undefined,
      website: honeypot.value || undefined,
    })
  })
}
</script>

<style module>
.workspace {
  display: grid;
  grid-template-columns: minmax(14rem, 18rem) minmax(14rem, 1fr);
  gap: 0.75rem 1rem;
  align-items: stretch;
  min-height: 0;
  flex: 1 1 0;
  overflow: hidden;
}

.left {
  min-width: 0;
  min-height: 0;
}

.rightMain {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  min-height: 0;
  flex: 1 1 0;
  overflow: hidden;
}

@media (max-width: 820px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
