#!/usr/bin/env bash
# Post-deploy smoke checks for RealtorAI.
# Defaults target the local services; override API_URL and WEB_URL for Caddy domains.

set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:3000}"
WEB_URL="${WEB_URL:-http://127.0.0.1:3001}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

note() {
  echo "==> $*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

require_cmd curl

curl_json() {
  local url="$1"
  curl --fail --silent --show-error --max-time 10 "$url"
}

note "Checking API liveness: $API_URL/health"
curl_json "$API_URL/health" | grep -q '"status":"ok"' || fail "API /health did not return ok"

note "Checking API readiness: $API_URL/ready"
curl_json "$API_URL/ready" | grep -q '"status":"ok"' || fail "API /ready did not return ok"

note "Checking Web response: $WEB_URL"
curl --fail --silent --show-error --max-time 10 "$WEB_URL" >/tmp/realtorai-smoke-web.html

if ! grep -E 'RealtorAI|כל ליד|דשבורד|משרד' /tmp/realtorai-smoke-web.html >/dev/null 2>&1; then
  fail "Web responded, but expected landing-page content was not found"
fi

note "Smoke checks passed"

