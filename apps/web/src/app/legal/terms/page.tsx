import { MarketingNav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';

export const metadata = { title: 'תקנון | Realtorai' };

export default function TermsPage() {
  return (
    <>
      <MarketingNav />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">תקנון שימוש</h1>
        <p className="text-sm text-muted-foreground mb-8">עודכן לאחרונה: מאי 2026</p>

        <h2 className="text-xl font-semibold mt-6 mb-3">1. הסכם השירות</h2>
        <p>בשימוש בפלטפורמת Realtorai את/ה מסכים/ה לתקנון זה.</p>

        <h2 className="text-xl font-semibold mt-6 mb-3">2. תשלום</h2>
        <p>תוכניות חודשיות, ביטול בכל עת. דמי הקמה אינם ניתנים להחזר לאחר תחילת ההקמה.</p>

        <h2 className="text-xl font-semibold mt-6 mb-3">3. אחריות</h2>
        <p>הסוכן הוא כלי עזר. ההחלטות העסקיות הסופיות באחריות המשרד. אנו לא מבטיחים תוצאות מסחריות ספציפיות.</p>

        <h2 className="text-xl font-semibold mt-6 mb-3">4. שימוש לרעה</h2>
        <p>ספאם, התחזות, או פעילות שמפרה דין — תגרור הפסקת שירות מיידית ללא החזר.</p>

        <p className="mt-8 text-muted-foreground italic">
          זוהי טיוטה כללית. עורך/ת הדין שלכם צריך/ה להחליף את הנוסח לפני שעולים לאוויר.
        </p>
      </main>
      <Footer />
    </>
  );
}
