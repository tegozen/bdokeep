import type { Ref } from 'vue'

const stack = () => useState<symbol[]>('modalEscapeStack', () => [])

let lockedScrollY = 0

function syncPageLock(openCount: number) {
  if (!import.meta.client) return

  const open = openCount > 0
  const wasOpen = document.documentElement.classList.contains('modal-open')
  document.documentElement.classList.toggle('modal-open', open)

  if (open && !wasOpen) {
    lockedScrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${lockedScrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
  } else if (!open && wasOpen) {
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    window.scrollTo(0, lockedScrollY)
  }
}

/**
 * Closes the topmost registered modal on Escape.
 * While any modal is open, locks page scroll and blurs `#__nuxt`.
 * Returns `obscured` — true when this modal is open but not on top (blur it).
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
