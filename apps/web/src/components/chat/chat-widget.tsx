'use client';

// Lightweight chat widget loader. Defaults to Crisp (free tier, no
// per-conversation fees) but the same pattern works for Intercom / Tawk /
// Drift — swap the script src + window object.
//
// Activation is env-gated (NEXT_PUBLIC_CRISP_WEBSITE_ID). If the var is
// unset, this component returns null and ships zero bytes of widget JS.
// That keeps marketing-site cold loads fast and gives us a kill switch
// without redeploying code.
//
// We deliberately don't auto-open the chat — Crisp's bell + bubble are
// already opt-in. Auto-popups annoy users and tank conversion.

import { useEffect } from 'react';

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

export function ChatWidget() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID?.trim();
    if (!id) return;
    // Already loaded? Bail out so navigation between marketing pages doesn't
    // double-inject the script.
    if (window.$crisp) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = id;

    const s = document.createElement('script');
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    document.head.appendChild(s);
    // No cleanup intentionally — Crisp doesn't gracefully unmount, and
    // re-loading on every nav would be slower than letting it persist.
  }, []);

  return null;
}
