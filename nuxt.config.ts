import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

const siteDescription =
  'Неофициальные гильдейские PvP-гайды по классам Black Desert Online'

/** Chunks that must not land on anonymous first paint (login, editors, guide-only). */
const DEFER_MANIFEST_CHUNKS = [
  'SuperadminAuth',
  'LoginFields',
  'superadmin-auth/ui',
  'UiConfirm',
  'UiModal.vue',
  'Propose',
  'PendingSectionDrafts',
  'ProposalSectionPreview',
  'ClassGuidePage',
  'VideoList',
  'ComboChain',
  'mdEditorSetup',
  'md-editor-v3',
  'UiMarkdownEditor',
  'UiMarkdownPreview',
  'YoutubeEmbed',
  'markdown-it',
  'highlight.js',
  'screenfull',
  'renderMarkdown',
] as const

function shouldDeferManifestChunk(file?: string, src?: string): boolean {
  const id = `${file ?? ''} ${src ?? ''}`.toLowerCase()
  return DEFER_MANIFEST_CHUNKS.some((chunk) => id.includes(chunk.toLowerCase()))
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: ['@vite-pwa/nuxt'],

  hooks: {
    'build:manifest'(manifest) {
      for (const item of Object.values(manifest)) {
        if (!shouldDeferManifestChunk(item.file, item.src)) continue
        item.prefetch = false
        item.preload = false
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
    build: {
      // One stylesheet instead of many per-SFC chunks (Lighthouse render-blocking).
      cssCodeSplit: false,
    },
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
    compressPublicAssets: { gzip: true, brotli: true },
    alias: {
      '@domain': `${rootDir}/domain`,
    },
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '0 * * * *': ['youtube:poll-ready'],
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
      globIgnores: ['**/classes/**', '**/codex/**'],
      runtimeCaching: [
        {
          urlPattern: ({ request, url }) => {
            if (request.mode !== 'navigate') return false
            const p = url.pathname
            return p === '/' || p.startsWith('/class/')
          },
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 20, maxAgeSeconds: 7 * 86400 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          urlPattern: ({ request, url }) =>
            request.method === 'GET' && url.pathname === '/api/classes',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-classes',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 1, maxAgeSeconds: 7 * 86400 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          urlPattern: ({ request, url }) =>
            request.method === 'GET' &&
            /^\/api\/classes\/[^/]+\/guide$/.test(url.pathname),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-guides',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 40, maxAgeSeconds: 7 * 86400 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          urlPattern: ({ request, url }) =>
            request.method === 'GET' && url.pathname === '/api/catalog/lightstone-sets',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-catalog',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 1, maxAgeSeconds: 7 * 86400 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          urlPattern: ({ request, url }) =>
            request.method === 'GET' &&
            (url.pathname.startsWith('/classes/') || url.pathname.startsWith('/codex/')),
          handler: 'CacheFirst',
          options: {
            cacheName: 'static-media',
            expiration: { maxEntries: 800, maxAgeSeconds: 30 * 86400 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          urlPattern: ({ request, url }) =>
            request.method === 'GET' && url.pathname.startsWith('/api/youtube/thumb/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'yt-thumbs',
            expiration: { maxEntries: 80, maxAgeSeconds: 7 * 86400 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          // Cookie gate: only serve/cache admin HTML while bdo_admin exp is in the future.
          urlPattern: ({ request, url }) => {
            if (request.mode !== 'navigate') return false
            const p = url.pathname
            if (p !== '/admin/proposals' && p !== '/admin/feedback') return false
            const raw = request.headers.get('cookie') || ''
            const m = raw.match(/(?:^|;\s*)bdo_admin=([^;]+)/)
            if (!m) return false
            let token = m[1]
            try {
              token = decodeURIComponent(token)
            } catch {
              /* keep raw */
            }
            const parts = token.split('.')
            if (parts.length !== 3 || parts[0] !== 'admin') return false
            const exp = Number(parts[1])
            return Number.isFinite(exp) && exp > Date.now()
          },
          handler: 'NetworkFirst',
          options: {
            cacheName: 'admin-pages',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 10, maxAgeSeconds: 7 * 86400 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          urlPattern: ({ request, url }) => {
            if (request.method !== 'GET') return false
            const p = url.pathname
            if (
              p !== '/api/admin/proposals' &&
              p !== '/api/admin/feedback' &&
              p !== '/api/admin/guild-banner'
            ) {
              return false
            }
            const raw = request.headers.get('cookie') || ''
            const m = raw.match(/(?:^|;\s*)bdo_admin=([^;]+)/)
            if (!m) return false
            let token = m[1]
            try {
              token = decodeURIComponent(token)
            } catch {
              /* keep raw */
            }
            const parts = token.split('.')
            if (parts.length !== 3 || parts[0] !== 'admin') return false
            const exp = Number(parts[1])
            return Number.isFinite(exp) && exp > Date.now()
          },
          handler: 'NetworkFirst',
          options: {
            cacheName: 'admin-api',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 20, maxAgeSeconds: 7 * 86400 },
            cacheableResponse: { statuses: [200] },
          },
        },
      ],
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
        // Committed art; rare changes. Lighthouse wants ≥30d for static icons.
        'Cache-Control': 'public, max-age=31536000, stale-while-revalidate=86400',
      },
    },
    '/codex/**': {
      headers: {
        // 200s: long TTL OK — UI busts via ?v= (CODEX_ICON_CACHE_V). 404s → no-store (codexCacheHeaders).
        'Cache-Control': 'public, max-age=31536000, stale-while-revalidate=86400',
      },
    },
    '/android-chrome-*.png': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, stale-while-revalidate=86400',
      },
    },
    '/favicon*': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, stale-while-revalidate=86400',
      },
    },
    '/apple-touch-icon.png': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, stale-while-revalidate=86400',
      },
    },
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy':
          'camera=(), microphone=(), geolocation=(), compute-pressure=*',
        // Catalog/class icons are self-hosted under /codex and /classes (never hotlink CDNs).
        // YouTube thumbs go through same-origin /api/youtube/thumb/*. Markdown strips <img>.
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "img-src 'self' data: blob:",
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

  experimental: {
    defaults: {
      nuxtLink: {
        prefetch: false,
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
