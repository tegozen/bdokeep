<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить забаф"
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
          v-model="activeBuffPreset"
          :tabs="guidePresets"
          aria-label="Пресет забафа"
        />
        <ProposeCopyFromPreset
          :target-preset="activeBuffPreset"
          :target-has-content="picked.length > 0"
          :is-empty="isPresetEmpty"
          size="md"
          @copy="copyFromPreset"
        >
          <template #default="{ preset }">
            <div :class="presetTools.copyPreview">
              <ul v-if="buffByPreset[preset].length" :class="$style.copyList">
                <li
                  v-for="(row, i) in buffByPreset[preset]"
                  :key="`${row.id}-${i}`"
                  :class="$style.copyItem"
                >
                  <img
                    v-if="row.icon_url"
                    :src="codexIconSrc(row.icon_url) || undefined"
                    alt=""
                    :class="$style.copyIcon"
                    loading="lazy"
                  >
                  <span>{{ row.name_ru }}</span>
                </li>
              </ul>
              <p v-else :class="$style.copyEmpty">Пока пусто</p>
            </div>
          </template>
        </ProposeCopyFromPreset>
        <ProposeCopyFromClass
          :exclude-class-slug="classSlug"
          :target-preset="activeBuffPreset"
          :target-has-content="picked.length > 0"
          section="buffs"
          size="md"
          @copy="copyFromClass"
        >
          <template #default="{ board }">
            <div :class="presetTools.copyPreview">
              <ul v-if="asBuffList(board).length" :class="$style.copyList">
                <li
                  v-for="(row, i) in asBuffList(board)"
                  :key="`${row.id}-${i}`"
                  :class="$style.copyItem"
                >
                  <img
                    v-if="row.icon_url"
                    :src="codexIconSrc(row.icon_url) || undefined"
                    alt=""
                    :class="$style.copyIcon"
                    loading="lazy"
                  >
                  <span>{{ row.name_ru }}</span>
                </li>
              </ul>
              <p v-else :class="$style.copyEmpty">Пока пусто</p>
            </div>
          </template>
        </ProposeCopyFromClass>
      </div>
    </template>

    <p :class="$style.hint">Выберите бафы для забафа класса.</p>

    <CatalogPicker
      v-model:query="query"
      :items="filteredCatalog"
      :pending="catalogPending"
      :error="catalogError"
      placeholder="Название бафа"
      pending-text="Загрузка бафов…"
      error-text="Не удалось загрузить бафы."
      :show-empty="!catalogPending && !catalogError && !filteredCatalog.length"
      :empty-text="query ? 'Нет бафов по поиску.' : 'Нет бафов.'"
      @pick="addItem"
    />

    <div :class="$style.pickedHead">
      Забаф ({{ picked.length }}/{{ maxPicked }})
      <span v-if="picked.length" :class="$style.dragHint">перетащите, чтобы поменять местами</span>
    </div>
    <ReorderableTiles
      :items="picked"
      :drag-from="dragFrom"
      :drag-over="dragOver"
      empty-text="Пока пусто — нажмите баф в списке выше."
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @dragover="onDragOver"
      @drop="onDrop"
      @remove="removeAt"
    />
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CRYSTAL_PRESET_IDS,
  CRYSTAL_PRESETS,
  fetchBuffs,
  type Buff,
  type CrystalPresetId,
  type Item,
} from '@/entities/catalog'
import type { GuideBuffRow } from '@/entities/class'
import { codexIconSrc } from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { submitGuideProposal } from '../api/submitProposal'
import { cloneItemList, fullReplacedPresets } from '../lib/clonePresetData'
import {
  emptyBuffPresetBoards,
  extractBuffPresets,
  type BuffPickItem,
  type BuffPresetBoards,
} from '../lib/extractGuideSectionPresets'
import { useProposeModal } from '../lib/useProposeModal'
import { useReorderableList } from '../lib/useReorderableList'
import CatalogPicker from './CatalogPicker.vue'
import ProposeCopyFromClass from './ProposeCopyFromClass.vue'
import ProposeCopyFromPreset from './ProposeCopyFromPreset.vue'
import ProposeModalShell from './ProposeModalShell.vue'
import ReorderableTiles from './ReorderableTiles.vue'
import presetTools from './proposePresetTools.module.css'

type PickItem = BuffPickItem

const MAX = 20

