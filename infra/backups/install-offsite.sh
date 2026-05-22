#!/usr/bin/env bash
# Install rclone + interactively configure an off-site backup remote.
#
# Idempotent: re-running is safe. The script:
#   1. Installs rclone if missing (apt or curl).
#   2. Walks you through `rclone config` once.
#   3. Writes /home/ubuntu/realtorai/infra/.env.offsite pointing at the chosen
#      remote so offsite-sync.sh knows what to use.
#   4. Adds a cron line that runs offsite-sync.sh 15 minutes AFTER pg-backup.sh
#      (the local backup must finish before we can sync it).
#
# Run after install-cron.sh.
#
# Usage:
#   sudo /home/ubuntu/realtorai/infra/backups/install-offsite.sh
#
# Environment overrides (skip prompts, useful for re-provisioning):
#   OFFSITE_REMOTE=b2:realtorai-backups sudo ./install-offsite.sh
#   FORCE_CRON=1 — overwrite an existing cron entry without asking

set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "ERROR: run with sudo" >&2
  exit 1
fi

REPO_ROOT="/home/ubuntu/realtorai"
CRON_FILE="/etc/cron.d/realtorai-offsite"
ENV_FILE="$REPO_ROOT/infra/.env.offsite"
ENV_EXAMPLE="$REPO_ROOT/infra/.env.offsite.example"
SYNC_SCRIPT="$REPO_ROOT/infra/backups/offsite-sync.sh"

echo "==> Step 1: install rclone"
if ! command -v rclone >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y rclone
  else
    curl https://rclone.org/install.sh | bash
  fi
else
  echo "    rclone already installed ($(rclone version | head -1))"
fi

echo "==> Step 2: configure an rclone remote"
echo
echo "    rclone supports B2, R2, OCI Object Storage, S3, Wasabi, SFTP, and more."
echo "    Recommended for low cost: Backblaze B2 (cheapest), or Cloudflare R2"
echo "    (zero egress). Either way pick 's3' or 'b2' in the menu."
echo
echo "    Suggested remote name: 'offsite'"
echo "    Suggested bucket name: 'realtorai-backups-$(hostname -s)'"
echo
echo "    Launching: rclone config"
echo "    Press Enter when you're ready, or Ctrl-C to abort."
read -r

if [[ -t 0 ]]; then
  sudo -u ubuntu HOME=/home/ubuntu rclone config
else
  echo "    Non-interactive shell detected — skipping rclone config."
  echo "    Run this later as the ubuntu user:  rclone config"
fi

echo "==> Step 3: write $ENV_FILE"
if [[ -f "$ENV_FILE" && -z "${FORCE_CRON:-}" ]]; then
  echo "    $ENV_FILE already exists — leaving it untouched."
  echo "    To rewrite, delete it and re-run."
else
  REMOTE="${OFFSITE_REMOTE:-}"
  if [[ -z "$REMOTE" ]]; then
    read -r -p "    Enter your remote path (e.g. offsite:realtorai-backups): " REMOTE
  fi
  if [[ -z "$REMOTE" ]]; then
    echo "    No remote given — leaving sync disabled. You can fill in $ENV_FILE later."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
  else
    cat > "$ENV_FILE" <<EOF
# Off-site backup target — written by install-offsite.sh.
# Format: <rclone-remote-name>:<bucket-or-path>
# Examples:
#   offsite:realtorai-backups
#   b2:realtorai-backups
#   r2:realtorai-backups
OFFSITE_REMOTE=$REMOTE
EOF
  fi
  chown ubuntu:ubuntu "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "    wrote $ENV_FILE"
fi

echo "==> Step 4: install cron entry → $CRON_FILE"
# Runs at 03:30 daily — 15 minutes after pg-backup.sh (which runs at 03:15).
cat > "$CRON_FILE" <<EOF
# Realtorai off-site backup sync. Installed by install-offsite.sh.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * ubuntu $SYNC_SCRIPT >> /var/log/realtorai-offsite.log 2>&1
EOF
chmod 644 "$CRON_FILE"

touch /var/log/realtorai-offsite.log
chown ubuntu:ubuntu /var/log/realtorai-offsite.log
chmod 640 /var/log/realtorai-offsite.log

echo
echo "==> Done. Smoke test:"
echo "    sudo -u ubuntu $SYNC_SCRIPT"
echo
echo "    Tail the log:"
echo "    tail -f /var/log/realtorai-offsite.log"
