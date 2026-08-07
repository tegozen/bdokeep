<template>
  <Teleport to="body">
    <div :class="$style.host" aria-live="polite" aria-relevant="additions">
      <Transition name="toast">
        <div
          v-if="visible && message"
          :class="$style.toast"
          role="status"
        >
          {{ message }}
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    message?: string
    /** Auto-hide after ms; 0 = stay until message cleared. */
    durationMs?: number
  }>(),
  {
    message: '',
    durationMs: 3000,
  },
)

const visible = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

function clearHideTimer() {
  if (hideTimer != null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

watch(
  () => props.message,
  (msg) => {
    clearHideTimer()
    if (!msg) {
      visible.value = false
      return
    }
    visible.value = true
    if (props.durationMs > 0) {
      hideTimer = setTimeout(() => {
        visible.value = false
      }, props.durationMs)
    }
  },
)

onUnmounted(() => clearHideTimer())
</script>

<style module>
.host {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 1rem;
  padding-top: max(1rem, env(safe-area-inset-top));
}

.toast {
  pointer-events: none;
  max-width: min(22rem, calc(100vw - 2rem));
  margin-top: 0.5rem;
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated, #12141c);
  color: var(--color-ink);
  font-size: 0.9rem;
  line-height: 1.35;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  text-align: center;
}

:global(.toast-enter-active),
:global(.toast-leave-active) {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

:global(.toast-enter-from),
:global(.toast-leave-to) {
  opacity: 0;
  transform: translateY(-0.4rem);
}
</style>
