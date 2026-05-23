'use client';

// Registers the service worker on first paint and exposes the
// `beforeinstallprompt` hook as a global event listener so other parts of the
// UI (e.g. settings page) can show an Install button.
//
// We deliberately keep this as small as possible — no online/offline status
// banner, no update prompt — those are nice-to-haves and easy to add later
// once the basics are validated.

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Wait for `load` so we don't compete with first paint resources.
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Silent fail — PWA features just won't be available.
          console.warn('[pwa] sw register failed', err);
        });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    // Stash the install prompt so other components can trigger it. We don't
    // call prompt() immediately because that would be against Chrome's UX
    // guidelines (the prompt must be in response to a user gesture).
    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__rai_installPrompt = e;
      window.dispatchEvent(new CustomEvent('rai:install-ready'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, []);

  return null;
}
