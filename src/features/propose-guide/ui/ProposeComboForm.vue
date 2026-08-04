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
    full
    border-strong
    @submit="onSubmit"
  >
    <div :class="$style.workspace">
      <div :class="$style.left">
        <p :class="$style.hint">
          Комба {{ isSuccession ? 'наследия' : 'пробуждения' }} — выберите скиллы по порядку.
          Можно добавить несколько комб; у каждой — своя заметка.
        </p>

        <CatalogPicker
          v-model:query="query"
          fill
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
      </div>

      <div :class="$style.right">
        <div :class="$style.pickedHead">
          <span>Цепочка · {{ skillCount }} скиллов · {{ comboPreviewCount }} комб</span>
          <span v-if="picked.length" :class="$style.dragHint">перетащите, чтобы поменять местами</span>
        </div>
        <div :class="$style.chainPane">
          <ComboEditorTiles
            :items="picked"
            :drag-from="dragFrom"
            :drag-over="dragOver"
            empty-text="Пока пусто — выберите скилл слева."
            @dragstart="onDragStart"
            @dragend="onDragEnd"
            @dragover="onDragOver"
            @drop="onDrop"
            @remove="removeAt"
            @update-divider="onUpdateDivider"
          />
          <button type="button" :class="$style.dividerBtn" @click="addDivider">
            + Добавить комбу
          </button>
        </div>
      </div>
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  MAX_COMBO_STEPS,
  MAX_COMBOS_PER_MODE,
  combosFromEditorItems,
  editorItemsFromCombos,
  type ComboEditorItem,
  type ComboEditorSkill,
} from '@domain'
import {
  fetchClassSkills,
  type GuideCombo,
  type Skill,
} from '@/entities/class'
import { submitGuideProposal } from '../api/submitProposal'
import { useProposeModal } from '../lib/useProposeModal'
import { useReorderableList } from '../lib/useReorderableList'
import CatalogPicker from './CatalogPicker.vue'
import ComboEditorTiles from './ComboEditorTiles.vue'
import ProposeModalShell from './ProposeModalShell.vue'

type PickItem = ComboEditorItem & Partial<Pick<ComboEditorSkill, 'name_ru' | 'icon_url'>>

const props = withDefaults(
  defineProps<{
    classSlug: string
    section: 'combo_awakening' | 'combo_succession'
    initialCombos?: GuideCombo[]
    triggerLabel?: string
  }>(),
  {
    initialCombos: () => [],
    triggerLabel: 'Предложить',
  },
)

const query = ref('')
const picked = ref<PickItem[]>([])
const skills = ref<Skill[]>([])
const catalogPending = ref(false)
const catalogError = ref(false)
let dividerSeq = 0

const isSuccession = computed(() => props.section === 'combo_succession')
const title = computed(() =>
  isSuccession.value ? 'Комба: наследие' : 'Комба: пробуждение',
)
const maxPicked = MAX_COMBO_STEPS
const skillCount = computed(
  () => picked.value.filter((p) => p.kind === 'skill').length,
)
const comboPreviewCount = computed(
  () => combosFromEditorItems(picked.value).length,
)

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
    picked.value = ensureLeadingDivider(next)
  },
)

function ensureLeadingDivider(items: PickItem[]): PickItem[] {
  if (items[0]?.kind === 'divider') return items
  return [
    { kind: 'divider', key: `d-${dividerSeq++}`, notes: '' },
    ...items,
  ]
}

function hydrateFromInitial() {
  const sorted = [...(props.initialCombos ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  )
  if (!sorted.length) {
    picked.value = [{ kind: 'divider', key: `d-${dividerSeq++}`, notes: '' }]
    return
  }
  const items = editorItemsFromCombos(
    sorted.map((c) => ({
      notes: c.notes,
      steps: [...c.steps]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({ skills: s.skills })),
    })),
  )
  const byId = new Map(skills.value.map((s) => [s.id, s]))
  const next: PickItem[] = []
  let skillsInCombo = 0
  let comboCount = 0
  for (const item of items) {
    if (item.kind === 'divider') {
      if (comboCount >= MAX_COMBOS_PER_MODE) break
      skillsInCombo = 0
      comboCount += 1
      next.push({ ...item, key: item.key || `d-${dividerSeq++}` })
      continue
    }
    if (skillsInCombo >= MAX_COMBO_STEPS) continue
    const skill = byId.get(item.id)
    next.push({
      kind: 'skill',
      id: item.id,
      name_ru: skill?.name_ru || item.name_ru || 'Скилл',
      icon_url: skill?.icon_url ?? item.icon_url ?? null,
    })
    skillsInCombo += 1
  }
  picked.value = ensureLeadingDivider(next)
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
  openModal,
  runSubmit,
} = useProposeModal({
  classSlug: () => props.classSlug,
  serialize: () =>
    JSON.stringify({
      combo: combosFromEditorItems(picked.value).map((c) => c.skill_ids),
    }),
  onOpen: async () => {
    catalogPending.value = true
    catalogError.value = false
    try {
      if (!skills.value.length) {
        skills.value = await fetchClassSkills(props.classSlug)
      }
      hydrateFromInitial()
    } catch {
      catalogError.value = true
    } finally {
      catalogPending.value = false
    }
  },
  onReset: () => {
    query.value = ''
    picked.value = [{ kind: 'divider', key: `d-${dividerSeq++}`, notes: '' }]
    resetDrag()
  },
})

