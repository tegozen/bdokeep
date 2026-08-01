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
          <UiButton
            v-if="item.section === 'summary'"
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
        <!-- summary -->
        <UiMarkdownPreview
          v-if="item.section === 'summary'"
          :id="`pending-summary-${item.id}`"
          :model-value="String(payload(item).text || '')"
          :class="$style.text"
        />

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

        <!-- morphs -->
        <template v-else-if="item.section === 'morphs'">
          <div v-if="morphByPreset[item.id]" :class="$style.presetTabs" role="tablist">
            <button
              v-for="p in presets"
              :key="p.id"
              type="button"
              role="tab"
              :class="[$style.presetTab, morphGuideTab[item.id] === p.id && $style.presetTabOn]"
              @click="morphGuideTab[item.id] = p.id"
            >
              {{ p.label }}
            </button>
          </div>
          <MorphBoard
            v-if="morphFilled(item.id) && Object.keys(morphFilled(item.id)!).length"
            :filled="morphFilled(item.id)!"
          />
          <p v-else-if="morphByPreset[item.id] === undefined" :class="$style.muted">Загрузка…</p>
          <p v-else :class="$style.muted">Нет морфов в этом пресете</p>
        </template>

        <pre v-else :class="$style.text">{{ JSON.stringify(item.payload, null, 2) }}</pre>
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
import { reactive, ref, watch } from 'vue'
import type { Buff, ClassVideo, Skill, SkillAddonEffect } from '@/entities/class'
import {
  approveProposal,
  rejectProposal,
  type PendingProposal,
} from '@/features/superadmin-auth'
import BorderSparkler from './BorderSparkler.vue'
import ReviewSummaryModal from './ReviewSummaryModal.vue'
import { resolveCatalogIds } from '@/shared/api/catalogResolve'
import {
  CRYSTAL_PRESETS,
  morphPresetFrom,
  resolveAddonLabel,
  useGuideSpecMode,
  type CrystalPresetId,
  type MorphPresetId,
  type MorphSlotLevel,
} from '@/shared/lib'
import { UiButton, UiMarkdownPreview } from '@/shared/ui'
import { ComboChain } from '@/widgets/combo-chain'
import { CrystalBoard, type CrystalFill } from '@/widgets/crystal-board'
import { MorphBoard, type MorphSlotFill } from '@/widgets/morph-board'
import { RelicBoard, type RelicFill } from '@/widgets/relic-board'
import { VideoList } from '@/widgets/video-list'

const props = defineProps<{
  proposals: PendingProposal[]
}>()

const emit = defineEmits<{
  changed: [action: 'approve' | 'reject']
}>()

const presets = CRYSTAL_PRESETS
const specMode = useGuideSpecMode()
const acting = ref<string | null>(null)
const editingId = ref<string | null>(null)
const editText = ref('')

