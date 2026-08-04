<template>
  <div v-if="proposals.length" :class="$style.list">
    <!-- Sparkler on the carousel frame so ancestors with overflow don't clip the bleed. -->
    <BorderSparkler />

    <article v-if="current" :class="$style.draft">
      <header v-if="proposals.length > 1" :class="$style.nav">
        <UiButton
          variant="ghost"
          size="sm"
          type="button"
          :disabled="!canPrev || acting === current.id"
          aria-label="Предыдущий черновик"
          @click="goPrev"
        >
          ←
        </UiButton>
        <span :class="$style.navMeta">
          Черновик {{ activeIndex + 1 }} / {{ proposals.length }}
        </span>
        <UiButton
          variant="ghost"
          size="sm"
          type="button"
          :disabled="!canNext || acting === current.id"
          aria-label="Следующий черновик"
          @click="goNext"
        >
          →
        </UiButton>
      </header>

      <header :class="$style.head">
        <div :class="$style.meta">
          <div :class="$style.metaLine">
            <span>Черновик</span>
            <span v-if="current.author_label">{{ current.author_label }}</span>
            <span v-if="modeLabel(current.section)">{{ modeLabel(current.section) }}</span>
          </div>
          <div :class="$style.metaDate">{{ formatDate(current.created_at) }}</div>
        </div>
        <div :class="$style.actions">
          <UiButton
            v-if="isSummary(current.section)"
            variant="ghost"
            size="sm"
            type="button"
            :disabled="acting === current.id"
            @click="startEdit(current)"
          >
            Редактировать
          </UiButton>
          <UiButton
            size="sm"
            type="button"
            :disabled="acting === current.id"
            aria-label="Одобрить"
            @click="onApprove(current)"
          >
            ✓
          </UiButton>
          <UiButton
            variant="danger"
            size="sm"
            type="button"
            :disabled="acting === current.id"
            aria-label="Отклонить"
            @click="onReject(current.id)"
          >
            ✕
          </UiButton>
        </div>
      </header>

      <div :class="$style.previewPane">
        <ProposalSectionPreview
          :key="current.id"
          pin-tabs
          :item="current"
          :muted-class="$style.muted"
          :text-class="$style.text"
          :buff-list-class="$style.buffList"
          :buff-item-class="$style.buffItem"
          :icon-class="$style.icon"
        />
      </div>

      <div
        v-if="proposals.length > 1"
        :class="$style.dots"
        role="tablist"
        aria-label="Черновики"
      >
        <button
          v-for="(item, i) in proposals"
          :key="item.id"
          type="button"
          role="tab"
          :aria-selected="i === activeIndex"
          :class="[$style.dot, i === activeIndex && $style.dotOn]"
          :aria-label="`Черновик ${i + 1}`"
          :disabled="acting === current.id"
          @click="activeIndex = i"
        />
      </div>
    </article>

    <ReviewSummaryModal
      :open="!!editingId"
      :proposal-id="editingId"
      :initial-text="editText"
      @close="cancelEdit"
      @approved="onEditedApproved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  approveProposal,
  rejectProposal,
  type PendingProposal,
} from '@/features/superadmin-auth'
import BorderSparkler from './BorderSparkler.vue'
import ProposalSectionPreview from './ProposalSectionPreview.vue'
import ReviewSummaryModal from './ReviewSummaryModal.vue'
import { formatRuDate, useConfirm } from '@/shared/lib'
import { UiButton } from '@/shared/ui'

const props = defineProps<{
  proposals: PendingProposal[]
}>()

const emit = defineEmits<{
  changed: [action: 'approve' | 'reject']
  'optimistic-remove': [item: PendingProposal]
  'optimistic-restore': [item: PendingProposal]
}>()

const { alert } = useConfirm()
const activeIndex = ref(0)
const acting = ref<string | null>(null)
const editingId = ref<string | null>(null)
const editText = ref('')

const current = computed(() => props.proposals[activeIndex.value] ?? null)
const canPrev = computed(() => activeIndex.value > 0)
const canNext = computed(() => activeIndex.value < props.proposals.length - 1)

