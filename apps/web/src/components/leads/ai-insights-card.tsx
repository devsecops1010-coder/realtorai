'use client';

// AI insights card. Lives on the lead detail page. On-demand generation —
// the user clicks "Generate" and we hit POST /leads/:id/insights, which
// fans out through the LLM router (Groq fast tier by default) and returns
// a structured { summary, nextAction, urgency }.
//
// We don't persist anything in this component; results are local state. If
// the user wants to re-generate (after sending a message, updating status,
// etc.) they tap refresh. A future iteration can cache the last result on
// Lead.metadata so refreshing the page shows the prior insight without an
// LLM call.

import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Insights {
  summary: string;
  nextAction: string;
  urgency: 'low' | 'medium' | 'high';
  model: string;
  generatedAt: string;
}

const URGENCY_LABEL: Record<Insights['urgency'], string> = {
  low: 'דחיפות נמוכה',
  medium: 'דחיפות בינונית',
  high: 'דחיפות גבוהה',
};
const URGENCY_VARIANT: Record<Insights['urgency'], 'cold' | 'warning' | 'hot'> = {
  low: 'cold',
  medium: 'warning',
  high: 'hot',
};

export function AiInsightsCard({ leadId }: { leadId: string }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<Insights>(`/leads/${leadId}/insights`, { method: 'POST' });
      setInsights(res);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'נכשלה הפקת התובנות';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            תובנות AI
          </CardTitle>
          {insights && (
            <Button
              variant="ghost"
              size="sm"
              onClick={generate}
              disabled={loading}
              className="h-7 text-xs gap-1"
              title="הפק תובנות מחדש"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              רענן
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!insights && !loading && !error && (
          // Initial state: explain what the button does so the LLM cost isn't
          // surprising. Bold the action so the eye lands there immediately.
          <div className="space-y-3 text-center py-2">
            <p className="text-sm text-muted-foreground">
              קבל תקציר חכם של מצב הליד והמלצה לפעולה הבאה — מבוסס על הנתונים, השיחות והמשימות.
            </p>
            <Button onClick={generate} className="gap-2">
              <Sparkles className="h-4 w-4" />
              צור תובנות
            </Button>
          </div>
        )}

        {loading && !insights && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            מנתח את הליד...
          </div>
        )}

        {error && !insights && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>{error}</p>
              <Button variant="ghost" size="sm" onClick={generate} className="h-7 mt-1 text-xs">
                נסה שוב
              </Button>
            </div>
          </div>
        )}

        {insights && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={URGENCY_VARIANT[insights.urgency]}>{URGENCY_LABEL[insights.urgency]}</Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(insights.generatedAt).toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · '}
                {insights.model}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">תקציר</p>
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>

            <div className="space-y-1 p-3 rounded-md bg-primary/10 border border-primary/20">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                <ArrowRight className="h-3 w-3" /> פעולה מומלצת
              </p>
              <p className="text-sm font-medium leading-relaxed">{insights.nextAction}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
