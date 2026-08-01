import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

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


  routeRules: {
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
          content: 'Неофициальные гильдейские PvP-гайды по классам Black Desert Online',
        },
        { name: 'theme-color', content: '#07080c' },
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
