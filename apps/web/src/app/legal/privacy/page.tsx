import { MarketingNav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';

export const metadata = { title: 'מדיניות פרטיות | Realtorai' };

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-slate">
        <h1 className="text-3xl font-bold mb-6">מדיניות פרטיות</h1>
        <p className="text-sm text-muted-foreground mb-8">עודכן לאחרונה: מאי 2026</p>

        <h2 className="text-xl font-semibold mt-6 mb-3">1. איזה מידע אנחנו אוספים</h2>
        <p>פרטי המשרד (שם, עיר, טלפון), פרטי משתמשים (שם, אימייל), ולידים (שמות, טלפונים, אימיילים, היסטוריית שיחות).</p>

        <h2 className="text-xl font-semibold mt-6 mb-3">2. למה אנחנו צריכים את זה</h2>
        <p>כדי לספק את השירות: מענה אוטומטי ללידים, גיוס בעלי דירות, ניהול CRM.</p>

        <h2 className="text-xl font-semibold mt-6 mb-3">3. עם מי אנחנו חולקים מידע</h2>
        <p>רק עם ספקי שירות שמספקים תשתית (LLM providers, WhatsApp providers, אחסון). כל הספקים תחת חוזי DPA.</p>

        <h2 className="text-xl font-semibold mt-6 mb-3">4. הזכויות שלך</h2>
        <p>זכות עיון, תיקון, מחיקה — תוך 24 שעות מבקשה. שלח/י בקשה ל-privacy@realtorai.example.</p>

        <h2 className="text-xl font-semibold mt-6 mb-3">5. אבטחה</h2>
        <p>הצפנה במנוחה ובתעבורה. בקרת גישה לפי tenant. audit log על כל פעולה.</p>

        <p className="mt-8 text-muted-foreground italic">
          זוהי מדיניות פרטיות בסיסית. עורך/ת הדין שלכם צריך/ה להחליף את הנוסח לפני שעולים לאוויר באופן רשמי.
        </p>
      </main>
      <Footer />
    </>
  );
}
