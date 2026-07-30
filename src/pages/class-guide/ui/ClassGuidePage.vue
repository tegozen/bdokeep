<template>
  <div :class="['mx-auto w-[min(100%-2rem,1920px)]', $style.page]">
    <ClassHero
      :klass="bundle?.class"
      :pvp-role="bundle?.guide?.pvp_role"
      :pending="pending"
    />

    <div v-if="error && !pending" :class="$style.error">
      Не удалось загрузить гайд. Проверьте API (PostgREST) и обновите страницу.
    </div>

    <nav v-if="!pending && !error && bundle" :class="$style.toc" aria-label="Разделы гайда">
      <a v-for="item in toc" :key="item.id" :href="`#${item.id}`">{{ item.label }}</a>
    </nav>

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
      <GuideSection title="Суть / роль в PvP" anchor="summary">
        <p v-if="bundle.guide?.summary" :class="[$style.summary, $style.fade]">
          {{ bundle.guide.summary }}
        </p>
        <ShowEmptyGuide v-else />
        <div :class="$style.proposeRow">
          <ProposeGuideForm :class-slug="bundle.class.slug" section="summary" />
          <ProposeGuideForm
            :class-slug="bundle.class.slug"
            section="pvp_role"
            trigger-label="Предложить роль"
          />
        </div>
      </GuideSection>

      <GuideSection title="Забаф" anchor="buffs" subtitle="Рекомендованный забаф гильдии">
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

      <GuideSection title="Комба" anchor="combo" subtitle="Цепочки для пробуждения и наследия">
        <div v-if="hasCombo" :class="[$style.comboWrap, $style.fade]">
          <div v-if="awakeningSteps.length" :class="$style.comboBlock">
            <h3 :class="$style.comboTitle">Пробуждение</h3>
            <ComboChain :steps="awakeningSteps" label="Комба пробуждения" />
          </div>
          <div v-if="successionSteps.length" :class="$style.comboBlock">
            <h3 :class="$style.comboTitle">Наследие</h3>
            <ComboChain :steps="successionSteps" label="Комба наследия" />
          </div>
        </div>
        <ShowEmptyGuide v-else />
        <div :class="$style.proposeRow">
          <ProposeGuideForm
            :class-slug="bundle.class.slug"
            section="combo_awakening"
            trigger-label="Предложить комбу (пробуждение)"
          />
          <ProposeGuideForm
            :class-slug="bundle.class.slug"
            section="combo_succession"
            trigger-label="Предложить комбу (наследие)"
          />
        </div>
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

      <GuideSection title="Видео" anchor="videos" subtitle="YouTube-гайды по классу">
        <VideoList :videos="bundle.videos" />
      </GuideSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ClassGuideBundle } from '@/entities/class'
import { ProposeGuideForm } from '@/features/propose-guide'
import { ShowEmptyGuide } from '@/features/show-empty-guide'
import { UiSkeleton } from '@/shared/ui'
import { ClassHero } from '@/widgets/class-hero'
import { ComboChain } from '@/widgets/combo-chain'
import { GuideItemList } from '@/widgets/guide-item-list'
import { GuideSection } from '@/widgets/guide-section'
import { VideoList } from '@/widgets/video-list'

const props = defineProps<{
  bundle: ClassGuideBundle | null
  pending: boolean
  error?: boolean
}>()

const toc = [
  { id: 'summary', label: 'Суть' },
  { id: 'buffs', label: 'Забаф' },
  { id: 'skills', label: 'Скиллы' },
  { id: 'combo', label: 'Комба' },
  { id: 'essence', label: 'Инкра' },
  { id: 'relics', label: 'Релики' },
  { id: 'lightstones', label: 'Камни' },
  { id: 'crystals', label: 'Ваны' },
  { id: 'videos', label: 'Видео' },
]

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
const hasCombo = computed(
  () => awakeningSteps.value.length > 0 || successionSteps.value.length > 0,
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

.toc {
  margin-bottom: 2rem;
  display: flex;
  flex-wrap: wrap;
  column-gap: 1rem;
  row-gap: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.75rem 0;
  font-size: 0.92rem;
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

.comboWrap {
  display: grid;
  gap: 1.25rem;
}

.comboBlock {
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem 1.15rem;
}

.comboTitle {
  margin: 0 0 0.75rem;
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--color-gold-soft);
}

.proposeRow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.85rem;
}
</style>
