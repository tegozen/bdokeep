<template>
  <div :class="$style.wrap">
    <button type="button" :class="$style.trigger" @click="open = true">
      {{ triggerLabel }}
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        :class="[$style.backdrop, isSummary && $style.backdropFull, obscured && $style.obscured]"
        @click.self="close"
      >
        <div
          :class="[$style.modal, isSummary && $style.modalFull]"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <header :class="$style.head">
            <h3 :class="$style.title">{{ title }}</h3>
            <div
              v-if="isBuffs"
              :class="$style.presetTabs"
              role="tablist"
              aria-label="Пресет забафа"
            >
              <button
                v-for="p in guidePresets"
                :key="p.id"
                type="button"
                role="tab"
                :aria-selected="activeBuffPreset === p.id"
                :class="[$style.presetTab, activeBuffPreset === p.id && $style.presetTabOn]"
                @click="activeBuffPreset = p.id"
              >
                {{ p.label }}
              </button>
            </div>
            <button type="button" :class="$style.close" aria-label="Закрыть" @click="close">
              ×
            </button>
          </header>

          <form :class="[$style.form, isSummary && $style.formFull]" @submit.prevent="onSubmit">
            <input
              v-model="honeypot"
              type="text"
              name="website"
              autocomplete="off"
              tabindex="-1"
              :class="$style.honey"
              aria-hidden="true"
            >

            <SuperadminAuth />

            <template v-if="isCombo || isBuffs">
              <p :class="$style.hint">
                <template v-if="isBuffs">Выберите бафы для забафа класса.</template>
                <template v-else>
                  Комба {{ isSuccessionCombo ? 'наследия' : 'пробуждения' }} — выберите скиллы по
                  порядку.
                </template>
              </p>
              <div
                v-if="isBuffs"
                :class="[$style.tabs, $style.tabsBuff]"
                role="tablist"
                aria-label="Категория бафов"
              >
                <button
                  v-for="tab in buffTabs"
                  :key="tab.id"
                  type="button"
                  role="tab"
                  :aria-selected="buffTab === tab.id"
                  :class="[$style.tab, buffTab === tab.id && $style.tabOn]"
                  @click="buffTab = tab.id"
                >
                  {{ tab.label }}
                </button>
              </div>
              <label :class="$style.label">
                Поиск
                <input
                  v-model="query"
                  type="search"
                  :class="$style.input"
                  :placeholder="isBuffs ? 'Название бафа' : 'Название скилла'"
                >
              </label>

              <div v-if="catalogPending" :class="$style.muted">
                {{ isBuffs ? 'Загрузка бафов…' : 'Загрузка скиллов…' }}
              </div>
              <div v-else-if="catalogError" :class="$style.error">
                {{ isBuffs ? 'Не удалось загрузить бафы.' : 'Не удалось загрузить скиллы.' }}
              </div>
              <ul v-else :class="$style.catalog">
                <li v-for="item in filteredCatalog" :key="item.id">
                  <button type="button" :class="$style.catalogBtn" @click="addItem(item)">
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
              <p v-if="!catalogPending && !catalogError && !filteredCatalog.length" :class="$style.muted">
                Нет {{ isBuffs ? 'бафов' : 'скиллов' }}{{ query ? ' по поиску' : ' в этой вкладке' }}.
              </p>

              <div :class="$style.pickedHead">
                {{ isBuffs ? `Забаф (${picked.length}/${maxPicked})` : `Цепочка (${picked.length}/${maxPicked})` }}
                <span v-if="picked.length" :class="$style.dragHint">перетащите, чтобы поменять местами</span>
              </div>
              <ol v-if="picked.length" :class="$style.picked">
                <li
                  v-for="(item, i) in picked"
                  :key="`${item.id}-${i}`"
                  :class="$style.step"
                >
                  <span v-if="i > 0" :class="$style.arrow" aria-hidden="true">→</span>
                  <div
                    :class="[
                      $style.tile,
                      dragFrom === i && $style.tileDragging,
                      dragOver === i && dragFrom !== i && $style.tileOver,
                    ]"
                    draggable="true"
                    :title="item.name_ru"
                    @dragstart="onDragStart(i, $event)"
                    @dragend="onDragEnd"
                    @dragover.prevent="onDragOver(i)"
                    @drop.prevent="onDrop(i)"
                  >
                    <img
                      v-if="item.icon_url"
                      :src="item.icon_url"
                      alt=""
                      :class="$style.tileIcon"
                      draggable="false"
                      loading="lazy"
                    >
                    <span v-else :class="$style.tileFallback">?</span>
                    <span :class="$style.tileName">{{ item.name_ru }}</span>
                    <button
                      type="button"
                      :class="$style.tileRemove"
                      :aria-label="`Убрать ${item.name_ru}`"
                      @click.stop="removeAt(i)"
                      @mousedown.stop
                    >
                      ✕
                    </button>
                  </div>
                </li>
              </ol>
              <p v-else :class="$style.muted">
                Пока пусто — нажмите {{ isBuffs ? 'баф' : 'скилл' }} в списке выше.
              </p>
            </template>

            <template v-else-if="isSummary">
              <div :class="[$style.label, $style.summaryEditor]">
                <span>Markdown</span>
                <UiMarkdownEditor
                  id="propose-summary-editor"
                  v-model="text"
                  placeholder="Опишите суть класса в Markdown…"
                  height="100%"
                />
              </div>
            </template>

            <template v-else>
              <label :class="$style.label">
                Текст
                <textarea
                  v-model="text"
                  :class="$style.textarea"
                  rows="6"
                  required
                  maxlength="8000"
                  placeholder="Предложенный текст…"
                />
              </label>
            </template>

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

            <div :class="$style.actions">
              <button type="button" :class="$style.secondary" @click="close">Отмена</button>
              <button type="submit" :class="$style.primary" :disabled="submitting || done">
                {{
                  submitting
                    ? 'Отправка…'
                    : isSuperadmin
                      ? 'Опубликовать'
                      : 'Отправить'
                }}
              </button>
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
  fetchBuffs,
  fetchClassSkills,
  type Buff,
  type GuideBuffRow,
  type ProposalSection,
  type Skill,
} from '@/entities/class'
import { SuperadminAuth } from '@/features/superadmin-auth'
import {
  CRYSTAL_PRESET_IDS,
  CRYSTAL_PRESETS,
  isCrystalPresetId,
  useModalEscape,
  useSuperadmin,
  type CrystalPresetId,
} from '@/shared/lib'
import { UiMarkdownEditor } from '@/shared/ui'
import { submitGuideProposal } from '../api/submitProposal'

