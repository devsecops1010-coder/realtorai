# RealtorAI Deploy Safety Runbook

This runbook is for continuing development without overwriting existing work.

## Rule Before Any Work

Run:

```bash
git status --short
```

If files are already modified, treat them as someone else's work unless you are
explicitly continuing that exact change.

Do not run:

```bash
git reset --hard
git checkout -- .
git clean -fd
```

## Before Deploy

Run:

```bash
scripts/realtorai-preflight.sh
```

This checks:

- secrets are not accidentally staged or shown in git status
- required env files exist
- Postgres and Redis are not exposed on public interfaces
- API build passes
- Web build passes
- API e2e tests pass

## After Deploy

Run locally on the server:

```bash
scripts/realtorai-smoke.sh
```

Run against real HTTPS domains:

```bash
API_URL=https://api.example.com WEB_URL=https://app.example.com scripts/realtorai-smoke.sh
```

## Current Safe Order For Production Hardening

1. Commit or otherwise preserve the current open work.
2. Run `scripts/realtorai-preflight.sh`.
3. Apply Prisma migrations with `pnpm api:prisma migrate deploy`.
4. Restart API and Web via systemd or production compose.
5. Run `scripts/realtorai-smoke.sh`.
6. Confirm backups with `infra/backups/pg-backup.sh`.
7. Confirm restore smoke test with `infra/backups/pg-restore.sh --smoke`.

## Next Engineering Priorities

1. Keep WhatsApp and voice webhooks asynchronous through queues.
2. Validate every AI tool input with strict schemas.
3. Add per-tenant usage limits before selling to many offices.
4. Move browser auth tokens toward httpOnly cookies.
5. Add monitoring alerts for API readiness, queue failures and backup failures.

