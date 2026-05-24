# Claude Handoff - RealtorAI

This file is the handoff for any AI coding assistant continuing work on the server project.

Project path on server:

`/home/ubuntu/realtorai`

Git branch:

`main`

Current base commit observed:

`50c14fb`

## Critical Rules

1. Do not run destructive git commands.
2. Do not run `git reset --hard`, `git checkout -- .`, or delete uncommitted work.
3. Do not rewrite the project structure.
4. Do not modify `.env` files or print secrets.
5. Do not expose Postgres or Redis publicly.
6. Do not re-enable mock LLM behavior in production.
7. Do not remove tenant isolation, RBAC, audit logging, or scoped Prisma access.
8. Before editing, run `git status --short` and inspect the relevant files.
9. Make small focused commits or changes only after verifying builds/tests.

## Current Project

RealtorAI is a multi-tenant SaaS for real estate offices.

Stack:

- API: NestJS 11, Prisma 6, PostgreSQL, Redis
- Web: Next.js 15, React 19, Tailwind
- Package manager: pnpm
- Modules: CRM, agents, LLM router, WhatsApp providers, mortgage module, audit, RBAC, onboarding, billing fields

Business goal:

- Sell AI agents to real estate offices.
- Each office gets agents for property recruitment, lead response, CRM/follow-up, and later mortgage, ads, branding, content and video.

## Recent Changes Already Made

API hardening:

- `apps/api/src/config/env.schema.ts`
  - Added `HOST`
  - Production now requires `CORS_ORIGINS`
  - Production now requires strong `JWT_SECRET`
  - Production now requires at least one real LLM API key
  - Production blocks `WHATSAPP_PROVIDER=mock`

- `apps/api/src/main.ts`
  - Production no longer falls back to open CORS
  - Server can bind to configured `HOST`

- `apps/api/src/llm/llm-router.service.ts`
  - Mock provider is only available outside production

Infrastructure:

- `infra/docker-compose.dev.yml`
  - Postgres and Redis are now bound to `127.0.0.1`, not public interfaces

Marketing website:

- Updated landing page copy and design toward a serious real estate SaaS
- Updated hero, features, pain points, how it works, pricing, CTA, nav and pricing page
- Emphasized lead response, property recruitment, mortgage module, CRM follow-up and office ROI

Platform/admin setup:

- `POST /admin/offices/setup`
  - Platform admin can now create a tenant, office, active office owner, billing limits and the two base agents in one operation.
  - The endpoint is guarded by `@Roles(platform_admin)` and audited as `admin.office_setup`.
- `apps/api/src/admin/dto/setup-office.dto.ts`
  - Validates tenant, billing, office and owner setup inputs.
- `apps/web/src/app/(protected)/admin/page.tsx`
  - Added a platform admin form for creating a new office/customer from the admin overview.
- `apps/web/src/app/(protected)/dashboard/page.tsx`
  - Reworked the personal area into a role-based daily workspace with current queue, role actions, workflow and relevant metrics.
- `apps/api/test/sprint6.e2e.spec.ts`
  - Added coverage that platform admin can create a tenant office and that the new owner can log in.

Marketing website refresh:

- Improved the public landing page visual system while preserving the existing product message.
- Updated:
  - `apps/web/src/components/marketing/hero.tsx`
  - `apps/web/src/components/marketing/pain-points.tsx`
  - `apps/web/src/components/marketing/how-it-works.tsx`
  - `apps/web/src/components/marketing/features.tsx`
  - `apps/web/src/components/marketing/pricing-section.tsx`
  - `apps/web/src/components/marketing/cta-band.tsx`
- Do not replace these files wholesale. If more work is needed, inspect them first and patch only the relevant section.

Login/API error cleanup:

- `apps/web/src/lib/api.ts`
  - Keeps `NEXT_PUBLIC_API_URL=/api` behavior.
  - Normalizes API URLs and prevents raw HTML error pages from being exposed as UI messages.
  - Maps common statuses to short Hebrew messages.
- `apps/web/src/app/login/page.tsx`
  - Login errors now render as a short bounded message.
  - Do not revert to showing `e.message` directly; that previously leaked a full HTML 404/error page into the form.

## Verification Already Passed

These commands passed after the latest changes:

```bash
pnpm api:build
pnpm --filter @realtorai/web build
pnpm api:test:e2e
sudo systemctl restart realtorai-api realtorai-web
scripts/realtorai-smoke.sh
```

E2E result:

- 14 suites passed
- 59 tests passed

Browser check:

- Opened the deployed web app through a local SSH tunnel.
- `/login` loaded with no browser console errors.
- `/dashboard` correctly redirected unauthenticated visitors to `/login` with no browser console errors.
- Public HTTP was restored on `http://141.145.223.159`.
  - Caddy is active on port 80 and proxies web to `127.0.0.1:3001`.
  - API is reachable through the same host under `/api/*`, stripping `/api` before proxying to `127.0.0.1:3000`.
  - `apps/web/.env.local` was changed to `NEXT_PUBLIC_API_URL=/api` and the web app was rebuilt.
  - Caddy failed because `/var/log/caddy/*.log` files were owned by root; ownership was fixed to `caddy:caddy`.
  - Direct iptables accept rules for ports 80 and 443 were inserted before the Oracle image's reject rule.
