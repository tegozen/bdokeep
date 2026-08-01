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
          aria-label="Предложить реликвии"
        >
          <header :class="$style.head">
            <h3 :class="$style.title">Предложить реликвии</h3>
            <div :class="$style.presetTabs" role="tablist" aria-label="Пресет реликвий">
              <button
                v-for="p in guidePresets"
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
                <div :class="$style.tabs" role="tablist" aria-label="Каталог">
                  <button
                    type="button"
                    role="tab"
                    :aria-selected="catalogTab === 'relics'"
                    :class="[$style.tab, catalogTab === 'relics' && $style.tabOn]"
                    @click="catalogTab = 'relics'"
                  >
                    Реликвии
                  </button>
                  <button
                    type="button"
                    role="tab"
                    :aria-selected="catalogTab === 'lightstones'"
                    :class="[$style.tab, catalogTab === 'lightstones' && $style.tabOn]"
                    @click="catalogTab = 'lightstones'"
                  >
                    Светящиеся камни
                  </button>
                </div>

                <input
                  v-model="query"
                  type="search"
                  :class="$style.input"
                  :placeholder="
                    catalogTab === 'relics' ? 'Название реликвии' : 'Название камня'
                  "
                  :aria-label="catalogTab === 'relics' ? 'Поиск реликвии' : 'Поиск камня'"
                  :disabled="!activeSlot"
                >

                <div v-if="catalogPending" :class="$style.muted">Загрузка каталога…</div>
                <div v-else-if="catalogError" :class="$style.error">
                  Не удалось загрузить каталог.
                </div>
                <ul v-else :class="[$style.catalog, !activeSlot && $style.catalogOff]">
                  <li v-for="item in filteredCatalog" :key="item.id">
                    <button type="button" :class="$style.catalogBtn" @click="assignItem(item)">
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
                  Нет {{ catalogTab === 'relics' ? 'реликвий' : 'камней'
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
import { computed, ref, watch } from 'vue'
import {
  fetchLightstones,
  fetchRelics,
  type GuideItemRow,
  type Item,
} from '@/entities/class'
import { SuperadminAuth } from '@/features/superadmin-auth'
import {
  CRYSTAL_PRESET_IDS,
  CRYSTAL_PRESETS,
  isCrystalPresetId,
  isLightstoneSlotId,
  isRelicSlotId,
  useModalEscape,
  useSuperadmin,
  type CrystalPresetId,
} from '@/shared/lib'
import { RelicBoard, type RelicFill } from '@/widgets/relic-board'
import { submitGuideProposal } from '../api/submitProposal'

type CatalogTab = 'relics' | 'lightstones'
type PresetBoards = Record<CrystalPresetId, Record<string, Item>>

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
    triggerLabel: 'Предложить реликвии',
    initialRelics: () => [],
    initialLightstones: () => [],
  },
)

const { isSuperadmin, refresh: refreshAdmin } = useSuperadmin()

const open = ref(false)
const honeypot = ref('')
const author = ref('')
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
const submitting = ref(false)
const formError = ref('')
const done = ref(false)
const doneMessage = ref('')

const { obscured } = useModalEscape(open, close)

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

watch(open, async (v) => {
  if (!v) return
  formError.value = ''
  done.value = false
  hydrateFromInitial()
  await refreshAdmin()
  if (!relics.value.length || !lightstones.value.length) {
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
  }
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

function reset() {
  honeypot.value = ''
  author.value = ''
  query.value = ''
  activeSlot.value = null
  catalogTab.value = 'relics'
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
    return
  }

  submitting.value = true
  try {
    const res = await submitGuideProposal({
      class_slug: props.classSlug,
      section: 'relics',
      payload: { relics: relicsPayload, lightstones: lightstonesPayload },
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
  width: min(100%, 72rem);
  max-height: min(94vh, 52rem);
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
  grid-template-columns: minmax(16rem, 28rem) minmax(16rem, 1fr);
  grid-template-rows: auto auto;
  gap: 0.75rem 1rem;
  align-items: start;
  min-height: 0;
  flex: 1;
}

.left {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}

.rightMain {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  min-height: 22rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.tab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  padding: 0.32rem 0.65rem;
}

.tabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.input {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0.45rem 0.6rem;
}

.input:disabled {
  opacity: 0.55;
}

.catalog {
  margin: 0;
  list-style: none;
  padding: 0;
  overflow: auto;
  max-height: 22rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}

.catalogOff {
  opacity: 0.45;
  pointer-events: none;
}

.catalogBtn {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.55rem;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  padding: 0.45rem 0.55rem;
  text-align: left;
}

.catalogBtn:hover {
  background: color-mix(in srgb, var(--color-gold) 10%, transparent);
}

.icon {
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.add {
  margin-left: auto;
  color: var(--color-gold);
}

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.muted {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.88rem;
}

.ok {
  margin: 0;
  color: var(--color-gold);
  font-size: 0.88rem;
}

.actions {
  grid-column: 1 / -1;
  grid-row: 2;
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
}

.secondary,
.primary {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  padding: 0.45rem 0.85rem;
}

.primary {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.primary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 820px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .left,
  .rightMain,
  .actions {
    grid-column: 1;
  }

  .rightMain {
    grid-row: auto;
    min-height: 0;
  }

  .actions {
    grid-row: auto;
  }
}
</style>
