# realtorai

פלטפורמת SaaS מולטי-טננט עם סוכני AI למשרדי תיווך.
Multi-tenant SaaS platform with AI agents for real estate offices in Israel.

## מבנה

```
realtorai/
├── apps/
│   ├── api/          # NestJS 11 + Prisma 6 backend
│   └── web/          # Next.js 15 + Tailwind + shadcn/ui dashboard
├── packages/
│   └── shared/       # types/utilities משותפים (placeholder)
└── infra/            # docker-compose, env templates
```

## הרצה לוקאלית

דרישות: Node 22+, pnpm 11+, Docker 24+, Ubuntu/macOS.

```bash
# 1. תלויות
pnpm install

# 2. תשתית (Postgres + Redis)
cp infra/.env.example infra/.env       # ערוך סיסמאות
pnpm infra:up

# 3. API env
cp apps/api/.env.example apps/api/.env  # ערוך JWT_SECRET וסיסמאות
pnpm api:prisma migrate dev
pnpm api:dev                            # API על http://localhost:3000

# 4. Dashboard (טרמינל נפרד)
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter @realtorai/web dev        # Dashboard על http://localhost:3001
```

## בדיקות

```bash
pnpm api:test          # unit
pnpm api:test:e2e      # end-to-end (44 בדיקות, ~30 שניות)
```

## תכונות שמומשו

### Backend (NestJS + Prisma)

| תחום | תיאור |
|------|-------|
| Multi-tenant | AsyncLocalStorage + Prisma extension. cross-tenant access חוסם אוטומטית |
| Auth | JWT access (15m) + refresh (30d, מחורר ב-DB), bcrypt 12 rounds, throttle 5/min on login |
| RBAC | platform_admin, office_owner, office_manager, realtor, viewer |
| Audit | `@Audit('action')` decorator → audit_logs table |
| CRM | Leads, Properties, Conversations, Messages, Tasks |
| LLM Router | Groq + Anthropic + Gemini + Mock; intent-based routing (fast/long/quality) עם fallback |
| WhatsApp | Twilio + Meta Cloud + 360dialog + Mock — signature verification per provider |
| Tool Layer | 9 tools ה-AI יכול לקרוא (update_lead_*, create_property, handoff_to_human, וכו') |
| Agents | Lead Responder + Property Recruiter, prompts בעברית, JSON output, מיוצר אוטומטית לכל משרד |
| Scheduled tasks | @nestjs/schedule: cron כל 5 דקות לפולואפים, יומי 06:00 UTC לסיכומים |
| Notifications | hot_lead / handoff_required / followup_due / daily_summary |
| Reports | /reports/today (per-office counts), /reports/usage (monthly aggregates) |
| Exports | CSV עם UTF-8 BOM ל-Excel: /exports/leads.csv, tasks, conversations |
| Onboarding | POST /onboarding — יוצר tenant + office + owner + 2 agents + 2 configs ב-transaction אחד |
| Admin | /admin/usage, /admin/revenue, /admin/health — platform_admin only |
| Billing | שדות על Tenant: setupFee, monthlyPlan, includedMessages, extraMessage prices, וכו' |

### Dashboard (Next.js 15)

| דף | תיאור |
|------|-------|
| /login + /register | התחברות והרשמה לאוטו |
| /dashboard | 9 כרטיסיות KPI מ-/reports/today |
| /leads | רשימה + חיפוש + יצירה |
| /leads/[id] | פרטים, שינוי סטטוס/טמפרטורה, opt-out |
| /properties | רשימת נכסים |
| /properties/[id] | פרטי נכס + שינוי סטטוס |
| /properties/bulk-upload | העלאת CSV של בעלי דירות |
| /tasks | סינון פתוחות/שלי/הכל + סגירה |
| /conversations | רשימת שיחות |
| /conversations/[id] | טרנסקריפט + מענה ידני + handoff |
| /notifications | התראות + מסומן כנקרא |
| /office | פרטי המשרד |
| /admin | (platform_admin) MRR + tenants + usage |

עברית RTL מלאה + פונט Heebo.

## סטטוס פיתוח

| Sprint | תיאור | קומיט |
|--------|-------|--------|
| 1 | יסודות (auth, tenants, offices, users) | 4d643b9 |
| 2 | CRM (leads, conversations, messages, tasks) + Next.js dashboard | dc9fa55 |
| 3 | WhatsApp + LLM Router + Lead Responder Agent | 33057b0 |
| 4 | Follow-ups + reports + notifications | 4dd8d9a |
| 5 | Properties + Property Recruiter agent | da6acce |
| 6 | Onboarding + Admin + Billing + CSV exports | 3cf2a3b |

## מה צריך כדי לעלות ל-production

- מפתח API לפחות אחד מ-Groq/Anthropic/Gemini (אחרת LLM Router נופל ל-Mock)
- WhatsApp BSP (Twilio/Meta/360dialog) עם credentials + טלפון מאומת
- Sentry DSN (אופציונלי, ל-monitoring)
- HTTPS reverse proxy מול ה-API (Caddy/Nginx) + DNS
- גיבוי PostgreSQL יומי
- ערכי `.env` של production עם סודות חזקים (`openssl rand -hex 64` ל-JWT_SECRET)

## טכנולוגיות עיקריות

NestJS 11 · Prisma 6 · PostgreSQL 16 · Redis 7 · Next.js 15 · React 19 · Tailwind 3 · shadcn/ui · TypeScript 5 · pnpm 11 · Jest · Docker
