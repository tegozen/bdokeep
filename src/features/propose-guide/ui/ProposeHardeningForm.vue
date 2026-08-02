<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить закалки"
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
        aria-label="Пресет закалок"
      />
    </template>

    <div :class="$style.workspace">
      <div :class="$style.left">
        <HardeningBoard
          :filled="filledMap"
          :selected-id="activeSlot"
          interactive
          @select="onSelectSlot"
          @clear="clearSlot"
        />
      </div>

      <div :class="$style.rightMain">
        <CatalogPicker
          v-model:query="query"
          :items="filteredCatalog"
          :pending="catalogPending"
          :error="catalogError"
          :disabled="!activeSlot"
          :catalog-off="!activeSlot"
          :catalog-class="$style.catalogFixed"
          placeholder="Название камня закалки"
          aria-label="Поиск камня закалки"
          pending-text="Загрузка каталога…"
          :show-empty="
            Boolean(activeSlot) && !catalogPending && !catalogError && !filteredCatalog.length
          "
          empty-text="Нет камней закалки по поиску."
          @pick="assignItem"
        />
      </div>
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  fetchHardening,
  type GuideItemRow,
  type Item,
} from '@/entities/class'
import {
  CRYSTAL_PRESET_IDS,
  CRYSTAL_PRESETS,
  HARDENING_SLOT_IDS,
  isCrystalPresetId,
  isHardeningSlotId,
  type CrystalPresetId,
} from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { HardeningBoard, type HardeningFill } from '@/widgets/hardening-board'
import { submitGuideProposal } from '../api/submitProposal'
import { useProposeModal } from '../lib/useProposeModal'
import CatalogPicker from './CatalogPicker.vue'
import ProposeModalShell from './ProposeModalShell.vue'

type PresetBoards = Record<CrystalPresetId, Record<string, Item>>

function emptyPresets(): PresetBoards {
  return { t1: {}, t2: {}, besp: {}, sub: {} }
}

const props = withDefaults(
  defineProps<{
    classSlug: string
    triggerLabel?: string
    initialHardening?: GuideItemRow[]
  }>(),
  {
    triggerLabel: 'Предложить',
    initialHardening: () => [],
  },
)

const query = ref('')
const guidePresets = CRYSTAL_PRESETS
const activePreset = ref<CrystalPresetId>('t1')
const activeSlot = ref<string | null>(null)
const presets = ref<PresetBoards>(emptyPresets())
const catalog = ref<Item[]>([])
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
  for (const row of props.initialHardening ?? []) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.slot || !row.items) continue
    if (!isHardeningSlotId(row.slot)) continue
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
    if (catalog.value.length) return
    catalogPending.value = true
    catalogError.value = false
    try {
      catalog.value = await fetchHardening()
    } catch {
      catalogError.value = true
    } finally {
      catalogPending.value = false
    }
  },
  onReset: () => {
    query.value = ''
    activeSlot.value = null
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
  const map: Record<string, HardeningFill> = {}
  for (const [id, item] of Object.entries(currentSlots())) {
    map[id] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
  }
  return map
})

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  const usedIds = new Set(Object.values(currentSlots()).map((i) => i.id))
  const list = catalog.value.filter((item) => !usedIds.has(item.id) || (
    activeSlot.value && currentSlots()[activeSlot.value]?.id === item.id
  ))
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
}

function assignItem(item: Item) {
  if (!activeSlot.value || !isHardeningSlotId(activeSlot.value)) return
  const slot = activeSlot.value
  const current = currentSlots()
  for (const [otherSlot, other] of Object.entries(current)) {
    if (otherSlot !== slot && other.id === item.id) {
      formError.value = 'Этот камень уже стоит в другом слоте'
      return
    }
  }
  formError.value = ''
  setCurrentSlots({ ...current, [slot]: item })
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
    const hardeningPayload: Array<{
      preset: CrystalPresetId
      slot: string
      item_id: string
      sort_order: number
    }> = []
    let order = 0
    for (const preset of CRYSTAL_PRESET_IDS) {
      for (const slot of HARDENING_SLOT_IDS) {
        const item = presets.value[preset][slot]
        if (!item) continue
        hardeningPayload.push({
          preset,
          slot,
          item_id: item.id,
          sort_order: order++,
        })
      }
    }
    if (!hardeningPayload.length) {
      formError.value = 'Заполните хотя бы один слот'
      return null
    }
    return submitGuideProposal({
      class_slug: props.classSlug,
      section: 'hardening',
      payload: { hardening: hardeningPayload },
      author_label: author.value || undefined,
      website: honeypot.value || undefined,
    })
  })
}
</script>

<style module>
.workspace {
  display: grid;
  grid-template-columns: minmax(14rem, 22rem) minmax(16rem, 1fr);
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
  min-height: 0;
}

/* Fixed catalog box — scroll here so the modal height stays put. */
.catalogFixed {
  flex: none !important;
  height: 14rem !important;
  max-height: 14rem !important;
  min-height: 14rem !important;
  overflow: auto !important;
}

@media (max-width: 820px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
