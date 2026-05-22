'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: 'האם הסוכן באמת מבין עברית?',
    a: 'כן. אנחנו משתמשים במודלי שפה מתקדמים (Claude, Gemini, Groq) שמדברים עברית ברמת שפת אם. אפשר להתאים את הטון לפי המשרד — פורמלי, חברותי, מקצועי.',
  },
  {
    q: 'מה קורה אם הסוכן לא יודע לענות?',
    a: 'הוא לא ינסה להמציא. הוא יסכם את השיחה, יסמן אותה כ-"דורש התערבות אנושית", וישלח לך התראה מיידית עם כל ההקשר.',
  },
  {
    q: 'איזה ספק WhatsApp להעדיף?',
    a: 'תלוי בנפח: Twilio למתחילים (התקנה תוך 15 דק׳, יקר יותר לטווח ארוך). Meta Cloud API לרוב המשרדים (דורש Meta Business verification — כשבוע, אבל זול וחזק). 360dialog לרשתות גדולות.',
  },
  {
    q: 'איפה המידע נשמר? האם זה תואם רגולציה?',
    a: 'המידע נשמר בשרתים בישראל, מוצפן במנוחה ובתעבורה. אנחנו תואמים תקנות הגנת הפרטיות הישראליות וגם GDPR. ניתן למחוק לקוח לפי בקשה תוך 24 שעות.',
  },
  {
    q: 'מה קורה אם בעל דירה מבקש שלא יפנו אליו?',
    a: 'הסוכן מזהה את זה, מוסיף אותו ל-Opt-Out tableוהמערכת לא תפנה אליו יותר באף ערוץ. זה אוטומטי.',
  },
  {
    q: 'כמה זמן ההתקנה?',
    a: 'Starter — שעתיים. Pro — חצי יום (כולל התאמת תסריטים). Network — 30 יום הקמה כולל אונבורדינג של כל הצוות.',
  },
  {
    q: 'אפשר לחבר ל-Yad2 או Madlan?',
    a: 'בתוכנית. בינתיים: לידים שמגיעים אליך במייל מהפורטלים — אפשר להעביר אוטומטית למערכת דרך n8n או Zapier. גם עובד עם טופסי האתר שלך.',
  },
  {
    q: 'מה אם אני רוצה לראות את כל ההודעות לפני שהם נשלחות?',
    a: 'אפשר. במצב "אישור ידני" כל תגובה של הסוכן עוברת אליך לאישור. נהוג להפעיל את זה בשבוע הראשון ואז לעבור לאוטומטי.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">שאלות נפוצות</h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-lg border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-right hover:bg-muted/50"
                >
                  <span className="font-medium">{f.q}</span>
                  <ChevronDown
                    className={cn('h-5 w-5 transition-transform shrink-0', open === i && 'rotate-180')}
                  />
                </button>
                {open === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
