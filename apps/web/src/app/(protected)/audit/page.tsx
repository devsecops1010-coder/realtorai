'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollText, User, Bot, ServerCog, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuditEntry {
  id: string;
  tenantId: string | null;
  actorType: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditResponse {
  items: AuditEntry[];
  total: number;
  take: number;
  skip: number;
  actions: string[];
}

const ACTOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  ai_agent: Bot,
  system: ServerCog,
};

const ACTOR_LABELS: Record<string, string> = {
  user: 'משתמש',
  ai_agent: 'סוכן AI',
  system: 'מערכת',
};

/**
 * /audit — tenant-scope audit trail viewer. Reads from GET /audit which the
 * Prisma extension auto-filters to the caller's tenant. Platform admins also
 * see /admin/audit (cross-tenant) — TODO surface that as a tab.
 */
export default function AuditPage() {
  const router = useRouter();
  const me = getCurrentUser();
  const canView =
    me?.role === 'office_owner' ||
    me?.role === 'office_manager' ||
    me?.role === 'platform_admin' ||
    me?.role === 'platform_owner';

  useEffect(() => {
    if (!canView) router.replace('/dashboard');
  }, [canView, router]);

  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterActor, setFilterActor] = useState<'' | 'user' | 'ai_agent' | 'system'>('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [skip, setSkip] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filterAction) p.set('action', filterAction);
    if (filterActor) p.set('actorType', filterActor);
    if (filterFrom) p.set('from', new Date(filterFrom).toISOString());
    if (filterTo) p.set('to', new Date(filterTo).toISOString());
    p.set('take', '50');
    p.set('skip', String(skip));
    return p.toString();
  }, [filterAction, filterActor, filterFrom, filterTo, skip]);

  useEffect(() => {
    if (!canView) return;
    setLoading(true);
    api<AuditResponse>(`/audit?${queryString}`)
      .then(setData)
      .catch((err) => {
        const e = err as ApiError;
        if (e.status === 403) router.replace('/dashboard');
      })
      .finally(() => setLoading(false));
  }, [canView, queryString, router]);

  function resetFilters() {
    setFilterAction('');
    setFilterActor('');
    setFilterFrom('');
    setFilterTo('');
    setSkip(0);
  }

  if (!canView) return null;

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ScrollText className="h-7 w-7 text-primary" />
          יומן ביקורת
        </h1>
        <p className="text-muted-foreground mt-1">
          כל פעולה רגישה במערכת — מי, מתי, על מה. {total.toLocaleString()} רשומות.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            סינון
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="action">פעולה</Label>
              <select
                id="action"
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setSkip(0);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">הכל</option>
                {(data?.actions ?? []).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="actor">סוג מבצע</Label>
              <select
                id="actor"
                value={filterActor}
                onChange={(e) => {
                  setFilterActor(e.target.value as typeof filterActor);
                  setSkip(0);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">הכל</option>
                <option value="user">משתמש</option>
                <option value="ai_agent">סוכן AI</option>
                <option value="system">מערכת</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from">מתאריך</Label>
              <Input
                id="from"
                type="date"
                value={filterFrom}
                onChange={(e) => {
                  setFilterFrom(e.target.value);
                  setSkip(0);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">עד תאריך</Label>
              <Input
                id="to"
                type="date"
                value={filterTo}
                onChange={(e) => {
                  setFilterTo(e.target.value);
                  setSkip(0);
                }}
              />
            </div>
            <Button variant="outline" onClick={resetFilters} className="h-9">
              נקה
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>זמן</TableHead>
                <TableHead>מבצע</TableHead>
                <TableHead>פעולה</TableHead>
                <TableHead>יעד</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    טוען...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    אין רשומות שתואמות לסינון.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((entry) => {
                  const ActorIcon = ACTOR_ICONS[entry.actorType] ?? ServerCog;
                  const isExpanded = expandedId === entry.id;
                  const hasMetadata =
                    entry.metadata && Object.keys(entry.metadata).length > 0;
                  return (
                    <>
                      <TableRow
                        key={entry.id}
                        className={hasMetadata ? 'cursor-pointer hover:bg-muted/40' : ''}
                        onClick={() => hasMetadata && setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <TableCell className="text-xs text-muted-foreground" dir="ltr">
                          {new Date(entry.createdAt).toLocaleString('he-IL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ActorIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{ACTOR_LABELS[entry.actorType] ?? entry.actorType}</span>
                            {entry.actorId && (
                              <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                                {entry.actorId.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.targetType ? (
                            <span className="text-sm">
                              {entry.targetType}
                              {entry.targetId && (
                                <span className="text-xs text-muted-foreground font-mono mr-1" dir="ltr">
                                  {entry.targetId.slice(0, 8)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasMetadata &&
                            (isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ))}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasMetadata && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30">
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono" dir="ltr">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 50 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - 50))}
          >
            ← הקודם
          </Button>
          <span className="text-muted-foreground">
            {skip + 1}-{Math.min(skip + 50, total)} מתוך {total}
          </span>
          <Button
            variant="outline"
            disabled={skip + 50 >= total}
            onClick={() => setSkip(skip + 50)}
          >
            הבא →
          </Button>
        </div>
      )}
    </div>
  );
}
