import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

const siteDescription =
  'Неофициальные гильдейские PvP-гайды по классам Black Desert Online'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: ['@vite-pwa/nuxt'],

  hooks: {
    // Don't prefetch click-only / editor-only chunks into anonymous page loads.
    'build:manifest'(manifest) {
      for (const item of Object.values(manifest)) {
        const id = `${item.file ?? ''} ${item.src ?? ''}`
        if (
          /SuperadminAuth|LoginFields|superadmin-auth\/ui|UiConfirm|UiModal\.vue|Propose\w+Form|PendingSectionDrafts|mdEditorSetup|md-editor-v3|UiMarkdownEditor|highlight\.js|screenfull/i.test(
            id,
          )
        ) {
          item.prefetch = false
          item.preload = false
        }
      }
    },
  },

  srcDir: 'src',

  dir: {
    pages: 'app/routes',
    layouts: 'app/layouts',
    // absolute — relative '../public' from srcDir is skipped by Nitro copy
    public: `${rootDir}/public`,
  },

  alias: {
    '@': `${import.meta.dirname}/src`,
    '@domain': `${rootDir}/domain`,
  },


  css: ['@/app/styles/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Filled at runtime from DATABASE_URL / ADMIN_* (see server/utils/adminAuth)
    databaseUrl: '',
    adminPassword: '',
    adminSessionSecret: '',
    public: {
      siteName: 'BDO Keep',
    },
  },


  nitro: {
    preset: 'node-server',
    alias: {
      '@domain': `${rootDir}/domain`,
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    registerWebManifestInRouteRules: true,
    manifest: {
      name: 'BDO Keep',
      short_name: 'BDO Keep',
      description: siteDescription,
      lang: 'ru',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      theme_color: '#07080c',
      background_color: '#07080c',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      cleanupOutdatedCaches: true,
      // Avoid claiming clients immediately — helps bfcache on soft navigations.
      clientsClaim: false,
      // SSR app — do not fall back navigations to a static index.html
      navigateFallback: null,
      // Shell only — skip large class portraits under public/classes/
      globPatterns: ['**/*.{js,css,ico,woff,woff2}', 'android-chrome-*.png', 'favicon*.png', 'apple-touch-icon.png', 'favicon.svg'],
      globIgnores: ['**/classes/**'],
    },
    client: {
      registerPlugin: true,
    },
    devOptions: {
      enabled: false,
    },
  },

  routeRules: {
    '/_nuxt/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/classes/**': {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    },
    '/android-chrome-*.png': {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    },
    '/favicon*': {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    },
    '/apple-touch-icon.png': {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    },
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy':
          'camera=(), microphone=(), geolocation=(), compute-pressure=*',
        // script-src/style-src 'unsafe-inline': required by Nuxt/Vue hydration + Tailwind.
        // Markdown: server sanitizeMarkdown + client XSSPlugin whitelist (no mermaid/katex/echarts).
        // img-src https: needed for catalog/class icons (BDO CDN). Markdown XSSPlugin strips remote <img>.
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "img-src 'self' data: blob: https:",
          "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
          "connect-src 'self' http://127.0.0.1:* http://localhost:*",
          "worker-src 'self'",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'BDO Keep — гильдейские PvP-гайды',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: siteDescription,
        },
        { name: 'theme-color', content: '#07080c' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'BDO Keep' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
