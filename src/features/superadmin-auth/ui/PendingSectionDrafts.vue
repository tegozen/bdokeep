<template>
  <div v-if="proposals.length" :class="$style.list">
    <article v-for="item in proposals" :key="item.id" :class="$style.draft">
      <BorderSparkler />
      <header :class="$style.head">
        <span :class="$style.tag">На модерации</span>
        <span :class="$style.meta">
          Черновик
          <template v-if="item.author_label"> · {{ item.author_label }}</template>
          · {{ formatDate(item.created_at) }}
          <template v-if="comboLabel(item.section)"> · {{ comboLabel(item.section) }}</template>
        </span>
        <div :class="$style.actions">
          <button
            type="button"
            :class="$style.approve"
            :disabled="acting === item.id"
            @click="onApprove(item.id)"
          >
            Approve
          </button>
          <button
            type="button"
            :class="$style.reject"
            :disabled="acting === item.id"
            @click="onReject(item.id)"
          >
            Reject
          </button>
        </div>
      </header>

      <div :class="$style.scrollCard">
        <!-- summary -->
        <p v-if="item.section === 'summary'" :class="$style.text">
          {{ String(payload(item).text || '') }}
        </p>

        <!-- combo -->
        <template v-else-if="isCombo(item.section)">
          <ComboChain
            v-if="comboSteps[item.id]?.length"
            :steps="comboSteps[item.id]!"
            :label="comboLabel(item.section) || 'Комба'"
          />
          <p v-else-if="comboSteps[item.id] === undefined" :class="$style.muted">Загрузка…</p>
          <p v-else :class="$style.muted">Нет скиллов</p>
        </template>

        <!-- buffs -->
        <template v-else-if="item.section === 'buffs'">
          <div v-if="buffByPreset[item.id]" :class="$style.presetTabs" role="tablist">
            <button
              v-for="p in presets"
              :key="p.id"
              type="button"
              role="tab"
              :class="[$style.presetTab, buffPreset[item.id] === p.id && $style.presetTabOn]"
              @click="buffPreset[item.id] = p.id"
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
                :class="$style.icon"
                loading="lazy"
              >
              <span>{{ row.buffs?.name_ru || 'Баф' }}</span>
            </li>
          </ul>
          <p v-else-if="buffByPreset[item.id] === undefined" :class="$style.muted">Загрузка…</p>
          <p v-else :class="$style.muted">Нет бафов в этом пресете</p>
        </template>

        <!-- crystals -->
        <template v-else-if="item.section === 'crystals'">
          <div v-if="crystalByPreset[item.id]" :class="$style.presetTabs" role="tablist">
            <button
              v-for="p in presets"
              :key="p.id"
              type="button"
              role="tab"
              :class="[$style.presetTab, crystalPreset[item.id] === p.id && $style.presetTabOn]"
              @click="crystalPreset[item.id] = p.id"
            >
              {{ p.label }}
            </button>
          </div>
          <CrystalBoard
            v-if="Object.keys(crystalFilled(item.id)).length"
            :filled="crystalFilled(item.id)"
          />
          <p v-else-if="crystalByPreset[item.id] === undefined" :class="$style.muted">Загрузка…</p>
          <p v-else :class="$style.muted">Нет кристаллов в этом пресете</p>
        </template>

        <!-- relics -->
        <template v-else-if="item.section === 'relics'">
          <div v-if="relicByPreset[item.id]" :class="$style.presetTabs" role="tablist">
            <button
              v-for="p in presets"
              :key="p.id"
              type="button"
              role="tab"
              :class="[$style.presetTab, relicPreset[item.id] === p.id && $style.presetTabOn]"
              @click="relicPreset[item.id] = p.id"
            >
              {{ p.label }}
            </button>
          </div>
          <RelicBoard
            v-if="Object.keys(relicFilled(item.id)).length"
            :filled="relicFilled(item.id)"
          />
          <p v-else-if="relicByPreset[item.id] === undefined" :class="$style.muted">Загрузка…</p>
          <p v-else :class="$style.muted">Нет реликвий в этом пресете</p>
        </template>

        <!-- videos -->
        <VideoList
          v-else-if="item.section === 'videos'"
          :videos="videosFor(item)"
        />

        <pre v-else :class="$style.text">{{ JSON.stringify(item.payload, null, 2) }}</pre>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Buff, ClassVideo, Skill } from '@/entities/class'
