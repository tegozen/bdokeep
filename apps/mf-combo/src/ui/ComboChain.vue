<template>
  <ol v-if="steps.length" :class="$style.chain" :aria-label="label">
    <li v-for="(step, i) in steps" :key="step.id || `${step.skills?.id}-${i}`" :class="$style.step">
      <span v-if="i > 0" :class="$style.arrow" aria-hidden="true">→</span>
      <span :class="$style.tile" :title="step.skills?.name_ru || 'Скилл'">
        <img
          v-if="step.skills?.icon_url"
          :src="codexIconSrc(step.skills.icon_url) || undefined"
          alt=""
          :class="$style.icon"
          loading="lazy"
        >
        <span v-else :class="$style.fallback">?</span>
        <span :class="$style.name">{{ step.skills?.name_ru || 'Скилл' }}</span>
      </span>
    </li>
  </ol>
</template>

<script setup lang="ts">
import type { GuideComboStepRow, Skill } from '@/entities/class'
import { codexIconSrc } from '@/shared/lib/codexIcon'

export type ComboStepView = {
  id?: string
  skills: Skill | null
}

defineProps<{
  steps: Array<GuideComboStepRow | ComboStepView>
  label?: string
}>()
</script>

<style module>
.chain {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.35rem 0.2rem;
  list-style: none;
  padding: 0;
}

.step {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.arrow {
  margin: 0 0.1rem;
  color: var(--color-gold-soft);
  font-size: 0.95rem;
  align-self: center;
}

.tile {
  display: flex;
  width: 4.25rem;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 0.4rem 0.3rem 0.35rem;
}

.icon,
.fallback {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  background: #000;
}

.icon {
  object-fit: contain;
}

.fallback {
  display: grid;
  place-items: center;
  color: var(--color-muted);
}

.name {
  display: -webkit-box;
  width: 100%;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 0.68rem;
  line-height: 1.15;
  text-align: center;
}
</style>
