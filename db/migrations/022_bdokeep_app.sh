#!/bin/bash
# App role for Nitro (no superuser / no bypassrls). Password = POSTGRES_PASSWORD.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  do \$\$
  begin
    if not exists (select from pg_roles where rolname = 'bdokeep_app') then
      create role bdokeep_app login password '${POSTGRES_PASSWORD}' nosuperuser nocreatedb nocreaterole;
    else
      alter role bdokeep_app with login password '${POSTGRES_PASSWORD}' nosuperuser;
    end if;
  end
  \$\$;

  grant usage on schema public to bdokeep_app;
  grant select, insert, update, delete on all tables in schema public to bdokeep_app;
  grant usage, select on all sequences in schema public to bdokeep_app;
  alter default privileges in schema public grant select, insert, update, delete on tables to bdokeep_app;
  alter default privileges in schema public grant usage, select on sequences to bdokeep_app;

  -- RLS stays on; allow app role full row access (authz enforced in Nitro)
  do \$\$
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
  \$\$;
EOSQL
