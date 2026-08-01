#!/bin/bash
# Role names kept for RLS policy grants (TO anon, authenticated) and legacy service_role grants in SQL.
# No login authenticator / PostgREST — app uses bdokeep_app via DATABASE_URL.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  do \$\$
  begin
    if not exists (select from pg_roles where rolname = 'anon') then
      create role anon nologin;
    end if;
    if not exists (select from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin;
    end if;
    if not exists (select from pg_roles where rolname = 'service_role') then
      create role service_role nologin nosuperuser;
    end if;
  end
  \$\$;

  grant usage on schema public to anon, authenticated, service_role;
EOSQL
