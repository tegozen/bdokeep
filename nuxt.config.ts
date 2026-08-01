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
  },

  css: ['@/app/styles/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Filled at runtime from DATABASE_URL / ADMIN_PASSWORD (see server/utils)
    databaseUrl: '',
    adminPassword: '',
    public: {
      siteName: 'BDO Keep',
    },
  },

  nitro: {
    preset: 'node-server',
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https:",
          "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
          "connect-src 'self' http://127.0.0.1:* http://localhost:* https:",
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
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Source+Sans+3:wght@400;600;700&display=swap',
        },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