type PickItem = { id: string; name_ru: string; icon_url: string | null }
type BuffTabId = 'camp' | 'cron' | 'balm' | 'elixir'
type BuffPresetBoards = Record<CrystalPresetId, PickItem[]>

const BUFF_TABS: { id: BuffTabId; label: string }[] = [
  { id: 'camp', label: 'Лагерь' },
  { id: 'cron', label: 'Блюдо Крон' },
  { id: 'balm', label: 'Бальзамы' },
  { id: 'elixir', label: 'Эликсиры' },
]

function emptyBuffPresets(): BuffPresetBoards {
  return { t1: [], t2: [], besp: [], sub: [] }
}

const props = withDefaults(
  defineProps<{
    classSlug: string
    section: ProposalSection
    triggerLabel?: string
    initialBuffs?: GuideBuffRow[]
    initialText?: string | null
  }>(),
  {
    triggerLabel: 'Предложить',
    initialBuffs: () => [],
    initialText: null,
  },
)

const { isSuperadmin, refresh: refreshAdmin } = useSuperadmin()

const open = ref(false)
const honeypot = ref('')
const text = ref('')
const author = ref('')
const query = ref('')
const buffTab = ref<BuffTabId>('camp')
const buffTabs = BUFF_TABS
const guidePresets = CRYSTAL_PRESETS
const activeBuffPreset = ref<CrystalPresetId>('t1')
const buffByPreset = ref<BuffPresetBoards>(emptyBuffPresets())
const comboPicked = ref<PickItem[]>([])
const skills = ref<Skill[]>([])
const buffs = ref<Buff[]>([])
const catalogPending = ref(false)
const catalogError = ref(false)
const submitting = ref(false)
const formError = ref('')
const done = ref(false)
const doneMessage = ref('')
const dragFrom = ref<number | null>(null)
const dragOver = ref<number | null>(null)

const { obscured } = useModalEscape(open, close)

const isCombo = computed(
  () => props.section === 'combo_awakening' || props.section === 'combo_succession',
)
const isBuffs = computed(() => props.section === 'buffs')
const isSummary = computed(() => props.section === 'summary')
const isSuccessionCombo = computed(() => props.section === 'combo_succession')
const maxPicked = computed(() => (isBuffs.value ? 20 : 30))

