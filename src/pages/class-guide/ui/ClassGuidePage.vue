<template>
  <div :class="['mx-auto w-[min(100%-2rem,1920px)]', $style.page]">
    <div v-if="error && !pending" :class="$style.error">
      Не удалось загрузить гайд. Проверьте API и обновите страницу.
    </div>

    <template v-if="pending">
      <div v-for="n in 5" :key="n" :class="$style.skel">
        <UiSkeleton variant="text" width="30%" height="1.4rem" />
        <UiSkeleton variant="block" height="120px" class="mt-3" />
      </div>
    </template>

    <template v-else-if="error">
      <!-- message above -->
    </template>

    <template v-else-if="!bundle">
      <ShowEmptyGuide title="Класс не найден" description="Такого класса нет или он скрыт." />
    </template>

    <template v-else>
      <div :class="$style.comboMorphRow">
        <div :class="$style.comboMorphCell">
          <GuideSection flush title="Суть" anchor="summary">
            <template v-if="sectionCount('summary')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{ sectionCount('summary') }}</span>
            </template>
            <template #actions>
              <ProposeGuideForm
                :class-slug="bundle.class.slug"
                section="summary"
                :initial-text="bundle.guide?.summary"
              />
            </template>
            <div v-if="bundle.guide?.summary" :class="[$style.summary, $style.fade]">
              <UiMarkdownPreview
                id="class-summary-preview"
                :model-value="bundle.guide.summary"
              />
            </div>
            <ShowEmptyGuide v-else />
          </GuideSection>
        </div>

        <div :class="$style.comboMorphCell">
          <GuideSection flush title="Комба" anchor="combo">
            <template v-if="comboPendingCount" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{ comboPendingCount }}</span>
            </template>
            <template #actions>
              <ProposeGuideForm
                :key="comboSection"
                :class-slug="bundle.class.slug"
                :section="comboSection"
              />
            </template>

            <div v-if="activeComboSteps.length" :class="[$style.comboBlock, $style.fade]">
              <ComboChain
                :steps="activeComboSteps"
                :label="specMode === 'succession' ? 'Комба наследия' : 'Комба пробуждения'"
              />
            </div>
            <ShowEmptyGuide v-else />
          </GuideSection>
        </div>

        <div :class="$style.comboMorphCell">
          <GuideSection flush title="Морфы" anchor="morphs">
            <template v-if="sectionCount('morphs')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{ sectionCount('morphs') }}</span>
            </template>
            <template #actions>
              <ProposeMorphForm
                :class-slug="bundle.class.slug"
                :initial-morphs="bundle.morphs"
              />
            </template>
            <div :class="[$style.morphStage, $style.fade]">
              <MorphBoard :filled="morphFilled" />
            </div>
          </GuideSection>
        </div>

        <template v-if="isSuperadmin && topDraftsVisible">
          <div :class="[$style.comboMorphCell, $style.comboMorphDraft]">
            <PendingSectionDrafts
              :proposals="pendingFor('summary')"
              @changed="onDraftChanged"
            />
          </div>
          <div :class="[$style.comboMorphCell, $style.comboMorphDraft]">
            <PendingSectionDrafts
              :proposals="comboPending"
              @changed="onDraftChanged"
            />
          </div>
          <div :class="[$style.comboMorphCell, $style.comboMorphDraft]">
            <PendingSectionDrafts
              :proposals="pendingFor('morphs')"
              @changed="onDraftChanged"
            />
          </div>
        </template>
      </div>

      <div :class="$style.gearBlock">
        <div ref="crystalColRef" :class="[$style.gearCell, $style.gearLive]">
          <GuideSection flush title="Инкрустация" anchor="crystals">
            <template v-if="sectionCount('crystals')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{ sectionCount('crystals') }}</span>
            </template>
            <template #actions>
              <ProposeCrystalForm
                :class-slug="bundle.class.slug"
                :initial-crystals="bundle.crystals"
              />
            </template>
            <div :class="[$style.crystalLayout, $style.fade]">
              <div :class="$style.picked">
                <p v-if="!crystalPickedList.length" :class="$style.pickedEmpty">Пока пусто</p>
                <ul v-else :class="$style.pickedList">
                  <li v-for="row in crystalPickedList" :key="row.id" :class="$style.pickedItem">
                    <img
                      v-if="row.icon_url"
                      :src="row.icon_url"
                      alt=""
                      :class="$style.pickedIcon"
                      loading="lazy"
                    >
                    <span :class="$style.pickedName">{{ row.name_ru }}</span>
                    <span v-if="row.count > 1" :class="$style.pickedCount">×{{ row.count }}</span>
                  </li>
                </ul>
              </div>
              <div :class="$style.crystalStage">
                <CrystalBoard :filled="crystalFilled" />
              </div>
            </div>
          </GuideSection>
        </div>

        <div :class="[$style.gearCell, $style.gearLive]">
          <GuideSection flush title="Реликвии" anchor="relics">
            <template v-if="sectionCount('relics')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{ sectionCount('relics') }}</span>
            </template>
            <template #actions>
              <ProposeRelicForm
                :class-slug="bundle.class.slug"
                :initial-relics="bundle.relics"
                :initial-lightstones="bundle.lightstones"
              />
            </template>
            <div :class="[$style.relicStage, $style.fade]">
              <RelicBoard :filled="relicFilled" />
            </div>
          </GuideSection>
        </div>

        <div
          :class="[$style.gearCell, $style.gearLive, $style.buffCol]"
          :style="buffColStyle"
        >
          <GuideSection fill flush title="Забаф" anchor="buffs">
            <template v-if="sectionCount('buffs')" #badge>
              <span :class="$style.pendingBadge" title="На модерации">{{ sectionCount('buffs') }}</span>
            </template>
            <template #actions>
              <ProposeGuideForm
                :class-slug="bundle.class.slug"
                section="buffs"
                :initial-buffs="bundle.buffs"
              />
            </template>
            <div :class="$style.scrollCard">
              <ul v-if="activeBuffs.length" :class="[$style.buffList, $style.fade]">
                <li v-for="row in activeBuffs" :key="row.id" :class="$style.buffItem">
                  <img
                    v-if="row.buffs?.icon_url"
                    :src="row.buffs.icon_url"
                    alt=""
                    :class="$style.buffIcon"
                    loading="lazy"
                  >
                  <div :class="$style.buffBody">
                    <strong>{{ row.buffs?.name_ru || row.slot || 'Слот' }}</strong>
                    <span v-if="row.group_name" :class="$style.muted"> · {{ row.group_name }}</span>
                    <p v-if="row.notes" :class="$style.notes">{{ row.notes }}</p>
                  </div>
                </li>
              </ul>
              <p v-else :class="[$style.buffEmpty, $style.fade]">Пока пусто</p>
            </div>
          </GuideSection>
        </div>

        <template v-if="isSuperadmin && gearDraftsVisible">
          <div :class="[$style.gearCell, $style.gearDraft]">
            <PendingSectionDrafts
              :proposals="pendingFor('crystals')"
              @changed="onDraftChanged"
            />
          </div>
          <div :class="[$style.gearCell, $style.gearDraft]">
            <PendingSectionDrafts
              :proposals="pendingFor('relics')"
              @changed="onDraftChanged"
            />
          </div>
          <div :class="[$style.gearCell, $style.gearDraft]">
            <PendingSectionDrafts
              :proposals="pendingFor('buffs')"
              @changed="onDraftChanged"
            />
          </div>
        </template>
      </div>

      <GuideSection title="Видео" anchor="videos">
        <template v-if="sectionCount('videos')" #badge>
          <span :class="$style.pendingBadge" title="На модерации">{{ sectionCount('videos') }}</span>
        </template>
        <template #actions>
          <ProposeVideosForm
            :class-slug="bundle.class.slug"
            :initial-videos="bundle.videos"
          />
        </template>
        <VideoList :videos="bundle.videos" />
        <PendingSectionDrafts
          v-if="isSuperadmin"
          :proposals="pendingFor('videos')"
          @changed="onDraftChanged"
        />
      </GuideSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ClassGuideBundle, ProposalSection } from '@/entities/class'
