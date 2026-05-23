'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FileText, Upload, Send, CheckCircle2, Clock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DocumentRow {
  id: string;
  originalFileName: string;
  status: string;
  createdAt: string;
  signatureRequest?: { id: string; signerName: string; signerEmail: string; status: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'טיוטה', sent: 'נשלח', viewed: 'נצפה', otp_verified: 'אומת',
  signed: 'נחתם', declined: 'נדחה', expired: 'פג תוקף', cancelled: 'בוטל',
};
const STATUS_VARIANT: Record<string, 'default' | 'success' | 'outline' | 'warning' | 'secondary'> = {
  draft: 'outline',
  sent: 'default',
  viewed: 'default',
  otp_verified: 'warning',
  signed: 'success',
  cancelled: 'secondary',
  expired: 'secondary',
};

export default function DocumentsListPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DocumentRow[]>('/sign/documents')
      .then(setDocs)
      .catch((err) => toast.error((err as ApiError).message))
      .finally(() => setLoading(false));
  }, []);

  const counts = docs.reduce(
    (acc, d) => {
      acc.total += 1;
      if (d.status === 'sent' || d.status === 'viewed' || d.status === 'otp_verified') acc.pending += 1;
      if (d.status === 'signed') acc.signed += 1;
      if (d.status === 'expired') acc.expired += 1;
      return acc;
    },
    { total: 0, pending: 0, signed: 0, expired: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            מסמכים לחתימה
          </h1>
          <p className="text-muted-foreground mt-1">העלאת PDF, יצירת בקשת חתימה, ראיות חתימה אלקטרונית</p>
        </div>
        <Button asChild>
          <Link href="/documents/upload" className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            העלאת מסמך
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={FileText} label="סה״כ מסמכים" value={counts.total} color="text-blue-600" />
        <Stat icon={Send} label="ממתינים לחתימה" value={counts.pending} color="text-amber-600" />
        <Stat icon={CheckCircle2} label="נחתמו" value={counts.signed} color="text-emerald-600" />
        <Stat icon={Clock} label="פגו תוקף" value={counts.expired} color="text-rose-600" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>רשימה</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">טוען...</div>
          ) : docs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              עוד אין מסמכים.{' '}
              <Link href="/documents/upload" className="text-primary hover:underline">העלה ראשון</Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם מסמך</TableHead>
                  <TableHead>חותם</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>נוצר</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/documents/${d.id}`} className="font-medium hover:underline">
                        {d.originalFileName}
                      </Link>
                    </TableCell>
                    <TableCell dir="ltr">{d.signatureRequest?.signerEmail ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[d.status] ?? 'default'}>
                        {STATUS_LABEL[d.status] ?? d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground" dir="ltr">
                      {new Date(d.createdAt).toLocaleString('he-IL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, color,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
