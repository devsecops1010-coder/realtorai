#!/usr/bin/env bash
# Daily PostgreSQL backup for Realtorai.
#
# Runs `pg_dump` inside the Postgres docker container, gzips the result,
# stores it under /var/backups/realtorai/ with date-stamped filename,
# and prunes:
#   - daily backups older than 14 days
#   - keeps Sunday backups for 8 weeks
#
# Usage:
#   /home/ubuntu/realtorai/infra/backups/pg-backup.sh
#
# Wired by install-cron.sh into /etc/cron.d/realtorai-backup at 03:15 daily.

set -euo pipefail

REPO_ROOT="/home/ubuntu/realtorai"
COMPOSE_FILE="$REPO_ROOT/infra/docker-compose.dev.yml"
COMPOSE_ENV="$REPO_ROOT/infra/.env"
BACKUP_DIR="/var/backups/realtorai"
DATE="$(date +%Y-%m-%d)"
DOW="$(date +%u)" # 1..7, Sunday=7
HOST_TAG="$(hostname -s)"
FILE_BASE="realtorai_${HOST_TAG}_${DATE}"

if [[ ! -f "$COMPOSE_ENV" ]]; then
  echo "ERROR: $COMPOSE_ENV not found" >&2
  exit 1
fi

# Load DB creds from infra/.env without exporting them upward.
# shellcheck disable=SC1090
set -a
. "$COMPOSE_ENV"
set +a

: "${POSTGRES_USER:?POSTGRES_USER not set in infra/.env}"
: "${POSTGRES_DB:?POSTGRES_DB not set in infra/.env}"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

OUT="$BACKUP_DIR/daily/${FILE_BASE}.sql.gz"
TMP="$BACKUP_DIR/daily/.${FILE_BASE}.sql.gz.tmp"

echo "[$(date -Iseconds)] pg_dump → $OUT"

# pg_dump from inside the container, gzipped on the host
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --clean --if-exists \
  | gzip -9 > "$TMP"
mv "$TMP" "$OUT"
chmod 600 "$OUT"

# On Sunday, also copy to weekly
if [[ "$DOW" == "7" ]]; then
  cp "$OUT" "$BACKUP_DIR/weekly/${FILE_BASE}.sql.gz"
  chmod 600 "$BACKUP_DIR/weekly/${FILE_BASE}.sql.gz"
fi

# Retention: 14 daily, 8 weekly
find "$BACKUP_DIR/daily" -maxdepth 1 -type f -name 'realtorai_*.sql.gz' -mtime +14 -delete
find "$BACKUP_DIR/weekly" -maxdepth 1 -type f -name 'realtorai_*.sql.gz' -mtime +56 -delete

# Size summary
SIZE="$(du -h "$OUT" | cut -f1)"
echo "[$(date -Iseconds)] done. size=$SIZE"
