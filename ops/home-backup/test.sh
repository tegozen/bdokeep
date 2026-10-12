#!/bin/sh
set -eu
cd "$(dirname "$0")"
# Only the dedicated bdokeep-backup-check fixture project is removed.
trap 'docker compose -f test.compose.yml logs --tail=30 role-test snapshot-test restore-check; docker compose -f test.compose.yml down -v --remove-orphans' EXIT
docker compose -f test.compose.yml build
docker compose -f test.compose.yml run --rm --no-deps --entrypoint python3 \
  -v "$PWD:/tests:ro" restore-check /tests/test_backup.py
docker compose -f test.compose.yml up -d restore-check
docker compose -f test.compose.yml wait restore-check
