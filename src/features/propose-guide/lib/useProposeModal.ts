import { computed, nextTick, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useSuperadmin } from '@/features/superadmin-auth'
import { parseApiError, useOnlineStatus, useUnsavedGuard } from '@/shared/lib'
import { refreshGuideAfterApprove } from './refreshGuideAfterApprove'

export type ProposeSubmitResult = { autoApproved?: boolean }

/**
 * Shared lifecycle for propose-guide modals: open/close, dirty guard,
 * author/honeypot, submit wrapper with error parse + auto-approve refresh.
 */
export function useProposeModal(opts: {
  /** Domain-only snapshot (author/honeypot are tracked automatically). */
  serialize: () => string
  classSlug: MaybeRefOrGetter<string>
  onOpen?: () => void | Promise<void>
  onReset?: () => void
}) {
  const open = ref(false)
  const honeypot = ref('')
  const author = ref('')
  const submitting = ref(false)
  const formError = ref('')
  const baseline = ref('')

  const { isStaff, refresh: refreshAdmin } = useSuperadmin()
  const { online } = useOnlineStatus()

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

  const { requestClose } = useUnsavedGuard({
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
   * On success, closes modal and refreshes guide if auto-approved.
   */
  async function runSubmit(
    fn: () => Promise<ProposeSubmitResult | null>,
  ): Promise<void> {
    formError.value = ''
    if (!online.value) {
      formError.value = 'Нет сети — отправка недоступна'
      return
    }
    if (!isStaff.value && !author.value.trim()) {
      formError.value = 'Укажите игровой ник'
      return
    }
    submitting.value = true
    try {
      const res = await fn()
      if (res == null) return
      close()
      if (res.autoApproved) {
        await refreshGuideAfterApprove(toValue(opts.classSlug))
      }
    } catch (e: unknown) {
      formError.value = parseApiError(e, 'Не удалось отправить. Попробуйте позже.')
    } finally {
      submitting.value = false
    }
  }

  function openModal() {
    open.value = true
  }

  return {
    open,
    honeypot,
    author,
    submitting,
    formError,
    requestClose,
    isStaff,
    close,
    openModal,
    runSubmit,
    async captureBaseline() {
      await nextTick()
      if (open.value) baseline.value = fullSerialize()
    },
  }
}

export type UseProposeModal = ReturnType<typeof useProposeModal>
