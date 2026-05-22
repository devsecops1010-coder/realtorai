import Link from 'next/link';
import { ArrowLeft, Clock, MessageCircle, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6 mx-auto inline-flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            פלטפורמת AI ראשונה בישראל למשרדי תיווך
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            סוכני AI שעונים לכל ליד
            <br />
            <span className="text-primary">תוך 60 שניות. 24/7.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            מערכת חכמה שמטפלת בלידים נכנסים ב-WhatsApp, מגייסת בעלי דירות,
            ומעבירה אליך רק לידים חמים — בלי להחמיץ אף שיחה.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Button asChild size="lg" className="text-base">
              <Link href="/register">
                התחל ניסיון חינם
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link href="#contact">דבר איתנו</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Stat icon={Clock} value="< 60 שנ׳" label="זמן תגובה ממוצע ללידים" />
            <Stat icon={MessageCircle} value="80%+" label="מהלידים מקבלים מענה אוטומטי" />
            <Stat icon={TrendingUp} value="3x" label="יותר פגישות בחודש בממוצע" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