import {
  fetchPendingForClass,
  PendingSectionDrafts,
  type PendingProposal,
} from '@/features/superadmin-auth'
import { ProposeCrystalForm, ProposeGuideForm, ProposeMorphForm, ProposeRelicForm, ProposeVideosForm } from '@/features/propose-guide'
import { ShowEmptyGuide } from '@/features/show-empty-guide'
import {
  CRYSTAL_ALL_SLOTS,
  morphPresetFrom,
  resolveAddonLabel,
  useGuidePreset,
  useGuideSpecMode,
  usePendingSummary,
  useSuperadmin,
} from '@/shared/lib'
import { UiMarkdownPreview, UiSkeleton } from '@/shared/ui'
import { ComboChain } from '@/widgets/combo-chain'
import { CrystalBoard, type CrystalFill } from '@/widgets/crystal-board'
import { GuideSection } from '@/widgets/guide-section'
import { MorphBoard, type MorphSlotFill } from '@/widgets/morph-board'
import { RelicBoard, type RelicFill } from '@/widgets/relic-board'
import { VideoList } from '@/widgets/video-list'

const props = defineProps<{
  bundle: ClassGuideBundle | null
  pending: boolean
  error?: boolean
}>()

const { isSuperadmin } = useSuperadmin()
const { refresh: refreshPendingSummary } = usePendingSummary()
const classPending = ref<PendingProposal[]>([])

