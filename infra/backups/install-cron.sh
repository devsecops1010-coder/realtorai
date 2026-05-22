#!/usr/bin/env bash
# Install daily Postgres backup cron + restore-test cron (weekly).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

# Ensure the backup script is in place + executable
chmod +x "$SCRIPT_DIR/pg-backup.sh" "$SCRIPT_DIR/pg-restore.sh"

# Backup dir
$SUDO mkdir -p /var/backups/realtorai/daily /var/backups/realtorai/weekly
$SUDO chown -R ubuntu:ubuntu /var/backups/realtorai
$SUDO chmod 700 /var/backups/realtorai

# Cron — run as ubuntu so we can `docker compose ... exec`.
# 03:15 daily for the dump. 04:00 every Sunday for the restore smoke test.
$SUDO tee /etc/cron.d/realtorai-backup >/dev/null <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

15 3 * * * ubuntu $SCRIPT_DIR/pg-backup.sh >> /var/log/realtorai-backup.log 2>&1
0  4 * * 0 ubuntu $SCRIPT_DIR/pg-restore.sh --smoke >> /var/log/realtorai-backup.log 2>&1
EOF

$SUDO touch /var/log/realtorai-backup.log
$SUDO chown ubuntu:ubuntu /var/log/realtorai-backup.log

echo "Installed cron at /etc/cron.d/realtorai-backup. Triggers:"
echo "  03:15 daily — pg_dump → /var/backups/realtorai/daily"
echo "  04:00 every Sunday — restore smoke test to a scratch DB"
echo ""
echo "Logs: tail -f /var/log/realtorai-backup.log"
echo ""
echo "Run once now to verify:"
echo "  $SCRIPT_DIR/pg-backup.sh"
