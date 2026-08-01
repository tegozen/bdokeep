<template>
  <div v-if="proposals.length" :class="$style.list">
    <article v-for="item in proposals" :key="item.id" :class="$style.draft">
      <BorderSparkler />
      <header :class="$style.head">
        <div :class="$style.meta">
          <span>Черновик</span>
          <span v-if="item.author_label">{{ item.author_label }}</span>
          <span>{{ formatDate(item.created_at) }}</span>
          <span v-if="modeLabel(item.section)">{{ modeLabel(item.section) }}</span>
        </div>
        <div :class="$style.actions">
          <UiButton
            v-if="isSummary(item.section)"
            variant="ghost"
            size="sm"
            type="button"
            :disabled="acting === item.id"
            @click="startEdit(item)"
          >
            Редактировать
          </UiButton>
          <UiButton
            size="sm"
            type="button"
            :disabled="acting === item.id"
            @click="onApprove(item)"
          >
            Одобрить
          </UiButton>
          <UiButton
            variant="danger"
            size="sm"
            type="button"
            :disabled="acting === item.id"
            @click="onReject(item.id)"
          >
            Отклонить
          </UiButton>
        </div>
      </header>

      <div :class="$style.scrollCard">
        <ProposalSectionPreview
          :item="item"
          :muted-class="$style.muted"
          :text-class="$style.text"
          :tabs-class="$style.presetTabs"
          :tab-class="$style.presetTab"
          :tab-on-class="$style.presetTabOn"
          :buff-list-class="$style.buffList"
          :buff-item-class="$style.buffItem"
          :icon-class="$style.icon"
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
import { ref } from 'vue'
import {
  approveProposal,
  rejectProposal,
  type PendingProposal,
} from '@/features/superadmin-auth'
import BorderSparkler from './BorderSparkler.vue'
import ProposalSectionPreview from './ProposalSectionPreview.vue'
import ReviewSummaryModal from './ReviewSummaryModal.vue'
import { UiButton } from '@/shared/ui'

const props = defineProps<{
  proposals: PendingProposal[]
}>()

const emit = defineEmits<{
  changed: [action: 'approve' | 'reject']
  'optimistic-remove': [item: PendingProposal]
  'optimistic-restore': [item: PendingProposal]
}>()

const acting = ref<string | null>(null)
const editingId = ref<string | null>(null)
const editText = ref('')

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
    return new Date(iso).toLocaleString('ru-RU')
  } catch {
    return iso
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
    alert(msg || 'Ошибка одобрения')
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
    alert(msg || 'Ошибка отклонения')
  } finally {
    acting.value = null
  }
}
</script>

<style module>
.list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.draft {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--color-gold) 35%, var(--color-border));
  border-radius: 0.45rem;
  background: color-mix(in srgb, var(--color-gold) 6%, var(--color-bg-elevated));
  padding: 0.75rem 0.85rem 0.85rem;
  overflow: hidden;
}

.head {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1 1 auto;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--color-muted);
}

.actions {
  display: flex;
  flex-wrap: nowrap;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
}

.scrollCard {
  max-height: min(420px, 55vh);
  overflow: auto;
  padding-right: 0.15rem;
}

.muted {
  color: var(--color-muted);
  font-size: 0.88rem;
}

.text {
  font-size: 0.92rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

.presetTabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.55rem;
}

.presetTab {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: transparent;
  color: var(--color-muted);
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  cursor: pointer;
}

.presetTabOn {
  border-color: color-mix(in srgb, var(--color-gold) 55%, var(--color-border));
  color: var(--color-ink);
  background: color-mix(in srgb, var(--color-gold) 12%, transparent);
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