async function loadClassPending() {
  if (!isSuperadmin.value || !props.bundle?.class.slug) {
    classPending.value = []
    return
  }
  try {
    classPending.value = await fetchPendingForClass(props.bundle.class.slug)
  } catch {
    classPending.value = []
  }
}

function pendingFor(section: string) {
  return classPending.value.filter((p) => p.section === section)
}

function sectionCount(section: string) {
  return pendingFor(section).length
}

const comboPending = computed(() =>
  classPending.value.filter(
    (p) => p.section === 'combo_awakening' || p.section === 'combo_succession',
  ),
)
const comboPendingCount = computed(() => comboPending.value.length)

const gearDraftsVisible = computed(
  () =>
    sectionCount('crystals') > 0 ||
    sectionCount('relics') > 0 ||
    sectionCount('buffs') > 0,
)

const topDraftsVisible = computed(
  () =>
    sectionCount('summary') > 0 ||
    comboPendingCount.value > 0 ||
    sectionCount('morphs') > 0,
)

async function onDraftChanged(action: 'approve' | 'reject') {
  await loadClassPending()
  await refreshPendingSummary()
  if (action === 'approve') {
    await reloadNuxtApp({ force: true })
  }
}

watch(
  [isSuperadmin, () => props.bundle?.class.slug],
  () => {
    void loadClassPending()
  },
  { immediate: true },
)

const specMode = useGuideSpecMode()
const guidePreset = useGuidePreset()
const activeMorphPreset = computed(() => morphPresetFrom(specMode.value, guidePreset.value))
const crystalColRef = ref<HTMLElement | null>(null)
const buffMaxHeight = ref<number | null>(null)
let crystalObserver: ResizeObserver | null = null

const buffColStyle = computed(() =>
  buffMaxHeight.value != null ? { maxHeight: `${buffMaxHeight.value}px` } : undefined,
)

function syncBuffMaxHeight() {
  const h = crystalColRef.value?.getBoundingClientRect().height
  if (!h || h < 80) {
    buffMaxHeight.value = null
    return
  }
  buffMaxHeight.value = Math.round(h)
}

function bindCrystalObserver() {
  crystalObserver?.disconnect()
  crystalObserver = null
  const el = crystalColRef.value
  if (!el || typeof ResizeObserver === 'undefined') {
    syncBuffMaxHeight()
    return
  }
  crystalObserver = new ResizeObserver(() => syncBuffMaxHeight())
  crystalObserver.observe(el)
  syncBuffMaxHeight()
}

watch(
  () => [props.bundle, props.pending, guidePreset.value] as const,
  async () => {
    if (props.pending || !props.bundle) return
    await nextTick()
    bindCrystalObserver()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  crystalObserver?.disconnect()
  crystalObserver = null
})

const awakeningSteps = computed(
  () => props.bundle?.comboSteps.filter((s) => s.mode === 'awakening') ?? [],
)
const successionSteps = computed(
  () => props.bundle?.comboSteps.filter((s) => s.mode === 'succession') ?? [],
)
const activeComboSteps = computed(() =>
  specMode.value === 'succession' ? successionSteps.value : awakeningSteps.value,
)
const comboSection = computed<ProposalSection>(() =>
  specMode.value === 'succession' ? 'combo_succession' : 'combo_awakening',
)

const activeBuffs = computed(() =>
  (props.bundle?.buffs ?? []).filter(
    (row) => (row.preset || 't1') === guidePreset.value,
  ),
)

const crystalFilled = computed(() => {
  const map: Record<string, CrystalFill> = {}
  for (const row of props.bundle?.crystals ?? []) {
    const preset = row.preset || 't1'
    if (preset !== guidePreset.value) continue
    const slot = row.slot
    const item = row.items
    if (!slot || !item) continue
    map[slot] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
  }
  return map
})

const crystalPickedList = computed(() => {
  const filled = crystalFilled.value
  const counts = new Map<
    string,
    { id: string; name_ru: string; icon_url: string | null; count: number }
  >()
  for (const slot of CRYSTAL_ALL_SLOTS) {
    const item = filled[slot.id]
    if (!item) continue
    const prev = counts.get(item.id)
    if (prev) {
      prev.count += 1
    } else {
      counts.set(item.id, {
        id: item.id,
        name_ru: item.name_ru,
        icon_url: item.icon_url,
        count: 1,
      })
    }
  }
  return [...counts.values()]
})

