'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import type { ConversationDetail } from '@/lib/types';

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [reply, setReply] = useState('');
  // AI-suggest state: separate from `reply` so the user can still see what
  // they were typing if the suggestion comes back empty/disappointing.
  const [suggesting, setSuggesting] = useState(false);

  async function load() {
    const c = await api<ConversationDetail>(`/conversations/${id}`);
    setConv(c);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function send() {
    if (!reply.trim()) return;
    await api(`/conversations/${id}/messages`, { method: 'POST', body: { body: reply } });
    setReply('');
    load();
  }

  async function handoff() {
    await api(`/conversations/${id}/handoff`, { method: 'POST', body: { reason: 'manual' } });
    load();
  }

  // Ask the LLM for a draft. Overwrites whatever's in `reply` — that's the
  // intent (the button is "draft a reply", not "append to my draft").
  async function suggest() {
    setSuggesting(true);
    try {
      const { suggestion } = await api<{ suggestion: string; model: string }>(
        `/conversations/${id}/suggest-reply`,
        { method: 'POST' },
      );
      setReply(suggestion);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'יצירת הצעה נכשלה');
    } finally {
      setSuggesting(false);
    }
  }

  if (!conv) return <div>טוען...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{conv.lead?.fullName || 'שיחה'}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{conv.channel}</Badge>
            <Badge variant={conv.status === 'handoff' ? 'destructive' : 'default'}>{conv.status}</Badge>
            <span className="text-sm text-muted-foreground">{formatDate(conv.startedAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>חזרה</Button>
          {!conv.handoffRequired && (
            <Button variant="destructive" onClick={handoff}>סמן להעברה למתווך</Button>
          )}
        </div>
      </div>

      {conv.summary && (
        <Card>
          <CardHeader>
            <CardTitle>סיכום</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{conv.summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>הודעות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {conv.messages.length === 0 && <p className="text-muted-foreground text-sm">אין הודעות.</p>}
          {conv.messages.map((m) => (
            <div
              key={m.id}
              className={
                m.senderType === 'lead'
                  ? 'bg-secondary p-3 rounded-md ml-auto max-w-[80%]'
                  : m.senderType === 'ai_agent'
                  ? 'bg-blue-50 p-3 rounded-md max-w-[80%]'
                  : 'bg-emerald-50 p-3 rounded-md max-w-[80%]'
              }
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{m.senderType}</span>
                <span className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>הוסף הודעה</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={suggest}
              disabled={suggesting}
              className="gap-1.5"
              title="הצעה אוטומטית — מבוססת על הקשר השיחה"
            >
              {suggesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
              )}
              הצע תשובה
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="כתוב הודעה ידנית, או לחץ ׳הצע תשובה׳ ל-AI..."
            rows={3}
          />
          <Button className="mt-3" onClick={send} disabled={!reply.trim()}>
            שלח
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
