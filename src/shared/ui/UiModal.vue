<template>
  <Teleport v-if="open" to="body">
    <div
      :class="[
        $style.backdrop,
        full && $style.backdropFull,
        stackObscured && $style.obscured,
      ]"
      :style="zIndex != null ? { zIndex } : undefined"
      @pointerdown="onBackdropPointerDown"
      @click="onBackdropClick"
    >
      <div
        ref="panelRef"
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
        @pointerdown.stop
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
import { useModalEscape } from '@/shared/lib'

export type UiModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'fluid'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    ariaLabel?: string
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

const openRef = toRef(props, 'open')
const { obscured: stackObscured } = useModalEscape(openRef, () => emit('close'))

const panelRef = ref<HTMLElement | null>(null)
let focusObserver: MutationObserver | null = null
let focusTimer: ReturnType<typeof setTimeout> | null = null

const FOCUSABLE_INPUT =
  'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"])'

function stopFocusWatch() {
  focusObserver?.disconnect()
  focusObserver = null
  if (focusTimer != null) {
    clearTimeout(focusTimer)
    focusTimer = null
  }
}

function tryFocusFirstInput(): boolean {
  const root = panelRef.value
  if (!root || stackObscured.value) return false
  const el = root.querySelector<HTMLElement>(FOCUSABLE_INPUT)
  if (!el) return false
  el.focus({ preventScroll: true })
  return true
}

function scheduleFocusFirstInput() {
  stopFocusWatch()
  void nextTick(() => {
    requestAnimationFrame(() => {
      if (tryFocusFirstInput()) return
      const root = panelRef.value
      if (!root || !props.open) return
      // Lazy/async slot content (e.g. propose forms) may mount after open.
      focusObserver = new MutationObserver(() => {
        if (tryFocusFirstInput()) stopFocusWatch()
      })
      focusObserver.observe(root, { childList: true, subtree: true })
      focusTimer = setTimeout(stopFocusWatch, 1500)
    })
  })
}

watch(
  () => props.open,
  (isOpen) => {
    if (!import.meta.client) return
    if (!isOpen) {
      stopFocusWatch()
      return
    }
    scheduleFocusFirstInput()
  },
  { immediate: true },
)

onBeforeUnmount(stopFocusWatch)

/** Close only if press started on backdrop — not drag-from-dialog release. */
const backdropPress = ref(false)

function onBackdropPointerDown(e: PointerEvent) {
  backdropPress.value = e.target === e.currentTarget
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget && backdropPress.value) {
    emit('close')
  }
  backdropPress.value = false
}
</script>

<style module>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1rem;
  /* Match site shell (#050505 + page-bg), not flat black. */
  background: color-mix(in srgb, #050505 55%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
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
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: min(94vh, 56rem);
  overflow: hidden;
  border: 0;
  border-radius: 0.75rem;
  /* Same plate as footer / home filters — warm #050505, not cool slate panel. */
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-gold) 7%, #050505) 0%,
      #050505 42%,
      #050608 100%
    );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-gold) 18%, transparent),
    inset 0 -1px 0 rgba(0, 0, 0, 0.35),
    0 16px 48px rgba(0, 0, 0, 0.45);
}

/* Gold gradient rim — shared with HomeClassFilters / SiteFooter. */
.modal::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    145deg,
    rgba(196, 148, 88, 0.78) 0%,
    rgba(160, 118, 68, 0.55) 28%,
    rgba(130, 96, 52, 0.48) 62%,
    rgba(110, 80, 44, 0.5) 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.modal > :global(*) {
  position: relative;
  z-index: 1;
}

.borderStrong::before {
  background: linear-gradient(
    145deg,
    rgba(212, 175, 98, 0.92) 0%,
    rgba(196, 148, 88, 0.7) 30%,
    rgba(160, 118, 68, 0.58) 65%,
    rgba(130, 96, 52, 0.62) 100%
  );
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
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
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