import {
  approveProposal,
  rejectProposal,
  type PendingProposal,
} from '@/features/superadmin-auth'
import BorderSparkler from './BorderSparkler.vue'
import { getSupabase } from '@/shared/api'
import { CRYSTAL_PRESETS, type CrystalPresetId } from '@/shared/lib'
import { ComboChain } from '@/widgets/combo-chain'
import { CrystalBoard, type CrystalFill } from '@/widgets/crystal-board'
import { RelicBoard, type RelicFill } from '@/widgets/relic-board'
import { VideoList } from '@/widgets/video-list'

const props = defineProps<{
  proposals: PendingProposal[]
}>()

const emit = defineEmits<{
  changed: [action: 'approve' | 'reject']
}>()

const presets = CRYSTAL_PRESETS
const acting = ref<string | null>(null)

type Payload = {
  text?: string
  skill_ids?: string[]
  buff_ids?: string[]
  buffs?: Array<{ preset?: string; buff_id: string }>
  crystals?: Array<{ preset?: string; slot: string; item_id: string }>
  relics?: Array<{ preset?: string; slot: string; item_id: string }>
  lightstones?: Array<{ preset?: string; slot: string; item_id: string }>
  videos?: Array<{ title?: string; youtube_url: string }>
}

const comboSteps = reactive<Record<string, Array<{ id: string; skills: Skill | null }> | null>>({})
const buffByPreset = reactive<
  Record<string, Partial<Record<CrystalPresetId, Array<{ id: string; buffs: Buff | null }>>> | null>
>({})
const buffPreset = reactive<Record<string, CrystalPresetId>>({})
const crystalByPreset = reactive<
  Record<string, Partial<Record<CrystalPresetId, Record<string, CrystalFill>>> | null>
>({})
const crystalPreset = reactive<Record<string, CrystalPresetId>>({})
const relicByPreset = reactive<
  Record<string, Partial<Record<CrystalPresetId, Record<string, RelicFill>>> | null>
>({})
const relicPreset = reactive<Record<string, CrystalPresetId>>({})

function payload(item: PendingProposal): Payload {
  return (item.payload ?? {}) as Payload
}

function isCombo(section: string) {
  return section === 'combo_awakening' || section === 'combo_succession'
}

function comboLabel(section: string) {
  if (section === 'combo_awakening') return 'Пробуждение'
  if (section === 'combo_succession') return 'Наследие'
  return ''
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU')
  } catch {
    return iso
  }
}

function buffsFor(id: string) {
  const preset = buffPreset[id] || 't1'
  return buffByPreset[id]?.[preset] || []
}

function crystalFilled(id: string): Record<string, CrystalFill> {
  const preset = crystalPreset[id] || 't1'
  return crystalByPreset[id]?.[preset] || {}
}

function relicFilled(id: string): Record<string, RelicFill> {
  const preset = relicPreset[id] || 't1'
  return relicByPreset[id]?.[preset] || {}
}

function videosFor(item: PendingProposal): ClassVideo[] {
  return (payload(item).videos ?? []).map((v, i) => ({
    id: `${item.id}-${i}`,
    class_id: item.class_id,
    title: v.title || `Видео ${i + 1}`,
    youtube_url: v.youtube_url,
    sort_order: i,
  }))
}

async function hydrate() {
  for (const key of Object.keys(comboSteps)) delete comboSteps[key]
  for (const key of Object.keys(buffByPreset)) delete buffByPreset[key]
  for (const key of Object.keys(crystalByPreset)) delete crystalByPreset[key]
  for (const key of Object.keys(relicByPreset)) delete relicByPreset[key]

  await Promise.all(
    props.proposals.map(async (item) => {
      if (isCombo(item.section)) await hydrateCombo(item)
      else if (item.section === 'buffs') await hydrateBuffs(item)
      else if (item.section === 'crystals') await hydrateCrystals(item)
      else if (item.section === 'relics') await hydrateRelics(item)
    }),
  )
}

async function hydrateCombo(item: PendingProposal) {
  const ids = payload(item).skill_ids ?? []
  if (!ids.length) {
    comboSteps[item.id] = []
    return
  }
  try {
    const { data, error } = await getSupabase()
      .from('skills')
      .select('id, name_ru, icon_url, class_slug')
      .in('id', ids)
    if (error) throw error
    const byId = new Map((data ?? []).map((s) => [s.id, s as Skill]))
    comboSteps[item.id] = ids.map((id) => ({ id, skills: byId.get(id) ?? null }))
  } catch {
    comboSteps[item.id] = []
  }
}

