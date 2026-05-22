#!/usr/bin/env bash
# Install Caddy from the official Cloudsmith apt repo, drop our Caddyfile
# into /etc/caddy/, and start the service.
#
# This script does NOT edit the domain placeholders in the Caddyfile —
# you must replace `app.example.com` and `api.example.com` with your real
# domains before HTTPS will provision. See the comments at the top of the
# Caddyfile.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "==> Installing Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | $SUDO gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | $SUDO tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  $SUDO apt-get update
  $SUDO apt-get install -y caddy
else
  echo "Caddy already installed: $(caddy version)"
fi

echo "==> Preparing /etc/caddy and /var/log/caddy"
$SUDO mkdir -p /etc/caddy /var/log/caddy
$SUDO chown -R caddy:caddy /var/log/caddy

echo "==> Installing Caddyfile"
if [[ -f /etc/caddy/Caddyfile && "${OVERWRITE_CADDYFILE:-0}" != "1" ]]; then
  echo "    /etc/caddy/Caddyfile already exists. Set OVERWRITE_CADDYFILE=1 to replace."
  echo "    Diff vs ours:"
  diff -u /etc/caddy/Caddyfile "$SCRIPT_DIR/Caddyfile" || true
else
  $SUDO install -m 644 "$SCRIPT_DIR/Caddyfile" /etc/caddy/Caddyfile
fi

echo "==> Validating Caddyfile"
$SUDO caddy fmt --overwrite /etc/caddy/Caddyfile
$SUDO caddy validate --config /etc/caddy/Caddyfile

echo "==> Opening firewall"
if command -v ufw >/dev/null 2>&1; then
  $SUDO ufw allow 80/tcp || true
  $SUDO ufw allow 443/tcp || true
fi

echo "==> Reloading Caddy"
$SUDO systemctl enable caddy
$SUDO systemctl reload caddy 2>/dev/null || $SUDO systemctl restart caddy

echo ""
echo "Caddy is up. Edit /etc/caddy/Caddyfile to replace example.com domains,"
echo "then run: sudo systemctl reload caddy"
echo ""
echo "Don't forget to also open ports 80+443 in Oracle Cloud Security List."
echo ""
$SUDO systemctl status --no-pager caddy | head -8
