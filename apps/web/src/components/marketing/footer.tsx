import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              Realtorai
            </Link>
            <p className="text-sm text-muted-foreground">סוכני AI למשרדי תיווך בישראל.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">מוצר</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#features" className="text-muted-foreground hover:text-foreground">יכולות</Link></li>
              <li><Link href="/#how" className="text-muted-foreground hover:text-foreground">איך זה עובד</Link></li>
              <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground">מחירים</Link></li>
              <li><Link href="/#faq" className="text-muted-foreground hover:text-foreground">שאלות נפוצות</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">חברה</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#contact" className="text-muted-foreground hover:text-foreground">צור קשר</Link></li>
              <li><Link href="/register" className="text-muted-foreground hover:text-foreground">התחל ניסיון</Link></li>
              <li><Link href="/login" className="text-muted-foreground hover:text-foreground">התחבר</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">משפטי</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">פרטיות</Link></li>
              <li><Link href="/legal/terms" className="text-muted-foreground hover:text-foreground">תקנון</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} Realtorai. כל הזכויות שמורות.</div>
          <div>בנוי בישראל 🇮🇱</div>
        </div>
      </div>
    </footer>
  );
}
