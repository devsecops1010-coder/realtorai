#!/usr/bin/env bash
# Sync local PostgreSQL backups to an off-site object store via rclone.
#
# Why a separate step: pg-backup.sh writes to /var/backups/realtorai/ on the
# same host that runs Postgres. If that host is lost (disk failure, ransomware,
# someone runs `rm -rf` in the wrong directory), the backups go with it. This
# script copies the same files to a remote you control.
#
# Designed to be cheap and provider-agnostic:
#   - Backblaze B2  (cheapest object storage with free egress to Cloudflare)
#   - Cloudflare R2 (zero egress, S3-compatible)
#   - Oracle Object Storage (always-free tier, 20GB)
#   - AWS S3 / Wasabi / any S3-compatible
#   - SFTP/SSH to a second VPS
#
# Usage:
#   /home/ubuntu/realtorai/infra/backups/offsite-sync.sh
#
# Wired by install-offsite.sh into the same cron line as pg-backup.sh (runs
# right after the local dump finishes).
#
# Configuration: reads infra/.env.offsite — see infra/.env.offsite.example
# for the variables. If the file is missing, the script logs a warning and
# exits 0 (so cron does not page you while you're still setting it up).

set -euo pipefail

REPO_ROOT="/home/ubuntu/realtorai"
LOCAL_DIR="/var/backups/realtorai"
ENV_FILE="$REPO_ROOT/infra/.env.offsite"
LOG_PREFIX="[$(date -Iseconds)] offsite-sync:"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$LOG_PREFIX $ENV_FILE not found — skipping (configure off-site sync to enable)" >&2
  exit 0
fi

if ! command -v rclone >/dev/null 2>&1; then
  echo "$LOG_PREFIX rclone not installed. Run infra/backups/install-offsite.sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
. "$ENV_FILE"
set +a

: "${OFFSITE_REMOTE:?OFFSITE_REMOTE not set (e.g. b2:realtorai-backups)}"

REMOTE_PATH="${OFFSITE_REMOTE%/}/$(hostname -s)"

if [[ ! -d "$LOCAL_DIR" ]]; then
  echo "$LOG_PREFIX no local backups at $LOCAL_DIR — nothing to sync" >&2
  exit 0
fi

echo "$LOG_PREFIX syncing $LOCAL_DIR → $REMOTE_PATH"

# rclone sync mirrors the source: files deleted locally (by retention) also
# get pruned remotely. Use --immutable so once a backup lands on the remote
# we never overwrite it — protects against a corrupt local backup poisoning
# the off-site copy. --transfers 2 keeps memory low.
rclone sync \
  --immutable \
  --transfers 2 \
  --checkers 4 \
  --min-age 30s \
  --log-level INFO \
  "$LOCAL_DIR" "$REMOTE_PATH"

echo "$LOG_PREFIX done."
