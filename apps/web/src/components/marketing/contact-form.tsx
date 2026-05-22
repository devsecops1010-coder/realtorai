'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ContactForm() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    officeName: '',
    city: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName,
        email: form.email,
      };
      if (form.phone) body.phone = form.phone;
      if (form.officeName) body.officeName = form.officeName;
      if (form.city) body.city = form.city;
      if (form.message) body.message = form.message;
      if (typeof document !== 'undefined') body.source = document.referrer || 'direct';

      await api('/contact', { method: 'POST', body, skipAuth: true });
      setDone(true);
    } catch (err) {
      const e = err as ApiError;
      setError(e.status === 429 ? 'יותר מדי פניות — נסה/י שוב בעוד דקה' : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">בואו נדבר</h2>
            <p className="text-lg text-muted-foreground">
              תשאיר/י פרטים, ניצור קשר תוך יום עסקים אחד עם הדגמה אישית.
            </p>
          </div>

          {done ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">קיבלנו את הפרטים שלך</h3>
                <p className="text-muted-foreground">ניצור איתך קשר תוך 24 שעות.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>פרטים ליצירת קשר</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">שם מלא *</Label>
                      <Input id="fullName" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">אימייל *</Label>
                      <Input id="email" type="email" required dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">טלפון</Label>
                      <Input id="phone" dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="officeName">שם המשרד</Label>
                      <Input id="officeName" value={form.officeName} onChange={(e) => set('officeName', e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="city">עיר עיקרית</Label>
                      <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">איך נוכל לעזור?</Label>
                    <Textarea
                      id="message"
                      rows={4}
                      placeholder="ספר/י קצת על המשרד — כמה מתווכים, היקף לידים, מה הכי כואב היום..."
                      value={form.message}
                      onChange={(e) => set('message', e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? 'שולח...' : 'שלח/י פנייה'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    בלחיצה על "שלח" את/ה מסכים/ה שניצור קשר באמצעי שמולא לעיל. ללא ספאם, ללא שיתוף עם צד שלישי.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
