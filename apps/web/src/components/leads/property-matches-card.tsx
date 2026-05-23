'use client';

// Property-matches card. Shown on a lead detail page. Lazily fetches
// matches on the first user click — we don't auto-call on render because
// the matcher is moderately expensive for tenants with many properties.

import { useState } from 'react';
import Link from 'next/link';
import { Building, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Match {
  property: {
    id: string;
    dealType: string;
    city: string | null;
    area: string | null;
    street: string | null;
    rooms: number | null;
    price: number | null;
    floor: number | null;
    coverImageUrl: string | null;
  };
  score: number;
  reasons: string[];
}

interface MatchesResponse {
  matches: Match[];
  reason?: string;
}

function formatPrice(n: number | null) {
  if (n === null) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(n);
}

export function PropertyMatchesCard({ leadId }: { leadId: string }) {
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api<MatchesResponse>(`/leads/${leadId}/property-matches`);
      setData(res);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'חיפוש נכשל');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="h-4 w-4 text-emerald-600" />
            נכסים תואמים
          </CardTitle>
          {data && (
            <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 text-xs gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              חיפוש מחדש
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!data && !loading && (
          <div className="text-center py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              מצא את 5 הנכסים הפעילים שהכי תואמים את הקריטריונים של הליד.
            </p>
            <Button onClick={load} className="gap-2">
              <Sparkles className="h-4 w-4" /> חפש התאמות
            </Button>
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            מחפש...
          </div>
        )}

        {data && data.matches.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">
            {data.reason ?? 'לא נמצאו התאמות'}
          </p>
        )}

        {data && data.matches.length > 0 && (
          <ul className="space-y-2">
            {data.matches.map((m) => (
              <li key={m.property.id}>
                <Link
                  href={`/properties/${m.property.id}`}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-accent transition-colors group"
                >
                  <div className="h-12 w-12 rounded-md bg-muted overflow-hidden grid place-items-center">
                    {m.property.coverImageUrl ? (
                      // Plain img — Next/Image would require a remote-hosts config
                      // that we don't have here. The grid is small so unoptimized is fine.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.property.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {m.property.street || m.property.area || m.property.city || 'נכס'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[
                        m.property.rooms ? `${m.property.rooms} חד'` : null,
                        formatPrice(m.property.price),
                        m.property.area,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {m.score}
                  </Badge>
                  <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
