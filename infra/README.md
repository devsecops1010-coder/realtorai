# Infra — Realtorai production bring-up

A repeatable path to take a fresh Ubuntu 24.04 server from zero to a Realtorai
production install that:

- Runs API + Web under **systemd** (auto-restart on failure, survives reboot)
- Serves **HTTPS** via Caddy with auto Let's Encrypt
- Takes **daily Postgres backups** with a weekly **restore smoke test**

All scripts here are idempotent — safe to re-run.

---

## Layout

```
infra/
├── docker-compose.dev.yml   # Postgres + Redis (bound to 127.0.0.1)
├── docker-compose.yml       # full prod compose (optional alternative path)
├── systemd/
│   ├── realtorai-api.service
│   ├── realtorai-web.service
│   └── install-services.sh
├── caddy/
│   ├── Caddyfile
│   └── install-caddy.sh
├── backups/
│   ├── pg-backup.sh
│   ├── pg-restore.sh
│   ├── offsite-sync.sh
│   ├── install-cron.sh
│   └── install-offsite.sh
├── .env.example
└── .env.offsite.example
```

Secrets stay in `infra/.env` and `apps/api/.env` — **never** committed.

---

## Fresh-server checklist

Assumes you're logged in as `ubuntu` and the repo is at `/home/ubuntu/realtorai`.

```bash
# 1. Prerequisites (one-time)
sudo apt-get update && sudo apt-get install -y curl gnupg
# Docker + compose plugin must already be installed (you have them).

# 2. Add ubuntu to the docker group (one-time, requires re-login after)
sudo usermod -aG docker ubuntu
# log out + back in, or in the current session run any docker command via `sg docker -c '...'`

# 3. Postgres + Redis
cp infra/.env.example infra/.env       # if not already done
$EDITOR infra/.env                      # set strong POSTGRES_PASSWORD + REDIS_PASSWORD
pnpm infra:up

# 4. App env
cp apps/api/.env.example apps/api/.env  # if not already done
$EDITOR apps/api/.env                    # set JWT_SECRET (openssl rand -hex 64),
                                         # real LLM API key, WhatsApp provider credentials
cp apps/web/.env.local.example apps/web/.env.local
$EDITOR apps/web/.env.local              # set NEXT_PUBLIC_API_URL=https://api.yourdomain.tld

# 5. Build
pnpm install
pnpm api:prisma migrate deploy
pnpm api:build
pnpm --filter @realtorai/web build

# 6. Run under systemd (replaces manual nohup)
sudo bash infra/systemd/install-services.sh

# 7. Reverse proxy + HTTPS
#    Edit infra/caddy/Caddyfile first — replace example.com with your real
#    domains and set the email at the top.
sudo bash infra/caddy/install-caddy.sh
# Open 80 + 443 in your cloud Security List as well.

# 8. Backups + restore smoke test
sudo bash infra/backups/install-cron.sh
# Verify backup once now:
infra/backups/pg-backup.sh
infra/backups/pg-restore.sh --smoke

# 9. Off-site backups (recommended — protects against host loss)
sudo bash infra/backups/install-offsite.sh
# Smoke-test the off-site sync once:
infra/backups/offsite-sync.sh
```

---

## Day-2 operations

| Action | Command |
|---|---|
| Tail API logs | `sudo journalctl -u realtorai-api -f` |
| Tail Web logs | `sudo journalctl -u realtorai-web -f` |
| Restart API | `sudo systemctl restart realtorai-api` |
| Restart Web | `sudo systemctl restart realtorai-web` |
| Reload Caddy after Caddyfile edit | `sudo systemctl reload caddy` |
| Run a backup now | `infra/backups/pg-backup.sh` |
| Smoke-test restore | `infra/backups/pg-restore.sh --smoke` |
| List backups | `ls -la /var/backups/realtorai/daily/` |
| Backup log | `tail -f /var/log/realtorai-backup.log` |
| Sync to off-site now | `infra/backups/offsite-sync.sh` |
| Off-site log | `tail -f /var/log/realtorai-offsite.log` |
| List off-site files | `rclone ls "$OFFSITE_REMOTE/$(hostname -s)"` |

## Deploying a new version

```bash
cd /home/ubuntu/realtorai
git pull
pnpm install
pnpm api:prisma migrate deploy
pnpm api:build
pnpm --filter @realtorai/web build
sudo systemctl restart realtorai-api realtorai-web
```

If you change Prisma schema, run `migrate deploy` _before_ restarting services
so the API doesn't crash on missing columns.

## Restore from a backup

**Test restore** (non-destructive):
```bash
infra/backups/pg-restore.sh --smoke
```

**Restore a specific dump to a named DB** (won't touch prod):
```bash
infra/backups/pg-restore.sh --to realtorai_staging \
  /var/backups/realtorai/daily/realtorai_HOSTNAME_2026-05-22.sql.gz
```

**Emergency restore over production DB** (requires interactive confirmation,
stops API + Web while restoring):
```bash
infra/backups/pg-restore.sh --emergency-overwrite-prod
```

---

## What's still NOT covered here

- **Uptime / error monitoring** (Sentry SDK, Uptime Kuma, etc.) — env vars
  already exist in `apps/api/.env.example` for `SENTRY_DSN`; SDK wiring still
  to do.
- **WhatsApp webhook queueing** — webhooks process inline; under load this
  should move to BullMQ on Redis. See handoff doc.
- **Per-tenant LLM budgets / rate limits** — only global throttler is wired.
- **Off-site backup storage** — `/var/backups/realtorai/` lives on the same
  VPS. Hook this directory up to S3-compatible object storage (Backblaze B2,
  Cloudflare R2, Oracle Object Storage) before relying on it.
