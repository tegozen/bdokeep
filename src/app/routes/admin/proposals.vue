<template>
  <div :class="$style.page">
    <p v-if="loading" :class="$style.muted">Загрузка…</p>
    <p v-else-if="!items.length" :class="$style.muted">Нет предложений.</p>

    <ul v-else :class="$style.list">
      <li v-for="item in items" :key="item.id" :class="$style.card">
        <div :class="$style.cardHead">
          <strong>{{ item.class_name_ru || item.class_slug }}</strong>
          <span :class="$style.badge">{{ sectionLabel(item) }}</span>
            <span v-if="item.author_label" :class="$style.muted">· {{ item.author_label }}</span>
            <span :class="$style.status">{{ statusLabel(item.status) }}</span>
          </div>
          <div :class="$style.metaDates">
            <span>предложено {{ formatDate(item.created_at) }}</span>
            <span v-if="item.reviewed_at">
              · {{ item.status === 'rejected' ? 'отклонено' : 'одобрено' }}
              {{ formatDate(item.reviewed_at) }}
            </span>
          </div>

          <div :class="$style.preview">
            <ProposalSectionPreview
              :item="item"
              :muted-class="$style.muted"
              :text-class="$style.text"
              :buff-list-class="$style.buffList"
              :buff-item-class="$style.buffItem"
              :icon-class="$style.buffIcon"
            />
          </div>

          <div v-if="item.status === 'pending'" :class="$style.actions">
            <UiButton
              v-if="isSummary(item.section)"
              variant="ghost"
              type="button"
              :disabled="acting === item.id"
              @click="startEdit(item)"
            >
              Редактировать
            </UiButton>
            <UiButton
              type="button"
              :disabled="acting === item.id"
              aria-label="Одобрить"
              @click="approve(item)"
            >
              ✓
            </UiButton>
            <UiButton
              variant="danger"
              type="button"
              :disabled="acting === item.id"
              aria-label="Отклонить"
              @click="reject(item.id)"
            >
              ✕
            </UiButton>
          </div>
          <div v-else-if="item.status === 'approved'" :class="$style.actions">
            <UiButton
              type="button"
              :disabled="acting === item.id"
              @click="reapply(item)"
            >
              Применить на сайт
            </UiButton>
          </div>
          <p v-if="item.review_note" :class="$style.muted">Заметка: {{ item.review_note }}</p>
        </li>
      </ul>

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
import { onMounted, ref, watch } from 'vue'
import { sectionLabel as domainSectionLabel } from '@domain'
import {
  ProposalSectionPreview,
  ReviewSummaryModal,
  useAdminProposalFilters,
  usePendingSummary,
  useSuperadmin,
} from '@/features/superadmin-auth'
import { formatRuDateTime, parseApiError, useConfirm } from '@/shared/lib'
import { UiButton } from '@/shared/ui'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — заявки | BDO Keep' })

type Proposal = {
  id: string
  class_id: string
  class_slug: string
  class_name_ru?: string | null
  section: string
  payload: {
    text?: string
    skill_ids?: string[]
    combos?: Array<{
      title?: string
      notes?: string
      skill_ids: string[]
    }>
    buff_ids?: string[]
    buffs?: Array<{ preset?: string; buff_id: string }>
    mode?: string
    kind?: string
    crystals?: Array<{ preset?: string; slot: string; item_id: string }>
    relics?: Array<{ preset?: string; slot: string; item_id: string }>
    lightstones?: Array<{ preset?: string; slot: string; item_id: string }>
    hardening?: Array<{ preset?: string; slot: string; item_id: string }>
    videos?: Array<{ title?: string; youtube_url: string; status?: string }>
    morphs?: Array<{
      preset?: string
      slot_level: number
      skill_id: string
      effect_ids: string[]
    }>
  }
  author_label: string | null
  status: string
  created_at: string
  reviewed_at: string | null
  review_note: string | null
}

const { isStaff, refresh, loseSession } = useSuperadmin()
const { alert, confirm } = useConfirm()
const { refresh: refreshPendingSummary, adjust: adjustPendingSummary } = usePendingSummary()
const { status, classFilter } = useAdminProposalFilters()

const loading = ref(false)
const items = ref<Proposal[]>([])
const acting = ref<string | null>(null)
const editingId = ref<string | null>(null)
const editText = ref('')

function statusLabel(value: string) {
  switch (value) {
    case 'pending':
      return 'Ожидает'
    case 'approved':
      return 'Одобрено'
    case 'rejected':
      return 'Отклонено'
    default:
      return value
  }
}

function sectionLabel(item: Proposal) {
  const base = domainSectionLabel(item.section)
  if (
    item.section === 'combo_awakening' ||
    item.section === 'combo_succession' ||
    item.section === 'summary_awakening' ||
    item.section === 'summary_succession'
  ) {
    const kind = item.payload?.kind === 'pve' ? 'ПВЕ' : 'ПВП'
    return `${base} · ${kind}`
  }
  return base
}

function isSummary(section: string) {
  return section === 'summary_awakening' || section === 'summary_succession'
}

function textOf(item: Proposal) {
  return String(item.payload?.text || '')
}

const formatDate = formatRuDateTime

