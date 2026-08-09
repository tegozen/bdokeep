import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import postgres from 'postgres'

const root = path.resolve(import.meta.dirname, '../..')
/** Catalog SQL fixtures (upsert / targeted prune only — never guide_* wipe). */
const sqlDir = path.join(root, 'db', 'seed', 'sql')

/** Ordered catalog fixtures (same order as former migrate.sh refresh_catalog). */
export const CATALOG_SEED_FILES = [
  '002_seed_skills.sql',
  '015_seed_relics_lightstones.sql',
  '029_seed_hardening.sql',
  '030_refresh_skill_addon_effects.sql',
  '032_refresh_morph_skills.sql',
  '045_refresh_morph_skills_bdocodex.sql',
  '034_refresh_garmoth_crystals_buffs.sql',
  '035_seed_lightstone_sets.sql',
  '033_localize_bdocodex_icons.sql',
] as const

function migrateDbUrl(): string {
  const url = (
    process.env.MIGRATE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim()
  if (!url) throw new Error('MIGRATE_DATABASE_URL or DATABASE_URL required for seed')
  return url
}

function fileHash(body: string): string {
  return crypto.createHash('sha256').update(body).digest('hex')
}

async function ensureSeedLedger(sql: ReturnType<typeof postgres>) {
  await sql`create schema if not exists drizzle`
  await sql`
    create table if not exists drizzle.__catalog_seeds (
      filename text primary key,
      hash text not null,
      applied_at timestamptz not null default now()
    )
  `
}

/**
 * Apply catalog SQL fixtures. Skips files whose sha256 already matches
 * `drizzle.__catalog_seeds` (set FORCE_SEED=1 to re-apply all).
 */
export async function seedCatalogs(opts?: { force?: boolean }) {
  const force =
    opts?.force === true ||
    process.env.FORCE_SEED === '1' ||
    process.env.FORCE_SEED === 'true'

  const sql = postgres(migrateDbUrl(), { max: 1, onnotice: () => {} })
  try {
    await ensureSeedLedger(sql)

    let applied = 0
    let skipped = 0

    for (const rel of CATALOG_SEED_FILES) {
      const full = path.join(sqlDir, rel)
      if (!fs.existsSync(full)) {
        throw new Error(`seed: missing SQL fixture ${rel} (expected under db/seed/sql/)`)
      }
      const body = fs.readFileSync(full, 'utf8')
      const hash = fileHash(body)

      if (!force) {
        const rows = await sql`
          select hash from drizzle.__catalog_seeds where filename = ${rel} limit 1
        `
        if (rows.length && String(rows[0]!.hash) === hash) {
          console.log(`seed: skip ${rel} (unchanged)`)
          skipped++
          continue
        }
      }

      console.log(`seed: apply ${rel}${force ? ' (force)' : ''}`)
      await sql.unsafe(body)
      await sql`
        insert into drizzle.__catalog_seeds (filename, hash, applied_at)
        values (${rel}, ${hash}, now())
        on conflict (filename) do update set
          hash = excluded.hash,
          applied_at = now()
      `
      applied++
    }

    console.log(`seed: catalog done (applied=${applied} skipped=${skipped})`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

const isMain =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  seedCatalogs().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
