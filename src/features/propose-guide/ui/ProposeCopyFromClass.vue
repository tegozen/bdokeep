<template>
  <div :class="$style.wrap">
    <UiButton
      variant="secondary"
      size="sm"
      type="button"
      @click="openModal"
    >
      Из другого класса
    </UiButton>

    <UiModal
      :open="open"
      title="Скопировать из другого класса"
      aria-label="Скопировать данные из пресета другого класса"
      :z-index="90"
      :size="size"
      @close="close"
    >
      <div :class="$style.body">
        <p :class="$style.hint">
          Выберите класс и пресет — данные заменят «{{ targetLabel }}».
        </p>

        <div :class="$style.main">
          <div :class="$style.classCol">
            <label :class="$style.searchLabel">
              <span :class="$style.srOnly">Поиск класса</span>
              <input
                v-model="classQuery"
                type="search"
                :class="$style.search"
                placeholder="Поиск класса…"
                autocomplete="off"
              >
            </label>

            <div :class="$style.classList" role="listbox" aria-label="Класс-источник">
              <p v-if="classesPending" :class="$style.status">Загрузка классов…</p>
              <p v-else-if="classesError" :class="$style.statusError">Не удалось загрузить классы.</p>
              <p v-else-if="!filteredClasses.length" :class="$style.status">Нет классов.</p>
              <button
                v-for="cls in filteredClasses"
                :key="cls.slug"
                type="button"
                role="option"
                :aria-selected="selectedSlug === cls.slug"
                :class="[$style.classRow, selectedSlug === cls.slug && $style.classRowActive]"
                @click="selectClass(cls.slug)"
              >
                <ClassIcon :slug="cls.slug" :icon-url="cls.icon_url" :label="cls.name_ru" size="sm" />
                <span :class="$style.className">{{ cls.name_ru }}</span>
              </button>
            </div>
          </div>

          <div :class="$style.sourceCol">
            <template v-if="selectedSlug">
              <p v-if="guidePending" :class="$style.status">Загрузка гайда…</p>
              <p v-else-if="guideError" :class="$style.statusError">Не удалось загрузить гайд.</p>
              <template v-else-if="sourceBoards">
                <p v-if="!hasAnySource" :class="$style.status">
                  У этого класса нет данных в этом разделе.
                </p>
                <template v-else>
                  <UiPresetTabs
                    v-model="sourcePreset"
                    :tabs="presetTabs"
                    aria-label="Пресет-источник"
                  />
                  <div :class="$style.preview">
                    <slot :preset="sourcePreset" :board="currentBoard" />
                  </div>
                </template>
              </template>
            </template>
            <p v-else :class="$style.status">Выберите класс слева.</p>
          </div>
        </div>

        <div :class="$style.actions">
          <UiButton variant="secondary" type="button" @click="close">Отмена</UiButton>
          <UiButton type="button" :disabled="!canCopy" @click="onCopy">
            Скопировать в {{ targetLabel }}
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Item } from '@/entities/catalog'
import {
  ClassIcon,
  fetchClassGuideBySlug,
  fetchPublishedClasses,
  type BdoClass,
  type ClassGuideBundle,
} from '@/entities/class'
import {
  CRYSTAL_PRESETS,
  useConfirm,
  type CrystalPresetId,
} from '@/shared/lib'
import { UiButton, UiModal, UiPresetTabs, type UiModalSize } from '@/shared/ui'
import {
  extractSectionFromBundle,
  hasAnyFilledSectionPreset,
  isSectionPresetEmpty,
  pickDefaultFilledPreset,
  type BuffPickItem,
  type BuffPresetBoards,
  type CopyFromClassSection,
  type ItemPresetBoards,
} from '../lib/extractGuideSectionPresets'

const props = withDefaults(
  defineProps<{
    excludeClassSlug: string
    targetPreset: CrystalPresetId
    section: CopyFromClassSection
    targetHasContent?: boolean
    size?: UiModalSize
  }>(),
  {
    targetHasContent: false,
    size: 'lg',
  },
)

const emit = defineEmits<{
  copy: [payload: Record<string, Item> | BuffPickItem[]]
}>()

const { confirm } = useConfirm()
const open = ref(false)
const classQuery = ref('')
const classes = ref<BdoClass[]>([])
const classesPending = ref(false)
const classesError = ref(false)
const selectedSlug = ref<string | null>(null)
const sourcePreset = ref<CrystalPresetId>('t1')
const sourceBoards = ref<ItemPresetBoards | BuffPresetBoards | null>(null)
const guidePending = ref(false)
const guideError = ref(false)
const guideCache = new Map<string, ClassGuideBundle>()

const targetLabel = computed(
  () => CRYSTAL_PRESETS.find((p) => p.id === props.targetPreset)?.label ?? props.targetPreset,
)

const presetTabs = CRYSTAL_PRESETS

