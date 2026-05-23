import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';

export const metadata = {
  title: 'תקנון שימוש | Realtorai',
  description: 'התקנון של Realtorai — הזכויות והחובות שלכם כמשתמשי הפלטפורמה.',
};

/**
 * Terms of Service — Hebrew, Israeli jurisdiction. Mirror structure of the
 * /legal/privacy page for consistency.
 */
export default function TermsPage() {
  return (
    <>
      <MarketingNav />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">תקנון שימוש</h1>
        <p className="text-sm text-muted-foreground mb-8">עודכן לאחרונה: מאי 2026 · גרסה 1.1</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <Section title="1. הסכם השירות">
            <p>
              תקנון זה מהווה הסכם משפטי מחייב בינך לבין מפעילת השירות (להלן: "החברה" /
              "אנחנו"). בעת רישום לפלטפורמת <strong>Realtorai</strong> ("השירות") את/ה מאשר/ת
              שקראת ואת/ה מסכים/ה לכל סעיפי התקנון. אם אינך מסכים/ה — אנא אל תירשם/י.
            </p>
            <p>
              שירותים ייעודיים (אינטגרציה עם ספקים חיצוניים, פלאן Enterprise) עשויים להיות
              כפופים להסכמים נוספים שייחתמו בכתב.
            </p>
          </Section>

          <Section title="2. הרשמה וחשבון">
            <ul>
              <li>הרשמה לשירות פתוחה אך ורק למשרדי תיווך רשומים בישראל ובעלי רישיון תיווך תקף.</li>
              <li>פרטי הרישום חייבים להיות נכונים ומעודכנים. מידע כוזב — ביטול מיידי של החשבון.</li>
              <li>החשבון אישי — אסור לשתף פרטי גישה. כל פעולה שמתבצעת מהחשבון רואה אותך אחראי/ת.</li>
              <li>מומלץ להפעיל אימות דו-שלבי (2FA). חובה לתפקידי platform_admin / platform_owner.</li>
            </ul>
          </Section>

          <Section title="3. תוכניות, תשלום וביטולים">
            <ul>
              <li>
                <strong>תקופת ניסיון</strong>: 14 ימים מהרישום (אלא אם נקבע אחרת). בסיומה החשבון
                יושעה אוטומטית אם לא נבחרה תוכנית בתשלום.
              </li>
              <li>
                <strong>תשלום חודשי</strong>: התוכניות מתחדשות אוטומטית בכל חודש קלנדרי. הסכום
                כולל מע"מ אלא אם נכתב אחרת.
              </li>
              <li>
                <strong>חיוב נוסף</strong>: שימוש מעבר למכסת התוכנית (הודעות WhatsApp, דקות
                שיחה, טוקני LLM) מחויב לפי תעריף שנמצא בדף התמחור. תקבל התראה ב-80% וב-100%
                מהמכסה החודשית.
              </li>
              <li>
                <strong>ביטול</strong>: ניתן לבטל בכל עת דרך החשבון או בכתב למייל
                billing@realtorai.example. הביטול נכנס לתוקף בסוף תקופת החיוב הנוכחית; לא
                ניתן החזר חלקי.
              </li>
              <li>
                <strong>דמי הקמה</strong>: אינם ניתנים להחזר אחרי תחילת ההקמה.
              </li>
              <li>
                <strong>חוסר תשלום</strong>: לאחר 14 ימי איחור — החשבון יושעה. לאחר 60 ימים —
                הנתונים יימחקו ולא יהיו זמינים לאחזור.
              </li>
            </ul>
          </Section>

          <Section title="4. שימוש מותר ואסור">
            <p>אסור להשתמש בשירות לפעולות הבאות:</p>
            <ul>
              <li>שליחת ספאם או הודעות לאנשים שלא נתנו הסכמה.</li>
              <li>התחזות לאדם או גוף אחר.</li>
              <li>הזנת מידע כוזב או מטעה ללידים.</li>
              <li>חריגה מההיתר הרגולטורי שלך כמתווך/ת רשוי/ה.</li>
              <li>ניסיון לעקוף הגבלות אבטחה (rate limiting, tenant isolation וכו').</li>
              <li>שימוש לרעה בכלי הסוכן (לדוגמה: מענה לתלונות בצורה שמטעה את הצרכן).</li>
              <li>הפרה של חוק הגנת הצרכן, חוק תיווך מקרקעין, חוק התקשורת, או כל דין אחר.</li>
            </ul>
            <p>הפרה — הפסקת שירות מיידית, ללא החזר, ועדכון רשויות אכיפה אם נדרש.</p>
          </Section>

          <Section title="5. תוכן וזכויות">
            <ul>
              <li>
                כל המידע שאתם מזינים (לידים, שיחות, נכסים) נשאר בבעלותכם. אנחנו מעבדים אותו
                בלעדית לטובת אספקת השירות לכם.
              </li>
              <li>
                התוכנה, ה-AI prompts, ועיצוב הפלטפורמה הם של החברה. אסור להעתיק, להנדס לאחור,
                או למכור מחדש.
              </li>
              <li>
                ייצוא נתונים: כל לקוח רשאי לבקש העתק מלא של הנתונים שלו ב-CSV / JSON תוך 14
                ימי עבודה.
              </li>
            </ul>
          </Section>

          <Section title="6. שירותי AI — הסתייגות מאחריות">
            <p>
              סוכני ה-AI הם <strong>כלי עזר</strong>. הם עלולים לטעות, לשגות, או לפעול באופן
              לא צפוי. עליך/עליכם:
            </p>
            <ul>
              <li>לבדוק את הפלט לפני שימוש מסחרי (לדוגמה: שליחת חוזה).</li>
              <li>לא להסתמך על תשובות הסוכן בנושאי משכנתאות, מס, או משפט — תמיד להפנות לאיש מקצוע.</li>
              <li>לפקח על השיחות שהסוכן מנהל עם לידים — יש כלי "העברה אנושית" לכל שיחה.</li>
            </ul>
            <p>
              איננו אחראים לתוצאות עסקיות, לאובדן עסקאות, או לנזק שנוצר משימוש בסוכן ה-AI מעבר
              לסכום שתשלמתם בחודש האחרון.
            </p>
          </Section>

          <Section title="7. זמינות (SLA)">
            <ul>
              <li>אנו שואפים ל-99% זמינות חודשית (לא כולל תחזוקה מתוכננת מראש).</li>
              <li>זמן תיקון לתקלות קריטיות: 4 שעות (RTO). אובדן מקסימלי של נתונים: 24 שעות (RPO).</li>
              <li>סטטוס בזמן אמת: <Link href="/status" className="text-primary underline">/status</Link>.</li>
            </ul>
          </Section>

          <Section title="8. הגבלת אחריות">
            <p>
              השירות ניתן "כפי שהוא" (AS-IS). איננו מבטיחים תוצאות מסחריות ספציפיות (מספר
              עסקאות, שיעור סגירה, וכו'). אחריותנו המקסימלית מוגבלת לסך התשלום ששילמתם בשלושת
              החודשים שקדמו לאירוע.
            </p>
          </Section>

          <Section title="9. שינויים בתקנון">
            <p>
              אנו רשאים לעדכן את התקנון. שינויים מהותיים יישלחו במייל 30 ימים מראש. המשך שימוש
              לאחר מועד הכניסה לתוקף — מהווה הסכמה. גרסאות קודמות זמינות באתר.
            </p>
          </Section>

          <Section title="10. סמכות שיפוט">
            <p>
              דין מדינת ישראל יחול על הסכם זה. סמכות השיפוט הבלעדית — בבתי המשפט של מחוז תל
              אביב, ישראל.
            </p>
          </Section>

          <Section title="11. יצירת קשר">
            <p>
              לכל שאלה משפטית או חוזית:{' '}
              <a href="mailto:legal@realtorai.example" className="text-primary underline">
                legal@realtorai.example
              </a>
              <br />
              לחיוב: <a href="mailto:billing@realtorai.example" className="text-primary underline">billing@realtorai.example</a>
            </p>
            <p>
              <Link href="/legal/privacy" className="text-primary underline">מדיניות פרטיות</Link>
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
