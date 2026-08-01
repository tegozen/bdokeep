<template>
  <div :class="['mx-auto w-[min(100%-2rem,960px)]', $style.page]">
    <header :class="$style.header">
      <h1 :class="$style.h1">Предложения гайдов</h1>
    </header>

    <form v-if="!authed" :class="$style.login" @submit.prevent="login">
      <label :class="$style.label">
        Пароль админа
        <input v-model="password" type="password" :class="$style.input" required autocomplete="current-password">
      </label>
      <p v-if="loginError" :class="$style.error">{{ loginError }}</p>
      <button type="submit" :class="$style.primary" :disabled="busy">Войти</button>
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
        <button type="button" :class="$style.ghost" :disabled="loading" @click="load">
          Обновить
        </button>
      </div>

      <p v-if="loading" :class="$style.muted">Загрузка…</p>
      <p v-else-if="!items.length" :class="$style.muted">Нет предложений.</p>

      <ul v-else :class="$style.list">
        <li v-for="item in items" :key="item.id" :class="$style.card">
          <div :class="$style.cardHead">
            <strong>{{ item.class_slug }}</strong>
            <span :class="$style.badge">{{ sectionLabel(item.section) }}</span>
            <span :class="$style.muted">{{ formatDate(item.created_at) }}</span>
            <span v-if="item.author_label" :class="$style.muted">· {{ item.author_label }}</span>
            <span :class="$style.status">{{ statusLabel(item.status) }}</span>
          </div>

          <div v-if="isCombo(item.section)" :class="$style.preview">
            <ComboChain
              v-if="comboPreview[item.id]?.length"
              :steps="comboPreview[item.id]!"
              label="Предложенная комба"
            />
            <p v-else-if="comboPreview[item.id] === undefined" :class="$style.muted">
              Загрузка скиллов…
            </p>
            <p v-else :class="$style.muted">Нет скиллов в предложении</p>
          </div>
          <div v-else-if="isBuffs(item.section)" :class="$style.crystalPreview">
            <p v-if="buffPreview[item.id] === undefined" :class="$style.muted">
              Загрузка бафов…
            </p>
            <template v-else>
              <div :class="$style.presetTabs" role="tablist">
                <button
                  v-for="p in crystalPresetTabs"
                  :key="p.id"
                  type="button"
                  role="tab"
                  :class="[
                    $style.presetTab,
                    buffPreviewPreset[item.id] === p.id && $style.presetTabOn,
                  ]"
                  @click="buffPreviewPreset[item.id] = p.id"
                >
                  {{ p.label }}
                </button>
              </div>
              <ul v-if="buffsFor(item.id).length" :class="$style.buffList">
                <li v-for="row in buffsFor(item.id)" :key="row.id" :class="$style.buffItem">
                  <img
                    v-if="row.buffs?.icon_url"
                    :src="row.buffs.icon_url"
                    alt=""
                    :class="$style.buffIcon"
                    loading="lazy"
                  >
                  <span>{{ row.buffs?.name_ru || 'Баф' }}</span>
                </li>
              </ul>
              <p v-else :class="$style.muted">Нет бафов в этом пресете</p>
            </template>
          </div>
          <div v-else-if="isCrystals(item.section)" :class="$style.crystalPreview">
            <p v-if="crystalPreview[item.id] === undefined" :class="$style.muted">
              Загрузка кристаллов…
            </p>
            <template v-else>
              <div :class="$style.presetTabs" role="tablist">
                <button
                  v-for="p in crystalPresetTabs"
                  :key="p.id"
                  type="button"
                  role="tab"
                  :class="[$style.presetTab, previewPreset[item.id] === p.id && $style.presetTabOn]"
                  @click="previewPreset[item.id] = p.id"
                >
                  {{ p.label }}
                </button>
              </div>
              <p
                v-if="!Object.keys(crystalFilledFor(item.id)).length"
                :class="$style.muted"
              >
                Нет кристаллов в этом пресете
              </p>
              <CrystalBoard v-else :filled="crystalFilledFor(item.id)" />
            </template>
          </div>
          <div v-else-if="isRelics(item.section)" :class="$style.crystalPreview">
            <p v-if="relicPreview[item.id] === undefined" :class="$style.muted">
              Загрузка реликвий…
            </p>
            <template v-else>
              <div :class="$style.presetTabs" role="tablist">
                <button
                  v-for="p in crystalPresetTabs"
                  :key="p.id"
                  type="button"
                  role="tab"
                  :class="[
                    $style.presetTab,
                    relicPreviewPreset[item.id] === p.id && $style.presetTabOn,
                  ]"
                  @click="relicPreviewPreset[item.id] = p.id"
                >
                  {{ p.label }}
                </button>
              </div>
              <RelicBoard :filled="relicFilledFor(item.id)" />
            </template>
          </div>
          <ul v-else-if="isVideos(item.section)" :class="$style.videoPreview">
            <li
              v-for="(v, i) in item.payload?.videos ?? []"
              :key="`${item.id}-${i}`"
              :class="$style.videoItem"
            >
              <span>{{ v.title || `Видео ${i + 1}` }}</span>
              <a
                v-if="v.youtube_url"
                :href="v.youtube_url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ v.youtube_url }}</a>
            </li>
            <li v-if="!(item.payload?.videos ?? []).length" :class="$style.muted">Нет видео</li>
          </ul>
          <UiMarkdownPreview
            v-else-if="item.section === 'summary'"
            :id="`admin-summary-${item.id}`"
            :model-value="textOf(item)"
            :class="$style.text"
          />
          <pre v-else :class="$style.text">{{ textOf(item) }}</pre>

          <div v-if="item.status === 'pending'" :class="$style.actions">
            <button
              v-if="item.section === 'summary'"
              type="button"
              :class="$style.ghost"
              :disabled="acting === item.id"
              @click="startEdit(item)"
            >
              Редактировать
            </button>
            <button
              type="button"
              :class="$style.primary"
              :disabled="acting === item.id"
              @click="approve(item)"
            >
              Одобрить
            </button>
            <button
              type="button"
              :class="$style.danger"
              :disabled="acting === item.id"
              @click="reject(item.id)"
            >
              Отклонить
            </button>
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
import { onMounted, reactive, ref, watch } from 'vue'
import type { Buff, Skill } from '@/entities/class'
import { resolveCatalogIds } from '@/shared/api/catalogResolve'
import { ReviewSummaryModal } from '@/features/superadmin-auth'
import { CRYSTAL_PRESETS, type CrystalPresetId, usePendingSummary, useSuperadmin } from '@/shared/lib'
import { UiMarkdownPreview } from '@/shared/ui'
import { ComboChain } from '@/widgets/combo-chain'
import { CrystalBoard, type CrystalFill } from '@/widgets/crystal-board'
import { RelicBoard, type RelicFill } from '@/widgets/relic-board'

