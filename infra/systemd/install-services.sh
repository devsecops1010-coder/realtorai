#!/usr/bin/env bash
# Install + enable systemd units for realtorai-api and realtorai-web.
# Idempotent: re-running just re-copies and re-loads.
#
# Requires: sudo. Run from the repo root or from infra/systemd/.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "Installing systemd units from $SCRIPT_DIR"

# Pre-flight: API needs a built dist/, web needs a built .next/
if [[ ! -f "$REPO_ROOT/apps/api/dist/main.js" ]]; then
  echo "ERROR: $REPO_ROOT/apps/api/dist/main.js missing — run 'pnpm api:build' first."
  exit 1
fi
if [[ ! -f "$REPO_ROOT/apps/web/.next/BUILD_ID" ]]; then
  echo "ERROR: $REPO_ROOT/apps/web/.next missing — run 'pnpm --filter @realtorai/web build' first."
  exit 1
fi
if [[ ! -f "$REPO_ROOT/apps/api/.env" ]]; then
  echo "ERROR: $REPO_ROOT/apps/api/.env missing — copy from .env.example and fill secrets."
  exit 1
fi

$SUDO install -m 644 "$SCRIPT_DIR/realtorai-api.service" /etc/systemd/system/realtorai-api.service
$SUDO install -m 644 "$SCRIPT_DIR/realtorai-web.service" /etc/systemd/system/realtorai-web.service

$SUDO systemctl daemon-reload
$SUDO systemctl enable realtorai-api.service realtorai-web.service
$SUDO systemctl restart realtorai-api.service
sleep 2
$SUDO systemctl restart realtorai-web.service

echo ""
echo "Done. Useful commands:"
echo "  sudo systemctl status realtorai-api"
echo "  sudo systemctl status realtorai-web"
echo "  sudo journalctl -u realtorai-api -f"
echo "  sudo journalctl -u realtorai-web -f"
echo ""
$SUDO systemctl status --no-pager realtorai-api.service | head -6
$SUDO systemctl status --no-pager realtorai-web.service | head -6