- After the marketing refresh, the public homepage was checked in browser at `http://141.145.223.159/`.
  - No browser console errors.
  - Hero, Command Center preview, pricing copy and CTA were present.

Known note:

- `pnpm api:test` currently finds no unit tests because the repo is mostly covered by e2e tests under `apps/api/test`.

## Current Uncommitted Files

The following files were modified and must not be overwritten:

```text
CLAUDE_HANDOFF.md
apps/api/prisma/schema.prisma
apps/api/src/admin/admin.controller.ts
apps/api/src/admin/admin.service.ts
apps/api/src/admin/dto/setup-office.dto.ts
apps/api/src/app.module.ts
apps/api/src/config/env.schema.ts
apps/api/src/llm/llm-router.service.ts
apps/api/src/main.ts
apps/api/src/sentry/sentry-exception.filter.ts
apps/api/src/offices/offices.controller.ts
apps/api/src/offices/offices.service.ts
apps/api/src/properties/dto/create-public-property-lead.dto.ts
apps/api/src/properties/dto/public-property-search.query.ts
apps/api/src/properties/properties.controller.ts
apps/api/src/properties/properties.service.ts
apps/api/src/tenants/tenants.service.ts
apps/api/test/sprint6.e2e.spec.ts
apps/web/src/app/(protected)/admin/page.tsx
apps/web/src/app/(protected)/dashboard/page.tsx
apps/web/src/app/page.tsx
apps/web/src/app/marketplace/page.tsx
apps/web/src/app/globals.css
apps/web/next.config.ts
apps/web/src/app/pricing/page.tsx
apps/web/.env.local
apps/web/src/components/marketing/cta-band.tsx
apps/web/src/components/marketing/features.tsx
apps/web/src/components/marketing/hero.tsx
apps/web/src/components/marketing/how-it-works.tsx
apps/web/src/components/marketing/nav.tsx
apps/web/src/components/marketing/hero.tsx
apps/web/src/components/marketplace/public-marketplace.tsx
docs/marketplace_feature_research.txt
apps/web/src/components/marketing/pain-points.tsx
apps/web/src/components/marketing/pricing-section.tsx
apps/web/src/lib/role-workspace.ts
apps/web/src/lib/types.ts
infra/docker-compose.dev.yml
```

## Production Risks To Fix Next

## Latest Login Routing Fix

- `apps/web/next.config.ts` now rewrites `/api/:path*` to the internal API (`INTERNAL_API_URL` or `http://127.0.0.1:3000`).
- This keeps login working even if the web app is opened directly on the Next server port, not only through Caddy.
- Do not remove this rewrite unless another proxy handles `/api/*` for every entry point.
- `apps/api/src/sentry/sentry-exception.filter.ts` now returns JSON responses instead of re-throwing into Express's HTML error handler.

## Latest Marketplace Slice

- Added public API endpoints:
  - `GET /properties/public/search`
  - `POST /properties/public/:id/leads`
- Added public UI page:
  - `/marketplace`
- Unified the public marketplace into the homepage at `/` (`http://localhost:3001/`), section id `#marketplace`.
- `/marketplace` now reuses the shared `PublicMarketplace` component as a full-page view.
- Updated marketing nav and hero CTAs to point to the unified homepage marketplace section.
- This is the first implementation slice from `docs/realtorai_platform_vision_architecture.txt`: public property search + lead capture without copying external marketplace data.

## Latest Competitor-Inspired Marketplace Features

- Researched Yad2, Madlan and OnMap feature patterns. Research summary:
  - `docs/marketplace_feature_research.txt`
- Enhanced `apps/web/src/components/marketplace/public-marketplace.tsx` with:
  - list/map/insights view switch
  - saved search localStorage
  - favorites localStorage
  - up to 3 compared properties
  - area/result insights
  - mini mortgage calculator
  - print action
  - feature rail inspired by marketplace patterns
- Important: these are feature inspirations only. Do not copy external listing data, images, text or exact UI from competitor sites.

## Latest Homepage First-Viewport Redesign

- `apps/web/src/components/marketing/hero.tsx` was redesigned so `http://localhost:3001/` visibly opens as a real estate marketplace first, not just a SaaS landing page.
- First viewport now includes:
  - marketplace headline
  - buy/rent/new/commercial tabs
  - search entry card
  - city chips
  - map-like visual panel with price pins
  - feature cards for search, insights, AI and mortgage/signing

## Latest Marketplace Demo Inventory

- Added property media fields:
  - `Property.coverImageUrl`
  - `Property.galleryUrls`
- Added migration:
  - `apps/api/prisma/migrations/20260523213500_property_media/migration.sql`