watch(
  () => props.proposals.map((p) => p.id).join(','),
  () => {
    if (!props.proposals.length) {
      activeIndex.value = 0
      return
    }
    if (activeIndex.value >= props.proposals.length) {
      activeIndex.value = props.proposals.length - 1
    }
  },
)

function goPrev() {
  if (canPrev.value) activeIndex.value -= 1
}

function goNext() {
  if (canNext.value) activeIndex.value += 1
}

function isSummary(section: string) {
  return section === 'summary_awakening' || section === 'summary_succession'
}

function modeLabel(section: string) {
  if (
    section === 'combo_awakening' ||
    section === 'summary_awakening' ||
    section === 'videos_awakening'
  ) {
    return 'Пробуждение'
  }
  if (
    section === 'combo_succession' ||
    section === 'summary_succession' ||
    section === 'videos_succession'
  ) {
    return 'Наследие'
  }
  return ''
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(iso))
  } catch {
    return formatRuDate(iso)
  }
}

function startEdit(item: PendingProposal) {
  editingId.value = item.id
  editText.value = String(item.payload?.text || '')
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

function onEditedApproved() {
  const id = editingId.value
  const item = id ? props.proposals.find((p) => p.id === id) : undefined
  cancelEdit()
  if (item) emit('optimistic-remove', item)
  emit('changed', 'approve')
}

async function onApprove(item: PendingProposal) {
  acting.value = item.id
  emit('optimistic-remove', item)
  try {
    await approveProposal(item.id)
    emit('changed', 'approve')
  } catch (e: unknown) {
    emit('optimistic-restore', item)
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    await alert({
      title: 'Ошибка',
      message: msg || 'Ошибка одобрения',
    })
  } finally {
    acting.value = null
  }
}

async function onReject(id: string) {
  acting.value = id
  const item = props.proposals.find((p) => p.id === id)
  if (item) emit('optimistic-remove', item)
  try {
    await rejectProposal(id)
    if (editingId.value === id) cancelEdit()
    emit('changed', 'reject')
  } catch (e: unknown) {
    if (item) emit('optimistic-restore', item)
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    await alert({
      title: 'Ошибка',
      message: msg || 'Ошибка отклонения',
    })
  } finally {
    acting.value = null
  }
}
</script>

<style module>
.list {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  /* No own border — parent guide grids already draw the cell frame. */
  background: color-mix(in srgb, var(--color-gold) 6%, var(--color-bg-elevated));
  padding: 0.75rem 0.85rem 0.85rem;
  /* Must stay visible so BorderSparkler can bleed past the frame. */
  overflow: visible;
}

.draft {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  min-height: 0;
  overflow: visible;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.navMeta {
  flex: 1;
  text-align: center;
  font-size: 0.78rem;
  color: var(--color-muted);
}

.head {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
  /* Match UiButton size="sm" min-height. */
  height: 2rem;
  min-width: 0;
  flex: 1 1 auto;
  font-size: 0.78rem;
  line-height: 1rem;
  color: var(--color-muted);
}

.metaLine {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  min-width: 0;
  height: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metaLine > span:not(:last-child)::after {
  content: '·';
  margin-left: 0.55rem;
  margin-right: 0.55rem;
  opacity: 0.65;
}

.metaDate {
  height: 1rem;
  white-space: nowrap;
}

.actions {
  display: flex;
  flex-wrap: nowrap;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
}

.previewPane {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.dots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
}

.dot {
  width: 0.45rem;
  height: 0.45rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.dotOn {
  border-color: color-mix(in srgb, var(--color-gold) 55%, var(--color-border));
  background: color-mix(in srgb, var(--color-gold) 55%, transparent);
}

.muted {
  color: var(--color-muted);
  font-size: 0.88rem;
}

.text {
  max-width: 100%;
  min-width: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.buffList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.buffItem {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
}

.icon {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
  border-radius: 0.2rem;
}
</style>
