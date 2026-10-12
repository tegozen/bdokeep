// Run only against the isolated fixture database, never production.
import assert from 'node:assert/strict'
import postgres from 'postgres'
import { syncBackupRole } from './backup-role.ts'

const url = 'postgres://postgres:test@db:15432/bdokeep'
const sql = postgres(url, { max: 1 })
try {
  await sql.unsafe(`
    CREATE SCHEMA drizzle;
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE bdokeep_app NOLOGIN;
    CREATE TABLE public.classes (id serial PRIMARY KEY, name text);
    INSERT INTO public.classes (name) VALUES ('RLS private row');
    ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.classes FORCE ROW LEVEL SECURITY;
    CREATE POLICY app ON public.classes TO bdokeep_app USING (true);
    CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text);
    INSERT INTO drizzle.__drizzle_migrations (hash) VALUES ('baseline');
    CREATE TABLE drizzle.__catalog_seeds (name text);
    INSERT INTO drizzle.__catalog_seeds VALUES ('fixture');
  `)
  // Optional role stays absent until explicitly enabled.
  delete process.env.BACKUP_DB_PASSWORD
  await syncBackupRole(url)
  assert.equal((await sql`SELECT 1 FROM pg_roles WHERE rolname = 'bdokeep_backup'`).length, 0)
  process.env.BACKUP_DB_PASSWORD = "test'quoted$$password"
  await syncBackupRole(url)
  await syncBackupRole(url) // idempotent; unusual password must not break SQL.
  const read = postgres({ host: 'db', port: 15432, database: 'bdokeep',
    username: 'bdokeep_backup', password: process.env.BACKUP_DB_PASSWORD, max: 1 })
  try {
    assert.equal((await read`SELECT * FROM public.classes`).length, 1)
    assert.equal((await read`SELECT * FROM drizzle.__catalog_seeds`).length, 1)
    await assert.rejects(read`INSERT INTO public.classes (name) VALUES ('forbidden')`, { code: '42501' })
    await assert.rejects(read`UPDATE public.classes SET name = 'forbidden'`, { code: '42501' })
    await assert.rejects(read`DELETE FROM public.classes`, { code: '42501' })
    await assert.rejects(read`SELECT nextval('public.classes_id_seq')`, { code: '42501' })
    await sql.unsafe('CREATE TABLE public.future_table (id serial); INSERT INTO public.future_table DEFAULT VALUES')
    assert.equal((await read`SELECT * FROM public.future_table`).length, 1)
    assert.equal((await read`SELECT last_value FROM public.future_table_id_seq`).length, 1)
  } finally {
    await read.end()
  }
  process.env.BACKUP_DB_PASSWORD = 'test-backup'
  await syncBackupRole(url) // check password resync; used by pg_dump tests.
  console.log('backup role: RLS, read-only, defaults, password rotation passed')
} finally {
  await sql.end()
}
