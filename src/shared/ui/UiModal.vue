<template>
  <Teleport v-if="open" to="body">
    <div
      :class="[
        $style.backdrop,
        full && $style.backdropFull,
        obscured && $style.obscured,
      ]"
      :style="zIndex != null ? { zIndex } : undefined"
      @click.self="emit('close')"
    >
      <div
        :class="[
          $style.modal,
          $style[size],
          full && $style.modalFull,
          borderStrong && $style.borderStrong,
        ]"
        :role="role"
        aria-modal="true"
        :aria-label="ariaLabel || title || undefined"
        :aria-labelledby="labelledBy"
        :aria-describedby="describedBy"
      >
        <header v-if="showHeader" :class="$style.head">
          <slot name="title">
            <h3
              v-if="title"
              :id="titleId"
              :class="$style.title"
            >
              {{ title }}
            </h3>
          </slot>
          <slot name="headerExtra" />
          <button
            type="button"
            :class="$style.close"
            aria-label="Закрыть"
            @click="emit('close')"
          >
            ×
          </button>
        </header>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
export type UiModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'fluid'

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    ariaLabel?: string
    obscured?: boolean
    full?: boolean
    showHeader?: boolean
    role?: 'dialog' | 'alertdialog'
    zIndex?: number | string
    size?: UiModalSize
    borderStrong?: boolean
    titleId?: string
    labelledBy?: string
    describedBy?: string
  }>(),
  {
    title: undefined,
    ariaLabel: undefined,
    obscured: false,
    full: false,
    showHeader: true,
    role: 'dialog',
    zIndex: 80,
    size: 'md',
    borderStrong: false,
    titleId: undefined,
    labelledBy: undefined,
    describedBy: undefined,
  },
)

const emit = defineEmits<{
  close: []
}>()
</script>

<style module>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
  transition: filter 160ms ease;
}

.backdropFull {
  justify-items: center;
  align-items: stretch;
}

.obscured {
  filter: blur(10px);
  pointer-events: none;
  user-select: none;
}

.modal {
  display: flex;
  flex-direction: column;
  max-height: min(94vh, 56rem);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-glow);
}

.borderStrong {
  border-color: var(--color-border-strong);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.sm {
  width: min(100%, 22rem);
  max-height: none;
}

.md {
  width: min(100%, 36rem);
}

.lg {
  width: min(100%, 52rem);
  max-height: min(94vh, 48rem);
}

.xl {
  width: min(100%, 72rem);
  max-height: min(94vh, 52rem);
}

.xxl {
  width: min(100%, 84rem);
  max-height: min(94vh, 58rem);
}

.fluid {
  width: min(1100px, 100%);
  max-height: min(92vh, 900px);
}

.modalFull {
  width: var(--summary-edit-modal-width);
  height: 100%;
  max-height: none;
}

.head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.85rem 1rem;
  flex-wrap: wrap;
}

.title {
  margin: 0;
  font-size: 1.05rem;
}

.close {
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  margin-left: auto;
}

@media (max-width: 900px) {
  .xxl {
    width: min(100%, 42rem);
  }
}
</style>
