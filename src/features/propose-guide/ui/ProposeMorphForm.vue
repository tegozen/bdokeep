<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить морфы"
    :trigger-label="triggerLabel"
    :submitting="submitting"
    :form-error="formError"
    :obscured="obscured"
    :is-superadmin="isSuperadmin"
    :request-close="requestClose"
    size="fluid"
    border-strong
    @submit="onSubmit"
  >
    <template #headerExtra>
      <div :class="presetTools.headerTools">
        <UiPresetTabs
          v-model="activeGuidePreset"
          :tabs="guidePresets"
          aria-label="Пресет морфов"
        />
        <ProposeCopyFromPreset
          :target-preset="activeGuidePreset"
          :target-has-content="!isGuidePresetEmpty(activeGuidePreset)"
          :is-empty="isGuidePresetEmpty"
          size="lg"
          @copy="copyFromPreset"
        >
          <template #default="{ preset }">
            <div :class="presetTools.copyPreview">
              <MorphBoard :filled="filledMapForGuide(preset)" />
            </div>
          </template>
        </ProposeCopyFromPreset>
      </div>
    </template>

    <div :class="$style.workspace">
      <div :class="$style.left">
        <MorphBoard
          :filled="filledMap"
          :selected-id="activeSlot"
          interactive
          @select="onSelectSlot"
          @clear="clearSlot"
        />
      </div>

      <div :class="$style.right">
        <UiPresetTabs
          v-model="catalogTab"
          :tabs="catalogTabs"
          aria-label="Каталог"
          size="sm"
        >
          <template #tab="{ tab }">
            <template v-if="tab.id === 'effects'">
              Эффекты
              <span v-if="activeSlotSkill">({{ effectCount }}/2)</span>
            </template>
            <template v-else>{{ tab.label }}</template>
          </template>
        </UiPresetTabs>

        <CatalogPicker
          v-if="catalogTab === 'skills'"
          v-model:query="query"
          fill
          :items="filteredSkills"
          :pending="catalogPending"
          :error="catalogError"
          :disabled="!activeLevel || activeKind !== 'skill'"
          :catalog-off="!activeLevel || activeKind !== 'skill'"
          placeholder="Название скилла"
          pending-text="Загрузка…"
          :show-empty="Boolean(activeLevel) && activeKind === 'skill' && !catalogPending && !filteredSkills.length"
          :empty-text="`Ничего не найдено${query ? ' по поиску' : ''}.`"
          @pick="assignSkill"
        />

        <CatalogPicker
          v-else
          v-model:query="query"
          fill
          :items="filteredEffects"
          :pending="catalogPending"
          :error="catalogError"
          :disabled="!activeLevel || !activeSlotSkill"
          :catalog-off="!activeLevel || !activeSlotSkill"
          placeholder="Эффект"
          pending-text="Загрузка…"
          :show-empty="Boolean(activeLevel) && Boolean(activeSlotSkill) && !catalogPending && !filteredEffects.length"
          :empty-text="`Ничего не найдено${query ? ' по поиску' : ''}.`"
          :is-picked="(fx) => isEffectPicked(fx.id)"
          :is-disabled="(fx) => isEffectDisabled(fx.id)"
          :item-label="effectLabel"
          @pick="assignEffect"
        />

        <p v-if="!activeSlot" :class="$style.muted">Выберите слот слева.</p>
        <p v-else-if="activeKind === 'effect' && !activeSlotSkill" :class="$style.muted">
          Сначала выберите скилл в этом уровне.
        </p>
      </div>
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  fetchClassSkills,
  fetchSkillAddonEffects,
  type GuideMorphRow,
  type Skill,
  type SkillAddonEffect,
} from '@/entities/class'
import {
  CRYSTAL_PRESETS,
  MORPH_PRESETS,
  MORPH_PRESET_IDS,
  MORPH_SLOT_LEVELS,
  emptyMorphPresetBoards,
  isMorphPresetId,
  isMorphSlotLevel,
  morphGuidePreset,
  morphPresetFrom,
  parseMorphBoardSlot,
  resolveAddonLabel,
  useGuideSpecMode,
  type CrystalPresetId,
  type MorphEffectIndex,
  type MorphPresetId,
  type MorphSlotLevel,
} from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { MorphBoard, type MorphSlotFill } from '@/widgets/morph-board'
import { submitGuideProposal } from '../api/submitProposal'
import { cloneMorphBoard, fullReplacedPresets } from '../lib/clonePresetData'
import { useProposeModal } from '../lib/useProposeModal'
import CatalogPicker from './CatalogPicker.vue'
import ProposeCopyFromPreset from './ProposeCopyFromPreset.vue'
import ProposeModalShell from './ProposeModalShell.vue'
import presetTools from './proposePresetTools.module.css'