defineExpose({ openModal })

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  return skills.value.filter((s) => {
    if (!q) return true
    return s.name_ru.toLowerCase().includes(q)
  })
})

function addItem(item: { id: string; name_ru: string; icon_url: string | null }) {
  let list = ensureLeadingDivider([...picked.value])
  const combos = combosFromEditorItems(list)
  const last = combos[combos.length - 1]
  const lastLen = last?.skill_ids.length ?? 0
  const trailingDivider = list.length > 0 && list[list.length - 1]?.kind === 'divider'
  const currentLen = trailingDivider ? 0 : lastLen
  if (currentLen >= maxPicked) {
    formError.value = `Максимум ${maxPicked} шагов в одной комбе`
    return
  }
  if (!trailingDivider && combos.length >= MAX_COMBOS_PER_MODE && currentLen === 0) {
    formError.value = `Максимум ${MAX_COMBOS_PER_MODE} комб`
    return
  }
  formError.value = ''
  list = [
    ...list,
    {
      kind: 'skill',
      id: item.id,
      name_ru: item.name_ru,
      icon_url: item.icon_url,
    },
  ]
  picked.value = list
}

function addDivider() {
  const list = ensureLeadingDivider([...picked.value])
  list.push({
    kind: 'divider',
    key: `d-${dividerSeq++}`,
    notes: '',
  })
  picked.value = list
  formError.value = ''
}

function removeAt(i: number) {
  const cur = picked.value[i]
  if (cur?.kind === 'divider') {
    const firstDivider = picked.value.findIndex((it) => it.kind === 'divider')
    if (i === firstDivider) return
  }
  picked.value = ensureLeadingDivider(picked.value.filter((_, idx) => idx !== i))
}

function onUpdateDivider(i: number, notes: string) {
  const cur = picked.value[i]
  if (!cur || cur.kind !== 'divider') return
  const next = [...picked.value]
  next[i] = { ...cur, notes }
  picked.value = next
}

async function onSubmit() {
  await runSubmit(async () => {
    const combos = combosFromEditorItems(picked.value)
    if (!combos.length) {
      formError.value = 'Добавьте хотя бы один скилл'
      return null
    }
    if (combos.length > MAX_COMBOS_PER_MODE) {
      formError.value = `Максимум ${MAX_COMBOS_PER_MODE} комб`
      return null
    }
    if (combos.some((c) => c.skill_ids.length > MAX_COMBO_STEPS)) {
      formError.value = `Максимум ${MAX_COMBO_STEPS} шагов в одной комбе`
      return null
    }
    return submitGuideProposal({
      class_slug: props.classSlug,
      section: props.section,
      payload: {
        mode: isSuccession.value ? 'succession' : 'awakening',
        combos: combos.map((c) => ({
          notes: c.notes || undefined,
          skill_ids: c.skill_ids,
        })),
      },
      author_label: author.value.trim() || undefined,
      website: honeypot.value,
    })
  })
}
</script>

<style module>
.workspace {
  display: grid;
  grid-template-columns: minmax(16rem, 0.95fr) minmax(18rem, 1.15fr);
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.left,
.right {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  min-height: 0;
}

.left {
  overflow: hidden;
}

.right {
  overflow: hidden;
}

.hint {
  margin: 0;
  flex-shrink: 0;
  font-size: 0.92rem;
  color: var(--color-muted);
}

.pickedHead {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.75rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.chainPane {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel, var(--color-bg));
  padding: 0.65rem 0.75rem;
}

.dividerBtn {
  flex-shrink: 0;
  width: 100%;
  border: 1px dashed var(--color-border-strong);
  background: color-mix(in srgb, var(--color-gold-soft) 8%, var(--color-bg));
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.55rem 0.75rem;
}

.dividerBtn:hover {
  border-color: var(--color-gold-soft);
  background: color-mix(in srgb, var(--color-gold-soft) 14%, var(--color-bg));
}

.dragHint {
  font-size: 0.8rem;
  opacity: 0.75;
}

@media (max-width: 820px) {
  .workspace {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .left,
  .right {
    overflow: visible;
  }

  .chainPane {
    overflow: visible;
  }
}
</style>
