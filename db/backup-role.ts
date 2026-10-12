import postgres from 'postgres'

/** Optional ops role. No schema migration: follows the existing app-role sync. */
export async function syncBackupRole(url: string) {
  const password = process.env.BACKUP_DB_PASSWORD
  if (!password) return
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    // Escape SQL literals rather than concatenate raw environment values.
    const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'"
    const identifier = (value: string) => '"' + value.replace(/"/g, '""') + '"'
    const [current] = await sql`select current_database() as name, current_user as owner`
    await sql.begin(async (tx) => {
      await tx.unsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bdokeep_backup') THEN
            CREATE ROLE bdokeep_backup;
          END IF;
        END $$;
        ALTER ROLE bdokeep_backup WITH LOGIN PASSWORD ${literal(password)}
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
        GRANT CONNECT ON DATABASE ${identifier(current.name)} TO bdokeep_backup;
      `)
      for (const schema of ['public', 'drizzle']) {
        await tx.unsafe(`
          GRANT USAGE ON SCHEMA ${identifier(schema)} TO bdokeep_backup;
          GRANT SELECT ON ALL TABLES IN SCHEMA ${identifier(schema)} TO bdokeep_backup;
          GRANT SELECT ON ALL SEQUENCES IN SCHEMA ${identifier(schema)} TO bdokeep_backup;
          ALTER DEFAULT PRIVILEGES FOR ROLE ${identifier(current.owner)} IN SCHEMA ${identifier(schema)}
            GRANT SELECT ON TABLES TO bdokeep_backup;
          ALTER DEFAULT PRIVILEGES FOR ROLE ${identifier(current.owner)} IN SCHEMA ${identifier(schema)}
            GRANT SELECT ON SEQUENCES TO bdokeep_backup;
        `)
      }
    })
    console.log('migrate: sync read-only bdokeep_backup role')
  } finally {
    await sql.end({ timeout: 5 })
  }
}
