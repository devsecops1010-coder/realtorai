# אפיון: אזורים אישיים, איזורים, תוכניות, השעיה

**גרסה:** 0.1 (טיוטה — לאישור לפני יישום)
**תאריך:** 2026-05-23
**מצב:** spec בלבד — אין שינוי קוד עד אישור

---

## 1. מטרות

שלושה צרכים שעלו מהמשתמש:

1. **תכנון מחדש של "אזורים אישיים"** — דשבורד שונה לכל role, לא generic
2. **שדה `areas` יהיה בחירה** (לא טקסט חופשי) — וכך גם שדה `plan`
3. **השעיית חשבון/משרד** — היום אין אפשרות בכלל

---

## 2. המצב הנוכחי — ניתוח פערים

### 2.1 אזורים אישיים

קיים: `apps/web/src/lib/role-workspace.ts` עם 11 workspaces:
`platform`, `executive`, `regional`, `officeLeadership`, `teamLead`, `sales`,
`mortgage`, `marketing`, `operations`, `finance`, `viewer`.

לכל workspace יש:
- `label`, `headline`, `focus`, `scope`, `tone` (gradient)

**הפער:** `apps/web/src/app/(protected)/dashboard/page.tsx` הוא **דשבורד יחיד**
שמציג את אותם 9 קלפים (סה"כ לידים, חדשים היום, חמים, מוסמכים...) לכולם.
אין שום הבדל בין מה ש-`realtor` רואה למה ש-`accountant` או
`mortgage_advisor` רואים. ה-workspace metadata נמצא בקוד אבל לא בשימוש
ב-UI מעבר ל-sidebar header.

### 2.2 שדה `areas`

קיים: `Office.areas String[] @default([])` — מערך של מחרוזות חופשי.

**הפער:**
- אין רשימה קנונית של אזורים
- שני משרדים יכולים להזין "מרכז ת״א" / "מרכז תל אביב" / "ת״א מרכז" — נראה
  אותו דבר אבל לא ניתן לקבץ / לחפש / לסנן
- ב-UI הקיים זה Input חופשי + comma-split (ראה
  `apps/web/src/app/(protected)/admin/page.tsx` בטופס הקמת משרד)
- כשממירים ל-enum / lookup table צריך להישאר תואם אחורה לכל המשרדים
  הקיימים

### 2.3 שדה `plan`

קיים: `Tenant.plan String @default("starter")` — מחרוזת חופשית.
שדות נלווים: `monthlyPlanIls`, `setupFeeIls`, `includedMessages`,
`includedCallMinutes`, `monthlyLlmBudgetUsd`, `extraMessageIls`,
`extraCallMinuteIls`, `successFeePct`.

**הפער:**
- כל אדמין יכול לכתוב "Pro" / "PRO" / "professional" — חוסר עקביות
- חוסר טבלת תוכניות שמגדירה ברירות-מחדל (תוכנית Pro כוללת
  10,000 הודעות, 500 דקות, וכו')
- אין UI בחירה — רק טקסט פתוח
- אין historical record של שינויי תוכנית

### 2.4 השעיית חשבון / משרד

קיים:
- `TenantStatus.suspended` באנום
- `OfficeStatus.inactive` באנום
- `Tenant.status` נשמר ב-DB

**הפער קריטי:**
- **אין `PATCH /admin/tenants/:id`** או דומה — לא ניתן לעדכן את ה-status
  דרך API. רק `POST /admin/tenants` (יצירה) ו-`GET` (קריאה)
- **אין enforcement.** ה-JwtAuthGuard לא בודק את `tenant.status`. משתמש
  של tenant מושעה ימשיך להתחבר ולבצע פעולות
- **אין UI** — אין כפתור "השעה" / "הפעל מחדש" בשום מקום
- **אין audit** של השעיה (גם אם היה endpoint)

---

## 3. ארכיטקטורה מוצעת

### 3.1 אזורים אישיים — Role-aware Dashboard

#### גישה
לא לשבור את `/dashboard` הקיים. במקום זה לבנות **דשבורד-רכיב** שמרכיב
את התוכן דינמית לפי `workspace.kind` של המשתמש.

#### מבנה רכיבים

```
apps/web/src/app/(protected)/dashboard/
├── page.tsx                  # entry — קורא ל-getWorkspaceForRole + מרכיב
├── widgets/                  # ספריית widgets קטנים, כל אחד עצמאי
│   ├── leads-overview.tsx    # 4 קלפים: סה"כ / חדשים / חמים / מוסמכים
│   ├── tasks-today.tsx       # משימות שלי להיום + דחוף
│   ├── pipeline-funnel.tsx   # פאנל convers ויזואלי לידים
│   ├── team-leaderboard.tsx  # מתווכים מובילים החודש (לראשי צוות+)
│   ├── network-rollup.tsx    # סיכום רב-משרדי (district/branch managers)
│   ├── platform-mrr.tsx      # MRR + active tenants (platform_admin)
│   ├── mortgage-pipeline.tsx # פרופילי משכנתא בטיפול
│   ├── marketing-kpis.tsx    # מקורות לידים / קמפיינים פעילים
│   ├── ops-handoffs.tsx      # שיחות בהעברה ושיחות פתוחות
│   └── finance-usage.tsx     # שימוש חודשי vs cap (LLM, WA, calls)
└── layouts/                  # mappings workspace → array of widgets
    └── index.ts              # 11 entries, אחד פר WorkspaceKind
```

#### Mapping workspace → widgets (טיוטה)

| Workspace | Widgets ברצף |
|---|---|
| platform | `platform-mrr` · `network-rollup` · `ops-handoffs` |
| executive | `network-rollup` · `pipeline-funnel` · `finance-usage` · `team-leaderboard` |
| regional | `network-rollup` · `team-leaderboard` · `tasks-today` |
| officeLeadership | `leads-overview` · `team-leaderboard` · `tasks-today` · `mortgage-pipeline` |
| teamLead | `team-leaderboard` · `leads-overview` · `tasks-today` |
| sales | `tasks-today` · `leads-overview` (filtered to me) · `pipeline-funnel` |
| mortgage | `mortgage-pipeline` · `tasks-today` (mortgage_followup) |
| marketing | `marketing-kpis` · `pipeline-funnel` · `leads-overview` |
| operations | `ops-handoffs` · `tasks-today` · `leads-overview` (no $$) |
| finance | `finance-usage` · `platform-mrr` (org-scope) |
| viewer | `leads-overview` (read) · `pipeline-funnel` |

#### עקרונות
1. **Widget = component עצמאי** — מקבל props, fetches נתונים בעצמו, מטפל
   ב-loading + empty state
2. **Re-use ברוחב המוצר** — ה-widgets הם רכיבים שגם דפים אחרים יכולים
   להציג (למשל `team-leaderboard` יכול להופיע ב-`/team`)
3. **No magic backend** — אין endpoint חדש "give me dashboard for role X".
   ה-widgets פונים ל-endpoints הקיימים (`/reports/today`, `/leads?...`,
   `/admin/revenue`). זה שומר על שכבת ה-API נקייה
4. **Permission-aware** — widget שמשתמש לא רשאי לראות פשוט לא נטען בכלל

#### Sample widget contract
```typescript
interface DashboardWidget {
  key: string;                    // unique id for layout
  Component: React.ComponentType; // self-contained, no props
  permission?: PermissionKey;     // optional: hide if user lacks it
  fullWidth?: boolean;            // span 2 cols on lg screens
}
```

---

### 3.2 שדה `areas` — מבחר במקום טקסט חופשי

#### החלטה: lookup table + many-to-many

לא enum (כי הרשימה תגדל ותהיה ניתנת לעריכה ע"י admin). לא JSON. **טבלה
קנונית** שמתחזקת platform_admin.

#### Schema

```prisma
model AreaCatalog {
  id        String   @id @default(uuid())
  // Slug יציב לזיהוי שלא משתנה בשינוי שם תצוגה
  slug      String   @unique          // "merkaz-tel-aviv", "natanya-mizrah"
  // שמות בעברית / אנגלית
  nameHe    String                    // "מרכז תל אביב"
  nameEn    String?                   // "Central Tel Aviv"
  // קיבוץ אזורים גדולים (צפון/מרכז/דרום/שרון/שפלה/...)
  region    String?                   // "מרכז"
  // יוצא משימוש בלי למחוק רשומות קיימות
  active    Boolean  @default(true)
  // לקיבוץ ב-UI
  sortOrder Int      @default(100)
  createdAt DateTime @default(now())

  offices   OfficeArea[]

  @@map("area_catalog")
}

model OfficeArea {
  officeId  String
  areaId    String
  office    Office      @relation(fields: [officeId], references: [id], onDelete: Cascade)
  area      AreaCatalog @relation(fields: [areaId], references: [id], onDelete: Cascade)
  createdAt DateTime    @default(now())

  @@id([officeId, areaId])
  @@index([areaId])
  @@map("office_areas")
}
```

#### מיגרציה אחורה
1. **שלב 1:** מוסיפים את הטבלאות החדשות. ה-`Office.areas String[]` נשאר
2. **שלב 2:** סקריפט seed שמייצר רשומות `AreaCatalog` מ-50 האזורים
   הנפוצים בישראל (תל אביב מרכז, רמת אביב, שפירא, נווה צדק, פלורנטין,
   צפון ת״א, הרצליה פיתוח, הרצליה ב', הרצליה ה', רעננה, כפר סבא,
   ירושלים מרכז, ירושלים מערב, ירושלים מזרח, חיפה הדר, חיפה כרמל,
   ראשון לציון, ראשל"צ מערב, רחובות, נתניה צפון, נתניה דרום, ...)
3. **שלב 3:** סקריפט migration שעובר על כל ה-offices ומנסה לזהות
   match בין ה-`areas[]` (טקסט) לבין ה-`slug`/`nameHe` בטבלה החדשה.
   matches → OfficeArea. mismatches → log + leave intact
4. **שלב 4:** כשה-UI החדש בייצור — נסיר את ה-`String[]` (deprecated migration)

#### Seeds לאזורים (לדיון)
50 ערים ראשיות × 2-4 רובעים כל אחת = ~120 רשומות. אפשר לייצר מ-json
קבוע ב-prisma/seed-areas.json.

#### API חדש
- `GET /catalog/areas` — public-ish (כל משתמש מחובר). מחזיר רשימת
  `{ id, slug, nameHe, nameEn, region }` של active=true
- `POST /admin/catalog/areas` (platform_admin) — יצירת אזור חדש
- `PATCH /admin/catalog/areas/:id` (platform_admin) — תיקון שם /
  השבתה (`active=false`)
- ה-Office endpoints (`PATCH /offices/current`, `POST /admin/offices/setup`)
  מקבלים עכשיו `areaIds: string[]` במקום `areas: string[]`

#### UI
- ב-`/office` ובמטופס "הקמת משרד חדש" ב-`/admin`: combobox מרובה-בחירה
  (מבוסס cmdk שכבר מותקן) עם search לפי `nameHe`
- ב-`/admin/catalog/areas` (חדש, platform_admin בלבד) — טבלה לעריכת
  הקטלוג

---

### 3.3 שדה `plan` — בחירה מטבלת `PlanCatalog`

#### Schema

```prisma
model PlanCatalog {
  id                    String   @id @default(uuid())
  slug                  String   @unique           // "starter", "pro", "enterprise"
  nameHe                String                     // "סטארטר"
  nameEn                String                     // "Starter"
  tagline               String?                    // "למשרד יחיד"
  // ברירות-מחדל שמיושמות בשעת הקצאה ל-tenant
  setupFeeIls           Int      @default(0)
  monthlyPlanIls        Int      @default(0)
  includedMessages      Int      @default(0)
  includedCallMinutes   Int      @default(0)
  monthlyLlmBudgetUsd   Decimal  @default(0) @db.Decimal(10, 4)
  extraMessageIls       Decimal  @default(0) @db.Decimal(8, 2)
  extraCallMinuteIls    Decimal  @default(0) @db.Decimal(8, 2)
  successFeePct         Decimal  @default(0) @db.Decimal(5, 2)
  // אילו פיצ'רים כלולים — JSON שמותח בעתיד
  features              Json     @default("{}")    // { sign: true, ai: "fast", branding: "white-label" }
  // הצגה ב-/pricing הציבורי
  publishedAt           DateTime?
  active                Boolean  @default(true)
  sortOrder             Int      @default(100)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // לא FK ישיר ב-Tenant — נשמרת חופש לכתוב slug שאינו בקטלוג
  // (לגרסת escape במקרה של תוכנית מותאמת אישית). ה-UI עדיין יציע
  // לבחור מהקטלוג.

  @@map("plan_catalog")
}
```

#### Tenant ↔ PlanCatalog
ה-`Tenant.plan` נשאר String (יציבות אחורית). מוסיפים שדה אופציונלי:

```prisma
// ב-Tenant:
planCatalogId String?   // ה-FK ברור; אם NULL = "custom" שאינו בקטלוג
```

(או: `Tenant.plan` הופך ל-FK ושומרים את ה-slug ב-`planSlug`. אכרוך עם
המשתמש לפי החלטה לפני יישום.)

#### Plan history (אופציונלי לעתיד)
טבלה `TenantPlanHistory` שמתעדת every plan change. **לא ב-MVP** —
התיעוד הראשון יסופק דרך AuditLog `tenant.plan.changed`.

#### Seeds — 4 תוכניות פתיחה
| slug | nameHe | חודשי ₪ | הקמה ₪ | הודעות | LLM $ |
|---|---|---|---|---|---|
| starter | סטארטר | 0 | 0 | 100 | 0 |
| growth | צמיחה | 990 | 1,500 | 1,000 | 10 |
| pro | מקצועי | 2,490 | 3,000 | 5,000 | 50 |
| enterprise | ארגוני | מותאם | מותאם | ללא הגבלה | 200 |

#### API
- `GET /catalog/plans` (auth required) — חזרת תוכניות פעילות
- `POST /admin/catalog/plans` (platform_admin) — יצירה
- `PATCH /admin/catalog/plans/:id` — עריכה / השבתה
- `PATCH /admin/tenants/:id/plan` — שיוך tenant ל-plan (= מיישם את
  ברירות-המחדל מהקטלוג + רושם audit)

#### UI
- בטופס "הקמת משרד חדש" ב-`/admin`: select מבוסס `/catalog/plans`
- בעמוד `/admin/tenants/[id]`: כפתור "שינוי תוכנית" → bottom-sheet/dialog
  עם רשימת תוכניות + כפתור "החל"
- עמוד `/admin/catalog/plans` חדש — CRUD לקטלוג

---

### 3.4 השעיית חשבון / משרד

#### עקרונות
1. **שני רבדים:** השעיה ברמת **tenant** (כל הארגון נחסם) או ברמת
   **office** (סניף בודד נחסם, שאר המשרדים בארגון עובדים)
2. **התנגות מיידית** — משתמש שנמצא online כשמשרדו מושעה — ה-bearer
   נשאר תקף עד 15 דקות (TTL של access token), אבל הבקשה הבאה תיחסם
   ע"י guard חדש
3. **רישום מלא** — מי השעה, מתי, סיבה, audit כפול

#### Schema

```prisma
// ב-Tenant — שדות נלווים ל-status הקיים:
suspendedAt         DateTime?
suspendedReason     String?     // free text — "no payment", "abuse", "owner request"
suspendedByUserId   String?     // FK ל-User (platform_admin שביצע)

// ב-Office — שדות נלווים ל-status הקיים:
inactivatedAt        DateTime?
inactivatedReason    String?
inactivatedByUserId  String?
```

(אפשר חלופית להסתפק ב-AuditLog ולא להוסיף שדות. ההמלצה שלי **כן להוסיף**
כדי שה-UI יציג מיד "הושעה ב-23/5 ע"י דנה — סיבה: אי-תשלום" בלי לרדוף
אחרי ה-audit.)

#### Enforcement

**שכבה חדשה ב-RolesGuard**, רצה אחרי JwtAuthGuard:

```typescript
@Injectable()
export class TenantStatusGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const role = ctx.switchToHttp().getRequest().user?.role;
    const tenantId = ctx.switchToHttp().getRequest().user?.tenantId;
    if (!tenantId) return true; // platform-only routes

    // platform_owner / platform_admin עוקפים ויכולים להציל מצב suspended
    if (role === 'platform_owner' || role === 'platform_admin') return true;

    const tenant = await this.prisma.unscoped().tenant.findUnique({
      where: { id: tenantId },
      select: { status: true, suspendedReason: true },
    });
    if (tenant?.status === 'suspended') {
      throw new HttpException(
        { code: 'tenant_suspended', message: 'החשבון מושעה', reason: tenant.suspendedReason },
        451, // Unavailable For Legal Reasons — semantically close
      );
    }
    return true;
  }
}
```

נוסיף guard באותו רעיון ל-Office (`OfficeStatusGuard`) — נופל רק על
endpoints שדורשים officeId.

#### Exempt list
endpoints שצריכים לעבוד גם בזמן suspended:
- `GET /auth/me` (לקבל מצב משתמש)
- `POST /auth/logout`
- `GET /billing/usage` (לראות כמה חייב)
- `POST /billing/pay-overdue` (לעתיד — תשלום חוב)

#### API חדש (admin)
- `PATCH /admin/tenants/:id/suspend` — body: `{ reason: string }`
- `PATCH /admin/tenants/:id/reactivate` — body: `{ note?: string }`
- `PATCH /admin/offices/:id/deactivate` — body: `{ reason: string }`
- `PATCH /admin/offices/:id/reactivate`

כל ארבעתם:
- מותרים רק ל-`platform_admin` / `platform_owner`
- כותבים `AuditLog` עם `action='tenant.suspended'` / וכו'
- מבטלים את כל ה-refresh tokens של משתמשי ה-tenant/office (forced logout)
- שולחים מייל לבעלים (`tenant.suspended` template)

#### UI
- **ב-`/admin/tenants/[id]`** (קיים):
  - Badge חדש "מושעה" באדום אם `status === 'suspended'`, עם הסיבה +
    תאריך + מי השעה
  - כפתורים:
    - אם active: "השעה חשבון" (אדום)
    - אם suspended: "הפעל מחדש" (ירוק)
  - בלחיצה: dialog עם textarea לסיבה (חובה) + checkbox "שלח מייל לבעלים"
- **ב-`/admin/offices/[id]`** (קיים): אותו דבר ברמת office

#### Edge cases להחלטה
- **suspended tenant יכול להתחבר?** המלצה: **כן** — login צריך לעבוד כדי
  שיוכלו לראות מסך "החשבון מושעה" עם הסיבה. כל endpoint אחר חוסם
- **מה עם signed signing tokens של חתימה?** המלצה: **לחסום**. אם המשרד
  הושעה, החותם לא יקבל את ה-PDF (יראה הודעה "המסמך נמצא בארגון מושעה
  — פנה לשולח")
- **AI / WhatsApp הפעילים** — מפסיקים מיד? המלצה: **כן**. ה-orchestrator
  בודק `tenant.status` לפני שליחה
- **מי כן יכול לראות את ה-tenant ב-/admin אחרי השעיה?** רק `platform_*`

---

## 4. סיכום שינויי DB

| טבלה | סוג שינוי | רטרו-תאימות |
|---|---|---|
| `AreaCatalog` | חדשה | — |
| `OfficeArea` | חדשה (junction) | — |
| `PlanCatalog` | חדשה | — |
| `Tenant.planCatalogId` | תוספת nullable FK | ✅ ה-Tenant.plan string נשאר |
| `Tenant.suspendedAt/Reason/ByUserId` | תוספת nullable | ✅ |
| `Office.inactivatedAt/Reason/ByUserId` | תוספת nullable | ✅ |
| `Office.areas: String[]` | deprecation בעתיד | ✅ שלב 1-3 נשאר; שלב 4 מסיר |

**מיגרציה אחת**: `add_catalogs_and_suspension`. כל השדות nullable / טבלאות
חדשות → אין break.

---

## 5. סיכום שינויי API

### חדשים
- `GET /catalog/areas`
- `GET /catalog/plans`
- `POST /admin/catalog/areas` · `PATCH /admin/catalog/areas/:id`
- `POST /admin/catalog/plans` · `PATCH /admin/catalog/plans/:id`
- `PATCH /admin/tenants/:id/plan`
- `PATCH /admin/tenants/:id/suspend` · `/reactivate`
- `PATCH /admin/offices/:id/deactivate` · `/reactivate`

### עודכנו
- `POST /admin/offices/setup` — מקבל `areaIds[]` ו-`planSlug` (תאימות
  אחורנית: עדיין מקבל `areas` ו-`plan` כ-string)
- `PATCH /offices/current` — מקבל `areaIds[]` במקום `areas`

### Guard חדש
- `TenantStatusGuard` — רץ אוטומטית על כל endpoint שמשתמש ב-`@CurrentUser`,
  אלא אם מסומן `@Public()` או ב-exempt list

---

## 6. סיכום שינויי UI

### דפים חדשים
- `/admin/catalog/areas` — CRUD לאזורים (platform_admin)
- `/admin/catalog/plans` — CRUD לתוכניות (platform_admin)

### דפים עם שדרוג
- `/dashboard` — מבוסס widget mapping per workspace (ספרינט נפרד)
- `/admin/page.tsx` — טופס "הקמת משרד חדש":
  - `areas` → multi-select מ-`/catalog/areas`
  - `plan` → select מ-`/catalog/plans`
- `/admin/tenants/[id]` — badge מצב + כפתורי השעה/הפעל
- `/admin/offices/[id]` — אותו דבר ברמת office
- `/office` — multi-select לאזורי המשרד

### Widgets חדשים (לדשבורד)
10 widgets לפי הטבלה בסעיף 3.1.

---

## 7. הערכת מאמץ

| חלק | מאמץ | תלות |
|---|---|---|
| AreaCatalog + OfficeArea + seed | 4 שעות | — |
| PlanCatalog + seed + endpoint שיוך לתוכנית | 5 שעות | — |
| השעיית tenant + office + guards + email | 6 שעות | — |
| Admin UI לקטלוגים + השעיה | 5 שעות | אחרי backend |
| Widget framework + 10 widgets | 12 שעות | אחרי AreaCatalog (לצורך filter) |
| Tests + smoke | 4 שעות | — |
| **סה"כ** | **~36 שעות (4-5 ימי עבודה)** | |

---

## 8. שאלות פתוחות (לאישור לפני התחלה)

1. **תוכניות ראשוניות** — האם 4 (starter/growth/pro/enterprise) זה הכיוון? או רוצה רשימה אחרת?
2. **אזורים ראשוניים** — להתחיל מ-50 (ערים גדולות) או 120 (ערים + רובעים)? אפשר גם להתחיל ב-rough ולתת ל-admin להוסיף בהדרגה
3. **השעיה — חיוב המשך** — כשמושעה האם החיוב עוצר אוטומטית? (היום אין חיוב אמיתי, אבל ה-status שיהיה ב-DB ישפיע בעתיד)
4. **Widget personalization** — האם רוצים לאפשר למשתמש סופי לבחור איזה widgets לראות, או mapping פר-role לבד?
5. **`Tenant.plan` חופשי** — להשאיר כ-string חופשי עם FK אופציונלי (גמיש), או להפוך ל-FK חובה (קפדני)?
6. **השעיית tenant חוסמת חתימה ציבורית?** — חותם שמקבל קישור לפני ההשעיה, האם רואה את ה-PDF אחרי?

---

## 9. הצעת סדר עבודה

**ספרינט A — תשתית קטלוגים (יומיים)**
1. Schema additions (AreaCatalog, PlanCatalog, suspend fields)
2. Seed scripts (אזורים + תוכניות)
3. `/catalog/areas`, `/catalog/plans` endpoints
4. Migration script: `Office.areas[]` → `OfficeArea[]`

**ספרינט B — השעיה (יום)**
1. `TenantStatusGuard` + `OfficeStatusGuard`
2. Admin endpoints + email templates
3. UI: badges + buttons + dialogs

**ספרינט C — Admin catalogs UI (יום)**
1. `/admin/catalog/areas`
2. `/admin/catalog/plans`
3. עדכון טופס הקמת משרד

**ספרינט D — Dashboard widgets (יומיים)**
1. Widget framework + layouts mapping
2. 10 widgets
3. החלפת `/dashboard` הקיים

**ספרינט E — Tests + commit (חצי יום)**
1. E2E ל-suspended enforcement
2. Smoke ידני של כל הזרימות
3. Commit + push

סה"כ ~4.5 ימים, ניתן לחתוך לסבבים נפרדים.

---

**ממתין לאישור / משוב על השאלות הפתוחות לפני שמתחילים יישום.**
