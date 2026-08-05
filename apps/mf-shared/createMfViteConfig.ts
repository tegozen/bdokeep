import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'
import AutoImport from 'unplugin-auto-import/vite'

const monorepoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const autoImports = path.join(monorepoRoot, 'apps/mf-shared/nuxtAutoImports.ts')

export type MfSectionName =
  | 'buffs'
  | 'chat-macro'
  | 'combo'
  | 'crystals'
  | 'feedback'
  | 'hardening'
  | 'morphs'
  | 'relics'
  | 'summary'
  | 'videos'

/** Shared Vite Module Federation config for apps/mf-*. */
export function createMfViteConfig(name: MfSectionName) {
  const mfDir = path.join(monorepoRoot, `apps/mf-${name}/src`)
  const federationName = `mf_${name.replace(/-/g, '_')}`
  const proposeByName: Partial<Record<MfSectionName, string>> = {
    buffs: 'ProposeBuffsForm.vue',
    combo: 'ProposeComboForm.vue',
    crystals: 'ProposeCrystalForm.vue',
    hardening: 'ProposeHardeningForm.vue',
    morphs: 'ProposeMorphForm.vue',
    relics: 'ProposeRelicForm.vue',
    summary: 'ProposeSummaryForm.vue',
    videos: 'ProposeVideosForm.vue',
  }
  const exposes: Record<string, string> = {
    './Live': path.join(mfDir, 'Live.vue'),
    './Draft': path.join(mfDir, 'Draft.vue'),
  }
  const proposeFile = proposeByName[name]
  if (proposeFile) {
    exposes['./Propose'] = path.join(mfDir, 'ui', proposeFile)
  }

  return defineConfig({
    base: `/mf/${name}/`,
    plugins: [
      vue(),
      AutoImport({
        imports: ['vue'],
        dts: false,
        vueTemplate: true,
      }),
      {
        name: 'bdokeep-nuxt-auto-imports',
        transform(code, id) {
          if (!/\.(vue|ts|js|mjs)(\?|$)/.test(id)) return null
          if (id.includes('nuxtAutoImports')) return null
          if (
            !/\buseState\b|\buseRequestFetch\b|\b\$fetch\b/.test(code) ||
            /from ['"][^'"]*nuxtAutoImports/.test(code)
          ) {
            return null
          }
          const needsState =
            /\buseState\s*\(/.test(code) && !/\bimport\s*\{[^}]*\buseState\b/.test(code)
          const needsFetch =
            /\buseRequestFetch\s*\(/.test(code) &&
            !/\bimport\s*\{[^}]*\buseRequestFetch\b/.test(code)
          const needsDollar =
            /(^|[^\w.$])\$fetch\s*[<(]/.test(code) && !/\bimport\s*\{[^}]*\$fetch\b/.test(code)
          if (!needsState && !needsFetch && !needsDollar) return null
          const names = [
            needsState ? 'useState' : null,
            needsFetch ? 'useRequestFetch' : null,
            needsDollar ? '$fetch' : null,
          ].filter(Boolean)
          return {
            code: `import { ${names.join(', ')} } from ${JSON.stringify(autoImports)}\n${code}`,
            map: null,
          }
        },
      },
      federation({
        name: federationName,
        filename: 'remoteEntry.js',
        exposes,
        // Plugin runtime accepts singleton; published SharedConfig typings omit it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shared: {
          vue: { singleton: true, requiredVersion: false },
        } as any,
      }),
    ],
    resolve: {
      alias: {
        '@': path.join(monorepoRoot, 'src'),
        '@domain': path.join(monorepoRoot, 'apps/mf-shared/domain'),
        '@bdokeep/domain': path.join(monorepoRoot, 'apps/mf-shared/domain'),
        '@bdokeep/mf-shared': path.join(monorepoRoot, 'apps/mf-shared'),
        '#imports': autoImports,
        '#app': autoImports,
        ...Object.fromEntries(
          (
            [
              'buffs',
              'chat-macro',
              'combo',
              'crystals',
              'feedback',
              'hardening',
              'morphs',
              'relics',
              'summary',
              'videos',
            ] as const
          ).map((n) => [`@bdokeep/mf-${n}`, path.join(monorepoRoot, `apps/mf-${n}/src`)]),
        ),
      },
    },
    build: {
      target: 'esnext',
      minify: false,
      cssCodeSplit: false,
      outDir: 'dist',
      emptyOutDir: true,
      modulePreload: false,
    },
    server: {
      port: Number(process.env.PORT || 4100),
      cors: true,
    },
    preview: {
      port: Number(process.env.PORT || 4100),
      cors: true,
    },
  })
}