const picked = computed({
  get(): PickItem[] {
    return isBuffs.value ? buffByPreset.value[activeBuffPreset.value] : comboPicked.value
  },
  set(next: PickItem[]) {
    if (isBuffs.value) {
      buffByPreset.value = {
        ...buffByPreset.value,
        [activeBuffPreset.value]: next,
      }
    } else {
      comboPicked.value = next
    }
  },
})

const title = computed(() => {
  switch (props.section) {
    case 'summary':
      return 'Предложить суть'
    case 'buffs':
      return 'Предложить забаф'
    case 'combo_awakening':
      return 'Комба: пробуждение'
    case 'combo_succession':
      return 'Комба: наследие'
    default:
      return 'Предложить правку'
  }
})

function hydrateBuffsFromInitial() {
  const next = emptyBuffPresets()
  for (const row of props.initialBuffs ?? []) {
    const presetRaw = String(row.preset || 't1')
    if (!isCrystalPresetId(presetRaw) || !row.buffs) continue
    next[presetRaw].push({
      id: row.buffs.id,
      name_ru: row.buffs.name_ru,
      icon_url: row.buffs.icon_url,
    })
  }
  buffByPreset.value = next
  activeBuffPreset.value = 't1'
}

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (isBuffs.value) {
    return buffs.value.filter((b) => {
      if (b.description !== buffTab.value) return false
      if (!q) return true
      return b.name_ru.toLowerCase().includes(q)
    })
  }
  return skills.value.filter((s) => {
    if (!q) return true
    return s.name_ru.toLowerCase().includes(q)
  })
})

watch(buffTab, () => {
  formError.value = ''
})

function addItem(item: PickItem) {
  if (picked.value.length >= maxPicked.value) {
    formError.value = isBuffs.value ? `Максимум ${maxPicked.value} бафов` : 'Максимум 30 шагов'
    return
  }
  formError.value = ''
  picked.value = [...picked.value, item]
}

function removeAt(i: number) {
  picked.value = picked.value.filter((_, idx) => idx !== i)
}

