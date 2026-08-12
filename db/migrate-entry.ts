/**
 * Compose migrate entrypoint: wait → baseline stamp → migrate → seed → sync app role.
 * Connects as postgres via MIGRATE_DATABASE_URL (compose uses trust on 127.0.0.1).
 */
import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { seedCatalogs } from './seed/index.ts'

const root = path.resolve(import.meta.dirname, '..')
const drizzleDir = path.join(root, 'drizzle')

function migrateUrl(): string {
  const url = (
    process.env.MIGRATE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim()
  if (!url) throw new Error('MIGRATE_DATABASE_URL or DATABASE_URL required')
  return url
}

async function waitForPostgres(url: string, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    const sql = postgres(url, { max: 1, connect_timeout: 3, onnotice: () => {} })
    try {
      await sql`select 1`
      await sql.end({ timeout: 1 })
      return
    } catch {
      try {
        await sql.end({ timeout: 1 })
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw new Error('migrate: postgres not ready')
}

async function ensureLegacyPolicyRoles(url: string) {
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    await sql.unsafe(`
      do $$
      begin
        if not exists (select from pg_roles where rolname = 'anon') then
          create role anon nologin;
        end if;
        if not exists (select from pg_roles where rolname = 'authenticated') then
          create role authenticated nologin;
        end if;
      end
      $$;
    `)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/** Role must exist before drizzle CREATE POLICY … TO bdokeep_app on empty DBs. */
async function ensureAppRoleExists(url: string) {
  const password = process.env.BDOKEEP_APP_PASSWORD
  if (!password) {
    throw new Error('BDOKEEP_APP_PASSWORD must be set for bdokeep_app role')
  }
  const escaped = password.replace(/'/g, "''")
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    await sql.unsafe(`
      do $$
      begin
        if not exists (select from pg_roles where rolname = 'bdokeep_app') then
          create role bdokeep_app login password '${escaped}' nosuperuser nocreatedb nocreaterole;
        end if;
      end
      $$;
    `)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/**
 * Existing volumes already have the pre-Drizzle schema (≈ migration 0000).
 * Stamp only that baseline hash so CREATE is not re-executed.
 * Later journal entries (e.g. admin_users) must actually run via migrate —
 * stamping the whole journal skips them on old volumes.
 */
async function ensureBaselineStamp(url: string) {
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    const hasClasses = await sql`
      select 1 as ok
      from information_schema.tables
      where table_schema = 'public' and table_name = 'classes'
      limit 1
    `
    if (!hasClasses.length) {
      console.log('migrate: empty database — will apply baseline via drizzle migrate')
      return
    }

    await sql`create schema if not exists drizzle`
    await sql`
      create table if not exists drizzle.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `

    const existing = await sql`select hash from drizzle.__drizzle_migrations`
    if (existing.length > 0) {
      console.log(`migrate: drizzle journal already has ${existing.length} row(s)`)
      return
    }

    const journalPath = path.join(drizzleDir, 'meta', '_journal.json')
    if (!fs.existsSync(journalPath)) {
      console.log('migrate: no drizzle journal — skip baseline stamp')
      return
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as {
      entries: Array<{ tag: string; when: number }>
    }
    const baseline = journal.entries[0]
    if (!baseline) {
      console.log('migrate: empty drizzle journal — skip baseline stamp')
      return
    }

    const sqlPath = path.join(drizzleDir, `${baseline.tag}.sql`)
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`migrate: missing ${baseline.tag}.sql for baseline stamp`)
    }
    const query = fs.readFileSync(sqlPath, 'utf8')
    const hash = crypto.createHash('sha256').update(query).digest('hex')
    await sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${hash}, ${baseline.when})
    `
    console.log(`migrate: baseline stamp ${baseline.tag} (additive migrations will apply)`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/**
 * Heal volumes where additive migration 0001 was falsely baseline-stamped
 * (journal row present, table never created). Idempotent — safe on every up.
 */
async function ensureAdminUsersTable(url: string) {
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    const hasAdmin = await sql`
      select 1 as ok
      from information_schema.tables
      where table_schema = 'public' and table_name = 'admin_users'
      limit 1
    `
    if (hasAdmin.length) return

    console.log('migrate: creating missing admin_users (false baseline stamp heal)…')
    await sql.unsafe(`
      CREATE TABLE "admin_users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "username" text NOT NULL,
        "password_hash" text NOT NULL,
        "role" text NOT NULL,
        "disabled_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "admin_users_role_check" CHECK (role = ANY (ARRAY['superadmin'::text, 'admin'::text])),
        CONSTRAINT "admin_users_username_len" CHECK ((char_length(username) >= 2) AND (char_length(username) <= 64)),
        CONSTRAINT "admin_users_password_hash_len" CHECK (char_length(password_hash) >= 20)
      );
      ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;
      CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_username_lower_uidx"
        ON "admin_users" USING btree (lower("username"));
      CREATE INDEX IF NOT EXISTS "admin_users_role_idx"
        ON "admin_users" USING btree ("role");
    `)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

async function runMigrate(url: string) {
  console.log('migrate: drizzle-orm migrate…')
  const client = postgres(url, { max: 1, onnotice: () => {} })
  const db = drizzle(client)
  try {
    await migrate(db, { migrationsFolder: drizzleDir })
  } finally {
    await client.end({ timeout: 5 })
  }
}

async function syncAppRole(url: string) {
  const password = process.env.BDOKEEP_APP_PASSWORD
  if (!password) {
    throw new Error('BDOKEEP_APP_PASSWORD must be set for bdokeep_app role')
  }
  const escaped = password.replace(/'/g, "''")
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    console.log('migrate: sync bdokeep_app role…')
    await sql.unsafe(`
      do $$
      begin
        if not exists (select from pg_roles where rolname = 'bdokeep_app') then
          create role bdokeep_app login password '${escaped}' nosuperuser nocreatedb nocreaterole;
        else
          alter role bdokeep_app with login password '${escaped}' nosuperuser;
        end if;
      end
      $$;

      grant usage on schema public to bdokeep_app;
      grant select, insert, update, delete on all tables in schema public to bdokeep_app;
      grant usage, select on all sequences in schema public to bdokeep_app;
      alter default privileges in schema public grant select, insert, update, delete on tables to bdokeep_app;
      alter default privileges in schema public grant usage, select on sequences to bdokeep_app;
    `)

    // Refresh bdokeep_app_all RLS policies on public tables.
    await sql.unsafe(`
      do $$
      declare
        r record;
      begin
        for r in
          select c.relname as tablename
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind = 'r'
            and c.relrowsecurity
        loop
          execute format('drop policy if exists bdokeep_app_all on %I', r.tablename);
          execute format(
            'create policy bdokeep_app_all on %I for all to bdokeep_app using (true) with check (true)',
            r.tablename
          );
        end loop;
      end
      $$;
    `)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

async function main() {
  const url = migrateUrl()
  process.env.MIGRATE_DATABASE_URL = url

  console.log('migrate: waiting for postgres…')
  await waitForPostgres(url)
  await ensureLegacyPolicyRoles(url)
  await ensureAppRoleExists(url)
  await ensureBaselineStamp(url)
  await runMigrate(url)
  await ensureAdminUsersTable(url)
  await seedCatalogs()
  await syncAppRole(url)
  console.log('migrate: done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
