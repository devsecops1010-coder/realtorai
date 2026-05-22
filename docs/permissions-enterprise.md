# מפרט הרשאות Enterprise (תיעוד עתידי)

> סטטוס: **מתועד, לא ממומש**. ממומש כשהמוצר יגייס לקוח רשת ראשון.
>
> המודל הנוכחי (MVP, ספרינטים 1-6) משתמש ב-5 roles ברמה אחת: `platform_admin`, `office_owner`, `office_manager`, `realtor`, `viewer`. מספיק למשרד עצמאי.
>
> המפרט הזה מתאר את ההרחבה הנדרשת ל-Enterprise — כשמשרת רשתות תיווך עם סניפים מרובים.

---

## היררכיית התפקידים

```
Platform Owner
    └─ Platform Admin
            └─ Network Admin           (רשת כמו רימקס/אנגלו-סכסון)
                    └─ Branch Manager  (סניף ברשת)
                            └─ Office Owner / Manager
                                    └─ Team Lead   (ראש צוות)
                                            └─ Realtor / Viewer
                                                    └─ AI Agent (actor system)
```

---

## 9 התפקידים

### 1. Platform Owner — בעל הפלטפורמה
**תפקיד:** השליטה המלאה על המערכת.

**הרשאות:**
- כל המשרדים והרשתות
- ניהול חבילות ותמחור
- שימוש ועלויות
- ניהול ספקי API
- ניהול חיובים
- לוגים ותקלות
- פתיחה/חסימה/מחיקת משרד
- ניהול הגדרות מערכת

### 2. Platform Admin — מנהל מערכת
**תפקיד:** מנהל מטעם בעל הפלטפורמה.

**הרשאות:**
- ניהול משרדים
- תמיכה בלקוחות
- צפייה בלוגים
- טיפול בתקלות
- הגדרת סוכנים
- צפייה בשימוש

**הגבלות:**
- לא רואה סודות קריטיים
- לא משנה פרטי חיוב רגישים בלי הרשאה

### 3. Network Admin — מנהל רשת
**תפקיד:** מנהל רשת נדל"ן גדולה (למשל רימקס ישראל).

**הרשאות:**
- כל הסניפים של הרשת
- דוחות הנהלה
- השוואת ביצועים בין סניפים
- ניהול תבניות תסריטים לרשת
- מיתוג ושפה אחידים
- יצירת סניפים
- ניהול מנהלי סניפים

**הגבלות:**
- לא רואה רשתות אחרות
- לא רואה לקוחות מחוץ לרשת שלו

### 4. Branch Manager — מנהל סניף
**תפקיד:** מנהל סניף בתוך רשת.

**הרשאות:**
- כל הלידים של הסניף
- שיחות ותמלולים של הסניף
- ביצועים לפי מתווך
- חלוקת לידים
- ניהול משתמשים בסניף
- תסריטים מקומיים
- דוחות סניף

**הגבלות:**
- לא רואה סניפים אחרים
- לא משנה הגדרות רשת בלי הרשאה

### 5. Office Owner / Office Manager — בעל/מנהל משרד
**תפקיד:** מנהל משרד עצמאי או משרד בתוך רשת.

**הרשאות:**
- כל הלידים של המשרד
- כל הנכסים
- שיחות ותמלולים
- ניהול סוכני AI
- ניהול משתמשים
- שינוי תסריטים
- דוחות
- שימוש ועלויות
- שעות פעילות
- הגדרת קליטת לידים חמים

### 6. Team Lead — ראש צוות
**תפקיד:** מנהל צוות מתווכים בתוך משרד.

**הרשאות:**
- לידים של הצוות
- שיחות הצוות
- שיוך לידים למתווכים
- משימות צוות
- דוחות צוות
- עדכון סטטוסים

**הגבלות:**
- לא רואה עלויות מערכת
- לא מנהל תסריטי AI כלליים
- לא מנהל משתמשים מחוץ לצוות

### 7. Realtor / Agent — מתווך
**תפקיד:** מטפל בלידים.

**הרשאות:**
- לידים שהוקצו לו
- עדכון סטטוס ליד
- סיכומי שיחה
- התראות על לידים חמים
- הוספת הערות
- יצירת פולואפ
- סימון ליד כטופל

**הגבלות:**
- לא רואה לידים שלא הוקצו לו (ברירת מחדל)
- לא משנה תסריטי AI
- לא רואה עלויות
- לא מוחק לידים
- לא מנהל משתמשים

### 8. Viewer — צפייה בלבד
**תפקיד:** משתמש שצריך לראות מידע בלי לערוך.

**הרשאות:**
- דוחות
- לידים לפי הרשאה
- סטטוסים

**הגבלות:** לא עורך, לא שולח, לא משנה הגדרות, לא מוחק.

### 9. AI Agent — סוכן AI כמשתמש מערכת
**תפקיד:** מבצע פעולות מוגבלות בשם המשרד.

**הרשאות אפשריות:**
- קריאת ליד
- שליחת WhatsApp
- שיחה דרך ספק טלפוניה
- עדכון סטטוס ליד
- יצירת משימה למתווך
- יצירת פולואפ
- סיכום שיחה
- סימון opt-out

**הגבלות (guardrails קריטיים):**
- לא מוחק לידים
- לא משנה מחירים
- לא משנה הגדרות משרד
- לא שולח התחייבות משפטית
- לא מפעיל קמפיין בתשלום
- לא משנה תסריטים בלי אישור

---

## עיקרון טכני

```
Role  = מה מותר למשתמש לעשות
Scope = איפה מותר לו לעשות את זה
```

### דוגמאות

