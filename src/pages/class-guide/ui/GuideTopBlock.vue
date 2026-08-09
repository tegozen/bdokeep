<template>
  <div :class="$style.topBlock">
    <div
      v-if="showRecruitCol"
      :class="$style.recruitCol"
    >
      <GuildRecruitBanner :data="guildBanner" />
    </div>
    <div :class="$style.comboMorphRow">
      <div :class="$style.comboMorphCell">
        <GuideSection
          flush
          :title="`Заметки (${comboKindLabel(comboKind)})`"
          :subtitle="sectionSubtitle('summary')"
        >
          <template v-if="drafts.summaryPendingCount" #badge>
            <span :class="$style.pendingBadge" title="На модерации">{{
              drafts.summaryPendingCount
            }}</span>
          </template>
          <template #actions>
            <ProposeLazy
              :key="`${summarySection}-${comboKind}`"
              :loader="() => import('@/features/propose-guide/ui/ProposeSummaryForm.vue')"
              :form-props="{
                classSlug: bundle.class.slug,
                section: summarySection,
                kind: comboKind,
                initialText: activeSummary,
              }"
            />
          </template>
          <div v-if="activeSummary" :class="[$style.summary, $style.fade]">
            <UiMarkdownPreview
              id="class-summary-preview"
              :model-value="activeSummary"
            />
          </div>
          <ShowEmptyGuide v-else />
        </GuideSection>
      </div>

      <div :class="$style.comboMorphCell">
        <GuideSection
          flush
          title="Комба"
          :subtitle="sectionSubtitle('combo')"
        >
          <template v-if="drafts.comboPendingCount" #badge>
            <span :class="$style.pendingBadge" title="На модерации">{{
              drafts.comboPendingCount
            }}</span>
          </template>
          <template #actions>
            <ProposeLazy
              :key="`${comboSection}-${comboKind}`"
              :loader="() => import('@/features/propose-guide/ui/ProposeComboForm.vue')"
              :form-props="{
                classSlug: bundle.class.slug,
                section: comboSection,
                kind: comboKind,
                initialCombos: activeCombos,
              }"
            />
          </template>

          <div
            v-if="activeCombos.length"
            :class="[$style.comboBlock, $style.fade]"
          >
            <div
              v-for="combo in activeCombos"
              :key="combo.id"
              :class="$style.comboItem"
            >
              <p v-if="combo.notes" :class="$style.comboNotes">{{ combo.notes }}</p>
              <ComboChain
                :steps="combo.steps"
                :label="
                  combo.notes ||
                  (specMode === 'succession'
                    ? `Комба наследия · ${comboKindLabel(comboKind)}`
                    : `Комба пробуждения · ${comboKindLabel(comboKind)}`)
                "
              />
            </div>
          </div>
          <ShowEmptyGuide v-else />
        </GuideSection>
      </div>

      <div :class="$style.comboMorphCell">
        <GuideSection
          flush
          title="Морфы"
          :subtitle="sectionSubtitle('morphs')"
        >
          <template v-if="drafts.morphPendingCount" #badge>
            <span :class="$style.pendingBadge" title="На модерации">{{
              drafts.morphPendingCount
            }}</span>
          </template>
          <template #actions>
            <ProposeLazy
              :loader="() => import('@/features/propose-guide/ui/ProposeMorphForm.vue')"
              :form-props="{
                classSlug: bundle.class.slug,
                initialMorphs: bundle.morphs,
              }"
            />
          </template>
          <div :class="[$style.morphStage, $style.fade]">
            <MorphBoard :filled="morphFilled" />
          </div>
        </GuideSection>
      </div>

      <template v-if="isStaff && drafts.visible">
        <div :class="[$style.comboMorphCell, $style.comboMorphDraft]">
          <PendingSectionDrafts
            :proposals="drafts.summaryPending"
            @changed="drafts.onChanged"
            @optimistic-remove="drafts.onOptimisticRemove"
            @optimistic-restore="drafts.onOptimisticRestore"
          />
        </div>
        <div :class="[$style.comboMorphCell, $style.comboMorphDraft]">
          <PendingSectionDrafts
            :proposals="drafts.comboPending"
            @changed="drafts.onChanged"
            @optimistic-remove="drafts.onOptimisticRemove"
            @optimistic-restore="drafts.onOptimisticRestore"
          />
        </div>
        <div :class="[$style.comboMorphCell, $style.comboMorphDraft]">
          <PendingSectionDrafts
            :proposals="drafts.morphPending"
            @changed="drafts.onChanged"
            @optimistic-remove="drafts.onOptimisticRemove"
            @optimistic-restore="drafts.onOptimisticRestore"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  comboKindLabel,
  type ComboKindId,
  type GuideSpecMode,
} from '@domain'
import type { ClassGuideBundle, GuideCombo } from '@/entities/class'
import { ProposeLazy } from '@/features/propose-guide'
import { PendingSectionDrafts } from '@/features/superadmin-auth'
import type { MorphSlotFill, GuideUiSection } from '@/shared/lib'
import { ShowEmptyGuide } from '@/shared/ui'
import UiMarkdownPreview from '@/shared/ui/UiMarkdownPreview.vue'
import { MorphBoard } from '@/shared/ui/morph-board'
import { ComboChain } from '@/widgets/combo-chain'
import { GuideSection } from '@/widgets/guide-section'
import { GuildRecruitBanner, type GuildBannerPublic } from '@/widgets/guild-banner'
import type { GuideTopDrafts } from './guideDrafts'

