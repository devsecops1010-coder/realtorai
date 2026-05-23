'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, AlertCircle, Maximize2, RotateCw } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Props {
  documentId: string;
  /** Pass true when the signed copy exists — the toggle is auto-rendered. */
  hasSignedVersion?: boolean;
  /** Initial variant to show; defaults to signed if available, otherwise original. */
  defaultVariant?: 'original' | 'signed';
  /** iframe height. Tall enough to read a page comfortably but not the whole screen. */
  height?: string;
}

/**
 * Inline PDF preview. Fetches the document via the authenticated
 * /sign/documents/:id/inline endpoint, hands the response off to a Blob URL,
 * and renders it in an iframe via the browser's built-in PDF viewer.
 *
 * Why fetch + Blob instead of pointing the iframe straight at the API URL:
 *   1. Cookies / CSRF are sent normally on the fetch (same-origin via the
 *      Next.js /api rewrite) — no edge cases with iframe credential leaks.
 *   2. We can show a real loading / error state instead of an opaque iframe.
 *   3. Easy to revoke the Blob URL on unmount/re-fetch to avoid leaks.
 *
 * Why iframe (not react-pdf or pdf.js): zero extra deps, native viewer in
 * every modern browser, the user can zoom/print/annotate using familiar UI.
 */
export function PdfPreview({
  documentId,
  hasSignedVersion = false,
  defaultVariant,
  height = '720px',
}: Props) {
  const [variant, setVariant] = useState<'original' | 'signed'>(
    defaultVariant ?? (hasSignedVersion ? 'signed' : 'original'),
  );
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Refresh seed for the "re-fetch" button. Bumping invalidates the effect.
  const [refreshSeed, setRefreshSeed] = useState(0);
  // Track the most recent Blob URL so we can revoke it before assigning a new
  // one (Blob URLs hold the file in memory until released).
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = variant === 'signed' ? '?signed=true' : '';
    fetch(`${apiUrl}/sign/documents/${documentId}/inline${params}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `HTTP ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        // Revoke the previous URL before we replace it. The order matters —
        // if we revoked AFTER setting state, the iframe would briefly point
        // at a freed URL.
        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        currentUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'טעינה נכשלה');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, variant, refreshSeed]);

  // Clean up the last Blob URL on unmount. The effect above already revokes
  // previous URLs on switch, so this only catches the very last one.
  useEffect(() => {
    return () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
  }, []);

  function openInNewTab() {
    if (blobUrl) window.open(blobUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">תצוגה מקדימה</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasSignedVersion && (
            // Toggle between original and signed — only shown after the doc
            // has been signed so admins can still verify what the signer saw.
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setVariant('original')}
                className={`px-3 py-1 rounded transition ${
                  variant === 'original' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'
                }`}
              >
                מקורי
              </button>
              <button
                type="button"
                onClick={() => setVariant('signed')}
                className={`px-3 py-1 rounded transition ${
                  variant === 'signed' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'
                }`}
              >
                חתום
              </button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshSeed((s) => s + 1)}
            title="טען מחדש"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openInNewTab}
            disabled={!blobUrl}
            title="פתח בכרטיסייה חדשה"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative bg-muted/30" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-background/60 z-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              טוען מסמך…
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center z-10">
            <div className="text-center max-w-sm px-4">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm font-semibold">לא ניתן להציג את המסמך</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setRefreshSeed((s) => s + 1)}
              >
                נסה שוב
              </Button>
            </div>
          </div>
        )}
        {blobUrl && !error && (
          // The browser's built-in PDF viewer handles zoom, search, page nav.
          // type="application/pdf" tells some browsers to skip plugin detection.
          <iframe
            src={blobUrl}
            title="PDF preview"
            className="w-full h-full border-0"
            // sandbox is intentionally omitted — the PDF is from our own API,
            // not user-controlled HTML. Sandboxing would also block the
            // built-in PDF.js renderer's controls in some browsers.
          />
        )}
      </div>
    </div>
  );
}
