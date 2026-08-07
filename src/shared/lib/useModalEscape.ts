import type { Ref } from 'vue'

type EscapeLayer = {
  id: symbol
  active: Ref<boolean>
  onClose: () => void
}

/** Client-only LIFO stack — not useState (Symbols must not hit SSR payload). */
const layers: EscapeLayer[] = []

let listening = false

function syncPageLock() {
  if (!import.meta.client) return
  const openCount = layers.reduce((n, l) => n + (l.active.value ? 1 : 0), 0)
  document.documentElement.classList.toggle('modal-open', openCount > 0)
}

function topActive(): EscapeLayer | undefined {
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].active.value) return layers[i]
  }
  return undefined
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.repeat) return
  const top = topActive()
  if (!top) return
  e.preventDefault()
  e.stopImmediatePropagation()
  top.onClose()
}

function ensureListener() {
  if (!import.meta.client || listening) return
  window.addEventListener('keydown', onKeydown)
  listening = true
}

function maybeRemoveListener() {
  if (!import.meta.client || !listening) return
  if (layers.length > 0) return
  window.removeEventListener('keydown', onKeydown)
  listening = false
}

/**
 * Closes the topmost *active* registered modal on Escape (LIFO).
 * Inactive leftovers on the stack are skipped so a dismissed confirm
 * cannot swallow later Esc presses.
 * While any modal is open, locks page scroll and blurs `#__nuxt`.
 * Returns `obscured` — true when this modal is open but not on top (blur it).
 * Primary consumer: `UiModal` — do not register again in parents.
 */
export function useModalEscape(active: Ref<boolean>, onClose: () => void) {
  const id = Symbol('modal')
  const layer: EscapeLayer = { id, active, onClose }

  const obscured = computed(() => {
    if (!active.value) return false
    return topActive()?.id !== id
  })

  function sync(isActive: boolean) {
    const idx = layers.findIndex((l) => l.id === id)
    if (isActive) {
      if (idx >= 0) layers.splice(idx, 1)
      layers.push(layer)
      ensureListener()
    } else if (idx >= 0) {
      layers.splice(idx, 1)
      maybeRemoveListener()
    }
    syncPageLock()
  }

  watch(
    active,
    (v) => {
      sync(v)
    },
    { immediate: true, flush: 'sync' },
  )

  onBeforeUnmount(() => {
    sync(false)
  })

  return { obscured }
}
