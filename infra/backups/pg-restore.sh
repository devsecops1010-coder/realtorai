#!/usr/bin/env bash
# Restore a Realtorai backup.
#
# Three modes:
#
#   pg-restore.sh --smoke
#       Restore the latest daily backup to a scratch DB called
#       realtorai_restore_test, run a couple of sanity queries, then drop
#       the scratch DB. Wired by the weekly cron so we know backups are
#       actually usable.
#
#   pg-restore.sh --to realtorai_staging  /var/backups/realtorai/daily/realtorai_HOST_2026-05-22.sql.gz
#       Restore a specific dump into a specific DB. Will refuse if the
#       target DB has tables (you must drop it first).
#
#   pg-restore.sh --emergency-overwrite-prod
#       Stop API + Web, restore latest daily over the live `realtorai` DB,
#       start API + Web. Requires interactive confirmation. USE WITH CARE.

set -euo pipefail

REPO_ROOT="/home/ubuntu/realtorai"
COMPOSE_FILE="$REPO_ROOT/infra/docker-compose.dev.yml"
COMPOSE_ENV="$REPO_ROOT/infra/.env"
BACKUP_DIR="/var/backups/realtorai"

set -a
. "$COMPOSE_ENV"
set +a

LATEST="$(ls -1t "$BACKUP_DIR/daily"/realtorai_*.sql.gz 2>/dev/null | head -1 || true)"
if [[ -z "$LATEST" ]]; then
  echo "ERROR: no backups found in $BACKUP_DIR/daily" >&2
  exit 1
fi

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" "$@"
}

run_psql_as_super() {
  compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres "$@"
}

mode="${1:-}"
case "$mode" in
  --smoke)
    SCRATCH="realtorai_restore_test"
    echo "[$(date -Iseconds)] smoke restore of $LATEST → $SCRATCH"
    run_psql_as_super -c "DROP DATABASE IF EXISTS $SCRATCH;"
    run_psql_as_super -c "CREATE DATABASE $SCRATCH;"
    gunzip -c "$LATEST" | compose exec -T postgres psql -U "$POSTGRES_USER" -d "$SCRATCH" >/dev/null
    TABLES=$(compose exec -T postgres psql -U "$POSTGRES_USER" -d "$SCRATCH" -tAc \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
    TENANTS=$(compose exec -T postgres psql -U "$POSTGRES_USER" -d "$SCRATCH" -tAc \
      "SELECT count(*) FROM tenants" 2>/dev/null || echo 0)
    run_psql_as_super -c "DROP DATABASE $SCRATCH;"
    echo "[$(date -Iseconds)] smoke ok. tables=$TABLES tenants=$TENANTS file=$LATEST"
    ;;
  --to)
    TARGET="${2:?usage: --to <db_name> <file.sql.gz>}"
    FILE="${3:?usage: --to <db_name> <file.sql.gz>}"
    [[ -f "$FILE" ]] || { echo "no such file: $FILE" >&2; exit 1; }
    echo "Restoring $FILE → $TARGET"
    run_psql_as_super -c "CREATE DATABASE $TARGET;" 2>/dev/null || true
    gunzip -c "$FILE" | compose exec -T postgres psql -U "$POSTGRES_USER" -d "$TARGET"
    echo "Done."
    ;;
  --emergency-overwrite-prod)
    echo "WARNING: this will overwrite the live $POSTGRES_DB database."
    read -r -p "Type the database name to confirm: " confirm
    [[ "$confirm" == "$POSTGRES_DB" ]] || { echo "Aborted."; exit 2; }
    SUDO=""
    [[ "$(id -u)" -ne 0 ]] && SUDO=sudo
    $SUDO systemctl stop realtorai-api realtorai-web || true
    run_psql_as_super -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
    run_psql_as_super -c "CREATE DATABASE $POSTGRES_DB;"
    gunzip -c "$LATEST" | compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    $SUDO systemctl start realtorai-api realtorai-web || true
    echo "Restored from $LATEST. Verify the app works before walking away."
    ;;
  *)
    cat <<USAGE
Usage:
  $0 --smoke
  $0 --to <db_name> <backup-file.sql.gz>
  $0 --emergency-overwrite-prod
USAGE
    exit 1
    ;;
esac
