<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить закалки"
    :trigger-label="triggerLabel"
    :submitting="submitting"
    :form-error="formError"
    :is-superadmin="isSuperadmin"
    :request-close="requestClose"
    size="xl"
    @submit="onSubmit"
  >
    <template #headerExtra>
      <div :class="presetTools.headerTools">
        <UiPresetTabs
          v-model="activePreset"
          :tabs="guidePresets"
          aria-label="Пресет закалок"
        />
        <ProposeCopyFromPreset
          :target-preset="activePreset"
          :target-has-content="Object.keys(currentSlots()).length > 0"
          :is-empty="isPresetEmpty"
          size="lg"
          @copy="copyFromPreset"
        >
          <template #default="{ preset }">
            <div :class="presetTools.copyPreview">
              <HardeningBoard :filled="filledMapForBoard(presets[preset])" list-only fill />
            </div>
          </template>
        </ProposeCopyFromPreset>
        <ProposeCopyFromClass
          :exclude-class-slug="classSlug"
          :target-preset="activePreset"
          :target-has-content="Object.keys(currentSlots()).length > 0"
          section="hardening"
          size="lg"
          @copy="copyFromClass"
        >
          <template #default="{ board }">
            <div :class="presetTools.copyPreview">
              <HardeningBoard :filled="filledMapForBoard(asItemBoard(board))" list-only fill />
            </div>
          </template>
        </ProposeCopyFromClass>
      </div>
    </template>

    <div :class="$style.workspace">
      <HardeningBoard
        :filled="filledMap"
        :selected-id="activeSlot"
        interactive
        slots-only
        @select="onSelectSlot"
        @clear="clearSlot"
      />

      <div :class="$style.panels">
        <HardeningBoard list-only fill :filled="filledMap" />
        <CatalogPicker
          v-model:query="query"
          fill
          :items="filteredCatalog"
          :pending="catalogPending"
          :error="catalogError"
          :disabled="!activeSlot"
          :catalog-off="!activeSlot"
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
  CRYSTAL_PRESET_IDS,
  CRYSTAL_PRESETS,
  HARDENING_SLOT_IDS,
  HardeningBoard,
  fetchHardening,
  isHardeningSlotId,
  type CrystalPresetId,
  type HardeningFill,
  type Item,
} from '@/entities/catalog'
import type { GuideItemRow } from '@/entities/class'
import { UiPresetTabs } from '@/shared/ui'
import { submitGuideProposal } from '../api/submitProposal'
import { cloneItemBoard, fullReplacedPresets } from '../lib/clonePresetData'
import {
  emptyItemPresetBoards,
  extractHardeningPresets,
  type BuffPickItem,
  type ItemPresetBoards,
} from '../lib/extractGuideSectionPresets'
import { useProposeModal } from '../lib/useProposeModal'
import CatalogPicker from './CatalogPicker.vue'
import ProposeCopyFromClass from './ProposeCopyFromClass.vue'
import ProposeCopyFromPreset from './ProposeCopyFromPreset.vue'
import ProposeModalShell from './ProposeModalShell.vue'
import presetTools from './proposePresetTools.module.css'

type PresetBoards = ItemPresetBoards

function emptyPresets(): PresetBoards {
  return emptyItemPresetBoards()
}

function asItemBoard(board: Record<string, Item> | BuffPickItem[]): Record<string, Item> {
  return Array.isArray(board) ? {} : board
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
  presets.value = extractHardeningPresets(props.initialHardening ?? [])
  activePreset.value = 't1'
}

const {
  open,
  honeypot,
  author,
  submitting,
  formError,
  requestClose,
  isSuperadmin,
  openModal,
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

defineExpose({ openModal })

function currentSlots(): Record<string, Item> {
  return presets.value[activePreset.value]
}

function setCurrentSlots(next: Record<string, Item>) {
  presets.value = { ...presets.value, [activePreset.value]: next }
}

function isPresetEmpty(preset: CrystalPresetId) {
  return Object.keys(presets.value[preset]).length === 0
}

function filledMapForBoard(board: Record<string, Item>): Record<string, HardeningFill> {
  const map: Record<string, HardeningFill> = {}
  for (const [id, item] of Object.entries(board)) {
    map[id] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
  }
  return map
}

function copyFromPreset(source: CrystalPresetId) {
  setCurrentSlots(cloneItemBoard(presets.value[source]))
  activeSlot.value = null
  query.value = ''
  formError.value = ''
}

function copyFromClass(board: Record<string, Item> | BuffPickItem[]) {
  if (Array.isArray(board)) return
  setCurrentSlots(cloneItemBoard(board))
  activeSlot.value = null
  query.value = ''
  formError.value = ''
}

const filledMap = computed(() => filledMapForBoard(presets.value[activePreset.value]))

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
      payload: {
        hardening: hardeningPayload,
        replaced_presets: fullReplacedPresets(CRYSTAL_PRESET_IDS),
      },
      author_label: author.value || undefined,
      website: honeypot.value || undefined,
    })
  })
}
</script>

<style module>
.workspace {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  flex: 1;
}

.panels {
  display: grid;
  grid-template-columns: minmax(14rem, 18rem) minmax(14rem, 1fr);
  gap: 0.75rem 1rem;
  align-items: stretch;
  min-height: 16rem;
  height: 16rem;
  max-height: 16rem;
  min-width: 0;
}

@media (max-width: 820px) {
  .panels {
    grid-template-columns: 1fr;
    height: auto;
    max-height: none;
  }
}
</style>