- **Branch Manager** רואה לידים — אבל רק בסניף שלו (`branchId`).
- **Office Manager** רואה את כל לידי המשרד — אבל רק במשרד שלו (`officeId`).
- **Realtor** רואה רק לידים שהוקצו לו (`assignedUserId = self`).

### שדות הרשאה מומלצים על User

- `tenantId` — כבר קיים
- `networkId` — חדש (nullable; משרד עצמאי לא שייך לרשת)
- `branchId` — חדש (nullable)
- `officeId` — כבר קיים
- `teamId` — חדש (nullable)
- `role` — כבר קיים, להרחיב את ה-enum
- `permissions` — אופציונלי; JSON עם override-ים נקודתיים

---

## חוקים בסיסיים

1. אין פעולה בלי `tenantId`.
2. אין גישה לדאטה של משרד אחר.
3. כל פעולה של AI נשמרת ב-audit log.
4. כל מחיקה דורשת הרשאה גבוהה (לפחות Office Owner).
5. כל פעולה רגישה דורשת אישור אנושי (קמפיין בתשלום, מחיקת לקוח).
6. כל opt-out חייב להישמר ולחסום פנייה עתידית.
7. AI Agent מקבל רק את הכלים שהוא צריך — לא יותר.
8. משתמש רואה רק את המידע ששייך ל-scope שלו.

---

## מה צריך כדי לממש את זה (כשמגיע הזמן)

### Schema (Prisma)

```prisma
enum UserRole {
  platform_owner       // חדש
  platform_admin
  network_admin        // חדש
  branch_manager       // חדש
  office_owner
  office_manager
  team_lead            // חדש
  realtor
  viewer
}

model Network {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name      String
  branding  Json?    // צבעים, לוגו, פונט
  templates Json?    // תסריטי AI ברמת רשת
  createdAt DateTime @default(now())
  branches  Branch[]
}

model Branch {
  id        String   @id @default(uuid())
  tenantId  String
  networkId String
  network   Network  @relation(fields: [networkId], references: [id], onDelete: Cascade)
  name      String
  city      String?
  managerId String?  // FK ל-User
  createdAt DateTime @default(now())
  offices   Office[]
}

model Team {
  id       String  @id @default(uuid())
  tenantId String
  officeId String
  office   Office  @relation(fields: [officeId], references: [id], onDelete: Cascade)
  name     String
  leadId   String? // FK ל-User
  users    User[]
}

// Office מקבל branchId אופציונלי:
model Office {
  // ... existing ...
  branchId  String?
  branch    Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)
  teams     Team[]
}

// User מקבל networkId, branchId, teamId אופציונליים:
model User {
  // ... existing ...
  networkId String?
  branchId  String?
  teamId    String?
}
```

### Authorization

הNarrative של ה-RolesGuard צריך להתרחב מ-"בודק role" ל-"בודק role + scope chain":

```typescript
// helper:
function canAccess(actor: User, resource: { tenantId, networkId?, branchId?, officeId?, teamId?, assignedUserId? }) {
  if (actor.tenantId !== resource.tenantId) return false;

  switch (actor.role) {
    case 'platform_owner':
    case 'platform_admin':
      return true; // cross-tenant access
    case 'network_admin':
      return actor.networkId === resource.networkId;
    case 'branch_manager':
      return actor.branchId === resource.branchId;
    case 'office_owner':
    case 'office_manager':
      return actor.officeId === resource.officeId;
    case 'team_lead':
      return actor.teamId === resource.teamId;
    case 'realtor':
      return resource.assignedUserId === actor.id;
    case 'viewer':
      return actor.officeId === resource.officeId; // read-only
    default:
      return false;
  }
}
```

ה-Prisma extension הקיים בודק כרגע רק `tenantId`. נצטרך להרחיב אותו לבדוק את כל ה-scope chain על כל מודל רלוונטי.

### CRUD חדשים

- `POST /networks`, `GET /networks/:id`, `PATCH /networks/:id` (platform_owner, platform_admin)
- `POST /branches`, `GET /branches/:id`, `PATCH /branches/:id` (network_admin+)
- `POST /teams`, `GET /teams/:id`, `PATCH /teams/:id` (office_owner+)
- `PATCH /users/:id` — חייב לכלול גם הקצאת team/branch/network כשמתאים

### UI נדרש

- `/networks` — Platform Owner / Platform Admin
- `/networks/:id` — Network Admin (דוחות חוצי-סניפים)
- `/branches` — Network Admin
- `/branches/:id` — Branch Manager
- `/teams` — בתוך עמוד המשרד, ניהול צוותים
- `/scripts` — Network Admin (תסריטי רשת) ו-Office Owner (תסריטי משרד)

### מעבר ל-data קיים

משרדים קיימים נשארים עם `networkId = NULL` — משרד עצמאי. כשלקוח רשת נכנס:
1. `POST /networks` יוצר Network עם המשרדים הקיימים שלו
2. עדכון `Office.branchId` למיפוי לסניפים
3. עדכון `User.networkId/branchId/teamId` לפי השיוך

---

## למה עדיין לא ממומש

ספרינטים 1-6 פותחו עבור משרד תיווך עצמאי. רוב משרדי התיווך בישראל עצמאיים — אין רשת ענקית. הרחבת מודל ההרשאות לפני שיש לקוח רשת חתום היא over-engineering: מוסיפה מורכבות לכל endpoint, מקשה על onboarding, ומאריכה את זמני הפיתוח לפיצ'רים שלקוחות אמיתיים מבקשים.

כשלקוח רשת יחתום — נחזור למסמך הזה ונפעיל. הוא מספיק מפורט כדי להתחיל יישום מיידית.
