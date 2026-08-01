<template>
  <div :class="$style.wrap">
    <button type="button" :class="$style.trigger" @click="open = true">
      {{ triggerLabel }}
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        :class="[$style.backdrop, obscured && $style.obscured]"
        @click.self="close"
      >
        <div
          :class="$style.modal"
          role="dialog"
          aria-modal="true"
          aria-label="Предложить инкрустацию"
        >
          <header :class="$style.head">
            <h3 :class="$style.title">Предложить инкрустацию</h3>
            <div :class="$style.presetTabs" role="tablist" aria-label="Пресет инкрустации">
              <button
                v-for="p in crystalPresets"
                :key="p.id"
                type="button"
                role="tab"
                :aria-selected="activePreset === p.id"
                :class="[$style.presetTab, activePreset === p.id && $style.presetTabOn]"
                @click="activePreset = p.id"
              >
                {{ p.label }}
              </button>
            </div>
            <button type="button" :class="$style.close" aria-label="Закрыть" @click="close">
              ×
            </button>
          </header>

          <form :class="$style.form" @submit.prevent="onSubmit">
            <input
              v-model="honeypot"
              type="text"
              name="website"
              autocomplete="off"
              tabindex="-1"
              :class="$style.honey"
              aria-hidden="true"
            >

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
                <div
                  :class="[$style.tabs, !tabsEnabled && $style.tabsOff]"
                  role="tablist"
                  aria-label="Категория кристаллов"
                >
                  <button
                    v-for="tab in crystalTabs"
                    :key="tab.id"
                    type="button"
                    role="tab"
                    :aria-selected="crystalTab === tab.id"
                    :aria-disabled="!tabsEnabled"
                    :disabled="!tabsEnabled"
                    :class="[$style.tab, crystalTab === tab.id && $style.tabOn]"
                    @click="crystalTab = tab.id"
                  >
                    {{ tab.label }}
                  </button>
                </div>

                <input
                  v-model="query"
                  type="search"
                  :class="$style.input"
                  placeholder="Название кристалла"
                  aria-label="Поиск кристалла"
                  :disabled="!activeSlot"
                >

                <div v-if="catalogPending" :class="$style.muted">Загрузка кристаллов…</div>
                <div v-else-if="catalogError" :class="$style.error">Не удалось загрузить кристаллы.</div>
                <ul v-else :class="[$style.catalog, !activeSlot && $style.catalogOff]">
                  <li v-for="item in filteredCatalog" :key="item.id">
                    <button type="button" :class="$style.catalogBtn" @click="assignCrystal(item)">
                      <img
                        v-if="item.icon_url"
                        :src="item.icon_url"
                        alt=""
                        :class="$style.icon"
                        loading="lazy"
                      >
                      <span>{{ item.name_ru }}</span>
                      <span :class="$style.add">+</span>
                    </button>
                  </li>
                </ul>
                <p
                  v-if="activeSlot && !catalogPending && !catalogError && !filteredCatalog.length"
                  :class="$style.muted"
                >
                  Нет {{
                    isDawnSlotId(activeSlot)
                      ? 'кристаллов рассвета'
                      : isCenterSlotId(activeSlot)
                        ? 'камней духов'
                        : 'кристаллов'
                  }}{{ query ? ' по поиску' : '' }}.
                </p>

                <SuperadminAuth />

                <label v-if="!isSuperadmin" :class="$style.label">
                  Игровой ник
                  <input
                    v-model="author"
                    type="text"
                    :class="$style.input"
                    maxlength="80"
                    required
                    autocomplete="nickname"
                    placeholder="Как вас зовут в игре"
                  >
                </label>

                <p v-if="formError" :class="$style.error">{{ formError }}</p>
                <p v-if="done" :class="$style.ok">{{ doneMessage }}</p>
              </div>

              <div :class="$style.actions">
                <button type="button" :class="$style.secondary" @click="close">Отмена</button>
                <button type="submit" :class="$style.primary" :disabled="submitting || done">
                  {{
                    submitting ? 'Отправка…' : isSuperadmin ? 'Опубликовать' : 'Отправить'
                  }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { fetchCrystals, type GuideItemRow, type Item } from '@/entities/class'
import { SuperadminAuth } from '@/features/superadmin-auth'
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
  useModalEscape,
  useSuperadmin,
  type CrystalPresetId,
  type CrystalTabId,
} from '@/shared/lib'
import { CrystalBoard, type CrystalFill } from '@/widgets/crystal-board'
import { submitGuideProposal } from '../api/submitProposal'

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
    triggerLabel: 'Предложить инкрустацию',
    initialCrystals: () => [],
  },
)

const { isSuperadmin, refresh: refreshAdmin } = useSuperadmin()

const open = ref(false)
const honeypot = ref('')
const author = ref('')
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
const submitting = ref(false)
const formError = ref('')
const done = ref(false)
const doneMessage = ref('')
const rightMainEl = ref<HTMLElement | null>(null)
const boardWidth = ref(360)
let rightMainObserver: ResizeObserver | null = null

