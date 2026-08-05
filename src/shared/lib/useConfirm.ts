import { useState } from './nuxtRuntime'

export type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** `alert` = single OK button (replaces window.alert). */
  variant?: 'confirm' | 'alert'
}

export type AlertOptions = {
  title?: string
  message: string
  confirmLabel?: string
}

type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void
}

export function useConfirm() {
  const request = useState<ConfirmRequest | null>('uiConfirm', () => null)

  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      request.value = {
        variant: 'confirm',
        ...options,
        resolve,
      }
    })
  }

  /** Custom alert dialog (not window.alert). Always resolves after dismiss. */
  function alert(options: AlertOptions | string): Promise<void> {
    const opts = typeof options === 'string' ? { message: options } : options
    return confirm({
      variant: 'alert',
      title: opts.title ?? 'Сообщение',
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? 'ОК',
    }).then(() => undefined)
  }

  function settle(value: boolean) {
    const current = request.value
    if (!current) return
    request.value = null
    // Alert always resolves as acknowledged.
    current.resolve(current.variant === 'alert' ? true : value)
  }

  return { request, confirm, alert, settle }
}
