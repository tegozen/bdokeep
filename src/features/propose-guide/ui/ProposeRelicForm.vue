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
    size="xl"
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
          @select="onSelectSlot"
          @clear="clearSlot"
        />
      </div>

      <div :class="$style.rightMain">
        <UiPresetTabs
          v-model="catalogTab"
          :tabs="catalogTabs"
          aria-label="Каталог"
          size="sm"
        />

        <CatalogPicker
          v-model:query="query"
          fill
          :items="filteredCatalog"
          :pending="catalogPending"
          :error="catalogError"
          :disabled="!activeSlot"
          :catalog-off="!activeSlot"
          :placeholder="catalogTab === 'relics' ? 'Название реликвии' : 'Название камня'"
          :aria-label="catalogTab === 'relics' ? 'Поиск реликвии' : 'Поиск камня'"
          pending-text="Загрузка каталога…"
          :show-empty="
            Boolean(activeSlot) && !catalogPending && !catalogError && !filteredCatalog.length
          "
          :empty-text="
            `Нет ${catalogTab === 'relics' ? 'реликвий' : 'камней'}${query ? ' по поиску' : ''}.`
          "
          @pick="assignItem"
        />
      </div>
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  fetchLightstones,
  fetchRelics,
  type GuideItemRow,
  type Item,
} from '@/entities/class'
import {
  CRYSTAL_PRESET_IDS,
  CRYSTAL_PRESETS,
  isCrystalPresetId,
  isLightstoneSlotId,
  isRelicSlotId,
  type CrystalPresetId,
} from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { RelicBoard, type RelicFill } from '@/widgets/relic-board'
import { submitGuideProposal } from '../api/submitProposal'
import { useProposeModal } from '../lib/useProposeModal'
import CatalogPicker from './CatalogPicker.vue'
import ProposeModalShell from './ProposeModalShell.vue'

type CatalogTab = 'relics' | 'lightstones'
type PresetBoards = Record<CrystalPresetId, Record<string, Item>>

const catalogTabs = [
  { id: 'relics' as const, label: 'Реликвии' },
  { id: 'lightstones' as const, label: 'Светящиеся камни' },
]

function emptyPresets(): PresetBoards {
  return { t1: {}, t2: {}, besp: {}, sub: {} }
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
const lightstones = ref<Item[]>([])
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
  serialize: serializeState,
  onOpen: async () => {
    hydrateFromInitial()
    if (relics.value.length && lightstones.value.length) return
    catalogPending.value = true
    catalogError.value = false
    try {
      const [r, l] = await Promise.all([fetchRelics(), fetchLightstones()])
      relics.value = r
      lightstones.value = l
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

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = catalogTab.value === 'relics' ? relics.value : lightstones.value
  if (!q) return list
  return list.filter((item) => item.name_ru.toLowerCase().includes(q))
})

watch(activePreset, () => {
  activeSlot.value = null
  query.value = ''
})

function onSelectSlot(id: string) {
  activeSlot.value = id
  formError.value = ''
  if (isRelicSlotId(id)) catalogTab.value = 'relics'
  else if (isLightstoneSlotId(id)) catalogTab.value = 'lightstones'
}

function assignItem(item: Item) {
  if (!activeSlot.value) return
  const slot = activeSlot.value
  if (isRelicSlotId(slot) && catalogTab.value !== 'relics') {
    formError.value = 'Выберите реликвию из вкладки «Реликвии»'
    return
  }
  if (isLightstoneSlotId(slot) && catalogTab.value !== 'lightstones') {
    formError.value = 'Выберите камень из вкладки «Светящиеся камни»'
    return
  }
  formError.value = ''
  setCurrentSlots({ ...currentSlots(), [slot]: item })
}

function clearSlot(slotId?: string) {
  const id = slotId || activeSlot.value
  if (!id) return
  const next = { ...currentSlots() }
  delete next[id]
  setCurrentSlots(next)
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
  grid-template-columns: minmax(16rem, 28rem) minmax(16rem, 1fr);
  gap: 0.75rem 1rem;
  align-items: start;
  min-height: 0;
  flex: 1;
}

.left {
  min-width: 0;
}

.rightMain {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  min-height: 22rem;
}

@media (max-width: 820px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
