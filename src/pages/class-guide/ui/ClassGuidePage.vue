<template>
  <div :class="['mx-auto w-[min(100%-2rem,1920px)]', $style.page]">
    <div v-if="error && !pending" :class="$style.error">
      Не удалось загрузить гайд. Проверьте API (PostgREST) и обновите страницу.
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
      <GuideSection title="Суть" anchor="summary">
        <template #actions>
          <ProposeGuideForm :class-slug="bundle.class.slug" section="summary" />
        </template>
        <p v-if="bundle.guide?.summary" :class="[$style.summary, $style.fade]">
          {{ bundle.guide.summary }}
        </p>
        <ShowEmptyGuide v-else />
      </GuideSection>

      <GuideSection title="Забаф" anchor="buffs">
        <template #actions>
          <ProposeGuideForm
            :class-slug="bundle.class.slug"
            section="buffs"
            trigger-label="Предложить забаф"
          />
        </template>
        <ul v-if="bundle.buffs.length" :class="[$style.list, $style.fade]">
          <li v-for="row in bundle.buffs" :key="row.id" :class="$style.item">
            <img
              v-if="row.buffs?.icon_url"
              :src="row.buffs.icon_url"
              alt=""
              :class="$style.icon"
              loading="lazy"
            >
            <div>
              <strong>{{ row.buffs?.name_ru || row.slot || 'Слот' }}</strong>
              <span v-if="row.group_name" :class="$style.muted"> · {{ row.group_name }}</span>
              <p v-if="row.notes" :class="$style.notes">{{ row.notes }}</p>
            </div>
          </li>
        </ul>
        <ShowEmptyGuide v-else />
      </GuideSection>

      <GuideSection title="Комба" anchor="combo">
        <template #beside>
          <div :class="$style.comboTabs" role="tablist" aria-label="Тип комбы">
            <button
              type="button"
              role="tab"
              :aria-selected="comboTab === 'awakening'"
              :class="[$style.comboTab, comboTab === 'awakening' && $style.comboTabOn]"
              @click="comboTab = 'awakening'"
            >
              Пробуждение
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="comboTab === 'succession'"
              :class="[$style.comboTab, comboTab === 'succession' && $style.comboTabOn]"
              @click="comboTab = 'succession'"
            >
              Наследие
            </button>
          </div>
        </template>
        <template #actions>
          <ProposeGuideForm
            :key="comboSection"
            :class-slug="bundle.class.slug"
            :section="comboSection"
            trigger-label="Предложить комбу"
          />
        </template>

        <div v-if="activeComboSteps.length" :class="[$style.comboBlock, $style.fade]">
          <ComboChain
            :steps="activeComboSteps"
            :label="comboTab === 'succession' ? 'Комба наследия' : 'Комба пробуждения'"
          />
        </div>
        <ShowEmptyGuide v-else />
      </GuideSection>

      <div :class="$style.gearRow">
        <GuideSection flush :class="$style.gearCol" title="Инкрустация" anchor="crystals">
          <template #beside>
            <div :class="$style.presetTabs" role="tablist" aria-label="Пресет инкрустации">
              <button
                v-for="p in crystalPresets"
                :key="p.id"
                type="button"
                role="tab"
                :aria-selected="activeCrystalPreset === p.id"
                :class="[$style.presetTab, activeCrystalPreset === p.id && $style.presetTabOn]"
                @click="activeCrystalPreset = p.id"
              >
                {{ p.label }}
              </button>
            </div>
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

        <GuideSection flush :class="$style.gearCol" title="Реликвии" anchor="relics">
          <template #beside>
            <div :class="$style.presetTabs" role="tablist" aria-label="Пресет реликвий">
              <button
                v-for="p in crystalPresets"
                :key="p.id"
                type="button"
                role="tab"
                :aria-selected="activeRelicPreset === p.id"
                :class="[$style.presetTab, activeRelicPreset === p.id && $style.presetTabOn]"
                @click="activeRelicPreset = p.id"
              >
                {{ p.label }}
              </button>
            </div>
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

      <GuideSection title="Видео" anchor="videos">
        <VideoList :videos="bundle.videos" />
      </GuideSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ClassGuideBundle, ProposalSection } from '@/entities/class'
import { ProposeCrystalForm, ProposeGuideForm, ProposeRelicForm } from '@/features/propose-guide'
import { ShowEmptyGuide } from '@/features/show-empty-guide'
import { CRYSTAL_ALL_SLOTS, CRYSTAL_PRESETS, type CrystalPresetId } from '@/shared/lib'
import { UiSkeleton } from '@/shared/ui'
import { ComboChain } from '@/widgets/combo-chain'
import { CrystalBoard, type CrystalFill } from '@/widgets/crystal-board'
import { GuideSection } from '@/widgets/guide-section'
import { RelicBoard, type RelicFill } from '@/widgets/relic-board'
import { VideoList } from '@/widgets/video-list'

const props = defineProps<{
  bundle: ClassGuideBundle | null
  pending: boolean
  error?: boolean
}>()

const comboTab = ref<'awakening' | 'succession'>('awakening')
const crystalPresets = CRYSTAL_PRESETS
const activeCrystalPreset = ref<CrystalPresetId>('t1')
const activeRelicPreset = ref<CrystalPresetId>('t1')

const awakeningSteps = computed(
  () => props.bundle?.comboSteps.filter((s) => s.mode === 'awakening') ?? [],
)
const successionSteps = computed(
  () => props.bundle?.comboSteps.filter((s) => s.mode === 'succession') ?? [],
)
const activeComboSteps = computed(() =>
  comboTab.value === 'succession' ? successionSteps.value : awakeningSteps.value,
)
const comboSection = computed<ProposalSection>(() =>
  comboTab.value === 'succession' ? 'combo_succession' : 'combo_awakening',
)

const crystalFilled = computed(() => {
  const map: Record<string, CrystalFill> = {}
  for (const row of props.bundle?.crystals ?? []) {
    const preset = (row.preset || 't1') as CrystalPresetId
    if (preset !== activeCrystalPreset.value) continue
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
    const preset = (row.preset || 't1') as CrystalPresetId
    if (preset !== activeRelicPreset.value) continue
    const slot = row.slot
    const item = row.items
    if (!slot || !item) continue
    map[slot] = { id: item.id, name_ru: item.name_ru, icon_url: item.icon_url }
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
  white-space: pre-wrap;
}

.fade {
  animation: fade-in 320ms ease both;
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

.comboTabs {
  display: inline-flex;
  gap: 0.3rem;
}

.comboTab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.3rem 0.7rem;
}

.comboTabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
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

.gearRow {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 1.5rem 2rem;
  align-items: start;
  margin-bottom: 2.5rem;
}

.gearCol {
  margin-bottom: 0;
  min-width: 0;
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
  .gearRow {
    grid-template-columns: 1fr;
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
