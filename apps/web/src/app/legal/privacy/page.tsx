import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';

export const metadata = {
  title: 'מדיניות פרטיות | Realtorai',
  description: 'מדיניות הפרטיות של Realtorai — מה אנחנו אוספים, איך משתמשים בו, ואיזה זכויות יש לכם.',
};

/**
 * Privacy policy page — Hebrew, aligned to GDPR + Israeli Privacy Protection
 * Act. Every section is concrete and actionable; if you're updating the
 * actual legal text for a launch, replace section text but keep the
 * structure so it stays diff-friendly.
 *
 * Mirror this in /legal/terms — same component pattern.
 */
export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">מדיניות פרטיות</h1>
        <p className="text-sm text-muted-foreground mb-8">עודכן לאחרונה: מאי 2026 · גרסה 1.1</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <Section title="1. מי אנחנו">
            <p>
              <strong>Realtorai</strong> ("השירות", "אנחנו") מפעיל פלטפורמת SaaS ל-CRM וסוכני AI
              עבור משרדי תיווך נדל"ן בישראל. מדיניות זו חלה על כל מי שמשתמש בשירות — בעלי
              משרדים, מתווכים, יועצי משכנתאות, וכל צד-ג' שמזין מידע דרך טפסי יצירת קשר.
            </p>
          </Section>

          <Section title="2. איזה מידע אנחנו אוספים">
            <h3 className="text-base font-semibold">2.1 מידע שאתם מזינים</h3>
            <ul>
              <li>פרטי משתמש: שם, אימייל, טלפון, תפקיד, מספר רישיון תיווך (אם רלוונטי).</li>
              <li>פרטי משרד: שם, כתובת, אזורי פעילות, פרטי יצירת קשר.</li>
              <li>פרטי לידים: שם, טלפון, אימייל, כתובת, ת"ז (אם נמסרה), העדפות נדל"ן, היסטוריית שיחה.</li>
              <li>פרטי בעלי דירות לגיוס: כתובת נכס, מאפיינים, מחיר מבוקש.</li>
              <li>מסמכים שאתם מעלים: כתבי הסמכה, חוזים, תעודות זהות.</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">2.2 מידע טכני שנאסף אוטומטית</h3>
            <ul>
              <li>כתובות IP, סוכן משתמש (User Agent), זמני התחברות.</li>
              <li>Cookies לזיהוי סשן (HttpOnly, Secure). ראו טבלת cookies בסעיף 7.</li>
              <li>לוגים של פעולות כתיבה (audit log) — חיוני לאבטחה ולחקירת אירועים.</li>
            </ul>
          </Section>

          <Section title="3. למה אנחנו צריכים את המידע">
            <ul>
              <li>
                <strong>אספקת השירות</strong>: מענה אוטומטי ב-WhatsApp, גיוס בעלי דירות, ניהול
                CRM, הפקת מסמכים (כתבי הסמכה), הפניית משכנתאות.
              </li>
              <li>
                <strong>תפעול בטוח</strong>: זיהוי משתמשים, מניעת ניצול, חקירת אירועי אבטחה.
              </li>
              <li>
                <strong>חיוב</strong>: מעקב אחרי שימוש (הודעות, דקות שיחה, טוקני LLM).
              </li>
            </ul>
          </Section>

          <Section title="4. הבסיס המשפטי לעיבוד (GDPR / חוק הגנת הפרטיות)">
            <ul>
              <li><strong>ביצוע חוזה</strong> — לגבי משתמשים רשומים, על בסיס תקנון השימוש.</li>
              <li><strong>הסכמה</strong> — לגבי לידים שמילאו טופס באתר משרד.</li>
              <li><strong>אינטרס לגיטימי</strong> — לאבטחה, מניעת תרמית, וניתוח שימוש.</li>
              <li><strong>חובה חוקית</strong> — לעמידה בחוק הגנת הפרטיות + הוראות רשם המאגרים.</li>
            </ul>
          </Section>

          <Section title="5. עם מי אנחנו חולקים מידע">
            <p>
              אנו <em>לא מוכרים</em> מידע אישי לאף גורם, לעולם. אנו חולקים מידע אך ורק עם:
            </p>
            <ul>
              <li>
                <strong>ספקי תשתית</strong>: Oracle Cloud (אחסון, אזור פראנקפורט EU), Anthropic /
                Google Gemini / Groq (LLM), Twilio / Meta / 360dialog (WhatsApp). כולם תחת חוזי
                DPA + הגדרות "zero data retention" ב-LLM (אין שימוש לאימון).
              </li>
              <li>
                <strong>יועצי משכנתאות שותפים</strong>: רק כאשר משתמש בחר להפנות ליד ליועץ
                ספציפי — ורק עם הפרטים שאישר.
              </li>
              <li>
                <strong>רשויות</strong>: רק בצו בית משפט תקף או בקשת רשות בעלת סמכות.
              </li>
            </ul>
          </Section>

          <Section title="6. כמה זמן נשמר מידע">
            <ul>
              <li>
                <strong>נתוני עבודה</strong> (לידים, שיחות, משימות, נכסים): כל עוד החשבון פעיל,
                ועד 90 ימים אחרי סגירה.
              </li>
              <li>
                <strong>Audit log</strong>: 365 ימים. רישומי פעולות קריטיות (חיוב, הפסקת שירות,
                שינויי תוכנית, חתימות) — 7 שנים בהתאם לדרישות רגולטוריות.
              </li>
              <li>
                <strong>גיבויים</strong>: עד 30 ימים. גיבויים מוצפנים במנוחה.
              </li>
            </ul>
          </Section>

          <Section title="7. Cookies">
            <table className="w-full text-sm border my-3">
              <thead className="bg-muted">
                <tr>
                  <th className="text-right p-2 border-l">Cookie</th>
                  <th className="text-right p-2 border-l">תכלית</th>
                  <th className="text-right p-2">חיים</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-2 border-l">rai_access</td><td className="p-2 border-l">JWT access token (HttpOnly)</td><td className="p-2">15 דקות</td></tr>
                <tr><td className="p-2 border-l">rai_refresh</td><td className="p-2 border-l">JWT refresh token (HttpOnly)</td><td className="p-2">30 ימים</td></tr>
                <tr><td className="p-2 border-l">rai_csrf</td><td className="p-2 border-l">CSRF double-submit</td><td className="p-2">סשן</td></tr>
                <tr><td className="p-2 border-l">rai_cookie_consent_v1</td><td className="p-2 border-l">זכירה שאישרתם cookies</td><td className="p-2">12 חודשים</td></tr>
              </tbody>
            </table>
            <p>
              איננו משתמשים ב-cookies של פרסום או טראקינג. אנליטיקה (אם תופעל) תעשה דרך כלי
              כמו Plausible — ללא cookies וללא מידע מזהה אישית.
            </p>
          </Section>

          <Section title="8. הזכויות שלכם">
            <ul>
              <li><strong>עיון</strong> — קבלת עותק של כל המידע שיש לנו עליכם.</li>
              <li><strong>תיקון</strong> — שינוי מידע שגוי.</li>
              <li><strong>מחיקה</strong> — בקשה למחיקה (עד 30 ימים, פרט למה שחייבים לשמור בדין).</li>
              <li><strong>הגבלה</strong> — הגבלת השימוש במידע.</li>
              <li><strong>ניוד</strong> — קבלת המידע בפורמט מובנה (CSV / JSON).</li>
              <li><strong>התנגדות</strong> — לעיבוד שמבוסס על אינטרס לגיטימי.</li>
            </ul>
            <p>
              לבקשות:{' '}
              <a href="mailto:privacy@realtorai.example" className="text-primary underline">
                privacy@realtorai.example
              </a>
              . נשיב תוך 14 ימי עבודה.
            </p>
          </Section>

          <Section title="9. אבטחה">
            <ul>
              <li>הצפנת תעבורה (TLS 1.3).</li>
              <li>הצפנת מסד הנתונים במנוחה.</li>
              <li>סיסמאות מאוחסנות כ-hash (bcrypt cost 12).</li>
              <li>2FA זמין לכל המשתמשים; חובה למשתמשי platform_admin/owner.</li>
              <li>בידוד tenant ברמת ה-ORM — לא ניתן שמשרד אחד יראה מידע של אחר.</li>
              <li>גיבויים יומיים, RTO 4 שעות / RPO 24 שעות.</li>
            </ul>
          </Section>

          <Section title="10. שינויים במדיניות">
            <p>
              שינויים מהותיים יוצגו באתר 30 ימים מראש ויישלחו במייל לכל בעל חשבון. שינויים
              מינוריים (תיקוני ניסוח, תוספת ספק כפוף ל-DPA) — יתעדכנו ללא הודעה מוקדמת.
              גרסאות קודמות נשמרות באתר.
            </p>
          </Section>

          <Section title="11. יצירת קשר">
            <p>
              לשאלות פרטיות:{' '}
              <a href="mailto:privacy@realtorai.example" className="text-primary underline">
                privacy@realtorai.example
              </a>
              <br />
              ל-DPO:{' '}
              <a href="mailto:dpo@realtorai.example" className="text-primary underline">
                dpo@realtorai.example
              </a>
              <br />
              לשאלות אחרות:{' '}
              <a href="mailto:hello@realtorai.example" className="text-primary underline">
                hello@realtorai.example
              </a>
            </p>
            <p>
              <Link href="/legal/terms" className="text-primary underline">תקנון השימוש</Link>
              {' · '}
              <Link href="/" className="text-primary underline">חזרה לדף הבית</Link>
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
