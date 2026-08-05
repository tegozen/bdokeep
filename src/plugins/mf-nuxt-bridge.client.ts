/**
 * Called from Nuxt host so Module Federation remotes can reuse Nuxt composables
 * (useState / useRequestFetch / $fetch) when their setup runs inside the host app tree.
 */
export default defineNuxtPlugin(() => {
  const g = globalThis as typeof globalThis & {
    __BDOKEEP_NUXT__?: {
      useState: typeof useState
      useRequestFetch: typeof useRequestFetch
      $fetch: typeof $fetch
    }
  }
  g.__BDOKEEP_NUXT__ = {
    useState,
    useRequestFetch,
    $fetch,
  }
})
