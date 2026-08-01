<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить инкрустацию"
    :trigger-label="triggerLabel"
    :submitting="submitting"
    :form-error="formError"
    :obscured="obscured"
    :is-superadmin="isSuperadmin"
    :request-close="requestClose"
    size="xxl"
    @submit="onSubmit"
  >
    <template #headerExtra>
      <UiPresetTabs
        v-model="activePreset"
        :tabs="crystalPresets"
        aria-label="Пресет инкрустации"
      />
    </template>

    <div :class="$style.workspace">
      <div :class="$style.boardSide">
        <div :class="$style.picked">
          <p v-if="!pickedList.length" :class="$style.pickedEmpty">Пока пусто</p>
          <ul v-else :class="$style.pickedList">
            <li v-for="row in pickedList" :key="row.id" :class="$style.pickedItem">
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

        <div :class="$style.left">
          <CrystalBoard
            :filled="filledMap"
            :selected-id="activeSlot"
            interactive
            fill
            :fill-width="boardWidth"
            @select="onSelectSlot"
            @clear="clearSlot"
          />
        </div>
      </div>

      <div ref="rightMainEl" :class="$style.rightMain">
        <UiPresetTabs
          v-model="crystalTab"
          :tabs="crystalTabs"
          aria-label="Категория кристаллов"
          :disabled="!tabsEnabled"
          auto-fit
        />

        <CatalogPicker
          v-model:query="query"
          tall
          :items="filteredCatalog"
          :pending="catalogPending"
          :error="catalogError"
          :disabled="!activeSlot"
          :catalog-off="!activeSlot"
          placeholder="Название кристалла"
          aria-label="Поиск кристалла"
          pending-text="Загрузка кристаллов…"
          error-text="Не удалось загрузить кристаллы."
          :show-empty="
            Boolean(activeSlot) && !catalogPending && !catalogError && !filteredCatalog.length
          "
          :empty-text="emptyCatalogText"
          @pick="assignCrystal"
        />
      </div>
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { fetchCrystals, type GuideItemRow, type Item } from '@/entities/class'
import {
  CRYSTAL_ALL_SLOTS,
  CRYSTAL_PRESETS,
  CRYSTAL_PRESET_IDS,
  CRYSTAL_TABS,
  crystalCatalogTab,
  isCenterSlotId,
  isCrystalPresetId,
  isDawnCrystalName,
  isDawnSlotId,
  isSpiritCrystalName,
  type CrystalPresetId,
  type CrystalTabId,
} from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { CrystalBoard, type CrystalFill } from '@/widgets/crystal-board'
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
    initialCrystals?: GuideItemRow[]
  }>(),
  {
    triggerLabel: 'Предложить',
    initialCrystals: () => [],
  },
)

const query = ref('')
const crystalTab = ref<CrystalTabId>('basic')
const crystalTabs = CRYSTAL_TABS
const crystalPresets = CRYSTAL_PRESETS
const activePreset = ref<CrystalPresetId>('t1')
const activeSlot = ref<string | null>(null)
const presets = ref<PresetBoards>(emptyPresets())
const crystals = ref<Item[]>([])
const catalogPending = ref(false)
const catalogError = ref(false)
const rightMainEl = ref<HTMLElement | null>(null)
const boardWidth = ref(360)
let rightMainObserver: ResizeObserver | null = null

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
  for (const row of props.initialCrystals ?? []) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.slot || !row.items) continue
    next[presetRaw][row.slot] = row.items
  }
  presets.value = next
  activePreset.value = 't1'
}

function syncBoardWidth() {
  // Defer geometric read past style invalidation (ResizeObserver / forced reflow).
  requestAnimationFrame(() => {
    const h = rightMainEl.value?.getBoundingClientRect().height ?? 0
    if (h < 120) return
    boardWidth.value = Math.max(220, Math.round((h - 20) * (6 / 7)))
  })
}

function bindRightMainObserver() {
  rightMainObserver?.disconnect()
  rightMainObserver = null
  const el = rightMainEl.value
  if (!el || typeof ResizeObserver === 'undefined') {
    syncBoardWidth()
    return
  }
  rightMainObserver = new ResizeObserver(() => syncBoardWidth())
  rightMainObserver.observe(el)
  syncBoardWidth()
}

onBeforeUnmount(() => {
  rightMainObserver?.disconnect()
  rightMainObserver = null
})

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
    await nextTick()
    bindRightMainObserver()
    if (!crystals.value.length) {
      catalogPending.value = true
      catalogError.value = false
      try {
        crystals.value = await fetchCrystals()
      } catch {
        catalogError.value = true
      } finally {
        catalogPending.value = false
        await nextTick()
        syncBoardWidth()
      }
    }
  },
  onReset: () => {
    query.value = ''
    activeSlot.value = null
    activePreset.value = 't1'
    presets.value = emptyPresets()
    rightMainObserver?.disconnect()
    rightMainObserver = null
  },
})