type EffectPair = [string | null, string | null]

type SlotState = {
  skill: Skill | null
  effectIds: EffectPair
}

type PresetBoards = Record<MorphPresetId, Partial<Record<MorphSlotLevel, SlotState>>>

function emptyEffects(): EffectPair {
  return [null, null]
}

function effectCountOf(pair: EffectPair): number {
  return (pair[0] ? 1 : 0) + (pair[1] ? 1 : 0)
}

function emptyPresets(): PresetBoards {
  return emptyMorphPresetBoards()
}

const props = withDefaults(
  defineProps<{
    classSlug: string
    triggerLabel?: string
    initialMorphs?: GuideMorphRow[]
  }>(),
  {
    triggerLabel: 'Предложить',
    initialMorphs: () => [],
  },
)

const specMode = useGuideSpecMode()

const query = ref('')
const catalogTab = ref<'skills' | 'effects'>('skills')
const guidePresets = CRYSTAL_PRESETS
const activeGuidePreset = ref<CrystalPresetId>('t1')
const activePreset = computed(() => morphPresetFrom(specMode.value, activeGuidePreset.value))
/** Relic-style slot id: `56` / `56_a` / `56_b`. */
const activeSlot = ref<string | null>(null)
const presets = ref<PresetBoards>(emptyPresets())
const skills = ref<Skill[]>([])
const effects = ref<SkillAddonEffect[]>([])
const catalogPending = ref(false)
const catalogError = ref(false)

const activeParsed = computed(() =>
  activeSlot.value ? parseMorphBoardSlot(activeSlot.value) : null,
)
const activeLevel = computed(() => activeParsed.value?.level ?? null)
const activeKind = computed(() => activeParsed.value?.kind ?? null)
const activeEffectIndex = computed(() => activeParsed.value?.effectIndex ?? null)

const catalogTabs = computed(() => [
  { id: 'skills' as const, label: 'Скиллы' },
  {
    id: 'effects' as const,
    label: 'Эффекты',
    disabled: !activeSlotSkill.value,
  },
])

function serializeState() {
  return JSON.stringify(
    Object.fromEntries(
      MORPH_PRESET_IDS.map((preset) => [
        preset,
        Object.fromEntries(
          MORPH_SLOT_LEVELS.map((level) => {
            const slot = presets.value[preset][level]
            if (!slot?.skill) return [level, null]
            return [
              level,
              {
                skill_id: slot.skill.id,
                effects: slot.effectIds.filter((id): id is string => Boolean(id)),
              },
            ]
          }),
        ),
      ]),
    ),
  )
}

function hydrateFromInitial() {
  const next = emptyPresets()
  for (const row of props.initialMorphs ?? []) {
    if (!isMorphPresetId(row.preset) || !isMorphSlotLevel(row.slot_level) || !row.skills) continue
    next[row.preset][row.slot_level] = {
      skill: {
        id: row.skills.id,
        name_ru: row.skills.name_ru,
        icon_url: row.skills.icon_url,
        class_slug: row.skills.class_slug,
        skill_type: row.skills.skill_type,
        supports_addon: row.skills.supports_addon,
        addon_tier: row.skills.addon_tier,
        addon_effect_keys: row.skills.addon_effect_keys ?? null,
      },
      effectIds: [row.effect1?.id ?? null, row.effect2?.id ?? null],
    }
  }
  presets.value = next
  activeGuidePreset.value = 't1'
  activeSlot.value = null
  catalogTab.value = 'skills'
}