const relicFilled = computed(() => {
  const map: Record<string, RelicFill> = {}
  for (const row of [...(props.bundle?.relics ?? []), ...(props.bundle?.lightstones ?? [])]) {
    const preset = row.preset || 't1'
    if (preset !== guidePreset.value) continue
    const slot = row.slot
    const item = row.items
    if (!slot || !item) continue
    map[slot] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
  }
  return map
})

const morphFilled = computed(() => {
  const map: Partial<Record<50 | 52 | 54 | 56 | 58 | 60, MorphSlotFill>> = {}
  for (const row of props.bundle?.morphs ?? []) {
    if (row.preset !== activeMorphPreset.value) continue
    const level = row.slot_level as 50 | 52 | 54 | 56 | 58 | 60
    const tier = row.skills?.addon_tier ?? 2
    map[level] = {
      skill: row.skills
        ? {
            id: row.skills.id,
            name_ru: row.skills.name_ru,
            icon_url: row.skills.icon_url,
            addon_tier: row.skills.addon_tier,
          }
        : null,
      effect1Label: row.effect1
        ? resolveAddonLabel(row.effect1.tier_labels, tier, row.effect1.name_ru)
        : null,
      effect2Label: row.effect2
        ? resolveAddonLabel(row.effect2.tier_labels, tier, row.effect2.name_ru)
        : null,
    }
  }
  return map
})
</script>

<style module>
.error {
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  padding: 1rem 1.25rem;
  color: var(--color-danger);
}

.skel {
  margin-bottom: 1.5rem;
}

.summary {
  min-height: 1.5rem;
}

.fade {
  animation: fade-in 320ms ease both;
}

.pendingBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--color-gold) 50%, transparent);
  border-radius: 999px;
  background: var(--color-gold-dim);
  color: var(--color-gold);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 0.2rem 0.4rem;
  text-align: center;
  pointer-events: none;
  user-select: none;
}

.list {
  margin: 0;
  display: grid;
  list-style: none;
  gap: 0.75rem;
  padding: 0;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 0.75rem;
}

.icon {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.buffList {
  margin: 0;
  display: grid;
  list-style: none;
  gap: 0.5rem;
  padding: 0;
}

.buffItem {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 0.55rem 0.65rem;
}

.buffIcon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.buffBody {
  min-width: 0;
  font-size: 0.88rem;
  line-height: 1.3;
}

.buffEmpty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.muted {
  font-weight: 400;
  color: var(--color-muted);
}

.notes {
  margin: 0.375rem 0 0;
  font-size: 0.92rem;
  color: var(--color-muted);
}

.comboBlock {
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem 1.15rem;
}

.comboMorphRow {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1px;
  margin-bottom: 2.5rem;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  overflow: visible;
}

.comboMorphCell {
  min-width: 0;
  padding: 0.85rem 1rem;
  background: var(--color-bg);
  overflow: visible;
}

.comboMorphDraft {
  overflow: visible;
}

.morphStage {
  width: 100%;
  min-width: 0;
}

.presetTabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.presetTab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  padding: 0.3rem 0.65rem;
}

.presetTabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.gearBlock {
  display: grid;
  grid-template-columns: auto auto minmax(14rem, 1fr);
  gap: 1px;
  margin-bottom: 2.5rem;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  overflow: visible;
}

.gearCell {
  min-width: 0;
  padding: 0.85rem 1rem;
  background: var(--color-bg);
  overflow: visible;
}

.gearDraft {
  overflow: visible;
}

.buffCol {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.scrollCard {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 0.55rem;
}

.crystalLayout {
  display: grid;
  grid-template-columns: minmax(11rem, 14rem) minmax(0, 22rem);
  gap: 0.85rem;
  align-items: stretch;
  justify-content: start;
  width: fit-content;
  max-width: 100%;
}

.picked {
  height: 0;
  min-height: 100%;
  min-width: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
}

.pickedEmpty {
  margin: 0;
  padding: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.pickedList {
  margin: 0;
  list-style: none;
  padding: 0;
}

.pickedItem {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.4rem 0.5rem;
}

.pickedIcon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.pickedName {
  min-width: 0;
  flex: 1;
  font-size: 0.8rem;
  line-height: 1.25;
  color: var(--color-ink);
}

.pickedCount {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--color-gold);
}

.crystalStage {
  width: 100%;
  max-width: 22rem;
  min-width: 0;
}

.relicStage {
  width: min(100%, 28rem);
}

@media (max-width: 1100px) {
  .comboMorphRow,
  .gearBlock {
    grid-template-columns: 1fr;
  }

  .buffCol {
    max-height: none !important;
  }
}

@media (max-width: 720px) {
  .crystalLayout {
    grid-template-columns: 1fr;
  }

  .picked {
    height: auto;
    min-height: 0;
    max-height: 12rem;
  }

  .crystalStage {
    width: min(100%, 32rem);
    margin-inline: auto;
  }
}
</style>
