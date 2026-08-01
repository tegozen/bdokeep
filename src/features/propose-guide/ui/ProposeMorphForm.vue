<template>
  <div :class="$style.wrap">
    <UiButton type="button" @click="open = true">
      {{ triggerLabel }}
    </UiButton>

    <Teleport to="body">
      <div
        v-if="open"
        :class="[$style.backdrop, obscured && $style.obscured]"
        @click.self="requestClose"
      >
        <div
          :class="$style.modal"
          role="dialog"
          aria-modal="true"
          aria-label="Предложить морфы"
        >
          <header :class="$style.head">
            <h3 :class="$style.title">Предложить морфы</h3>
            <div :class="$style.presetTabs" role="tablist" aria-label="Пресет морфов">
              <button
                v-for="p in guidePresets"
                :key="p.id"
                type="button"
                role="tab"
                :aria-selected="activeGuidePreset === p.id"
                :class="[$style.presetTab, activeGuidePreset === p.id && $style.presetTabOn]"
                @click="activeGuidePreset = p.id"
              >
                {{ p.label }}
              </button>
            </div>
            <button type="button" :class="$style.close" aria-label="Закрыть" @click="requestClose">
              ×
            </button>
          </header>

          <form :class="$style.form" @submit.prevent="onSubmit">
            <input
              v-model="honeypot"
              type="text"
              name="website"
              autocomplete="off"
              tabindex="-1"
              :class="$style.honey"
              aria-hidden="true"
            >

            <SuperadminAuth>
              <label :class="$style.label">
                Игровой ник
                <input
                  v-model="author"
                  type="text"
                  :class="$style.input"
                  maxlength="80"
                  required
                  autocomplete="nickname"
                  placeholder="Как вас зовут в игре"
                >
              </label>
            </SuperadminAuth>

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
                <div :class="$style.tabs" role="tablist" aria-label="Каталог">
                  <button
                    type="button"
                    role="tab"
                    :aria-selected="catalogTab === 'skills'"
                    :class="[$style.tab, catalogTab === 'skills' && $style.tabOn]"
                    @click="catalogTab = 'skills'"
                  >
                    Скиллы
                  </button>
                  <button
                    type="button"
                    role="tab"
                    :aria-selected="catalogTab === 'effects'"
                    :class="[$style.tab, catalogTab === 'effects' && $style.tabOn]"
                    :disabled="!activeSlotSkill"
                    @click="catalogTab = 'effects'"
                  >
                    Эффекты
                    <span v-if="activeSlotSkill">({{ effectCount }}/2)</span>
                  </button>
                </div>

                <input
                  v-model="query"
                  type="search"
                  :class="$style.input"
                  :placeholder="catalogTab === 'skills' ? 'Название скилла' : 'Эффект'"
                  :disabled="!activeLevel"
                >

                <div v-if="catalogPending" :class="$style.muted">Загрузка…</div>
                <div v-else-if="catalogError" :class="$style.error">Не удалось загрузить каталог.</div>

                <ul
                  v-else-if="catalogTab === 'skills'"
                  :class="[$style.catalog, !activeLevel && $style.catalogOff]"
                >
                  <li v-for="skill in filteredSkills" :key="skill.id">
                    <button type="button" :class="$style.catalogBtn" @click="assignSkill(skill)">
                      <img
                        v-if="skill.icon_url"
                        :src="skill.icon_url"
                        alt=""
                        :class="$style.icon"
                        loading="lazy"
                      >
                      <span>{{ skill.name_ru }}</span>
                      <span :class="$style.add">+</span>
                    </button>
                  </li>
                </ul>

                <ul
                  v-else
                  :class="[$style.catalog, (!activeLevel || !activeSlotSkill) && $style.catalogOff]"
                >
                  <li v-for="fx in filteredEffects" :key="fx.id">
                    <button
                      type="button"
                      :class="[$style.catalogBtn, isEffectPicked(fx.id) && $style.picked]"
                      :disabled="isEffectPicked(fx.id) || effectCount >= 2"
                      @click="assignEffect(fx)"
                    >
                      <span>{{ effectLabel(fx) }}</span>
                      <span :class="$style.add">+</span>
                    </button>
                  </li>
                </ul>

                <p v-if="activeLevel && !catalogPending && !filteredListLength" :class="$style.muted">
                  Ничего не найдено{{ query ? ' по поиску' : '' }}.
                </p>
                <p v-else-if="!activeLevel" :class="$style.muted">Выберите слот слева.</p>

                <p v-if="formError" :class="$style.error">{{ formError }}</p>
                <p v-if="done" :class="$style.ok">{{ doneMessage }}</p>

                <div :class="$style.actions">
                  <UiButton variant="secondary" type="button" @click="requestClose">Отмена</UiButton>
                  <UiButton type="submit" :disabled="submitting || done">
                    {{
                      submitting ? 'Отправка…' : isSuperadmin ? 'Опубликовать' : 'Отправить'
                    }}
                  </UiButton>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  fetchClassSkills,
  fetchSkillAddonEffects,
  type GuideMorphRow,
  type Skill,
  type SkillAddonEffect,
} from '@/entities/class'
import { SuperadminAuth } from '@/features/superadmin-auth'
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
  useGuidePreset,
  useGuideSpecMode,
  useSuperadmin,
  useUnsavedGuard,
  type MorphPresetId,
  type MorphSlotLevel,
} from '@/shared/lib'
import { UiButton } from '@/shared/ui'
import { MorphBoard, type MorphSlotFill } from '@/widgets/morph-board'
import { submitGuideProposal } from '../api/submitProposal'

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