async function hydrateBuffs(item: PendingProposal) {
  buffPreset[item.id] = 't1'
  const p = payload(item)
  const entries = p.buffs?.length
    ? p.buffs
    : (p.buff_ids ?? []).map((id) => ({ preset: 't1' as const, buff_id: id }))
  if (!entries.length) {
    buffByPreset[item.id] = {}
    return
  }
  try {
    const { data, error } = await getSupabase()
      .from('buffs')
      .select('id, name_ru, icon_url, description')
      .in(
        'id',
        entries.map((e) => e.buff_id),
      )
    if (error) throw error
    const byId = new Map((data ?? []).map((b) => [b.id, b as Buff]))
    const byPreset: Partial<Record<CrystalPresetId, Array<{ id: string; buffs: Buff | null }>>> = {}
    for (const entry of entries) {
      const preset = (entry.preset || 't1') as CrystalPresetId
      if (!byPreset[preset]) byPreset[preset] = []
      byPreset[preset]!.push({ id: entry.buff_id, buffs: byId.get(entry.buff_id) ?? null })
    }
    buffByPreset[item.id] = byPreset
  } catch {
    buffByPreset[item.id] = {}
  }
}

async function hydrateCrystals(item: PendingProposal) {
  crystalPreset[item.id] = 't1'
  const entries = payload(item).crystals ?? []
  if (!entries.length) {
    crystalByPreset[item.id] = {}
    return
  }
  try {
    const { data, error } = await getSupabase()
      .from('items')
      .select('id, name_ru, icon_url, item_type')
      .eq('item_type', 'crystal')
      .in(
        'id',
        entries.map((e) => e.item_id),
      )
    if (error) throw error
    const byId = new Map(
      (data ?? []).map((c) => [
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
    crystalByPreset[item.id] = byPreset
  } catch {
    crystalByPreset[item.id] = {}
  }
}

async function hydrateRelics(item: PendingProposal) {
  relicPreset[item.id] = 't1'
  const p = payload(item)
  const entries = [...(p.relics ?? []), ...(p.lightstones ?? [])]
  if (!entries.length) {
    relicByPreset[item.id] = {}
    return
  }
  try {
    const { data, error } = await getSupabase()
      .from('items')
      .select('id, name_ru, icon_url, item_type')
      .in('item_type', ['relic', 'lightstone'])
      .in(
        'id',
        entries.map((e) => e.item_id),
      )
    if (error) throw error
    const byId = new Map(
      (data ?? []).map((c) => [
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
    relicByPreset[item.id] = byPreset
  } catch {
    relicByPreset[item.id] = {}
  }
}

async function onApprove(id: string) {
  acting.value = id
  try {
    await approveProposal(id)
    emit('changed', 'approve')
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    alert(msg || 'Ошибка approve')
  } finally {
    acting.value = null
  }
}

async function onReject(id: string) {
  acting.value = id
  try {
    await rejectProposal(id)
    emit('changed', 'reject')
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    alert(msg || 'Ошибка reject')
  } finally {
    acting.value = null
  }
}

watch(
  () => props.proposals.map((p) => p.id).join(','),
  () => {
    void hydrate()
  },
  { immediate: true },
)
</script>

<style module>
.list {
  margin-top: 0;
  display: grid;
  gap: 0.85rem;
  overflow: visible;
}

.draft {
  position: relative;
  isolation: isolate;
  overflow: visible;
  border: 1px dashed color-mix(in srgb, var(--color-gold) 55%, var(--color-border));
  background: #12141c;
  padding: 0.85rem 1rem;
}

.draft > :not(canvas) {
  position: relative;
  z-index: 1;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.75rem;
  margin-bottom: 0.65rem;
}

.tag {
  border: 1px solid color-mix(in srgb, var(--color-gold) 45%, transparent);
  color: var(--color-gold);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
}

.meta {
  font-size: 0.82rem;
  color: var(--color-muted);
  min-width: 0;
}

.scrollCard {
  overflow: visible;
  border: 1px solid var(--color-border);
  background: var(--color-bg-deep);
  padding: 0.55rem;
}

.text {
  margin: 0;
  white-space: pre-wrap;
  font: inherit;
}

.muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.88rem;
}

.presetTabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.55rem;
}

.presetTab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  padding: 0.25rem 0.5rem;
}

.presetTabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.buffList {
  margin: 0;
  display: grid;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
}

.buffItem {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
}

.icon {
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.4rem;
  margin-left: auto;
}

.approve,
.reject {
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  line-height: 1.2;
  padding: 0.25rem 0.55rem;
}

.approve {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.reject {
  border-color: color-mix(in srgb, var(--color-danger) 50%, transparent);
  color: var(--color-danger);
}

.approve:disabled,
.reject:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
