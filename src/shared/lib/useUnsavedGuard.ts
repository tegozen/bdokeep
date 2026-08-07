import type { ComputedRef, Ref } from 'vue'
import { toValue } from 'vue'
import { useConfirm } from './useConfirm'

const DEFAULT_MESSAGE =
  'Есть несохранённые изменения. Закрыть без сохранения?'

/**
 * Guard modal close (backdrop / Esc / cancel) when `dirty`.
 * Also registers browser `beforeunload` while the modal is open and dirty.
 * Esc itself is handled by `UiModal` → `@close` → `requestClose`.
 */
export function useUnsavedGuard(opts: {
  active: Ref<boolean>
  dirty: Ref<boolean> | ComputedRef<boolean>
  onClose: () => void
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
}) {
  const { confirm } = useConfirm()
  let busy = false

  async function requestClose() {
    if (busy || !opts.active.value) return
    if (toValue(opts.dirty)) {
      busy = true
      try {
        const ok = await confirm({
          title: opts.title ?? 'Закрыть?',
          message: opts.message ?? DEFAULT_MESSAGE,
          confirmLabel: opts.confirmLabel ?? 'Закрыть',
          cancelLabel: opts.cancelLabel ?? 'Остаться',
        })
        if (!ok) return
      } finally {
        busy = false
      }
    }
    opts.onClose()
  }

  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (!opts.active.value || !toValue(opts.dirty)) return
    e.preventDefault()
    e.returnValue = ''
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
  })

  return { requestClose }
}
