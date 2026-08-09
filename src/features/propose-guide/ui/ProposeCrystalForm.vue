<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить инкрустацию"
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
          :tabs="crystalPresets"
          aria-label="Пресет инкрустации"
        />
        <ProposeCopyFromPreset
          :target-preset="activePreset"
          :target-has-content="Object.keys(currentSlots()).length > 0"
          :is-empty="isPresetEmpty"
          size="lg"
          @copy="copyFromPreset"
        >
          <template #default="{ preset }">
            <div :class="$style.copyPreview">
              <div :class="$style.copyPicked">
                <p v-if="!pickedListForBoard(presets[preset]).length" :class="$style.pickedEmpty">Пока пусто</p>
                <ul v-else :class="$style.pickedList">
                  <li
                    v-for="row in pickedListForBoard(presets[preset])"
                    :key="row.id"
                    :class="$style.pickedItem"
                  >
                    <img
                      v-if="row.icon_url"
                      :src="codexIconSrc(row.icon_url) || undefined"
                      alt=""
                      :class="$style.pickedIcon"
                      loading="lazy"
                    >
                    <span :class="$style.pickedName">{{ row.name_ru }}</span>
                    <span v-if="row.count > 1" :class="$style.pickedCount">×{{ row.count }}</span>
                  </li>
                </ul>
              </div>
              <div :class="$style.copyBoard">
                <CrystalBoard :filled="filledMapForBoard(presets[preset])" />
              </div>
            </div>
          </template>
        </ProposeCopyFromPreset>
        <ProposeCopyFromClass
          :exclude-class-slug="classSlug"
          :target-preset="activePreset"
          :target-has-content="Object.keys(currentSlots()).length > 0"
          section="crystals"
          size="lg"
          @copy="copyFromClass"
        >
          <template #default="{ board }">
            <div :class="$style.copyPreview">
              <div :class="$style.copyPicked">
                <p v-if="!pickedListForBoard(asItemBoard(board)).length" :class="$style.pickedEmpty">Пока пусто</p>
                <ul v-else :class="$style.pickedList">
                  <li
                    v-for="row in pickedListForBoard(asItemBoard(board))"
                    :key="row.id"
                    :class="$style.pickedItem"
                  >
                    <img
                      v-if="row.icon_url"
                      :src="codexIconSrc(row.icon_url) || undefined"
                      alt=""
                      :class="$style.pickedIcon"
                      loading="lazy"
                    >
                    <span :class="$style.pickedName">{{ row.name_ru }}</span>
                    <span v-if="row.count > 1" :class="$style.pickedCount">×{{ row.count }}</span>
                  </li>
                </ul>
              </div>
              <div :class="$style.copyBoard">
                <CrystalBoard :filled="filledMapForBoard(asItemBoard(board))" />
              </div>
            </div>
          </template>
        </ProposeCopyFromClass>
      </div>
    </template>

    <div :class="$style.workspace">
      <div :class="$style.boardSide">
        <div :class="$style.picked">
          <p v-if="!pickedList.length" :class="$style.pickedEmpty">Пока пусто</p>
          <ul v-else :class="$style.pickedList">
            <li v-for="row in pickedList" :key="row.id" :class="$style.pickedItem">
              <img
                v-if="row.icon_url"
                :src="codexIconSrc(row.icon_url) || undefined"
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
        <CatalogPicker
          v-model:query="query"
          fill
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
import {
  CRYSTAL_ALL_SLOTS,
  CRYSTAL_PRESETS,
  CRYSTAL_PRESET_IDS,
  CrystalBoard,
  fetchCrystals,
  isCenterSlotId,
  isDawnCrystalName,
  isDawnSlotId,
  isSpiritCrystalName,
  type CrystalFill,
  type CrystalPresetId,
  type Item,
} from '@/entities/catalog'
import type { GuideItemRow } from '@/entities/class'
import { codexIconSrc } from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { submitGuideProposal } from '../api/submitProposal'
import { cloneItemBoard, fullReplacedPresets } from '../lib/clonePresetData'
import {
  emptyItemPresetBoards,
  extractCrystalPresets,
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
    initialCrystals?: GuideItemRow[]
  }>(),
  {
    triggerLabel: 'Предложить',
    initialCrystals: () => [],
  },
)

const query = ref('')
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
  presets.value = extractCrystalPresets(props.initialCrystals ?? [])
  activePreset.value = 't1'
}

function syncBoardWidth() {
  // Defer geometric read past style invalidation (ResizeObserver / forced reflow).
  requestAnimationFrame(() => {
    const h = rightMainEl.value?.getBoundingClientRect().height ?? 0
    if (h < 120) return
    // Stable board size — not driven by catalog filter height swings.
    boardWidth.value = Math.min(340, Math.max(240, Math.round((h - 20) * (6 / 7))))
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
  requestClose,
  isSuperadmin,
  openModal,
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

defineExpose({ openModal })

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

function isPresetEmpty(preset: CrystalPresetId) {
  return Object.keys(presets.value[preset]).length === 0
}

function filledMapForBoard(board: Record<string, Item>): Record<string, CrystalFill> {
  const map: Record<string, CrystalFill> = {}
  for (const [id, item] of Object.entries(board)) {
    map[id] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
  }
  return map
}

function pickedListForBoard(board: Record<string, Item>) {
  const counts = new Map<string, { id: string; name_ru: string; icon_url: string | null; count: number }>()
  for (const slot of CRYSTAL_ALL_SLOTS) {
    const item = board[slot.id]
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

const pickedList = computed(() => pickedListForBoard(presets.value[activePreset.value]))

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
      payload: {
        crystals: crystalsPayload,
        replaced_presets: fullReplacedPresets(CRYSTAL_PRESET_IDS),
      },
      author_label: author.value || undefined,
      website: honeypot.value || undefined,
    })
  })
}
</script>

<style module>
.copyPreview {
  display: grid;
  grid-template-columns: 12rem 16rem;
  grid-template-rows: minmax(0, 1fr);
  gap: 0.75rem;
  align-items: stretch;
  box-sizing: border-box;
  width: max-content;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.copyPicked {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
}

.copyBoard {
  width: 16rem;
  max-width: 100%;
  align-self: start;
  min-height: 0;
}

.workspace {
  display: grid;
  /* boardSide sizes to content; catalog takes leftover modal width */
  grid-template-columns: auto minmax(20rem, 1fr);
  gap: 0.75rem 1rem;
  align-items: stretch;
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.boardSide {
  display: grid;
  grid-template-columns: minmax(12rem, 15rem) auto;
  gap: 0.85rem;
  align-items: stretch;
  min-width: 0;
  max-width: 100%;
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
  width: 100%;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .boardSide {
    grid-template-columns: 1fr;
  }

  .copyPreview {
    grid-template-columns: 1fr;
    width: 100%;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    overflow: auto;
  }

  .copyBoard {
    width: min(16rem, 100%);
  }
}
</style>
