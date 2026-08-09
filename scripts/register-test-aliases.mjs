import { register } from 'node:module'

/** Map @domain to ./domain for node:test / tsx. */
register('./test-alias-loader.mjs', import.meta.url)