/** Fill missing addon_effect_keys / tier from the live skills catalog. */
function enrichSlotSkillsFromCatalog() {
  if (!skills.value.length) return
  const byId = new Map(skills.value.map((s) => [s.id, s]))
  let changed = false
  const nextPresets = { ...presets.value }
  for (const preset of MORPH_PRESET_IDS) {
    const board = { ...nextPresets[preset] }
    let boardChanged = false
    for (const level of MORPH_SLOT_LEVELS) {
      const slot = board[level]
      if (!slot?.skill) continue
      const cat = byId.get(slot.skill.id)
      if (!cat) continue
      if (
        slot.skill.addon_effect_keys?.length &&
        slot.skill.addon_tier != null &&
        slot.skill.supports_addon != null
      ) {
        continue
      }
      board[level] = {
        ...slot,
        skill: {
          ...slot.skill,
          supports_addon: cat.supports_addon,
          addon_tier: cat.addon_tier ?? slot.skill.addon_tier,
          addon_effect_keys: cat.addon_effect_keys ?? slot.skill.addon_effect_keys,
        },
      }
      boardChanged = true
    }
    if (boardChanged) {
      nextPresets[preset] = board
      changed = true
    }
  }
  if (changed) presets.value = nextPresets
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
  serialize: serializeState,
  onOpen: async () => {
    hydrateFromInitial()
    if (skills.value.length && effects.value.length) {
      enrichSlotSkillsFromCatalog()
      return
    }
    catalogPending.value = true
    catalogError.value = false
    try {
      const [s, e] = await Promise.all([
        fetchClassSkills(props.classSlug),
        fetchSkillAddonEffects(),
      ])
      skills.value = s
      effects.value = e
      enrichSlotSkillsFromCatalog()
    } catch {
      catalogError.value = true
    } finally {
      catalogPending.value = false
    }
  },
  onReset: () => {
    query.value = ''
    catalogTab.value = 'skills'
    activeGuidePreset.value = 't1'
    activeSlot.value = null
    presets.value = emptyPresets()
  },
})

function slotAt(level: MorphSlotLevel): SlotState | undefined {
  return presets.value[activePreset.value][level]
}

function morphKey(guide: CrystalPresetId): MorphPresetId {
  return morphPresetFrom(specMode.value, guide)
}

function isGuidePresetEmpty(guide: CrystalPresetId) {
  const board = presets.value[morphKey(guide)]
  return !MORPH_SLOT_LEVELS.some((level) => Boolean(board[level]?.skill))
}

function filledMapForGuide(guide: CrystalPresetId): Partial<Record<MorphSlotLevel, MorphSlotFill>> {
  const board = presets.value[morphKey(guide)]
  const map: Partial<Record<MorphSlotLevel, MorphSlotFill>> = {}
  for (const level of MORPH_SLOT_LEVELS) {
    const slot = board[level]
    if (!slot?.skill) continue
    const tier = slot.skill.addon_tier ?? 2
    const e1 = slot.effectIds[0] ? effects.value.find((e) => e.id === slot.effectIds[0]) : null
    const e2 = slot.effectIds[1] ? effects.value.find((e) => e.id === slot.effectIds[1]) : null
    map[level] = {
      skill: slot.skill,
      effect1Label: e1 ? resolveAddonLabel(e1.tier_labels, tier, e1.name_ru) : null,
      effect2Label: e2 ? resolveAddonLabel(e2.tier_labels, tier, e2.name_ru) : null,
    }
  }
  return map
}

