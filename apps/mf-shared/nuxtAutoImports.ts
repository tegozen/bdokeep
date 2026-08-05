/**
 * Nuxt auto-import shim for Module Federation remotes.
 * Prefer host bridge (set by mf-nuxt-bridge.client.ts); fall back to local refs.
 */
import { ref, type Ref } from 'vue'

type Bridge = {
  useState: <T>(key: string, init?: () => T) => Ref<T>
  useRequestFetch: () => typeof globalThis.$fetch
  $fetch: typeof globalThis.$fetch
}

function bridge(): Bridge | null {
  return (globalThis as typeof globalThis & { __BDOKEEP_NUXT__?: Bridge }).__BDOKEEP_NUXT__ ?? null
}

const localState = new Map<string, Ref<unknown>>()

export function useState<T>(key: string, init?: () => T): Ref<T> {
  const b = bridge()
  if (b) return b.useState(key, init)
  if (!localState.has(key)) {
    localState.set(key, ref(init ? init() : null) as Ref<unknown>)
  }
  return localState.get(key) as Ref<T>
}

export function useRequestFetch() {
  const b = bridge()
  if (b) return b.useRequestFetch()
  return $fetch
}

export const $fetch = ((...args: unknown[]) => {
  const b = bridge()
  const fn = b?.$fetch ?? (globalThis as { $fetch?: typeof fetch }).$fetch
  if (!fn) throw new Error('$fetch is not available outside Nuxt host')
  return (fn as (...a: unknown[]) => unknown)(...args)
}) as typeof globalThis.$fetch
