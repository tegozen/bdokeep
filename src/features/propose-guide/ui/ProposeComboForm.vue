<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    :title="title"
    :trigger-label="triggerLabel"
    :submitting="submitting"
    :form-error="formError"
    :obscured="obscured"
    :is-superadmin="isSuperadmin"
    :request-close="requestClose"
    @submit="onSubmit"
  >
    <p :class="$style.hint">
      Комба {{ isSuccession ? 'наследия' : 'пробуждения' }} — выберите скиллы по порядку.
    </p>

    <CatalogPicker
      v-model:query="query"
      :items="filteredCatalog"
      :pending="catalogPending"
      :error="catalogError"
      placeholder="Название скилла"
      pending-text="Загрузка скиллов…"
      error-text="Не удалось загрузить скиллы."
      :show-empty="!catalogPending && !catalogError && !filteredCatalog.length"
      :empty-text="query ? 'Нет скиллов по поиску.' : 'Нет скиллов.'"
      @pick="addItem"
    />

    <div :class="$style.pickedHead">
      Цепочка ({{ picked.length }}/{{ maxPicked }})
      <span v-if="picked.length" :class="$style.dragHint">перетащите, чтобы поменять местами</span>
    </div>
    <ReorderableTiles
      :items="picked"
      :drag-from="dragFrom"
      :drag-over="dragOver"
      empty-text="Пока пусто — нажмите скилл в списке выше."
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
  fetchClassSkills,
  type GuideComboStepRow,
  type Skill,
} from '@/entities/class'
import { submitGuideProposal } from '../api/submitProposal'
import { useProposeModal } from '../lib/useProposeModal'
import { useReorderableList } from '../lib/useReorderableList'
import CatalogPicker from './CatalogPicker.vue'
import ProposeModalShell from './ProposeModalShell.vue'
import ReorderableTiles from './ReorderableTiles.vue'

type PickItem = { id: string; name_ru: string; icon_url: string | null }

const MAX = 30

const props = withDefaults(
  defineProps<{
    classSlug: string
    section: 'combo_awakening' | 'combo_succession'
    initialSteps?: GuideComboStepRow[]
    triggerLabel?: string
  }>(),
  {
    initialSteps: () => [],
    triggerLabel: 'Предложить',
  },
)

const query = ref('')
const picked = ref<PickItem[]>([])
const skills = ref<Skill[]>([])
const catalogPending = ref(false)
const catalogError = ref(false)

const isSuccession = computed(() => props.section === 'combo_succession')
const title = computed(() =>
  isSuccession.value ? 'Комба: наследие' : 'Комба: пробуждение',
)
const maxPicked = MAX

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

function hydrateFromInitial() {
  const sorted = [...(props.initialSteps ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  )
  const next: PickItem[] = []
  for (const step of sorted) {
    if (next.length >= MAX) break
    const skill = step.skills
    if (!skill) continue
    next.push({
      id: skill.id,
      name_ru: skill.name_ru,
      icon_url: skill.icon_url,
    })
  }
  picked.value = next
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
  serialize: () => JSON.stringify({ combo: picked.value.map((p) => p.id) }),
  onOpen: async () => {
    hydrateFromInitial()
    if (skills.value.length) return
    catalogPending.value = true
    catalogError.value = false
    try {
      skills.value = await fetchClassSkills(props.classSlug)
    } catch {
      catalogError.value = true
    } finally {
      catalogPending.value = false
    }
  },
  onReset: () => {
    query.value = ''
    picked.value = []
    resetDrag()
  },
})

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  return skills.value.filter((s) => {
    if (!q) return true
    return s.name_ru.toLowerCase().includes(q)
  })
})

function addItem(item: PickItem) {
  if (picked.value.length >= maxPicked) {
    formError.value = 'Максимум 30 шагов'
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
    if (!picked.value.length) {
      formError.value = 'Добавьте хотя бы один скилл'
      return null
    }
    return submitGuideProposal({
      class_slug: props.classSlug,
      section: props.section,
      payload: {
        mode: isSuccession.value ? 'succession' : 'awakening',
        skill_ids: picked.value.map((s) => s.id),
      },
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
