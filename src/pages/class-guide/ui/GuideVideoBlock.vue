<template>
  <div :class="$style.videoBlock">
    <div :class="[$style.videoCell, $style.videoLive]">
      <GuideSection
        flush
        title="Видео"
        :subtitle="sectionSubtitle('videos')"
      >
        <template v-if="drafts.videosPendingCount" #badge>
          <span :class="$style.pendingBadge" title="На модерации">{{
            drafts.videosPendingCount
          }}</span>
        </template>
        <template #actions>
          <ProposeLazy
            :key="videosSection"
            :loader="() => import('@/features/propose-guide/ui/ProposeVideosForm.vue')"
            :form-props="{
              classSlug: bundle.class.slug,
              section: videosSection,
              initialVideos: activeVideos,
            }"
          />
        </template>
        <VideoList :videos="activeVideos" />
      </GuideSection>
    </div>

    <template v-if="isStaff && drafts.visible">
      <div :class="[$style.videoCell, $style.videoDraft]">
        <PendingSectionDrafts
          :proposals="drafts.videosPending"
          @changed="drafts.onChanged"
          @optimistic-remove="drafts.onOptimisticRemove"
          @optimistic-restore="drafts.onOptimisticRestore"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ClassGuideBundle, ClassVideo } from '@/entities/class'
import { ProposeLazy } from '@/features/propose-guide'
import { PendingSectionDrafts } from '@/features/superadmin-auth'
import type { GuideUiSection } from '@/shared/lib'
import { GuideSection } from '@/widgets/guide-section'
import { VideoList } from '@/entities/class'
import type { GuideVideoDrafts } from './guideDrafts'

defineProps<{
  bundle: ClassGuideBundle
  videosSection: string
  activeVideos: ClassVideo[]
  sectionSubtitle: (key: GuideUiSection) => string
  isStaff: boolean
  drafts: GuideVideoDrafts
}>()
</script>

<style module>
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

.videoBlock {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  overflow: visible;
}

.videoCell {
  min-width: 0;
  padding: 0.85rem 1rem;
  background: var(--color-bg);
  overflow: visible;
}

.videoDraft {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: visible;
  padding: 0;
}

.videoDraft > * {
  flex: 1;
  min-height: 0;
}
</style>
