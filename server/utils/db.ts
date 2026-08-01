import postgres from 'postgres'

export type Sql = ReturnType<typeof postgres>

let sqlSingleton: Sql | null = null

/** Server-only Postgres client (bdokeep_app). Never expose URL to the client. */
export function useDb(): Sql {
  if (sqlSingleton) return sqlSingleton

  const config = useRuntimeConfig()
  const url = String(
    config.databaseUrl || process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || '',
  ).trim()
  if (!url) {
    throw createError({ statusCode: 500, statusMessage: 'DATABASE_URL не задан' })
  }

  sqlSingleton = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  return sqlSingleton
}

/** Log safely and return a generic 502 — never leak SQL/schema to clients. */
export function throwDbError(err: unknown): never {
  const msg = err instanceof Error ? err.message : 'query failed'
  console.error('[db]', msg)
  throw createError({ statusCode: 502, statusMessage: 'Ошибка базы данных' })
}

export async function withDbError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    // Re-throw H3 errors (validation etc.)
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    throwDbError(err)
  }
}
