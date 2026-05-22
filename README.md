# realtorai

פלטפורמת SaaS מולטי-טננט עם סוכני AI למשרדי תיווך.
Multi-tenant SaaS platform with AI agents for real estate offices.

## מבנה

```
realtorai/
├── apps/
│   ├── api/          # NestJS backend (Sprint 1)
│   └── web/          # Next.js dashboard (Sprint 2)
├── packages/
│   └── shared/       # types/utilities משותפים
└── infra/            # docker-compose, env templates
```

## הרצה לוקאלית

דרישות: Node 22+, pnpm 11+, Docker 24+.

```bash
# 1. תלויות
pnpm install

# 2. תשתית (Postgres + Redis)
cp infra/.env.example infra/.env  # ערוך סיסמאות
pnpm infra:up

# 3. API env
cp apps/api/.env.example apps/api/.env  # ערוך JWT_SECRET וסיסמאות
pnpm api:prisma migrate dev
pnpm api:dev
```

ה-API ירוץ על `http://localhost:3000`.

## בדיקות

```bash
pnpm api:test          # unit
pnpm api:test:e2e      # end-to-end (דורש Postgres + Redis למעלה)
```

## סטטוס

| Sprint | תיאור | סטטוס |
|--------|-------|-------|
| 1 | יסודות (auth, tenants, offices, users, audit) | בעבודה |
| 2 | CRM (leads, conversations, tasks, dashboard) | טרם התחיל |
| 3 | WhatsApp + lead responder agent | טרם התחיל |
| 4 | פולו-אפ ודוחות | טרם התחיל |
| 5 | סוכן גיוס דירות | טרם התחיל |
| 6 | onboarding, billing, monitoring | טרם התחיל |
