<template>
  <div :class="['mx-auto w-[min(100%-2rem,960px)]', $style.page]">
    <header :class="$style.header">
      <h1 :class="$style.h1">Предложения гайдов</h1>
      <NuxtLink v-if="authed" to="/admin/feedback" :class="$style.link">
        Обратная связь
      </NuxtLink>
    </header>

    <form v-if="!authed" :class="$style.login" @submit.prevent="login">
      <label :class="$style.label">
        Пароль админа
        <input v-model="password" type="password" :class="$style.input" required autocomplete="current-password">
      </label>
      <p v-if="loginError" :class="$style.error">{{ loginError }}</p>
      <UiButton type="submit" :disabled="busy">Войти</UiButton>
    </form>

    <template v-else>
      <div :class="$style.filters">
        <button
          v-for="opt in statusOpts"
          :key="opt.value"
          type="button"
          :class="[$style.chip, status === opt.value && $style.chipOn]"
          @click="setStatus(opt.value)"
        >
          {{ opt.label }}
        </button>
        <button
          v-if="classFilter"
          type="button"
          :class="[$style.chip, $style.chipOn]"
          @click="clearClassFilter"
        >
          Класс: {{ classFilter }} ×
        </button>
        <UiButton variant="ghost" type="button" :disabled="loading" @click="load">
          Обновить
        </UiButton>
      </div>

      <p v-if="loading" :class="$style.muted">Загрузка…</p>
      <p v-else-if="!items.length" :class="$style.muted">Нет предложений.</p>

      <ul v-else :class="$style.list">
        <li v-for="item in items" :key="item.id" :class="$style.card">
          <div :class="$style.cardHead">
            <strong>{{ item.class_slug }}</strong>
            <span :class="$style.badge">{{ sectionLabel(item.section) }}</span>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { sectionLabel as domainSectionLabel } from '@domain'
import { ProposalSectionPreview, ReviewSummaryModal } from '@/features/superadmin-auth'
import { useConfirm, usePendingSummary, useSuperadmin } from '@/shared/lib'
import { UiButton } from '@/shared/ui'

useHead({ title: 'Админ — предложения | BDO Keep' })

type Proposal = {
  id: string
  class_id: string
  class_slug: string
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

const route = useRoute()
const router = useRouter()
const { isSuperadmin } = useSuperadmin()
const { alert, confirm } = useConfirm()
const { refresh: refreshPendingSummary, adjust: adjustPendingSummary } = usePendingSummary()

const authed = ref(false)
const password = ref('')
const loginError = ref('')
const busy = ref(false)
const loading = ref(false)
const items = ref<Proposal[]>([])
const status = ref(
  typeof route.query.status === 'string' && route.query.status
    ? route.query.status
    : 'pending',
)
const classFilter = ref(
  typeof route.query.class === 'string' ? route.query.class.trim().toLowerCase() : '',
)
const acting = ref<string | null>(null)
const editingId = ref<string | null>(null)
const editText = ref('')

const statusOpts = [
  { value: 'pending', label: 'Ожидает' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
  { value: 'all', label: 'Все' },
]

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

function syncQuery() {
  const query: Record<string, string> = {}
  if (status.value && status.value !== 'pending') query.status = status.value
  else if (status.value === 'pending') query.status = 'pending'
  if (classFilter.value) query.class = classFilter.value
  void router.replace({ query })
}

function clearClassFilter() {
  classFilter.value = ''
  syncQuery()
  if (authed.value) void load()
}

function sectionLabel(section: string) {
  return domainSectionLabel(section)
}

function isSummary(section: string) {
  return section === 'summary_awakening' || section === 'summary_succession'
}

function textOf(item: Proposal) {
  return String(item.payload?.text || '')
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
    return iso
  }
}

async function checkMe() {
  try {
    const res = await $fetch<{ ok: boolean }>('/api/admin/me')
    authed.value = Boolean(res.ok)
    isSuperadmin.value = authed.value
  } catch {
    authed.value = false
  }
}

async function login() {
  loginError.value = ''
  busy.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    password.value = ''
    authed.value = true
    isSuperadmin.value = true
    await refreshPendingSummary()
    await load()
  } catch {
    loginError.value = 'Неверный пароль'
  } finally {
    busy.value = false
  }
}

async function load() {
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
    if (code === 401) {
      authed.value = false
      isSuperadmin.value = false
    }
    items.value = []
  } finally {
    loading.value = false
  }
}

function setStatus(value: string) {
  status.value = value
  syncQuery()
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
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    await alert({
      title: 'Ошибка',
      message: msg || 'Не удалось применить',
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

watch(status, () => {
  if (authed.value) load()
})

onMounted(async () => {
  await checkMe()
  if (authed.value) {
    await refreshPendingSummary()
    await load()
  }
})
</script>

<style module>
.page {
  padding: 2rem 0 4rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.h1 {
  margin: 0;
  font-size: 1.6rem;
}

.link {
  color: var(--color-gold);
  font-size: 0.9rem;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.login {
  display: grid;
  gap: 0.85rem;
  max-width: 22rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1.25rem;
}

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.input {
  box-sizing: border-box;
  min-height: 2rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  line-height: 1;
  padding: 0 0.65rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.chip {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  padding: 0.4rem 0.75rem;
}

.chipOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
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
