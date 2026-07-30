import type { Ref } from 'vue'

const stack = () => useState<symbol[]>('modalEscapeStack', () => [])

/**
 * Closes the topmost registered modal on Escape.
 * Register while `active` is true; only the last registered modal receives the key.
 */
export function useModalEscape(active: Ref<boolean>, onClose: () => void) {
  const id = Symbol('modal')
  const layers = stack()

  function sync(isActive: boolean) {
    const next = layers.value.filter((x) => x !== id)
    layers.value = isActive ? [...next, id] : next
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
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    sync(false)
  })
}
