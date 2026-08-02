<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить забаф"
    :trigger-label="triggerLabel"
    :submitting="submitting"
    :form-error="formError"
    :obscured="obscured"
    :is-superadmin="isSuperadmin"
    :request-close="requestClose"
    @submit="onSubmit"
  >
    <template #headerExtra>
      <UiPresetTabs
        v-model="activeBuffPreset"
        :tabs="guidePresets"
        aria-label="Пресет забафа"
      />
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
import { fetchBuffs, type Buff, type GuideBuffRow } from '@/entities/class'
import {
  CRYSTAL_PRESET_IDS,
  CRYSTAL_PRESETS,
  isCrystalPresetId,
  type CrystalPresetId,
} from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { submitGuideProposal } from '../api/submitProposal'
import { useProposeModal } from '../lib/useProposeModal'
import { useReorderableList } from '../lib/useReorderableList'
import CatalogPicker from './CatalogPicker.vue'
import ProposeModalShell from './ProposeModalShell.vue'
import ReorderableTiles from './ReorderableTiles.vue'

type PickItem = { id: string; name_ru: string; icon_url: string | null }
type BuffPresetBoards = Record<CrystalPresetId, PickItem[]>

const MAX = 20

function emptyBuffPresets(): BuffPresetBoards {
  return { t1: [], t2: [], besp: [], sub: [] }
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

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return buffs.value
  return buffs.value.filter((b) => b.name_ru.toLowerCase().includes(q))
})

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
      payload: { buffs: buffsPayload },
      author_label: author.value.trim() || undefined,
      website: honeypot.value,
    })
  })
}
</script>

<style module>
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
