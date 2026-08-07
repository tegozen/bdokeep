import type { Ref } from 'vue'

const stack = () => useState<symbol[]>('modalEscapeStack', () => [])

function syncPageLock(openCount: number) {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('modal-open', openCount > 0)
}

/**
 * Closes the topmost registered modal on Escape (LIFO stack).
 * While any modal is open, locks page scroll and blurs `#__nuxt`.
 * Returns `obscured` — true when this modal is open but not on top (blur it).
 * Primary consumer: `UiModal` — do not register again in parents.
 */
export function useModalEscape(active: Ref<boolean>, onClose: () => void) {
  const id = Symbol('modal')
  const layers = stack()

  const obscured = computed(() => {
    if (!active.value) return false
    return layers.value[layers.value.length - 1] !== id
  })

  function sync(isActive: boolean) {
    const next = layers.value.filter((x) => x !== id)
    layers.value = isActive ? [...next, id] : next
    syncPageLock(layers.value.length)
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    if (!active.value) return
    if (layers.value[layers.value.length - 1] !== id) return
    e.preventDefault()
    onClose()
  }

  watch(
    active,
    (v) => {
      sync(v)
    },
    { immediate: true },
  )

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    syncPageLock(layers.value.length)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    sync(false)
  })

  return { obscured }
}