type Payload = {
  text?: string
  skill_ids?: string[]
  buff_ids?: string[]
  buffs?: Array<{ preset?: string; buff_id: string }>
  crystals?: Array<{ preset?: string; slot: string; item_id: string }>
  relics?: Array<{ preset?: string; slot: string; item_id: string }>
  lightstones?: Array<{ preset?: string; slot: string; item_id: string }>
  videos?: Array<{ title?: string; youtube_url: string }>
  morphs?: Array<{
    preset?: string
    slot_level: number
    skill_id: string
    effect_ids: string[]
  }>
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
const morphByPreset = reactive<
  Record<string, Partial<Record<MorphPresetId, Partial<Record<MorphSlotLevel, MorphSlotFill>>>> | null>
>({})
const morphGuideTab = reactive<Record<string, CrystalPresetId>>({})

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

function morphFilled(id: string): Partial<Record<MorphSlotLevel, MorphSlotFill>> {
  const preset = morphPresetFrom(specMode.value, morphGuideTab[id] || 't1')
  return morphByPreset[id]?.[preset] || {}
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
  for (const key of Object.keys(morphByPreset)) delete morphByPreset[key]

  await Promise.all(
    props.proposals.map(async (item) => {
      if (isCombo(item.section)) await hydrateCombo(item)
      else if (item.section === 'buffs') await hydrateBuffs(item)
      else if (item.section === 'crystals') await hydrateCrystals(item)
      else if (item.section === 'relics') await hydrateRelics(item)
      else if (item.section === 'morphs') await hydrateMorphs(item)
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
    const { skills } = await resolveCatalogIds({ skills: ids })
    const byId = new Map(skills.map((s) => [s.id, s as Skill]))
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
    const { buffs } = await resolveCatalogIds({
      buffs: entries.map((e) => e.buff_id),
    })
    const byId = new Map(buffs.map((b) => [b.id, b as Buff]))
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
    const { items } = await resolveCatalogIds({
      items: entries.map((e) => e.item_id),
    })
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
    const { items } = await resolveCatalogIds({
      items: entries.map((e) => e.item_id),
    })
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
    relicByPreset[item.id] = byPreset
  } catch {
    relicByPreset[item.id] = {}
  }
}

async function hydrateMorphs(item: PendingProposal) {
  morphGuideTab[item.id] = 't1'
  const entries = payload(item).morphs ?? []
  if (!entries.length) {
    morphByPreset[item.id] = {}
    return
  }
  try {
    const skillIds = [...new Set(entries.map((e) => e.skill_id))]
    const effectIds = [...new Set(entries.flatMap((e) => e.effect_ids ?? []))]
    const { skills, skill_addon_effects: fx } = await resolveCatalogIds({
      skills: skillIds,
      skill_addon_effects: effectIds,
    })
    const skillById = new Map(skills.map((s) => [s.id, s as Skill]))
    const fxById = new Map(fx.map((e) => [e.id, e as SkillAddonEffect]))
    const byPreset: Partial<
      Record<MorphPresetId, Partial<Record<MorphSlotLevel, MorphSlotFill>>>
    > = {}
    for (const entry of entries) {
      const preset = (entry.preset || 'aw_t1') as MorphPresetId
      const level = entry.slot_level as MorphSlotLevel
      const skill = skillById.get(entry.skill_id) ?? null
      const tier = skill?.addon_tier ?? 2
      const e1 = fxById.get(entry.effect_ids?.[0] || '')
      const e2 = fxById.get(entry.effect_ids?.[1] || '')
      if (!byPreset[preset]) byPreset[preset] = {}
      byPreset[preset]![level] = {
        skill: skill
          ? {
              id: skill.id,
              name_ru: skill.name_ru,
              icon_url: skill.icon_url,
              addon_tier: skill.addon_tier,
            }
          : null,
        effect1Label: e1 ? resolveAddonLabel(e1.tier_labels, tier, e1.name_ru) : null,
        effect2Label: e2 ? resolveAddonLabel(e2.tier_labels, tier, e2.name_ru) : null,
      }
    }
    morphByPreset[item.id] = byPreset
  } catch {
    morphByPreset[item.id] = {}
  }
}

function startEdit(item: PendingProposal) {
  editingId.value = item.id
  editText.value = String(payload(item).text || '')
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

function onEditedApproved() {
  cancelEdit()
  emit('changed', 'approve')
}

async function onApprove(item: PendingProposal) {
  acting.value = item.id
  try {
    await approveProposal(item.id)
    emit('changed', 'approve')
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

async function onReject(id: string) {
  acting.value = id
  try {
    await rejectProposal(id)
    if (editingId.value === id) cancelEdit()
    emit('changed', 'reject')
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

watch(
  () => props.proposals.map((p) => p.id).join(','),
  () => {
    if (editingId.value && !props.proposals.some((p) => p.id === editingId.value)) {
      cancelEdit()
    }
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

</style>
