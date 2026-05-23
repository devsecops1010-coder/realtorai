#!/usr/bin/env bash
# Pre-deploy safety checks for RealtorAI.
# Run from the repo root before restarting production services.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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

require_cmd git
require_cmd pnpm
require_cmd docker

note "Checking repository state"
git status --short

if git status --short | grep -E '(^|\s)(\.env|.*\.env$|.*\.env\.)' >/dev/null 2>&1; then
  fail "Env files appear in git status. Do not commit or expose secrets."
fi

note "Checking required env files exist without printing values"
[[ -f apps/api/.env ]] || fail "apps/api/.env is missing"
[[ -f apps/web/.env.local ]] || echo "WARN: apps/web/.env.local is missing"
[[ -f infra/.env ]] || fail "infra/.env is missing"

note "Checking database/cache ports are not publicly exposed by Docker"
docker ps --format '{{.Names}} {{.Ports}}' | tee /tmp/realtorai-preflight-ports.txt
if grep -E '0\.0\.0\.0:(5432|6379)|:::(5432|6379)' /tmp/realtorai-preflight-ports.txt >/dev/null 2>&1; then
  fail "Postgres or Redis is exposed publicly. Bind them to 127.0.0.1 only."
fi

note "Building API"
pnpm api:build

note "Building Web"
pnpm --filter @realtorai/web build

note "Running API e2e tests"
pnpm api:test:e2e

note "Preflight passed"

