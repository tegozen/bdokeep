import { pathToFileURL } from 'node:url'
import { register } from 'node:module'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = new URL('..', import.meta.url)

/** Map @domain / @bdokeep/domain to apps/mf-shared/domain for node:test. */
register('./test-alias-loader.mjs', import.meta.url)