function emptyBuffPresets(): BuffPresetBoards {
  return emptyBuffPresetBoards()
}

function asBuffList(board: Record<string, Item> | BuffPickItem[]): BuffPickItem[] {
  return Array.isArray(board) ? board : []
}

const props = withDefaults(
  defineProps<{
    classSlug: string
    triggerLabel?: string
    initialBuffs?: GuideBuffRow[]
  }>(),
  {
    triggerLabel: 'Предложить',
    initialBuffs: () => [],
  },
)

const query = ref('')
const guidePresets = CRYSTAL_PRESETS
const activeBuffPreset = ref<CrystalPresetId>('t1')
const buffByPreset = ref<BuffPresetBoards>(emptyBuffPresets())
const buffs = ref<Buff[]>([])
const catalogPending = ref(false)
const catalogError = ref(false)
const maxPicked = MAX

const picked = computed({
  get(): PickItem[] {
    return buffByPreset.value[activeBuffPreset.value]
  },
  set(next: PickItem[]) {
    buffByPreset.value = {
      ...buffByPreset.value,
      [activeBuffPreset.value]: next,
    }
  },
})

const {
  dragFrom,
  dragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  resetDrag,
} = useReorderableList(
  () => picked.value,
  (next) => {
    picked.value = next
  },
)

function hydrateBuffsFromInitial() {
  buffByPreset.value = extractBuffPresets(props.initialBuffs ?? [])
  activeBuffPreset.value = 't1'
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
  serialize: () =>
    JSON.stringify({
      buffs: Object.fromEntries(
        CRYSTAL_PRESET_IDS.map((p) => [p, buffByPreset.value[p].map((b) => b.id)]),
      ),
    }),
  onOpen: async () => {
    hydrateBuffsFromInitial()
    if (buffs.value.length) return
    catalogPending.value = true
    catalogError.value = false
    try {
      buffs.value = await fetchBuffs()
    } catch {
      catalogError.value = true
    } finally {
      catalogPending.value = false
    }
  },
  onReset: () => {
    query.value = ''
    activeBuffPreset.value = 't1'
    buffByPreset.value = emptyBuffPresets()
    resetDrag()
  },
})

defineExpose({ openModal })

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return buffs.value
  return buffs.value.filter((b) => b.name_ru.toLowerCase().includes(q))
})

function isPresetEmpty(preset: CrystalPresetId) {
  return buffByPreset.value[preset].length === 0
}

function copyFromPreset(source: CrystalPresetId) {
  buffByPreset.value = {
    ...buffByPreset.value,
    [activeBuffPreset.value]: cloneItemList(buffByPreset.value[source]),
  }
  formError.value = ''
}

function copyFromClass(board: Record<string, Item> | BuffPickItem[]) {
  if (!Array.isArray(board)) return
  buffByPreset.value = {
    ...buffByPreset.value,
    [activeBuffPreset.value]: cloneItemList(board),
  }
  formError.value = ''
}

function addItem(item: PickItem) {
  if (picked.value.length >= maxPicked) {
    formError.value = `Максимум ${maxPicked} бафов`
    return
  }
  formError.value = ''
  picked.value = [...picked.value, item]
}

function removeAt(i: number) {
  picked.value = picked.value.filter((_, idx) => idx !== i)
}

async function onSubmit() {
  await runSubmit(async () => {
    const anyBuff = CRYSTAL_PRESET_IDS.some((p) => buffByPreset.value[p].length > 0)
    if (!anyBuff) {
      formError.value = 'Добавьте хотя бы один баф'
      return null
    }
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
    return submitGuideProposal({
      class_slug: props.classSlug,
      section: 'buffs',
      payload: {
        buffs: buffsPayload,
        replaced_presets: fullReplacedPresets(CRYSTAL_PRESET_IDS),
      },
      author_label: author.value.trim() || undefined,
      website: honeypot.value,
    })
  })
}
</script>

<style module>
.copyList {
  margin: 0;
  list-style: none;
  padding: 0;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}

.copyItem {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.4rem 0.5rem;
  font-size: 0.85rem;
  color: var(--color-ink);
}

.copyItem:last-child {
  border-bottom: 0;
}

.copyIcon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.copyEmpty {
  margin: 0;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.hint {
  margin: 0;
  font-size: 0.92rem;
  color: var(--color-muted);
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
</style>
