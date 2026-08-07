import { onMounted, type Ref } from 'vue'

export type UseOnlineStatus = {
  online: Ref<boolean>
}

let listenersAttached = false

function syncOnline(online: Ref<boolean>) {
  if (typeof navigator !== 'undefined') {
    online.value = navigator.onLine
  }
}

/**
 * Shared reactive online/offline from navigator + window events.
 * SSR defaults to online (no navigator).
 */
export function useOnlineStatus(): UseOnlineStatus {
  const online = useState('app-online', () =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  if (import.meta.client && !listenersAttached) {
    listenersAttached = true
    syncOnline(online)
    const onChange = () => syncOnline(online)
    window.addEventListener('online', onChange)
    window.addEventListener('offline', onChange)
  } else if (import.meta.client) {
    onMounted(() => syncOnline(online))
  }

  return { online }
}