const { obscured } = useModalEscape(open, close)

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

function currentSlots(): Record<string, Item> {
  return presets.value[activePreset.value]
}

function setCurrentSlots(next: Record<string, Item>) {
  presets.value = { ...presets.value, [activePreset.value]: next }
}

function syncBoardWidth() {
  const h = rightMainEl.value?.getBoundingClientRect().height ?? 0
  if (h < 120) return
  boardWidth.value = Math.max(220, Math.round((h - 20) * (6 / 7)))
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

watch(open, async (v) => {
  if (!v) {
    rightMainObserver?.disconnect()
    rightMainObserver = null
    return
  }
  formError.value = ''
  done.value = false
  hydrateFromInitial()
  await refreshAdmin()
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
})

watch([isSuperadmin, catalogPending], async () => {
  if (!open.value) return
  await nextTick()
  syncBoardWidth()
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

function reset() {
  honeypot.value = ''
  author.value = ''
  query.value = ''
  activeSlot.value = null
  activePreset.value = 't1'
  presets.value = emptyPresets()
  formError.value = ''
  done.value = false
  doneMessage.value = ''
  submitting.value = false
}

function close() {
  open.value = false
  reset()
}

async function onSubmit() {
  formError.value = ''
  if (!isSuperadmin.value && !author.value.trim()) {
    formError.value = 'Укажите игровой ник'
    return
  }
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
    return
  }

  submitting.value = true
  try {
    const res = await submitGuideProposal({
      class_slug: props.classSlug,
      section: 'crystals',
      payload: { crystals: crystalsPayload },
      author_label: author.value || undefined,
      website: honeypot.value || undefined,
    })
    done.value = true
    doneMessage.value = res.autoApproved
      ? 'Опубликовано.'
      : 'Отправлено на модерацию.'
    if (res.autoApproved) {
      setTimeout(() => {
        close()
        window.location.reload()
      }, 700)
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    formError.value = msg || 'Не удалось отправить'
  } finally {
    submitting.value = false
  }
}
</script>

<style module>
.wrap {
  display: inline-flex;
}

.trigger {
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-gold) 12%, transparent);
  color: var(--color-gold);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.7rem;
}

.trigger:hover {
  background: color-mix(in srgb, var(--color-gold) 22%, transparent);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
  transition: filter 160ms ease;
}

.obscured {
  filter: blur(10px);
  pointer-events: none;
  user-select: none;
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(100%, 84rem);
  max-height: min(94vh, 58rem);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-glow);
}

.head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.85rem 1rem;
  flex-wrap: wrap;
}

.title {
  margin: 0;
  font-size: 1.05rem;
}

.presetTabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-width: 0;
}

.presetTab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  padding: 0.32rem 0.55rem;
}

.presetTabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.close {
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  margin-left: auto;
}

.form {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
}

.honey {
  position: absolute;
  left: -9999px;
  height: 0;
  width: 0;
  opacity: 0;
}

.workspace {
  display: grid;
  grid-template-columns: auto minmax(16rem, 1fr);
  grid-template-rows: auto auto;
  gap: 0.75rem 1rem;
  align-items: start;
  min-height: 0;
  flex: 1;
}

.boardSide {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-columns: minmax(14.5rem, 18rem) auto;
  gap: 1rem;
  align-items: stretch;
  min-width: 0;
}

.picked {
  /* Height follows the board column; do not expand the row. */
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
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  min-height: 0;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.3rem;
}

.tab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.75rem;
  padding: 0.38rem 0.25rem;
}

.tabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.tabsOff {
  opacity: 0.4;
}

.tabsOff .tab {
  cursor: not-allowed;
}

.tabsOff .tabOn {
  border-color: var(--color-border);
  background: transparent;
  color: var(--color-muted);
}

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.input {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0.5rem 0.65rem;
}

.catalog {
  flex: none;
  height: min(28rem, 48vh);
  margin: 0;
  overflow: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  padding: 0;
}

.catalogOff {
  opacity: 0.45;
  pointer-events: none;
}

.catalogBtn {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  padding: 0.4rem 0.55rem;
  text-align: left;
}

.catalogBtn:hover {
  background: var(--color-gold-dim);
}

.add {
  margin-left: auto;
  color: var(--color-gold);
}

.icon {
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.actions {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.primary,
.secondary {
  border: 1px solid var(--color-border);
  cursor: pointer;
  font: inherit;
  padding: 0.45rem 0.9rem;
}

.primary {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.primary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.secondary {
  background: transparent;
  color: var(--color-muted);
}

.muted {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}

.ok {
  margin: 0;
  color: var(--color-gold-soft);
  font-size: 0.9rem;
}

@media (max-width: 900px) {
  .modal {
    width: min(100%, 42rem);
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .boardSide,
  .rightMain,
  .actions {
    grid-column: 1;
  }

  .boardSide {
    grid-template-columns: 1fr;
  }

  .picked {
    height: auto;
    min-height: 0;
    max-height: 10rem;
  }

  .left {
    justify-self: center;
  }

  .catalog {
    height: 14rem;
  }
}
</style>