async function load() {
  if (!isStaff.value) return
  loading.value = true
  try {
    const query: Record<string, string> = { status: status.value }
    if (classFilter.value && /^[a-z0-9-]+$/.test(classFilter.value)) {
      query.class_slug = classFilter.value
    }
    const res = await $fetch<{ items: Proposal[] }>('/api/admin/proposals', { query })
    items.value = res.items ?? []
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'statusCode' in e
        ? Number((e as { statusCode?: number }).statusCode)
        : 0
    items.value = []
    if (code === 401) {
      await loseSession()
      return
    }
    await alert({ title: 'Ошибка', message: parseApiError(e, 'Не удалось загрузить') })
  } finally {
    loading.value = false
  }
}

function startEdit(item: Proposal) {
  editingId.value = item.id
  editText.value = textOf(item)
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

async function onEditedApproved() {
  const id = editingId.value
  const idx = id ? items.value.findIndex((i) => i.id === id) : -1
  const removed = idx >= 0 ? items.value[idx]! : undefined
  cancelEdit()
  if (removed && idx >= 0) {
    items.value.splice(idx, 1)
    adjustPendingSummary(-1, removed.class_slug)
  }
  void refreshPendingSummary()
}

async function approve(item: Proposal) {
  acting.value = item.id
  const idx = items.value.findIndex((i) => i.id === item.id)
  const removed = idx >= 0 ? items.value[idx]! : undefined
  if (idx >= 0) items.value.splice(idx, 1)
  adjustPendingSummary(-1, item.class_slug)
  try {
    await $fetch(`/api/admin/proposals/${item.id}/approve`, { method: 'POST' })
    void refreshPendingSummary()
  } catch (e: unknown) {
    if (removed && idx >= 0) {
      items.value.splice(idx, 0, removed)
      adjustPendingSummary(1, item.class_slug)
    }
    await alert({
      title: 'Ошибка',
      message: parseApiError(e, 'Ошибка одобрения'),
    })
  } finally {
    acting.value = null
  }
}

async function reapply(item: Proposal) {
  const ok = await confirm({
    title: 'Применить на сайт?',
    message: `Версия от ${item.author_label || '—'} (${formatDate(item.created_at)}) станет текущей для этого раздела.`,
    confirmLabel: 'Применить',
  })
  if (!ok) return

  acting.value = item.id
  try {
    await $fetch(`/api/admin/proposals/${item.id}/reapply`, { method: 'POST' })
    item.reviewed_at = new Date().toISOString()
    item.review_note = 'повторно применено'
    // Keep approve-order sort: move to top of approved list.
    if (status.value === 'approved' || status.value === 'rejected' || status.value === 'all') {
      const idx = items.value.findIndex((i) => i.id === item.id)
      if (idx > 0) {
        items.value.splice(idx, 1)
        items.value.unshift(item)
      }
    }
  } catch (e: unknown) {
    await alert({
      title: 'Ошибка',
      message: parseApiError(e, 'Не удалось применить'),
    })
  } finally {
    acting.value = null
  }
}

async function reject(id: string) {
  acting.value = id
  const idx = items.value.findIndex((i) => i.id === id)
  const removed = idx >= 0 ? items.value[idx]! : undefined
  if (idx >= 0) items.value.splice(idx, 1)
  if (removed) adjustPendingSummary(-1, removed.class_slug)
  try {
    await $fetch(`/api/admin/proposals/${id}/reject`, { method: 'POST', body: {} })
    if (editingId.value === id) cancelEdit()
    void refreshPendingSummary()
  } catch (e: unknown) {
    if (removed && idx >= 0) {
      items.value.splice(idx, 0, removed)
      adjustPendingSummary(1, removed.class_slug)
    }
    await alert({
      title: 'Ошибка',
      message: parseApiError(e, 'Ошибка отклонения'),
    })
  } finally {
    acting.value = null
  }
}

watch([status, classFilter], () => {
  if (isStaff.value) void load()
})

watch(isStaff, (ok) => {
  if (ok) {
    void refreshPendingSummary()
    void load()
  } else {
    items.value = []
  }
})

onMounted(async () => {
  await refresh()
  if (isStaff.value) {
    await refreshPendingSummary()
    await load()
  }
})
</script>

<style module>
.page {
  display: grid;
  gap: 1rem;
}

.list {
  margin: 0;
  display: grid;
  gap: 1rem;
  list-style: none;
  padding: 0;
}

.card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem;
}

.cardHead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.35rem;
}

.metaDates {
  margin-bottom: 0.75rem;
  font-size: 0.82rem;
  color: var(--color-muted);
}

.badge {
  border: 1px solid var(--color-border);
  color: var(--color-gold-soft);
  font-size: 0.82rem;
  padding: 0.1rem 0.45rem;
}

.status {
  margin-left: auto;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-muted);
}

.text {
  margin: 0;
  max-width: 100%;
  min-width: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font: inherit;
  color: var(--color-ink);
}

.preview {
  margin-bottom: 0.5rem;
  min-width: 0;
  max-width: 100%;
  max-height: min(28rem, 60vh);
  overflow: auto;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.buffList {
  margin: 0 0 0.5rem;
  display: grid;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
}

.buffItem {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
}

.crystalPreview {
  margin-bottom: 0.75rem;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.videoPreview {
  margin: 0 0 0.75rem;
  display: grid;
  gap: 0.45rem;
  list-style: none;
  padding: 0;
}

.videoItem {
  display: grid;
  gap: 0.15rem;
  font-size: 0.88rem;
}

.videoItem a {
  color: var(--color-gold);
  word-break: break-all;
}

.buffIcon {
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}
</style>
