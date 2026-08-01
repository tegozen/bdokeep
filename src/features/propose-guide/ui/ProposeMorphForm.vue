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
      <UiPresetTabs
        v-model="activeGuidePreset"
        :tabs="guidePresets"
        aria-label="Пресет морфов"
      />
    </template>

    <div :class="$style.workspace">
      <div :class="$style.left">
        <MorphBoard
          :filled="filledMap"
          :selected-level="activeLevel"
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
          :disabled="!activeLevel"
          :catalog-off="!activeLevel"
          placeholder="Название скилла"
          pending-text="Загрузка…"
          :show-empty="Boolean(activeLevel) && !catalogPending && !filteredSkills.length"
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
          :show-empty="Boolean(activeLevel) && !catalogPending && !filteredEffects.length"
          :empty-text="`Ничего не найдено${query ? ' по поиску' : ''}.`"
          :is-picked="(fx) => isEffectPicked(fx.id)"
          :is-disabled="(fx) => isEffectPicked(fx.id) || effectCount >= 2"
          :item-label="effectLabel"
          @pick="assignEffect"
        />

        <p v-if="!activeLevel" :class="$style.muted">Выберите слот слева.</p>
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
  resolveAddonLabel,
  useGuideSpecMode,
  type CrystalPresetId,
  type MorphPresetId,
  type MorphSlotLevel,
} from '@/shared/lib'
import { UiPresetTabs } from '@/shared/ui'
import { MorphBoard, type MorphSlotFill } from '@/widgets/morph-board'
import { submitGuideProposal } from '../api/submitProposal'
import { useProposeModal } from '../lib/useProposeModal'
import CatalogPicker from './CatalogPicker.vue'
import ProposeModalShell from './ProposeModalShell.vue'

type SlotState = {
  skill: Skill | null
  effectIds: string[]
}

type PresetBoards = Record<MorphPresetId, Partial<Record<MorphSlotLevel, SlotState>>>

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
const activeLevel = ref<MorphSlotLevel | null>(null)
const presets = ref<PresetBoards>(emptyPresets())
const skills = ref<Skill[]>([])
const effects = ref<SkillAddonEffect[]>([])
const catalogPending = ref(false)
const catalogError = ref(false)

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
            return [level, { skill_id: slot.skill.id, effects: slot.effectIds }]
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
    const effectIds: string[] = []
    if (row.effect1?.id) effectIds.push(row.effect1.id)
    if (row.effect2?.id) effectIds.push(row.effect2.id)
    next[row.preset][row.slot_level] = {
      skill: {
        id: row.skills.id,
        name_ru: row.skills.name_ru,
        icon_url: row.skills.icon_url,
        class_slug: row.skills.class_slug,
        skill_type: row.skills.skill_type,
        supports_addon: row.skills.supports_addon,
        addon_tier: row.skills.addon_tier,
      },
      effectIds,
    }
  }
  presets.value = next
  activeGuidePreset.value = 't1'
  activeLevel.value = null
  catalogTab.value = 'skills'
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
  serialize: serializeState,
  onOpen: async () => {
    hydrateFromInitial()
    if (skills.value.length && effects.value.length) return
    catalogPending.value = true
    catalogError.value = false
    try {
      const [s, e] = await Promise.all([
        fetchClassSkills(props.classSlug),
        fetchSkillAddonEffects(),
      ])
      skills.value = s
      effects.value = e
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
    activeLevel.value = null
    presets.value = emptyPresets()
  },
})

function slotAt(level: MorphSlotLevel): SlotState | undefined {
  return presets.value[activePreset.value][level]
}

const activeSlotSkill = computed(() =>
  activeLevel.value ? slotAt(activeLevel.value)?.skill ?? null : null,
)

const effectCount = computed(() =>
  activeLevel.value ? slotAt(activeLevel.value)?.effectIds.length ?? 0 : 0,
)

const filledMap = computed(() => {
  const map: Partial<Record<MorphSlotLevel, MorphSlotFill>> = {}
  for (const level of MORPH_SLOT_LEVELS) {
    const slot = slotAt(level)
    if (!slot?.skill) continue
    const tier = slot.skill.addon_tier ?? 2
    const e1 = effects.value.find((e) => e.id === slot.effectIds[0])
    const e2 = effects.value.find((e) => e.id === slot.effectIds[1])
    map[level] = {
      skill: slot.skill,
      effect1Label: e1 ? resolveAddonLabel(e1.tier_labels, tier, e1.name_ru) : null,
      effect2Label: e2 ? resolveAddonLabel(e2.tier_labels, tier, e2.name_ru) : null,
    }
  }
  return map
})

const filteredSkills = computed(() => {
  const q = query.value.trim().toLowerCase()
  return skills.value.filter((s) => {
    if (s.supports_addon === false) return false
    if (!q) return true
    return s.name_ru.toLowerCase().includes(q)
  })
})

const filteredEffects = computed(() => {
  const q = query.value.trim().toLowerCase()
  return effects.value.filter((e) => {
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
  return slotAt(activeLevel.value)?.effectIds.includes(id) ?? false
}

function onSelectSlot(level: MorphSlotLevel) {
  activeLevel.value = level
  catalogTab.value = slotAt(level)?.skill ? 'effects' : 'skills'
  query.value = ''
}

function clearSlot(level: MorphSlotLevel) {
  const board = { ...presets.value[activePreset.value] }
  delete board[level]
  presets.value = { ...presets.value, [activePreset.value]: board }
  if (activeLevel.value === level) catalogTab.value = 'skills'
}

function assignSkill(skill: Skill) {
  if (!activeLevel.value) return
  const board = { ...presets.value[activePreset.value] }
  board[activeLevel.value] = { skill, effectIds: [] }
  presets.value = { ...presets.value, [activePreset.value]: board }
  catalogTab.value = 'effects'
  query.value = ''
}

function assignEffect(fx: SkillAddonEffect) {
  if (!activeLevel.value) return
  const cur = slotAt(activeLevel.value)
  if (!cur?.skill || cur.effectIds.includes(fx.id) || cur.effectIds.length >= 2) return
  const board = { ...presets.value[activePreset.value] }
  board[activeLevel.value] = {
    skill: cur.skill,
    effectIds: [...cur.effectIds, fx.id],
  }
  presets.value = { ...presets.value, [activePreset.value]: board }
}

watch(activePreset, () => {
  activeLevel.value = null
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
        if (slot.effectIds.length !== 2) {
          formError.value = `В пресете «${MORPH_PRESETS.find((p) => p.id === preset)?.label}» слот Ур. ${level}: нужно ровно 2 эффекта`
          activeGuidePreset.value = morphGuidePreset(preset)
          specMode.value = preset.startsWith('succ_') ? 'succession' : 'awakening'
          activeLevel.value = level
          catalogTab.value = 'effects'
          return null
        }
        morphs.push({
          preset,
          slot_level: level,
          skill_id: slot.skill.id,
          effect_ids: [slot.effectIds[0]!, slot.effectIds[1]!],
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
      payload: { morphs },
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
