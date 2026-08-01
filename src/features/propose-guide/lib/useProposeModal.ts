import { computed, nextTick, ref, watch } from 'vue'
import { useSuperadmin, useUnsavedGuard } from '@/shared/lib'
import { parseSubmitError } from './parseSubmitError'
import { reloadAfterApprove } from './reloadAfterApprove'

export type ProposeSubmitResult = { autoApproved?: boolean }

/**
 * Shared lifecycle for propose-guide modals: open/close, dirty guard,
 * author/honeypot, submit wrapper with error parse + auto-approve reload.
 */
export function useProposeModal(opts: {
  /** Domain-only snapshot (author/honeypot are tracked automatically). */
  serialize: () => string
  onOpen?: () => void | Promise<void>
  onReset?: () => void
}) {
  const open = ref(false)
  const honeypot = ref('')
  const author = ref('')
  const submitting = ref(false)
  const formError = ref('')
  const baseline = ref('')

  const { isSuperadmin, refresh: refreshAdmin } = useSuperadmin()

  function fullSerialize() {
    return JSON.stringify({
      author: author.value,
      honeypot: honeypot.value,
      data: opts.serialize(),
    })
  }

  const dirty = computed(
    () => open.value && baseline.value !== '' && fullSerialize() !== baseline.value,
  )

  function close() {
    open.value = false
  }

  const { requestClose, obscured } = useUnsavedGuard({
    active: open,
    dirty,
    onClose: close,
  })

  function resetShell() {
    honeypot.value = ''
    author.value = ''
    submitting.value = false
    formError.value = ''
  }

  watch(open, async (v) => {
    if (v) {
      baseline.value = ''
      formError.value = ''
      await refreshAdmin()
      await opts.onOpen?.()
      await nextTick()
      baseline.value = fullSerialize()
    } else {
      baseline.value = ''
      resetShell()
      opts.onReset?.()
    }
  })

  /**
   * Run submit body. Return `null` to abort (caller sets `formError`).
   * On success, closes modal and reloads if auto-approved.
   */
  async function runSubmit(
    fn: () => Promise<ProposeSubmitResult | null>,
  ): Promise<void> {
    formError.value = ''
    if (!isSuperadmin.value && !author.value.trim()) {
      formError.value = 'Укажите игровой ник'
      return
    }
    submitting.value = true
    try {
      const res = await fn()
      if (res == null) return
      close()
      if (res.autoApproved) {
        await reloadAfterApprove()
      }
    } catch (e: unknown) {
      formError.value = parseSubmitError(e)
    } finally {
      submitting.value = false
    }
  }

  return {
    open,
    honeypot,
    author,
    submitting,
    formError,
    obscured,
    requestClose,
    isSuperadmin,
    close,
    runSubmit,
    async captureBaseline() {
      await nextTick()
      if (open.value) baseline.value = fullSerialize()
    },
  }
}

export type UseProposeModal = ReturnType<typeof useProposeModal>
