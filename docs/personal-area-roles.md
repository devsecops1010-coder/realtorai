# Personal Area Roles

This document explains how the protected UI is organized by user role.

## Source Of Truth

Role labels, role groups, assignable roles and workspace copy live in:

```text
apps/web/src/lib/role-workspace.ts
```

Do not duplicate role labels in pages. Import from `role-workspace.ts`.

## Main UI Surfaces

```text
apps/web/src/components/layout/sidebar.tsx
apps/web/src/app/(protected)/dashboard/page.tsx
apps/web/src/app/(protected)/team/page.tsx
apps/web/src/app/(protected)/office/page.tsx
apps/web/src/app/(protected)/team/permissions/page.tsx
```

## Role Experience

| Role group | Main experience |
|---|---|
| platform_owner / platform_admin | Platform control, tenants, offices, usage, health |
| ceo / deputy_ceo | Executive overview, performance and team structure |
| district_manager / branch_manager | Branch and regional monitoring |
| office_owner / office_manager | Office performance, team load, hot leads, property recruitment |
| team_lead | Team priorities, open handoffs, daily tasks |
| realtor | Hot leads, follow-ups, calls and meetings |
| mortgage_advisor | Mortgage profiles, referrals and qualified leads |
| marketing_manager | New leads, publishable properties and campaign conversations |
| secretary | Operational queue, handoffs, new leads and tasks |
| accountant | Reports, usage, office data and permissions visibility |
| viewer | Read-only tracking |

## Navigation Rules

The sidebar hides irrelevant pages based on role. This is only UX filtering.

Server-side enforcement must still happen in API guards.

## Next Backend Step

Mirror the same role groups in the API:

```text
apps/api/src/common/guards/roles.guard.ts
apps/api/src/common/decorators/roles.decorator.ts
```

Then enforce role access per route:

- Admin routes: platform roles only
- Team management: owner/manager and higher only
- Lead write actions: sales/operations/manager roles
- Mortgage routes: mortgage/manager roles
- Billing and usage: finance/owner/platform roles

## Development Rule

When adding a new role or changing a label:

1. Update `apps/web/src/lib/role-workspace.ts`.
2. Update `apps/web/src/app/(protected)/team/permissions/page.tsx` if the permission matrix changes.
3. Run `pnpm --filter @realtorai/web build`.
4. Run `scripts/realtorai-smoke.sh` after deployment.