defineProps<{
  bundle: ClassGuideBundle
  guildBanner: GuildBannerPublic | null | undefined
  showRecruitCol: boolean
  isStaff: boolean
  comboKind: ComboKindId
  specMode: GuideSpecMode
  sectionSubtitle: (key: GuideUiSection) => string
  summarySection: string
  comboSection: string
  activeSummary: string | null
  activeCombos: GuideCombo[]
  morphFilled: Partial<Record<50 | 52 | 54 | 56 | 58 | 60, MorphSlotFill>>
  drafts: GuideTopDrafts
}>()
</script>

<style module>
.summary {
  min-width: 0;
  max-width: 100%;
  min-height: 1.5rem;
  /* Cap so long siege-role markdown scrolls inside the cell, not the page. */
  max-height: min(28rem, 60vh);
  overflow: auto;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.fade {
  animation: fade-in 320ms ease;
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

.comboBlock {
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem 1.15rem;
}

.comboItem + .comboItem {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.comboNotes {
  margin: 0 0 0.55rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.topBlock {
  display: flex;
  align-items: flex-start;
  gap: 1px;
  margin-bottom: 2.5rem;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  overflow: visible;
}

.recruitCol {
  flex: 0 0 auto;
  align-self: stretch;
  width: max-content;
  max-width: 100%;
  min-width: 0;
  padding: 0.85rem 1rem;
  background: var(--color-bg);
}

.comboMorphRow {
  flex: 1 1 auto;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1px;
  margin: 0;
  border: none;
  background: var(--color-border);
  overflow: visible;
}

.comboMorphCell {
  min-width: 0;
  padding: 0.85rem 1rem;
  background: var(--color-bg);
  overflow: visible;
}

.comboMorphDraft {
  display: flex;
  flex-direction: column;
  /* Reserve draft chrome so catalog hydrate doesn't grow the page mid-scroll. */
  height: min(32rem, 70vh);
  min-height: min(32rem, 70vh);
  overflow: visible;
  padding: 0;
}

.comboMorphDraft > * {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.morphStage {
  width: 100%;
  min-width: 0;
}

@media (max-width: 1100px) {
  .topBlock {
    flex-direction: column;
  }

  .comboMorphRow {
    grid-template-columns: 1fr;
    width: 100%;
  }
}
</style>
