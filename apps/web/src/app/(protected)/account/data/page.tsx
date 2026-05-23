'use client';

// Data tools page. Two operations:
//   - Full GDPR-style export: GET /exports/full.json → save-as
//   - CSV import: paste CSV (or upload file → FileReader → text)
//
// Lives under /account/data so it sits alongside the user's own settings.
// In a future iteration the export can ZIP+stream large datasets; for v1
// the JSON file is the right shape (machine + human readable).

import { useState } from 'react';
import { Download, Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function DataToolsPage() {
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);

  function downloadFullExport() {
    // We could fetch + create a blob, but a direct anchor link lets the
    // browser handle Content-Disposition properly and shows download
    // progress in the browser's native UI.
    const a = document.createElement('a');
    a.href = '/api/exports/full.json';
    a.download = 'realtorai-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('הורדה החלה');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function runImport() {
    if (!csvText.trim()) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await api<{ inserted: number; skipped: number; errors: string[] }>(
        '/leads/import',
        { method: 'POST', body: { csv: csvText } },
      );
      setResult(res);
      if (res.inserted > 0) {
        toast.success(`יובאו ${res.inserted} לידים`);
      } else if (res.skipped > 0) {
        toast.info(`${res.skipped} שורות דולגו (כפילויות)`);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'ייבוא נכשל');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" />
          ניהול נתונים
        </h1>
        <p className="text-muted-foreground mt-1">
          ייצוא נתונים מלא וייבוא לידים מקובץ CSV.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" /> ייצוא נתונים מלא (GDPR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            הורדה של כל הנתונים בחשבון: לידים, שיחות, נכסים, משימות, יועצי משכנתאות. בפורמט
            JSON שקריא גם לבן אדם וגם למחשב. סיסמאות וסודות 2FA אינם נכללים.
          </p>
          <Button onClick={downloadFullExport} className="gap-2">
            <Download className="h-4 w-4" /> הורד את כל הנתונים שלי
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" /> ייבוא לידים מ-CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            העלה קובץ CSV או הדבק טקסט. עמודות מזוהות (case-insensitive):
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded mx-1">fullName</code>,
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded mx-1">phone</code>,
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded mx-1">email</code>,
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded mx-1">city</code>,
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded mx-1">area</code>,
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded mx-1">intent</code>,
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded mx-1">notes</code>.
            לידים עם טלפון שכבר קיים בחשבון יידלגו.
          </p>

          <div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="text-sm file:mr-3 file:rounded-md file:border file:bg-card file:px-3 file:py-1 file:text-sm file:cursor-pointer"
            />
          </div>

          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`fullName,phone,email,city,area,intent\nדנה לוי,0501234567,dana@example.co.il,תל אביב,צפון,buy`}
            rows={8}
            dir="ltr"
            className="font-mono text-xs"
          />

          <Button onClick={runImport} disabled={importing || !csvText.trim()} className="gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            ייבא לידים
          </Button>

          {result && (
            <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                ייבוא הושלם
              </div>
              <p>נוספו: <strong>{result.inserted}</strong></p>
              <p>דולגו (כפילויות): <strong>{result.skipped}</strong></p>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-destructive">
                    {result.errors.length} שגיאות
                  </summary>
                  <ul className="mt-1 text-xs text-muted-foreground pl-4 list-disc">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
