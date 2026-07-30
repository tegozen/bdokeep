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

      <GuideSection title="Скилгайд" anchor="skills">
        <ul v-if="bundle.skills.length" :class="[$style.list, $style.fade]">
          <li v-for="row in bundle.skills" :key="row.id" :class="$style.item">
            <img
              v-if="row.skills?.icon_url"
              :src="row.skills.icon_url"
              alt=""
              :class="$style.icon"
              loading="lazy"
            >
            <div>
              <strong>{{ row.skills?.name_ru || 'Скилл' }}</strong>
              <span :class="$style.muted"> · {{ modeLabel(row.mode) }} · приоритет {{ row.priority }}</span>
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

      <GuideSection title="Инкра / эссенция" anchor="essence">
        <GuideItemList v-if="bundle.essence.length" :rows="bundle.essence" />
        <ShowEmptyGuide v-else />
      </GuideSection>

      <GuideSection title="Релики" anchor="relics">
        <GuideItemList v-if="bundle.relics.length" :rows="bundle.relics" />
        <ShowEmptyGuide v-else />
      </GuideSection>

      <GuideSection title="Светящиеся камни" anchor="lightstones">
        <GuideItemList v-if="bundle.lightstones.length" :rows="bundle.lightstones" />
        <ShowEmptyGuide v-else />
      </GuideSection>

      <GuideSection title="Камни в ванах" anchor="crystals">
        <GuideItemList v-if="bundle.crystals.length" :rows="bundle.crystals" />
        <ShowEmptyGuide v-else />
      </GuideSection>

      <GuideSection title="Видео" anchor="videos">
        <VideoList :videos="bundle.videos" />
      </GuideSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ClassGuideBundle, ProposalSection } from '@/entities/class'
import { ProposeGuideForm } from '@/features/propose-guide'
import { ShowEmptyGuide } from '@/features/show-empty-guide'
import { UiSkeleton } from '@/shared/ui'
import { ComboChain } from '@/widgets/combo-chain'
import { GuideItemList } from '@/widgets/guide-item-list'
import { GuideSection } from '@/widgets/guide-section'
import { VideoList } from '@/widgets/video-list'

const props = defineProps<{
  bundle: ClassGuideBundle | null
  pending: boolean
  error?: boolean
}>()

const comboTab = ref<'awakening' | 'succession'>('awakening')

function modeLabel(mode: string) {
  if (mode === 'succession') return 'Наследие'
  if (mode === 'both') return 'Оба'
  return 'Пробуждение'
}

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
</style>