function onDragStart(i: number, e: DragEvent) {
  dragFrom.value = i
  dragOver.value = i
  e.dataTransfer?.setData('text/plain', String(i))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(i: number) {
  dragOver.value = i
}

function onDrop(i: number) {
  const from = dragFrom.value
  if (from == null || from === i) {
    onDragEnd()
    return
  }
  const next = [...picked.value]
  const [item] = next.splice(from, 1)
  if (!item) {
    onDragEnd()
    return
  }
  next.splice(i, 0, item)
  picked.value = next
  onDragEnd()
}

function onDragEnd() {
  dragFrom.value = null
  dragOver.value = null
}

function close() {
  open.value = false
}

function reset() {
  text.value = ''
  author.value = ''
  honeypot.value = ''
  query.value = ''
  buffTab.value = 'camp'
  activeBuffPreset.value = 't1'
  buffByPreset.value = emptyBuffPresets()
  comboPicked.value = []
  formError.value = ''
  done.value = false
  doneMessage.value = ''
  submitting.value = false
  dragFrom.value = null
  dragOver.value = null
}

watch(open, async (v) => {
  if (v) {
    formError.value = ''
    done.value = false
    doneMessage.value = ''
    if (isSummary.value || (!isCombo.value && !isBuffs.value)) {
      text.value = props.initialText?.trim() ? props.initialText : ''
    }
    if (isBuffs.value) hydrateBuffsFromInitial()
    await refreshAdmin()
    if (isCombo.value && !skills.value.length) {
      catalogPending.value = true
      catalogError.value = false
      try {
        skills.value = await fetchClassSkills(props.classSlug)
      } catch {
        catalogError.value = true
      } finally {
        catalogPending.value = false
      }
    } else if (isBuffs.value && !buffs.value.length) {
      catalogPending.value = true
      catalogError.value = false
      try {
        buffs.value = await fetchBuffs()
      } catch {
        catalogError.value = true
      } finally {
        catalogPending.value = false
      }
    }
  } else {
    reset()
  }
})

async function onSubmit() {
  formError.value = ''
  submitting.value = true
  try {
    if (isCombo.value && !picked.value.length) {
      formError.value = 'Добавьте хотя бы один скилл'
      return
    }
    if (isBuffs.value) {
      const anyBuff = CRYSTAL_PRESET_IDS.some((p) => buffByPreset.value[p].length > 0)
      if (!anyBuff) {
        formError.value = 'Добавьте хотя бы один баф'
        return
      }
    }
    if (isSummary.value && !text.value.trim()) {
      formError.value = 'Введите текст сути'
      return
    }
    if (!isSuperadmin.value && !author.value.trim()) {
      formError.value = 'Укажите игровой ник'
      return
    }

    let payload: Record<string, unknown>
    if (isCombo.value) {
      payload = {
        mode: isSuccessionCombo.value ? 'succession' : 'awakening',
        skill_ids: picked.value.map((s) => s.id),
      }
    } else if (isBuffs.value) {
      const buffsPayload: Array<{
        preset: CrystalPresetId
        buff_id: string
        sort_order: number
      }> = []
      let order = 0
      for (const preset of CRYSTAL_PRESET_IDS) {
        for (const b of buffByPreset.value[preset]) {
          buffsPayload.push({
            preset,
            buff_id: b.id,
            sort_order: order++,
          })
        }
      }
      payload = { buffs: buffsPayload }
    } else {
      payload = { text: text.value.trim() }
    }

    const res = await submitGuideProposal({
      class_slug: props.classSlug,
      section: props.section,
      payload,
      author_label: author.value.trim() || undefined,
      website: honeypot.value,
    })
    done.value = true
    if (res.autoApproved) {
      doneMessage.value = 'Опубликовано сразу. Обновляю страницу…'
      setTimeout(() => {
        reloadNuxtApp()
      }, 600)
    } else {
      doneMessage.value = 'Отправлено на модерацию. Спасибо!'
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    formError.value = msg || 'Не удалось отправить. Попробуйте позже.'
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
  border: 1px solid var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.75rem;
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
  background: rgba(0, 0, 0, 0.45);
  padding: 1rem;
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
  transition: filter 160ms ease;
}

.backdropFull {
  padding: 1rem;
  justify-items: center;
  align-items: stretch;
}

.obscured {
  filter: blur(10px);
  pointer-events: none;
  user-select: none;
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(100%, 36rem);
  max-height: min(94vh, 56rem);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-glow);
}

.modalFull {
  width: var(--summary-edit-modal-width);
  height: 100%;
  max-height: none;
}

.formFull {
  overflow: hidden;
}

.formFull .actions {
  flex-shrink: 0;
  margin-top: auto;
  padding-top: 0.25rem;
}

.summaryEditor {
  flex: 1;
  min-height: 0;
  grid-template-rows: auto 1fr;
}

.summaryEditor :global(.md-editor) {
  min-height: 0;
  height: 100% !important;
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
  gap: 0.85rem;
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

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.input,
.textarea {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0.5rem 0.65rem;
}

.textarea {
  resize: vertical;
  min-height: 7rem;
}

.hint {
  margin: 0;
  font-size: 0.92rem;
  color: var(--color-muted);
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
}

.tabsBuff {
  grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
}

.tabsBuff .tab {
  font-size: 0.78rem;
  padding: 0.4rem 0.35rem;
}

.tab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  padding: 0.45rem 0.5rem;
}

.tabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.catalog {
  flex: none;
  height: 16rem;
  margin: 0;
  overflow: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  padding: 0;
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

.pickedHead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.dragHint {
  font-size: 0.8rem;
  opacity: 0.75;
}

.picked {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.35rem 0.2rem;
  list-style: none;
  padding: 0;
}

.step {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.arrow {
  margin: 0 0.1rem;
  color: var(--color-gold-soft);
  font-size: 0.95rem;
  align-self: center;
}

.tile {
  position: relative;
  display: flex;
  width: 4.5rem;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  cursor: grab;
  padding: 0.4rem 0.3rem 0.35rem;
  user-select: none;
  touch-action: none;
}

.tile:active {
  cursor: grabbing;
}

.tileDragging {
  opacity: 0.45;
}

.tileOver {
  border-color: var(--color-border-strong);
  box-shadow: inset 0 0 0 1px var(--color-gold-soft);
}

.tileIcon {
  width: 2.75rem;
  height: 2.75rem;
  background: #000;
  object-fit: contain;
  pointer-events: none;
}

.tileFallback {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  background: #000;
  color: var(--color-muted);
}

.tileName {
  display: -webkit-box;
  width: 100%;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--color-ink);
  font-size: 0.68rem;
  line-height: 1.15;
  text-align: center;
}

.tileRemove {
  position: absolute;
  top: 0.1rem;
  right: 0.1rem;
  border: 0;
  background: rgba(0, 0, 0, 0.65);
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.15rem 0.25rem;
}

.tileRemove:hover {
  color: var(--color-danger);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
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
</style>