useHead({ title: 'Админ — предложения | BDO Keep' })

type Proposal = {
  id: string
  class_id: string
  class_slug: string
  section: string
  payload: {
    text?: string
    skill_ids?: string[]
    buff_ids?: string[]
    buffs?: Array<{ preset?: string; buff_id: string }>
    mode?: string
    crystals?: Array<{ preset?: string; slot: string; item_id: string }>
    relics?: Array<{ preset?: string; slot: string; item_id: string }>
    lightstones?: Array<{ preset?: string; slot: string; item_id: string }>
    videos?: Array<{ title?: string; youtube_url: string }>
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
const { refresh: refreshPendingSummary } = usePendingSummary()

const crystalPresetTabs = CRYSTAL_PRESETS
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
const comboPreview = reactive<Record<string, Array<{ id: string; skills: Skill | null }> | null>>(
  {},
)
const buffPreview = reactive<
  Record<string, Partial<Record<CrystalPresetId, Array<{ id: string; buffs: Buff | null }>>> | null>
>({})
const buffPreviewPreset = reactive<Record<string, CrystalPresetId>>({})
const crystalPreview = reactive<
  Record<string, Partial<Record<CrystalPresetId, Record<string, CrystalFill>>> | null>
>({})
const previewPreset = reactive<Record<string, CrystalPresetId>>({})
const relicPreview = reactive<
  Record<string, Partial<Record<CrystalPresetId, Record<string, RelicFill>>> | null>
>({})
const relicPreviewPreset = reactive<Record<string, CrystalPresetId>>({})

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
  switch (section) {
    case 'summary':
      return 'Суть'
    case 'buffs':
      return 'Забаф'
    case 'crystals':
      return 'Инкрустация'
    case 'relics':
      return 'Реликвии'
    case 'videos':
      return 'Видео'
    case 'morphs':
      return 'Морфы'
    case 'combo_awakening':
      return 'Комба · пробуждение'
    case 'combo_succession':
      return 'Комба · наследие'
    default:
      return section
  }
}

function isCombo(section: string) {
  return section === 'combo_awakening' || section === 'combo_succession'
}

function isBuffs(section: string) {
  return section === 'buffs'
}

function isCrystals(section: string) {
  return section === 'crystals'
}

function isRelics(section: string) {
  return section === 'relics'
}

function isVideos(section: string) {
  return section === 'videos'
}

function textOf(item: Proposal) {
  return String(item.payload?.text || '')
}

function crystalFilledFor(proposalId: string): Record<string, CrystalFill> {
  const preset = previewPreset[proposalId] || 't1'
  return crystalPreview[proposalId]?.[preset] || {}
}

function relicFilledFor(proposalId: string): Record<string, RelicFill> {
  const preset = relicPreviewPreset[proposalId] || 't1'
  return relicPreview[proposalId]?.[preset] || {}
}

function buffsFor(proposalId: string): Array<{ id: string; buffs: Buff | null }> {
  const preset = buffPreviewPreset[proposalId] || 't1'
  return buffPreview[proposalId]?.[preset] || []
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU')
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
    await Promise.all([
      hydrateComboPreviews(),
      hydrateBuffPreviews(),
      hydrateCrystalPreviews(),
      hydrateRelicPreviews(),
    ])
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

async function hydrateComboPreviews() {
  for (const key of Object.keys(comboPreview)) delete comboPreview[key]
  const combos = items.value.filter((i) => isCombo(i.section))
  await Promise.all(
    combos.map(async (item) => {
      const ids = item.payload?.skill_ids ?? []
      if (!ids.length) {
        comboPreview[item.id] = []
        return
      }
      try {
        const { skills } = await resolveCatalogIds({ skills: ids })
        const byId = new Map(skills.map((s) => [s.id, s as Skill]))
        comboPreview[item.id] = ids.map((id) => ({
          id,
          skills: byId.get(id) ?? null,
        }))
      } catch {
        comboPreview[item.id] = []
      }
    }),
  )
}

async function hydrateBuffPreviews() {
  for (const key of Object.keys(buffPreview)) delete buffPreview[key]
  for (const key of Object.keys(buffPreviewPreset)) delete buffPreviewPreset[key]
  const list = items.value.filter((i) => isBuffs(i.section))
  await Promise.all(
    list.map(async (item) => {
      buffPreviewPreset[item.id] = 't1'
      const entries =
        item.payload?.buffs?.length
          ? item.payload.buffs
          : (item.payload?.buff_ids ?? []).map((id) => ({
              preset: 't1' as const,
              buff_id: id,
            }))
      if (!entries.length) {
        buffPreview[item.id] = {}
        return
      }
      try {
        const ids = entries.map((e) => e.buff_id)
        const { buffs } = await resolveCatalogIds({ buffs: ids })
        const byId = new Map(buffs.map((b) => [b.id, b as Buff]))
        const byPreset: Partial<
          Record<CrystalPresetId, Array<{ id: string; buffs: Buff | null }>>
        > = {}
        for (const entry of entries) {
          const preset = (entry.preset || 't1') as CrystalPresetId
          if (!byPreset[preset]) byPreset[preset] = []
          byPreset[preset]!.push({
            id: entry.buff_id,
            buffs: byId.get(entry.buff_id) ?? null,
          })
        }
        buffPreview[item.id] = byPreset
      } catch {
        buffPreview[item.id] = {}
      }
    }),
  )
}

async function hydrateCrystalPreviews() {
  for (const key of Object.keys(crystalPreview)) delete crystalPreview[key]
  for (const key of Object.keys(previewPreset)) delete previewPreset[key]
  const list = items.value.filter((i) => isCrystals(i.section))
  await Promise.all(
    list.map(async (item) => {
      previewPreset[item.id] = 't1'
      const entries = item.payload?.crystals ?? []
      if (!entries.length) {
        crystalPreview[item.id] = {}
        return
      }
      try {
        const ids = entries.map((e) => e.item_id)
        const { items } = await resolveCatalogIds({ items: ids })
        const byId = new Map(
          items
            .filter((c) => c.item_type === 'crystal')
            .map((c) => [
              c.id,
              { id: c.id, name_ru: c.name_ru, icon_url: c.icon_url } as CrystalFill,
            ]),
        )
        const byPreset: Partial<Record<CrystalPresetId, Record<string, CrystalFill>>> = {}
        for (const entry of entries) {
          const fill = byId.get(entry.item_id)
          if (!fill) continue
          const preset = (entry.preset || 't1') as CrystalPresetId
          if (!byPreset[preset]) byPreset[preset] = {}
          byPreset[preset]![entry.slot] = fill
        }
        crystalPreview[item.id] = byPreset
      } catch {
        crystalPreview[item.id] = {}
      }
    }),
  )
}

async function hydrateRelicPreviews() {
  for (const key of Object.keys(relicPreview)) delete relicPreview[key]
  for (const key of Object.keys(relicPreviewPreset)) delete relicPreviewPreset[key]
  const list = items.value.filter((i) => isRelics(i.section))
  await Promise.all(
    list.map(async (item) => {
      relicPreviewPreset[item.id] = 't1'
      const relicEntries = item.payload?.relics ?? []
      const lightEntries = item.payload?.lightstones ?? []
      const entries = [...relicEntries, ...lightEntries]
      if (!entries.length) {
        relicPreview[item.id] = {}
        return
      }
      try {
        const ids = entries.map((e) => e.item_id)
        const { items } = await resolveCatalogIds({ items: ids })
        const byId = new Map(
          items
            .filter((c) => c.item_type === 'relic' || c.item_type === 'lightstone')
            .map((c) => [
              c.id,
              { id: c.id, name_ru: c.name_ru, icon_url: c.icon_url } as RelicFill,
            ]),
        )
        const byPreset: Partial<Record<CrystalPresetId, Record<string, RelicFill>>> = {}
        for (const entry of entries) {
          const fill = byId.get(entry.item_id)
          if (!fill) continue
          const preset = (entry.preset || 't1') as CrystalPresetId
          if (!byPreset[preset]) byPreset[preset] = {}
          byPreset[preset]![entry.slot] = fill
        }
        relicPreview[item.id] = byPreset
      } catch {
        relicPreview[item.id] = {}
      }
    }),
  )
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
  cancelEdit()
  await load()
  await refreshPendingSummary()
}

async function approve(item: Proposal) {
  acting.value = item.id
  try {
    await $fetch(`/api/admin/proposals/${item.id}/approve`, { method: 'POST' })
    await load()
    await refreshPendingSummary()
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    alert(msg || 'Ошибка одобрения')
  } finally {
    acting.value = null
  }
}

async function reject(id: string) {
  acting.value = id
  try {
    await $fetch(`/api/admin/proposals/${id}/reject`, { method: 'POST', body: {} })
    if (editingId.value === id) cancelEdit()
    await load()
    await refreshPendingSummary()
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    alert(msg || 'Ошибка отклонения')
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
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0.5rem 0.65rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.chip,
.ghost,
.primary,
.danger {
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

.primary {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.danger {
  border-color: color-mix(in srgb, var(--color-danger) 50%, transparent);
  color: var(--color-danger);
}

.ghost {
  color: var(--color-muted);
}

.list {
  margin: 0;
  display: grid;
  gap: 1rem;
  list-style: none;
  padding: 0;
}

.card {
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem;
}

.cardHead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
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
  white-space: pre-wrap;
  font: inherit;
  color: var(--color-ink);
}

.preview {
  margin-bottom: 0.5rem;
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

.presetTabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.presetTab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  padding: 0.3rem 0.55rem;
}

.presetTabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
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
