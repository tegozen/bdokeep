/**
 * Nuxt runtime helpers used from shared code that Module Federation remotes also bundle.
 * Host resolves `#imports` via Nuxt; MF vite aliases `#imports` → apps/mf-shared/nuxtAutoImports.ts.
 */
export { useState, useRequestFetch, $fetch } from '#imports'
