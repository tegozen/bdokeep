/**
 * Preload display font so Cinzel swap does not shift brand / class title (CLS).
 * URL is resolved by Vite from the same @fontsource file as main.css.
 */
import cinzelWoff2 from '@fontsource/cinzel/files/cinzel-latin-700-normal.woff2?url'

export default defineNuxtPlugin(() => {
  useHead({
    link: [
      {
        rel: 'preload',
        href: cinzelWoff2,
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      },
    ],
  })
})
