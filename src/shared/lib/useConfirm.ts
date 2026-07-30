export type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void
}

export function useConfirm() {
  const request = useState<ConfirmRequest | null>('uiConfirm', () => null)

  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      request.value = { ...options, resolve }
    })
  }

  function settle(value: boolean) {
    const current = request.value
    if (!current) return
    request.value = null
    current.resolve(value)
  }

  return { request, confirm, settle }
}