function copyFromPreset(sourceGuide: CrystalPresetId) {
  const from = morphKey(sourceGuide)
  const to = activePreset.value
  presets.value = {
    ...presets.value,
    [to]: cloneMorphBoard(presets.value[from], MORPH_SLOT_LEVELS),
  }
  activeSlot.value = null
  catalogTab.value = 'skills'
  query.value = ''
  formError.value = ''
}

const activeSlotSkill = computed(() =>
  activeLevel.value ? slotAt(activeLevel.value)?.skill ?? null : null,
)

const effectCount = computed(() =>
  activeLevel.value ? effectCountOf(slotAt(activeLevel.value)?.effectIds ?? emptyEffects()) : 0,
)

const filledMap = computed(() => filledMapForGuide(activeGuidePreset.value))

const filteredSkills = computed(() => {
  const q = query.value.trim().toLowerCase()
  const usedElsewhere = new Set<string>()
  for (const level of MORPH_SLOT_LEVELS) {
    if (level === activeLevel.value) continue
    const id = slotAt(level)?.skill?.id
    if (id) usedElsewhere.add(id)
  }
  return skills.value.filter((s) => {
    if (s.supports_addon !== true) return false
    if (!s.addon_effect_keys?.length) return false
    if (usedElsewhere.has(s.id)) return false
    if (!q) return true
    return s.name_ru.toLowerCase().includes(q)
  })
})

const filteredEffects = computed(() => {
  const q = query.value.trim().toLowerCase()
  const skill = activeSlotSkill.value
  if (!skill) return []

  const fromCatalog = skills.value.find((s) => s.id === skill.id)
  const rawKeys = fromCatalog?.addon_effect_keys ?? skill.addon_effect_keys
  const keys = Array.isArray(rawKeys) ? rawKeys.filter(Boolean) : []
  const allowed = new Set(keys)

  return effects.value.filter((e) => {
    // If we know the allowlist — enforce it; otherwise show full catalog (never blank).
    if (allowed.size && !allowed.has(e.key)) return false
    if (!q) return true
    return effectLabel(e).toLowerCase().includes(q) || e.name_ru.toLowerCase().includes(q)
  })
})

function effectLabel(fx: SkillAddonEffect) {
  const tier = activeSlotSkill.value?.addon_tier ?? 2
  return resolveAddonLabel(fx.tier_labels, tier, fx.name_ru)
}

function isEffectPicked(id: string) {
  if (!activeLevel.value) return false
  const pair = slotAt(activeLevel.value)?.effectIds
  return pair?.[0] === id || pair?.[1] === id
}

function isEffectDisabled(id: string) {
  if (!activeLevel.value) return true
  const cur = slotAt(activeLevel.value)
  if (!cur?.skill) return true
  // If skill slot is selected but Effects tab is open, treat as replacing slot a.
  const idx = activeEffectIndex.value === 'b' ? 1 : 0
  const other = cur.effectIds[idx === 0 ? 1 : 0]
  if (other === id) return true
  return false
}

function onSelectSlot(id: string) {
  const parsed = parseMorphBoardSlot(id)
  if (!parsed) return
  activeSlot.value = id
  formError.value = ''
  catalogTab.value = parsed.kind === 'skill' ? 'skills' : 'effects'
  query.value = ''
}

function clearSlot(id: string) {
  const parsed = parseMorphBoardSlot(id)
  if (!parsed) return
  const board = { ...presets.value[activePreset.value] }
  const cur = board[parsed.level]
  if (!cur?.skill || parsed.kind === 'skill') {
    delete board[parsed.level]
    if (activeSlot.value && parseMorphBoardSlot(activeSlot.value)?.level === parsed.level) {
      catalogTab.value = 'skills'
      activeSlot.value = String(parsed.level)
    }
  } else {
    const next: EffectPair = [...cur.effectIds]
    next[parsed.effectIndex === 'a' ? 0 : 1] = null
    board[parsed.level] = { skill: cur.skill, effectIds: next }
  }
  presets.value = { ...presets.value, [activePreset.value]: board }
}