const { isSuperadmin, refresh: refreshAdmin } = useSuperadmin()
const specMode = useGuideSpecMode()

const open = ref(false)
const honeypot = ref('')
const author = ref('')
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
const submitting = ref(false)
const formError = ref('')
const done = ref(false)
const doneMessage = ref('')
const baseline = ref('')

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

const dirty = computed(
  () => open.value && !done.value && baseline.value !== '' && serializeState() !== baseline.value,
)

function close() {
  open.value = false
}

const { requestClose, obscured } = useUnsavedGuard({
  active: open,
  dirty,
  onClose: close,
})

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

const filteredListLength = computed(() =>
  catalogTab.value === 'skills' ? filteredSkills.value.length : filteredEffects.value.length,
)

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

function reset() {
  honeypot.value = ''
  author.value = ''
  query.value = ''
  catalogTab.value = 'skills'
  activeGuidePreset.value = 't1'
  activeLevel.value = null
  presets.value = emptyPresets()
  formError.value = ''
  done.value = false
  doneMessage.value = ''
  submitting.value = false
}

watch(open, async (v) => {
  if (v) {
    baseline.value = ''
    formError.value = ''
    done.value = false
    hydrateFromInitial()
    await refreshAdmin()
    if (!skills.value.length || !effects.value.length) {
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
    }
    await nextTick()
    baseline.value = serializeState()
  } else {
    baseline.value = ''
    reset()
  }
})

watch(activePreset, () => {
  activeLevel.value = null
  catalogTab.value = 'skills'
  query.value = ''
})

async function onSubmit() {
  formError.value = ''
  if (honeypot.value) return

  if (!isSuperadmin.value && !author.value.trim()) {
    formError.value = 'Укажите игровой ник'
    return
  }

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
        return
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
    return
  }

  submitting.value = true
  try {
    const res = await submitGuideProposal({
      class_slug: props.classSlug,
      section: 'morphs',
      payload: { morphs },
      author_label: author.value.trim() || undefined,
      website: honeypot.value,
    })
    done.value = true
    doneMessage.value = res.autoApproved ? 'Опубликовано' : 'Заявка отправлена'
    if (res.autoApproved) {
      setTimeout(() => reloadNuxtApp({ force: true }), 600)
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    formError.value = msg || 'Ошибка отправки'
  } finally {
    submitting.value = false
  }
}
</script>

<style module>
.wrap {
  display: inline-flex;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.65);
  padding: 1rem;
}

.obscured {
  visibility: hidden;
  pointer-events: none;
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(1100px, 100%);
  max-height: min(92vh, 900px);
  overflow: hidden;
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg-elevated);
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.85rem 1rem;
}

.title {
  margin: 0;
  font-size: 1.1rem;
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
  padding: 0.25rem 0.5rem;
}

.presetTabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.close {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 1.4rem;
  line-height: 1;
}

.form {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 0.85rem 1rem 1rem;
}

.honey {
  position: absolute;
  left: -9999px;
  opacity: 0;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(18rem, 1.1fr) minmax(16rem, 1fr);
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.left,
.right {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.tabs {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 0.55rem;
}

.tab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  padding: 0.3rem 0.55rem;
}

.tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.input {
  width: 100%;
  margin-bottom: 0.55rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0.4rem 0.55rem;
}

.catalog {
  margin: 0 0 0.75rem;
  max-height: 18rem;
  overflow: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  padding: 0;
}

.catalogOff {
  opacity: 0.45;
  pointer-events: none;
}

.catalogBtn {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
  padding: 0.4rem 0.5rem;
}

.catalogBtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.picked {
  background: var(--color-gold-dim);
}

.icon {
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.add {
  margin-left: auto;
  color: var(--color-gold);
}

.label {
  display: grid;
  gap: 0.3rem;
  margin-bottom: 0.65rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.muted {
  margin: 0 0 0.55rem;
  color: var(--color-muted);
  font-size: 0.88rem;
}

.error {
  margin: 0 0 0.55rem;
  color: var(--color-danger);
  font-size: 0.88rem;
}

.ok {
  margin: 0 0 0.55rem;
  color: var(--color-gold);
  font-size: 0.88rem;
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
