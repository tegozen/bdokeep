<template>
  <div
    :class="[
      $style.root,
      size === 'sm' && $style.sm,
      editable && $style.editable,
      saving && $style.saving,
    ]"
    :role="editable ? 'radiogroup' : 'img'"
    :aria-label="ariaLabel"
    @click.stop
    @keydown.stop
  >
    <template v-if="editable">
      <button
        v-for="n in 5"
        :key="n"
        type="button"
        :class="[$style.star, n <= filled ? $style.on : $style.off]"
        :disabled="saving"
        role="radio"
        :aria-checked="n === filled"
        :aria-label="`${n} из 5`"
        @click="onPick(n)"
      >
        <svg
          :class="$style.icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M12 3.2l2.35 5.55 6.05.55-4.6 4.05 1.4 5.95L12 16.2l-5.2 3.1 1.4-5.95-4.6-4.05 6.05-.55L12 3.2z"
          />
        </svg>
      </button>
    </template>
    <template v-else-if="filled">
      <span
        v-for="n in filled"
        :key="n"
        :class="[$style.star, $style.on]"
        aria-hidden="true"
      >
        <svg
          :class="$style.icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M12 3.2l2.35 5.55 6.05.55-4.6 4.05 1.4 5.95L12 16.2l-5.2 3.1 1.4-5.95-4.6-4.05 6.05-.55L12 3.2z"
          />
        </svg>
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    tier?: number | null
    editable?: boolean
    saving?: boolean
    size?: 'sm' | 'md'
  }>(),
  {
    tier: null,
    editable: false,
    saving: false,
    size: 'md',
  },
)

const emit = defineEmits<{
  change: [tier: number | null]
}>()

const filled = computed(() => {
  const t = props.tier
  return t === 1 || t === 2 || t === 3 || t === 4 || t === 5 ? t : 0
})

const ariaLabel = computed(() => {
  if (filled.value) return `Тир ${filled.value} из 5`
  return props.editable ? 'Тир не задан' : 'Тир не указан'
})

function onPick(n: number) {
  if (!props.editable || props.saving) return
  emit('change', n === filled.value ? null : n)
}
</script>

<style module>
.root {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  line-height: 0;
  user-select: none;
}

.sm .icon {
  width: 1.1rem;
  height: 1.1rem;
}

.root:not(.sm) .icon {
  width: 1.5rem;
  height: 1.5rem;
}

.editable {
  cursor: pointer;
}

.saving {
  opacity: 0.55;
  pointer-events: none;
}

.star {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  line-height: 0;
  cursor: inherit;
}

.star:disabled {
  cursor: default;
}

.icon {
  display: block;
  flex: none;
  overflow: visible;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 1.35;
  stroke-linejoin: round;
  /* 5-point stars read high; nudge down for optical center */
  transform: translateY(1px);
  paint-order: stroke fill;
}

.off .icon {
  fill: transparent;
  stroke: var(--color-border);
  color: var(--color-gold-soft);
  filter: none;
}

.on .icon {
  fill: var(--color-gold);
  stroke: var(--color-border-strong);
  color: var(--color-gold);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--color-gold) 35%, transparent));
}

.editable .off:not(:disabled):hover .icon,
.editable .off:not(:disabled):focus-visible .icon {
  stroke: var(--color-border-strong);
  color: var(--color-gold);
  outline: none;
}

.editable .on:not(:disabled):hover .icon,
.editable .on:not(:disabled):focus-visible .icon {
  fill: var(--color-gold);
  stroke: var(--color-gold);
  outline: none;
}
</style>