const filteredClasses = computed(() => {
  const q = classQuery.value.trim().toLowerCase()
  const list = classes.value.filter((c) => c.slug !== props.excludeClassSlug)
  if (!q) return list
  return list.filter((c) => c.name_ru.toLowerCase().includes(q) || c.slug.includes(q))
})

const hasAnySource = computed(() => {
  if (!sourceBoards.value) return false
  return hasAnyFilledSectionPreset(props.section, sourceBoards.value)
})

const currentBoard = computed((): Record<string, Item> | BuffPickItem[] => {
  const boards = sourceBoards.value
  if (!boards) return props.section === 'buffs' ? [] : {}
  if (props.section === 'buffs') {
    return (boards as BuffPresetBoards)[sourcePreset.value] ?? []
  }
  return (boards as ItemPresetBoards)[sourcePreset.value] ?? {}
})

const canCopy = computed(() => {
  if (!sourceBoards.value || !selectedSlug.value || guidePending.value || guideError.value) {
    return false
  }
  return !isSectionPresetEmpty(props.section, sourceBoards.value, sourcePreset.value)
})

async function loadClasses() {
  if (classes.value.length) return
  classesPending.value = true
  classesError.value = false
  try {
    classes.value = await fetchPublishedClasses()
  } catch {
    classesError.value = true
  } finally {
    classesPending.value = false
  }
}

async function loadGuide(slug: string) {
  guidePending.value = true
  guideError.value = false
  sourceBoards.value = null
  try {
    let bundle = guideCache.get(slug)
    if (!bundle) {
      const fetched = await fetchClassGuideBySlug(slug)
      if (!fetched) {
        guideError.value = true
        return
      }
      guideCache.set(slug, fetched)
      bundle = fetched
    }
    const boards = extractSectionFromBundle(props.section, bundle)
    sourceBoards.value = boards
    sourcePreset.value = pickDefaultFilledPreset(props.section, boards)
  } catch {
    guideError.value = true
  } finally {
    guidePending.value = false
  }
}

function selectClass(slug: string) {
  if (selectedSlug.value === slug) return
  selectedSlug.value = slug
  void loadGuide(slug)
}

function resetTransient() {
  classQuery.value = ''
  selectedSlug.value = null
  sourceBoards.value = null
  guidePending.value = false
  guideError.value = false
  sourcePreset.value = 't1'
}

function openModal() {
  resetTransient()
  open.value = true
  void loadClasses()
}

function close() {
  open.value = false
}

async function onCopy() {
  if (!canCopy.value || !sourceBoards.value) return
  if (props.targetHasContent) {
    const sourceLabel =
      CRYSTAL_PRESETS.find((p) => p.id === sourcePreset.value)?.label ?? sourcePreset.value
    const className =
      classes.value.find((c) => c.slug === selectedSlug.value)?.name_ru ?? selectedSlug.value
    const ok = await confirm({
      title: 'Заменить пресет?',
      message: `Данные «${targetLabel.value}» будут заменены копией из «${className}» / «${sourceLabel}».`,
      confirmLabel: 'Скопировать',
      cancelLabel: 'Отмена',
    })
    if (!ok) return
  }

  if (props.section === 'buffs') {
    const list = (sourceBoards.value as BuffPresetBoards)[sourcePreset.value] ?? []
    emit('copy', list.map((b) => ({ ...b })))
  } else {
    const board = (sourceBoards.value as ItemPresetBoards)[sourcePreset.value] ?? {}
    emit(
      'copy',
      Object.fromEntries(Object.entries(board).map(([slot, item]) => [slot, { ...item }])),
    )
  }
  close()
}
</script>

<style module>
.wrap {
  display: inline-flex;
  flex-shrink: 0;
}

.body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  overflow: hidden;
  padding: 1rem;
}

.hint {
  margin: 0;
  flex-shrink: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--color-muted);
}

.main {
  display: grid;
  grid-template-columns: minmax(10.5rem, 13rem) minmax(0, 1fr);
  gap: 0.75rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.classCol {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.searchLabel {
  display: block;
  flex-shrink: 0;
}

.search {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  border-radius: 0.35rem;
  padding: 0.45rem 0.65rem;
  font: inherit;
  font-size: 0.9rem;
}

.search:focus {
  outline: 2px solid var(--color-gold);
  outline-offset: 1px;
}

.classList {
  flex: 1 1 auto;
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}

.classRow {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  margin: 0;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
}

.classRow:last-child {
  border-bottom: 0;
}

.classRow:hover {
  background: color-mix(in srgb, var(--color-gold) 12%, transparent);
}

.classRowActive {
  background: color-mix(in srgb, var(--color-gold) 22%, transparent);
}

.className {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sourceCol {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.status,
.statusError {
  margin: 0;
  padding: 0.65rem;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--color-muted);
}

.statusError {
  color: var(--color-danger, #c44);
}

/* Fills leftover column height; children own their scroll (not this pane). */
.preview {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  padding: 0.65rem;
}

.actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 0.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.85rem;
  margin-top: auto;
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 720px) {
  .main {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(9rem, 30%) minmax(0, 1fr);
  }
}
</style>