- Public search now returns property images for marketplace cards and the selected-property gallery.
- `apps/web/src/components/marketplace/public-marketplace.tsx` now renders image thumbnails, a selected-property gallery and image thumbnails in comparison.
- Added a repeatable demo inventory script:
  - `apps/api/scripts/seed-demo-properties.js`
  - It deletes only records whose notes start with `DEMO_SEED_50`, then creates 50 active demo properties across Israeli cities, split between sale and rent, with cover and gallery images.
  - Run from repo root after Prisma migration/generate:
    `cd apps/api && node scripts/seed-demo-properties.js`

## Latest Mortgage Calculator Rebuild

- Reworked the public mortgage calculator toward feature parity with advanced Israeli mortgage calculators.
- Main files:
  - `apps/web/src/lib/mortgage.ts`
  - `apps/web/src/components/tools/mortgage-calculator.tsx`
  - `apps/web/src/app/tools/mortgage-calculator/page.tsx`
- Features now include:
  - up to 4 parallel mortgage mixes
  - always-visible tabs for `תמהיל 1` through `תמהיל 4`
  - a dedicated `השוואת תמהילים` tab matching the requested calculator workflow
  - clone active mix into the next tab
  - multiple tracks per mix
  - horizontal blue track grid with columns for amount, track, repayment method, months, rate, CPI, advanced options, monthly payment and total repayment
  - tabs are attached directly to a blue calculator workbench; transaction controls and result totals live inside the workbench instead of a separate dashboard card
  - track term is now a select list in 12-month steps, displayed like `360 (30 שנים)` to match the requested calculator UI
  - default track term is 360 months / 30 years
  - transaction controls are bidirectional:
    - editing property price clamps equity and recalculates loan/LTV
    - editing equity recalculates loan/LTV
    - editing loan amount recalculates equity/LTV
    - editing LTV recalculates loan/equity
    - all mix track tables now rescale principal amounts immediately when the top loan/equity/LTV/price controls change, preserving each mix's current track ratios and keeping track totals aligned with the loan amount
  - expanded track catalog: prime, fixed linked/unlinked, variable linked/unlinked, eligibility, dollar/euro, makam
  - repayment methods: Shpitzer, equal principal, bullet/balloon
  - advanced per-track inputs: grace, future rate change, partial/full prepayment, reduce-payment/shorten-term mode
  - aggregate summary, per-track summary, comparison summary, annual comparison, monthly comparison
  - full monthly amortization table for the active mix
  - browser save/load, print, CSV export
- The full calculator can now be prefilled from URL query params:
  - `/tools/mortgage-calculator?price=2500000&down=625000`
  - supported params: `price`, `down`, `downPayment`, `equity`, `scenario`
- Sale property detail pages now render the full mortgage calculator below the property detail grid, prefilled with the property's price and 25% down payment. It is not the compact preview.
- Do not copy external calculator branding or text. Keep the implementation as RealtorAI-owned UI with similar functionality.

## Latest Product Polish Pass

- Public marketing navigation and footer anchor links now use root-relative anchors (`/#features`, `/#how`, `/#contact`, `/#faq`) so they work from marketplace/property detail pages.
- Cookie notice was reduced to a compact bottom-left card so it does not cover forms, calculators, or primary CTA areas as aggressively.
- `/marketplace` now has dedicated metadata and a real page-level `h1`.
- Marketplace demo rows hide city-specific office mismatch for `DEMO_SEED_50` listings by showing `משרד תיווך מאומת` in cards.
- Onboarding sample properties now include cover/gallery images, and the repeatable 50-property seed now includes amenity booleans.
- Homepage hero smart map now uses live public property data through `HeroLivePropertyMap` + `LiveMap` instead of fake hardcoded price dots.

## Production Risks To Fix Next

High priority:

1. Add Caddy or Nginx reverse proxy with HTTPS.
2. Stop running API/Web with manual `nohup`; use systemd, PM2, or Docker production compose.
3. Move WhatsApp webhook processing to a queue so webhook replies fast.
4. Add Zod validation around AI tool inputs.
5. Move web auth away from localStorage toward httpOnly cookies.
6. Add billing enforcement and usage limits, not only billing fields.
7. Add Postgres backups and restore test.
8. Add uptime/error monitoring.

Medium priority:

1. Add voice agent integration later with Vapi, Retell, Twilio or equivalent.
2. Strengthen RBAC with resource scopes per office/team/agent.
3. Add per-tenant LLM budgets and rate limits.
4. Add admin usage dashboards.
5. Add better onboarding flows for each real estate office.

## Safe Next Work Recommendation

Start with infrastructure hardening:

1. Add production process management.
2. Add HTTPS reverse proxy.
3. Add backup script.
4. Add monitoring.

Then continue product work:

1. Queue WhatsApp webhooks.
2. Add AI tool input validation.
3. Add usage/billing enforcement.
4. Add voice agent module only after the base system is stable.

## Commands To Run Before Handing Off

```bash
git status --short
pnpm api:build
pnpm --filter @realtorai/web build
pnpm api:test:e2e
```

If any command fails, fix the failure before making more changes.
