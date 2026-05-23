'use client';

// Demo video placeholder. Today: a static thumbnail + "play" button that
// scrolls to the contact form (so the click isn't wasted while we wait
// for a real video). Tomorrow: swap the placeholder div for an <iframe>
// pointing at a Wistia / Loom / YouTube embed.
//
// We're using a placeholder rather than a <video> tag because we don't yet
// have a production-quality demo recording. Showing a half-baked video is
// worse than showing "video coming soon" with a clear path to action.

import { useState } from 'react';
import { Play, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DemoVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          ראה את Realtorai בפעולה
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          2 דקות שמדגימות איך נראית התרחיש מליד נכנס ועד פגישה — הכל בלי לגעת
          במקלדת.
        </p>
      </div>

      <div className="relative aspect-video rounded-2xl overflow-hidden border shadow-lift bg-gradient-to-br from-primary/10 via-purple-500/5 to-fuchsia-500/10">
        {/* When we have a real embed URL we'll swap this block for an
            <iframe> with the loom/youtube src. The placeholder mocks the
            position so the page layout doesn't shift on launch day. */}
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 grid place-items-center group cursor-pointer"
            aria-label="הפעל סרטון דמו"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-fuchsia-500/10" />
            <div className="relative z-10 text-center space-y-4">
              <div className="h-20 w-20 mx-auto rounded-full bg-white/90 dark:bg-card backdrop-blur grid place-items-center shadow-lift group-hover:scale-110 transition-transform">
                <Play className="h-8 w-8 text-primary ml-1" />
              </div>
              <p className="text-sm text-muted-foreground">
                לחץ להפעלת הסרטון
              </p>
            </div>
          </button>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-card text-center p-8">
            <div className="max-w-md space-y-3">
              <p className="font-bold text-lg">הסרטון בהפקה.</p>
              <p className="text-sm text-muted-foreground">
                בינתיים — קבע שיחת דמו בזום עם הצוות שלנו ונציג לך את המערכת חיה
                על הנתונים שלך.
              </p>
              <Button asChild>
                <a href="#contact" className="gap-2 inline-flex">
                  קבע שיחת דמו <ArrowLeft className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
