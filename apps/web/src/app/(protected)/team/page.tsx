'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UserPlus, Loader2, ShieldCheck, TableProperties } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getAssignableRoleOptions, ROLE_LABELS } from '@/lib/role-workspace';
import type { UserRole } from '@/lib/types';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: 'active' | 'invited' | 'disabled';
  officeId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<TeamUser['status'], string> = {
  active: 'פעיל',
  invited: 'הוזמן',
  disabled: 'מנוטרל',
};

export default function TeamPage() {
  const me = getCurrentUser();
  const canManage =
    me?.role === 'office_owner' ||
    me?.role === 'office_manager' ||
    me?.role === 'platform_owner' ||
    me?.role === 'platform_admin';
  const assignableRoles = getAssignableRoleOptions(me?.role);

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'realtor' as UserRole });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await api<TeamUser[]>('/users');
      setUsers(list);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFlash(null);
    setSubmitting(true);
    try {
      await api('/users/invite', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
        },
      });
      toast.success(`הזמנה נשלחה ל-${form.email}`, {
        description: 'המשתמש יקבל אימייל עם קישור להפעלת החשבון.',
      });
      setFlash(null); // legacy state — kept for now, toast is the primary surface
      setForm({ name: '', email: '', phone: '', role: 'realtor' });
      await load();
    } catch (e) {
      const msg = (e as ApiError).message;
      setFormError(msg);
      toast.error('שליחת ההזמנה נכשלה', { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateUser(id: string, patch: { role?: UserRole; status?: TeamUser['status'] }) {
    try {
      await api(`/users/${id}`, { method: 'PATCH', body: patch });
      toast.success(
        patch.role ? 'התפקיד עודכן' : patch.status === 'disabled' ? 'המשתמש נוטרל' : 'המשתמש הופעל',
      );
      await load();
    } catch (e) {
      const msg = (e as ApiError).message;
      setError(msg);
      toast.error('פעולה נכשלה', { description: msg });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">צוות המשרד</h1>
          <p className="text-muted-foreground mt-1">הזמן עובדים, נהל הרשאות וסטטוסים</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/team/permissions"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-sm font-medium"
          >
            <TableProperties className="h-4 w-4 text-primary" />
            מטריצת הרשאות
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            {users.length} משתמשים
          </div>
        </div>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-primary" />
              הזמנת משתמש חדש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={invite} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="name">שם מלא</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="050-..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">תפקיד</Label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as UserRole }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {assignableRoles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={submitting} className="h-9 btn-shine">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שלח הזמנה'}
              </Button>
              {formError && (
                <p className="md:col-span-5 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}
              {flash && (
                <p className="md:col-span-5 text-sm text-emerald-600 bg-emerald-500/10 rounded-md px-3 py-2">
                  {flash}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>חברי הצוות</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">טוען...</div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">אין משתמשים עדיין.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>תפקיד</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>התחברות אחרונה</TableHead>
                  {canManage && <TableHead className="text-left">פעולות</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isMe = u.id === me?.id;
                  const isPlatformRole = u.role === 'platform_owner' || u.role === 'platform_admin';
                  // office_manager cannot change office_owner. Nobody changes platform_*.
                  const canEdit =
                    canManage &&
                    !isMe &&
                    !isPlatformRole &&
                    !(me?.role === 'office_manager' && u.role === 'office_owner');
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name}
                        {isMe && <span className="text-xs text-muted-foreground mr-2">(את/ה)</span>}
                      </TableCell>
                      <TableCell dir="ltr" className="text-sm">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <select
                            value={u.role}
                            onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          >
                            {assignableRoles.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            u.status === 'active'
                              ? 'success'
                              : u.status === 'invited'
                                ? 'outline'
                                : 'secondary'
                          }
                        >
                          {STATUS_LABELS[u.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground" dir="ltr">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('he-IL') : '—'}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateUser(u.id, {
                                  status: u.status === 'disabled' ? 'active' : 'disabled',
                                })
                              }
                            >
                              {u.status === 'disabled' ? 'הפעל' : 'נטרל'}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
