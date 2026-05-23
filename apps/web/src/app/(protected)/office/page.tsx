'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Phone,
  MessageSquare,
  MapPin,
  Users as UsersIcon,
  Flame,
  ListTodo,
  Home as HomeIcon,
  ArrowLeft,
  UserCheck,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCurrentUser } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/role-workspace';
import type { Office, UserRole } from '@/lib/types';

interface AreaCatalogEntry {
  id: string;
  slug: string;
  nameHe: string;
  region: string | null;
}

interface TeamMemberStats {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited' | 'disabled';
  leadsAssigned: number;
  hotLeads: number;
  openTasks: number;
  propertiesAsAssignee: number;
}

interface TeamStats {
  officeId: string;
  members: TeamMemberStats[];
}

export default function OfficePage() {
  const router = useRouter();
  const [office, setOffice] = useState<Office | null>(null);
  const [team, setTeam] = useState<TeamStats | null>(null);
  const [areaCatalog, setAreaCatalog] = useState<AreaCatalogEntry[]>([]);
  const [editingAreas, setEditingAreas] = useState(false);
  const [draftAreaIds, setDraftAreaIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const me = getCurrentUser();
  const canEditAreas = me?.role === 'office_owner' || me?.role === 'office_manager';

  useEffect(() => {
    api<Office>('/offices/current').then(setOffice).catch(() => setOffice(null));
    api<TeamStats>('/offices/current/team-stats').then(setTeam).catch(() => setTeam(null));
    api<AreaCatalogEntry[]>('/catalog/areas').then(setAreaCatalog).catch(() => undefined);
  }, []);

  // Build areaLinks lookup if office has the catalog-backed links populated
  const officeAreaIds = useMemo(
    () => office?.areaLinks?.map((l) => l.areaId) ?? [],
    [office],
  );

  function openAreaEdit() {
    if (!office) return;
    setDraftAreaIds(officeAreaIds);
    setEditingAreas(true);
  }

  function toggleDraftArea(id: string) {
    setDraftAreaIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function saveAreas() {
    if (!office) return;
    setSaving(true);
    try {
      const updated = await api<Office>('/offices/current', {
        method: 'PATCH',
        body: JSON.stringify({ areaIds: draftAreaIds }),
      });
      setOffice(updated);
      setEditingAreas(false);
      toast.success('האזורים עודכנו');
    } catch (e) {
      toast.error(`עדכון נכשל: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!office) return <div>טוען...</div>;

  // Aggregate the team into per-role rollups for the bottom section. Roles
  // with zero people are dropped so the panel stays focused.
  const byRole = (team?.members ?? []).reduce<Record<string, { count: number; leads: number; hot: number; properties: number; openTasks: number }>>((acc, m) => {
    const k = m.role;
    if (!acc[k]) acc[k] = { count: 0, leads: 0, hot: 0, properties: 0, openTasks: 0 };
    acc[k].count += 1;
    acc[k].leads += m.leadsAssigned;
    acc[k].hot += m.hotLeads;
    acc[k].properties += m.propertiesAsAssignee;
    acc[k].openTasks += m.openTasks;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">המשרד שלי</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {office.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoTile icon={MapPin} label="עיר" value={office.city || '—'} />
          <InfoTile icon={Phone} label="טלפון" value={office.phone || '—'} dir="ltr" />
          <InfoTile icon={MessageSquare} label="WhatsApp" value={office.whatsappNumber || '—'} dir="ltr" />
          <InfoTile icon={Building2} label="סטטוס" value={office.status} />
          <div className="col-span-2 md:col-span-4 mt-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">אזורי פעילות</p>
              {canEditAreas && !editingAreas && (
                <button
                  type="button"
                  onClick={openAreaEdit}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  עריכה
                </button>
              )}
            </div>
            {editingAreas ? (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
                <div className="text-xs text-muted-foreground">
                  סמן את האזורים שהמשרד עובד בהם. הרשימה לקוחה מקטלוג מרכזי.
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-72 overflow-y-auto">
                  {areaCatalog.map((a) => {
                    const picked = draftAreaIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleDraftArea(a.id)}
                        className={`text-right text-xs rounded-md px-2 py-1.5 border transition ${
                          picked
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-background hover:border-muted-foreground/40'
                        }`}
                      >
                        {a.nameHe}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingAreas(false)}>
                    ביטול
                  </Button>
                  <Button size="sm" disabled={saving} onClick={saveAreas}>
                    שמירה ({draftAreaIds.length})
                  </Button>
                </div>
              </div>
            ) : office.areaLinks && office.areaLinks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {office.areaLinks.map((l) => (
                  <Badge key={l.areaId} variant="secondary" className="font-normal">
                    {l.area.nameHe}
                  </Badge>
                ))}
              </div>
            ) : office.areas.length > 0 ? (
              // Backward-compat: tenant predates the catalog migration.
              <div className="flex flex-wrap gap-1.5">
                {office.areas.map((a) => (
                  <Badge key={a} variant="outline" className="font-normal">
                    {a}
                  </Badge>
                ))}
                {canEditAreas && (
                  <span className="text-xs text-muted-foreground self-center">
                    (לחץ עריכה לעדכן מהקטלוג)
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">אין אזורי פעילות מוגדרים.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-user team table. Rows are clickable — click drills into /leads
          filtered by the user's assignedUserId. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            חברי הצוות וביצועים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!team ? (
            <div className="text-center py-8 text-muted-foreground">טוען נתוני צוות...</div>
          ) : team.members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">אין חברי צוות עדיין.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>תפקיד</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="h-3.5 w-3.5" /> לידים
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-rose-500" /> חמים
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <HomeIcon className="h-3.5 w-3.5 text-blue-500" /> נכסים
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <ListTodo className="h-3.5 w-3.5 text-amber-500" /> משימות פתוחות
                    </span>
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((m) => (
                  <TableRow
                    key={m.userId}
                    className="cursor-pointer group"
                    onClick={() => router.push(`/leads?assignedUserId=${m.userId}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 grid place-items-center text-xs font-semibold">
                          {m.name.slice(0, 1)}
                        </div>
                        {m.name}
                        {m.status === 'invited' && (
                          <Badge variant="outline" className="text-xs">הוזמן</Badge>
                        )}
                        {m.status === 'disabled' && (
                          <Badge variant="secondary" className="text-xs">מנוטרל</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABELS[m.role]}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">{m.leadsAssigned}</TableCell>
                    <TableCell className="tabular-nums">
                      {m.hotLeads > 0 ? (
                        <span className="text-rose-600 font-semibold">{m.hotLeads}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{m.propertiesAsAssignee}</TableCell>
                    <TableCell className="tabular-nums">{m.openTasks}</TableCell>
                    <TableCell>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Per-role rollups for managers — at-a-glance "how is each role
          doing". Each card links to /team filtered indirectly via the role
          column. */}
      {Object.keys(byRole).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              סיכום לפי תפקיד
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(byRole).map(([role, s]) => (
                <Link key={role} href={`/team`} className="group">
                  <div className="rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-lift hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[role as UserRole]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{s.count} משתמשים</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <RollupStat icon={UsersIcon} label="לידים" value={s.leads} />
                      <RollupStat icon={Flame} label="חמים" value={s.hot} color="text-rose-600" />
                      <RollupStat icon={HomeIcon} label="נכסים" value={s.properties} />
                      <RollupStat icon={ListTodo} label="משימות" value={s.openTasks} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  dir?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="font-medium" dir={dir}>
        {value}
      </p>
    </div>
  );
}

function RollupStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className={`font-semibold tabular-nums ${color ?? ''}`}>{value}</span>
    </div>
  );
}