function assignSkill(skill: Skill) {
  if (!activeLevel.value || activeKind.value !== 'skill') return
  const board = { ...presets.value[activePreset.value] }
  board[activeLevel.value] = { skill, effectIds: emptyEffects() }
  presets.value = { ...presets.value, [activePreset.value]: board }
  activeSlot.value = `${activeLevel.value}_a`
  catalogTab.value = 'effects'
  query.value = ''
}

function assignEffect(fx: SkillAddonEffect) {
  if (!activeLevel.value) return
  const cur = slotAt(activeLevel.value)
  if (!cur?.skill || isEffectDisabled(fx.id)) return

  // Default to slot a when Effects tab is open but skill cell is still selected.
  const idx = activeEffectIndex.value === 'b' ? 1 : 0
  const next: EffectPair = [...cur.effectIds]
  next[idx] = fx.id

  const board = { ...presets.value[activePreset.value] }
  board[activeLevel.value] = { skill: cur.skill, effectIds: next }
  presets.value = { ...presets.value, [activePreset.value]: board }

  const other: MorphEffectIndex = idx === 0 ? 'b' : 'a'
  if (!next[idx === 0 ? 1 : 0]) {
    activeSlot.value = `${activeLevel.value}_${other}`
  } else {
    activeSlot.value = `${activeLevel.value}_${idx === 0 ? 'a' : 'b'}`
  }
  catalogTab.value = 'effects'
  query.value = ''
}

watch(catalogTab, (tab) => {
  if (!activeLevel.value) return
  query.value = ''
  if (tab === 'skills' && activeKind.value !== 'skill') {
    activeSlot.value = String(activeLevel.value)
  } else if (tab === 'effects' && activeKind.value !== 'effect') {
    const pair = slotAt(activeLevel.value)?.effectIds
    const next = !pair?.[0] ? 'a' : !pair?.[1] ? 'b' : 'a'
    activeSlot.value = `${activeLevel.value}_${next}`
  }
})

watch(activePreset, () => {
  activeSlot.value = null
  catalogTab.value = 'skills'
  query.value = ''
})

async function onSubmit() {
  if (honeypot.value) return
  await runSubmit(async () => {
    const morphs: Array<{
      preset: MorphPresetId
      slot_level: MorphSlotLevel
      skill_id: string
      effect_ids: [string, string]
    }> = []

    for (const preset of MORPH_PRESET_IDS) {
      for (const level of MORPH_SLOT_LEVELS) {
        const slot = presets.value[preset][level]
        if (!slot?.skill) continue
        const [e1, e2] = slot.effectIds
        if (!e1 || !e2) {
          formError.value = `В пресете «${MORPH_PRESETS.find((p) => p.id === preset)?.label}» слот Ур. ${level}: нужно ровно 2 эффекта`
          activeGuidePreset.value = morphGuidePreset(preset)
          specMode.value = preset.startsWith('succ_') ? 'succession' : 'awakening'
          activeSlot.value = `${level}_${!e1 ? 'a' : 'b'}`
          catalogTab.value = 'effects'
          return null
        }
        morphs.push({
          preset,
          slot_level: level,
          skill_id: slot.skill.id,
          effect_ids: [e1, e2],
        })
      }
    }

    if (!morphs.length) {
      formError.value = 'Заполните хотя бы один слот'
      return null
    }

    return submitGuideProposal({
      class_slug: props.classSlug,
      section: 'morphs',
      payload: {
        morphs,
        replaced_presets: fullReplacedPresets(MORPH_PRESET_IDS),
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
  grid-template-columns: minmax(18rem, 1.1fr) minmax(16rem, 1fr);
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
  overflow: auto;
}

.muted {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}

@media (max-width: 820px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
