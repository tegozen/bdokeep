<template>
  <div :class="$style.topWrap">
    <div
      :class="[
        $style.rowNotes,
        showRecruitCol && $style.rowNotesWithBanner,
      ]"
    >
      <div
        v-if="showRecruitCol"
        :class="$style.banner"
      >
        <GuildRecruitBanner :data="guildBanner" />
      </div>
      <div :class="$style.notesClamp">
        <GuideSection
          flush
          fill
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
    </div>
    <div
      v-if="isStaff && drafts.visible"
      :class="$style.sectionDraft"
    >
      <PendingSectionDrafts
        :proposals="drafts.summaryPending"
        @changed="drafts.onChanged"
        @optimistic-remove="drafts.onOptimisticRemove"
        @optimistic-restore="drafts.onOptimisticRestore"
      />
    </div>

    <div :class="$style.rowCombo">
      <div :class="$style.comboCol">
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
              <div :class="$style.comboScroll">
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
          </div>
          <div v-else :class="$style.comboBlock">
            <ShowEmptyGuide />
          </div>
        </GuideSection>
        <div
          v-if="isStaff && drafts.visible"
          :class="$style.sectionDraft"
        >
          <PendingSectionDrafts
            :proposals="drafts.comboPending"
            @changed="drafts.onChanged"
            @optimistic-remove="drafts.onOptimisticRemove"
            @optimistic-restore="drafts.onOptimisticRestore"
          />
        </div>
      </div>

      <div :class="$style.morphCol">
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
        <div
          v-if="isStaff && drafts.visible"
          :class="$style.sectionDraft"
        >
          <PendingSectionDrafts
            :proposals="drafts.morphPending"
            @changed="drafts.onChanged"
            @optimistic-remove="drafts.onOptimisticRemove"
            @optimistic-restore="drafts.onOptimisticRestore"
          />
        </div>
      </div>
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
import { MorphBoard, type MorphSlotFill } from '@/entities/catalog'
import { ComboChain } from '@/entities/class'
import UiMarkdownPreview from '@/shared/ui/UiMarkdownPreview.vue'
import type { GuideUiSection } from '../lib/sectionUpdates'
import ShowEmptyGuide from './ShowEmptyGuide.vue'
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
  min-height: 0;
  flex: 1 1 auto;
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
  /* MorphBoard: 6 rows × 4.5rem + 1px border top/bottom */
  --combo-work-h: calc(6 * 4.5rem + 2px);
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: var(--combo-work-h);
  max-height: var(--combo-work-h);
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem 1.15rem;
  overflow-x: hidden;
  overflow-y: auto;
}

.comboItem {
  min-width: 0;
  max-width: 100%;
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

.comboScroll {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.topWrap {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  max-width: 100%;
}

.rowNotes {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  min-width: 0;
}

@media (min-width: 768px) {
  .rowNotes {
    gap: 0.9rem;
  }
}

.rowCombo {
  display: flex;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
  max-width: 100%;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

/* Same visual as home: bare frame, no panel chrome.
   Fixed height = banner cardMatch width × frame aspect (292/218). */
.rowNotesWithBanner {
  --banner-w: calc(3 * 130px + 2 * 0.85rem);
  --banner-h: calc(var(--banner-w) * 218 / 292);
}

@media (min-width: 768px) {
  .rowNotesWithBanner {
    --banner-w: calc(3 * 148px + 2 * 0.9rem);
  }
}

.banner {
  flex: 0 0 auto;
  align-self: flex-start;
  width: var(--banner-w, auto);
  height: var(--banner-h, auto);
  max-width: 100%;
  line-height: 0;
}

.rowNotesWithBanner .banner :deep(aside) {
  width: 100% !important;
  height: 100% !important;
  max-width: none;
  aspect-ratio: auto;
}

.notesClamp {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.rowNotesWithBanner .notesClamp {
  height: var(--banner-h);
  max-height: var(--banner-h);
}

/* Without banner, keep a reasonable scroll cap. */
.rowNotes:not(.rowNotesWithBanner) .summary {
  max-height: min(28rem, 60vh);
}

.comboCol,
.morphCol {
  min-width: 0;
  padding: 0.85rem 1rem;
  background: var(--color-bg);
}

.comboCol {
  flex: 1 1 0;
  overflow: hidden;
}

.comboCol > * {
  min-width: 0;
  max-width: 100%;
}

/* Keep morph column ~same footprint as the banner / ~3 home cards. */
.morphCol {
  flex: 0 0 auto;
  align-self: stretch;
  width: min(100%, calc(3 * 148px + 2 * 0.9rem));
  max-width: 100%;
}

.sectionDraft {
  display: flex;
  flex-direction: column;
  height: min(32rem, 70vh);
  min-height: min(32rem, 70vh);
  overflow: visible;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}

.sectionDraft > * {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.morphStage {
  width: 100%;
  min-width: 0;
}

@media (max-width: 1100px) {
  .rowNotes,
  .rowCombo {
    flex-direction: column;
  }

  .banner,
  .morphCol {
    width: 100%;
  }

  .rowNotesWithBanner .banner {
    width: 100%;
    height: auto;
    aspect-ratio: 292 / 218;
  }

  .rowNotesWithBanner .banner :deep(aside) {
    height: auto !important;
    aspect-ratio: 292 / 218;
  }

  .rowNotesWithBanner .notesClamp {
    height: auto;
    max-height: min(28rem, 60vh);
  }

  .rowNotesWithBanner .summary {
    max-height: min(28rem, 60vh);
  }
}
</style>
