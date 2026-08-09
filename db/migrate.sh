#!/bin/sh
# Apply db/migrations in order. Used by compose `migrate` service on every up.
# Tracks applied files in public.schema_migrations.
#
# Existing volumes (created via old initdb mounts): first run baselines
# historically-applied files, then applies anything newer (003, 030+).
set -eu

MIG_DIR="${MIG_DIR:-/migrations}"
PGHOST="${PGHOST:-127.0.0.1}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-bdokeep}"
export PGHOST PGUSER PGDATABASE
# Prefer trust on 127.0.0.1 inside db network namespace; password optional.
if [ -n "${POSTGRES_PASSWORD:-}" ]; then
  export PGPASSWORD="$POSTGRES_PASSWORD"
fi

echo "migrate: waiting for postgres at ${PGHOST}…"
i=0
while ! pg_isready -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "migrate: postgres not ready" >&2
    exit 1
  fi
  sleep 1
done

psql -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
SQL

# Filenames that used to ship via docker-entrypoint-initdb.d (already on old volumes).
baseline_if_legacy() {
  legacy="$(psql -Atc "
    select case
      when exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'classes'
      ) and not exists (select 1 from public.schema_migrations)
      then '1' else '0' end
  ")"
  if [ "$legacy" != "1" ]; then
    return 0
  fi

  echo "migrate: baselining legacy database (stamp old initdb migrations)…"
  # Keep in sync with historical compose initdb mounts (not 003 / 030+).
  for name in \
    000_roles.sh \
    001_init.sql \
    002_seed_skills.sql \
    004_combo_steps.sql \
    005_proposals.sql \
    006_drop_pvp_role.sql \
    007_buffs_proposals.sql \
    008_seed_buffs.sql \
    009_drop_guide_skills.sql \
    010_seed_crystals.sql \
    011_crystals_proposals.sql \
    012_crystal_presets.sql \
    013_crystal_preset_sub.sql \
    014_relic_presets.sql \
    015_seed_relics_lightstones.sql \
    016_buff_presets.sql \
    017_videos_proposals.sql \
    018_morphs.sql \
    019_seed_skill_addon_effects.sql \
    020_morph_grants.sql \
    021_morph_presets_guide.sql \
    022_bdokeep_app.sh \
    023_guide_morphs_rls.sql \
    024_class_tier.sql \
    025_section_updates.sql \
    026_backfill_section_updates.sql \
    027_dual_mode_summary_videos_tier.sql \
    028_hardening.sql \
    029_seed_hardening.sql
  do
    if [ -e "${MIG_DIR}/${name}" ]; then
      psql -v ON_ERROR_STOP=1 -c \
        "insert into public.schema_migrations (filename) values ('${name}') on conflict do nothing"
    fi
  done
}

baseline_if_legacy

applied=0
skipped=0
# shellcheck disable=SC2045
for path in $(ls -1 "${MIG_DIR}"/[0-9][0-9][0-9]_* 2>/dev/null | sort); do
  name="$(basename "$path")"
  have="$(psql -Atc "select 1 from public.schema_migrations where filename = '${name}'")"
  if [ "$have" = "1" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  echo "migrate: apply ${name}"
  case "$name" in
    *.sh)
      # Scripts expect POSTGRES_* and optional PGHOST (set above).
      sh "$path"
      ;;
    *.sql)
      psql -v ON_ERROR_STOP=1 -f "$path"
      ;;
    *)
      echo "migrate: skip unknown ${name}" >&2
      continue
      ;;
  esac

  psql -v ON_ERROR_STOP=1 -c \
    "insert into public.schema_migrations (filename) values ('${name}')"
  applied=$((applied + 1))
done

echo "migrate: done (applied=${applied} skipped=${skipped})"

# Always sync app role password / grants (idempotent) — .env may have changed.
echo "migrate: sync bdokeep_app role…"
sh "${MIG_DIR}/022_bdokeep_app.sh"
psql -v ON_ERROR_STOP=1 -c \
  "insert into public.schema_migrations (filename) values ('022_bdokeep_app.sh') on conflict do nothing"

# Always re-apply catalog seeds/refreshes (idempotent upsert + prune where present).
# Legacy volumes stamp old initdb seeds in schema_migrations without re-running them —
# without this block prod keeps stale/partial catalogs (e.g. missing crystals/skills).
refresh_catalog() {
  name="$1"
  path="${MIG_DIR}/${name}"
  if [ ! -f "$path" ]; then
    return 0
  fi
  echo "migrate: refresh catalog ${name}…"
  psql -v ON_ERROR_STOP=1 -f "$path"
}

# Order: base skills/items → addon effects → morph overlays → crystals/buffs (upsert+prune) → icons.
refresh_catalog 002_seed_skills.sql
refresh_catalog 015_seed_relics_lightstones.sql
refresh_catalog 029_seed_hardening.sql
refresh_catalog 030_refresh_skill_addon_effects.sql
refresh_catalog 032_refresh_morph_skills.sql
refresh_catalog 045_refresh_morph_skills_bdocodex.sql
refresh_catalog 034_refresh_garmoth_crystals_buffs.sql
refresh_catalog 035_seed_lightstone_sets.sql

# Always rewrite any leftover bdocodex hotlinks (idempotent) so one compose up fixes prod DB.
if [ -f "${MIG_DIR}/033_localize_bdocodex_icons.sql" ]; then
  echo "migrate: localize catalog icon URLs…"
  psql -v ON_ERROR_STOP=1 -f "${MIG_DIR}/033_localize_bdocodex_icons.sql"
fi