watch([isSuperadmin, catalogPending], async () => {
  if (!open.value) return
  await nextTick()
  syncBoardWidth()
})

watch(activePreset, () => {
  activeSlot.value = null
  query.value = ''
})

function currentSlots(): Record<string, Item> {
  return presets.value[activePreset.value]
}

function setCurrentSlots(next: Record<string, Item>) {
  presets.value = { ...presets.value, [activePreset.value]: next }
}

const filledMap = computed(() => {
  const map: Record<string, CrystalFill> = {}
  for (const [id, item] of Object.entries(currentSlots())) {
    map[id] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
  }
  return map
})

const pickedList = computed(() => {
  const counts = new Map<string, { id: string; name_ru: string; icon_url: string | null; count: number }>()
  for (const slot of CRYSTAL_ALL_SLOTS) {
    const item = currentSlots()[slot.id]
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
})

const tabsEnabled = computed(() => {
  const slot = activeSlot.value
  if (!slot) return true
  return !isDawnSlotId(slot) && !isCenterSlotId(slot)
})

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  const slot = activeSlot.value
  const dawnSlot = slot ? isDawnSlotId(slot) : false
  const centerSlot = slot ? isCenterSlotId(slot) : false
  return crystals.value.filter((c) => {
    const isDawn = isDawnCrystalName(c.name_ru)
    const isSpirit = isSpiritCrystalName(c.name_ru)
    if (dawnSlot) {
      if (!isDawn) return false
    } else if (centerSlot) {
      if (!isSpirit) return false
    } else if (isDawn || isSpirit) {
      return false
    } else if (crystalCatalogTab(c.name_ru) !== crystalTab.value) {
      return false
    }
    if (!q) return true
    return c.name_ru.toLowerCase().includes(q)
  })
})

const emptyCatalogText = computed(() => {
  const kind = activeSlot.value
    ? isDawnSlotId(activeSlot.value)
      ? 'кристаллов рассвета'
      : isCenterSlotId(activeSlot.value)
        ? 'камней духов'
        : 'кристаллов'
    : 'кристаллов'
  return `Нет ${kind}${query.value ? ' по поиску' : ''}.`
})

function onSelectSlot(id: string) {
  activeSlot.value = id
  formError.value = ''
}

function assignCrystal(item: Item) {
  if (!activeSlot.value) return
  const dawnSlot = isDawnSlotId(activeSlot.value)
  const centerSlot = isCenterSlotId(activeSlot.value)
  const dawnItem = isDawnCrystalName(item.name_ru)
  const spiritItem = isSpiritCrystalName(item.name_ru)

  if (dawnSlot && !dawnItem) {
    formError.value = 'В этот слот можно только кристалл рассвета'
    return
  }
  if (centerSlot && !spiritItem) {
    formError.value = 'В центральный слот можно только камень / кристалл духа'
    return
  }
  if (!dawnSlot && dawnItem) {
    formError.value = 'Кристалл рассвета только в нижние слоты'
    return
  }
  if (!centerSlot && spiritItem) {
    formError.value = 'Камень духов только в центральный слот'
    return
  }

  formError.value = ''
  setCurrentSlots({ ...currentSlots(), [activeSlot.value]: item })
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
    const crystalsPayload: Array<{
      preset: CrystalPresetId
      slot: string
      item_id: string
      sort_order: number
    }> = []
    let order = 0
    for (const preset of CRYSTAL_PRESET_IDS) {
      for (const [slot, item] of Object.entries(presets.value[preset])) {
        crystalsPayload.push({
          preset,
          slot,
          item_id: item.id,
          sort_order: order++,
        })
      }
    }
    if (!crystalsPayload.length) {
      formError.value = 'Заполните хотя бы один слот'
      return null
    }
    return submitGuideProposal({
      class_slug: props.classSlug,
      section: 'crystals',
      payload: { crystals: crystalsPayload },
      author_label: author.value || undefined,
      website: honeypot.value || undefined,
    })
  })
}
</script>

<style module>
.workspace {
  display: grid;
  grid-template-columns: auto minmax(16rem, 1fr);
  gap: 0.75rem 1rem;
  align-items: start;
  min-height: 0;
  flex: 1;
}

.boardSide {
  display: grid;
  grid-template-columns: minmax(14.5rem, 18rem) auto;
  gap: 1rem;
  align-items: stretch;
  min-width: 0;
}

.picked {
  height: 0;
  min-height: 100%;
  min-width: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
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

.left {
  min-width: 0;
  justify-self: start;
}

.rightMain {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  min-height: 0;
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .boardSide {
    grid-template-columns: 1fr;
  }
}
</style>
